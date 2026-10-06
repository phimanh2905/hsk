import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent, act } from "@testing-library/react";

import ReadingReaderRoot from "../reading-reader-root";
import { READING_ARTICLES } from "@/content/reading";
import { progressStore } from "@/lib/store/progress-store";

const tea = READING_ARTICLES.tea;

function getByODId(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
  // jsdom không có scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
  // spyOn (mặc định) vẫn gọi implementation gốc — chỉ ghi nhận call.
  vi.spyOn(progressStore, "addXp");
  vi.spyOn(progressStore, "recordReadingProgress");
  vi.spyOn(progressStore, "recordReadingQuizDone");
  vi.spyOn(progressStore, "addToVocabBook");
});
afterEach(() => {
  cleanup();
});

describe("ReadingReaderRoot", () => {
  it("render passage (số câu) + quiz + audio bar + topbar", () => {
    const { container } = render(<ReadingReaderRoot article={tea} />);
    expect(getByODId("reader-root")).toBeTruthy();
    expect(container.querySelectorAll(".sent").length).toBe(tea.sentences.length);
    expect(getByODId("reading-quiz")).toBeTruthy();
    expect(getByODId("karaoke-bar")).toBeTruthy();
    expect(getByODId("scaffold-bar")).toBeTruthy();
    // title zh + vi từ READING_LIB
    expect(document.body.textContent).toContain("茶道与宁静");
    expect(document.body.textContent).toContain("Trà đạo và sự tĩnh lặng");
    // hydration-safe: mặc định scaf hanzi — không có pinyin
    expect(container.textContent).not.toContain("chádào");
  });

  it("đọc bye.reading.scaf từ localStorage sau mount → scaf áp dụng", () => {
    window.localStorage.setItem("bye.reading.scaf", JSON.stringify("pinyin"));
    const { container } = render(<ReadingReaderRoot article={tea} />);
    act(() => {}); // flush effect
    expect(container.textContent).toContain("chádào");
  });

  it("A+ đổi font size → --reader-size mới + ghi bye.reading.font", () => {
    const { container } = render(<ReadingReaderRoot article={tea} />);
    const canvas = getByODId("reading-canvas");
    expect(canvas.style.getPropertyValue("--reader-size")).toBe("18px");
    act(() => document.querySelector('[aria-label="Tăng cỡ chữ"]')!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(canvas.style.getPropertyValue("--reader-size")).toBe("20px");
    expect(JSON.parse(window.localStorage.getItem("bye.reading.font")!)).toBe(20);
    // clamp ở 26
    for (let i = 0; i < 10; i++) {
      act(() => document.querySelector('[aria-label="Tăng cỡ chữ"]')!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    }
    expect(canvas.style.getPropertyValue("--reader-size")).toBe("26px");
  });

  it("trả lời đúng hết quiz → addXp(3) đúng 1 lần (trả lời lại không cộng)", () => {
    render(<ReadingReaderRoot article={tea} />);
    const pick = (text: string) => {
      const btn = [...document.querySelectorAll('[data-od-id="reading-quiz"] button')].find(
        (b) => b.textContent?.includes(text),
      ) as HTMLButtonElement;
      act(() => btn.click());
    };
    pick("追求内心的平静"); // answer 0 = index 1
    pick("在竹林之中"); // answer 1 = index 0
    expect(progressStore.addXp).toHaveBeenCalledTimes(1);
    expect(progressStore.addXp).toHaveBeenCalledWith(3);
    expect(progressStore.recordReadingQuizDone).toHaveBeenCalledTimes(1);
    // chọn sai lại rồi chọn đúng lại → không cộng thêm
    pick("展示茶叶的价格");
    pick("追求内心的平静");
    expect(progressStore.addXp).toHaveBeenCalledTimes(1);
    expect(progressStore.recordReadingQuizDone).toHaveBeenCalledTimes(1);
  });

  it("seek tới câu cuối rồi pause → recordReadingProgress(id, pct theo maxIndex)", () => {
    const { unmount } = render(<ReadingReaderRoot article={tea} />);
    const slider = document.querySelector('[aria-label="Vị trí câu trong bài"]') as HTMLElement;
    // 5 câu → ArrowRight x4 → index 4 (câu cuối)
    for (let i = 0; i < tea.sentences.length - 1; i++) {
      act(() => fireEvent.keyDown(slider, { key: "ArrowRight" }));
    }
    act(() => fireEvent.click(document.querySelector('[aria-label="Tạm dừng"]')!));
    const pct = Math.round(((tea.sentences.length - 1) / tea.sentences.length) * 100); // 80
    expect(progressStore.recordReadingProgress).toHaveBeenCalledWith("tea", pct);
    unmount();
  });

  it("phát câu đầu rồi pause → ghi progress pct 0 (đã chạm ≥1 câu)", () => {
    render(<ReadingReaderRoot article={tea} />);
    act(() => fireEvent.click(document.querySelector('[aria-label="Phát"]')!)); // index 0
    act(() => fireEvent.click(document.querySelector('[aria-label="Tạm dừng"]')!));
    expect(progressStore.recordReadingProgress).toHaveBeenCalledTimes(1);
    expect(progressStore.recordReadingProgress).toHaveBeenCalledWith("tea", 0);
  });

  it("bấm từ → popup; Lưu từ → addToVocabBook + vocab book có từ", () => {
    const { container, unmount } = render(<ReadingReaderRoot article={tea} />);
    const firstWord = container.querySelector(".w") as HTMLElement;
    act(() => fireEvent.click(firstWord));
    expect(getByODId("word-popup")).toBeTruthy();
    const saveBtn = [...document.querySelectorAll('[data-od-id="word-popup"] button')].find(
      (b) => b.textContent?.includes("Lưu"),
    ) as HTMLButtonElement;
    act(() => saveBtn.click());
    expect(progressStore.addToVocabBook).toHaveBeenCalledWith({
      hanzi: "茶道",
      pinyin: "chádào",
      vi: "trà đạo, nghệ thuật uống trà",
    });
    expect(progressStore.getVocabBook().some((v) => v.hanzi === "茶道")).toBe(true);
    unmount();
  });

  it("progress có sẵn trong store → quizDone init (không cộng XP lại)", () => {
    progressStore.recordReadingProgress("tea", 40);
    progressStore.recordReadingQuizDone("tea"); // chiếm slot lần đầu
    render(<ReadingReaderRoot article={tea} />);
    const pick = (text: string) => {
      const btn = [...document.querySelectorAll('[data-od-id="reading-quiz"] button')].find(
        (b) => b.textContent?.includes(text),
      ) as HTMLButtonElement;
      act(() => btn.click());
    };
    pick("追求内心的平静");
    pick("在竹林之中");
    expect(progressStore.addXp).not.toHaveBeenCalled();
  });
});
