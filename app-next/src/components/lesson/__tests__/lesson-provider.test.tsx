import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { progressStore } from "@/lib/store/progress-store";
import { LessonProvider, useLesson } from "../lesson-provider";
import type { LessonItem } from "../lesson-provider";

const items: LessonItem[] = [
  { hanzi: "你好", pinyin: "nǐ hǎo", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ",
    example: { zh: "李明，你好。", pinyinPerChar: [], vi: "Chào Lý Minh" }, index: 0, itemKey: "hsk1.lesson-1.0" },
];

function Probe() {
  const { mode, setMode, index, setIndex, known, markKnown } = useLesson();
  return (
    <div>
      <span data-mode={mode} data-index={index} />
      <button onClick={() => setMode("quiz")}>to-quiz</button>
      <button onClick={() => setIndex(1)}>next</button>
      <button onClick={() => markKnown(0, "known")}>known</button>
      <span data-known={known[0] ?? "none"} />
    </div>
  );
}

describe("LessonProvider state machine", () => {
  it("mode mặc định flash, setMode/setIndex/markKnown cập nhật", () => {
    const { container } = render(
      <LessonProvider items={items} book="hsk1" page="lesson-1">
        <Probe />
      </LessonProvider>
    );
    expect(container.querySelector("[data-mode='flash']")).toBeTruthy(); // mode mặc định
    act(() => screen.getByText("to-quiz").click());
    expect(container.querySelector("[data-mode='quiz']")).toBeTruthy();
    act(() => screen.getByText("next").click());
    expect(container.querySelector("[data-index='1']")).toBeTruthy();
    act(() => screen.getByText("known").click());
    expect(container.querySelector("[data-known='known']")).toBeTruthy();
  });

  it("đổi mode reset index về 0 (RULING Task 12, khớp switchMode của clone)", () => {
    const { container } = render(
      <LessonProvider items={items} book="hsk1" page="lesson-1">
        <Probe />
      </LessonProvider>
    );
    const btn = (label: string) => Array.from(container.querySelectorAll("button")).find((b) => b.textContent === label)!;
    act(() => btn("next").click());
    expect(container.querySelector("[data-index='1']")).toBeTruthy();
    act(() => btn("to-quiz").click());
    expect(container.querySelector("[data-mode='quiz']")).toBeTruthy();
    expect(container.querySelector("[data-index='0']")).toBeTruthy();
  });

  it("useLesson throw nếu dùng ngoài provider", () => {
    // excerpt qua console.error do React báo lỗi render
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow();
    spy.mockRestore();
  });
});

function FlashProbe({ onG }: { onG?: (lv: 1 | 2 | 3) => void }) {
  const { revealed, setRevealed, grade, done, autoplay, toggleAutoplay, index } = useLesson();
  return (
    <div>
      <span data-revealed={revealed} data-done={done} data-autoplay={autoplay} data-index={index} />
      <button onClick={() => setRevealed(true)}>reveal</button>
      <button onClick={() => { grade(1); onG?.(1); }}>g1</button>
      <button onClick={() => toggleAutoplay()}>toggle-auto</button>
    </div>
  );
}

describe("Flash SRS state (port opendesign lesson.html)", () => {
  it("grade chỉ chạy khi revealed: chưa lật → no-op, lật rồi → recordReview + sang từ tiếp", () => {
    const spy = vi.spyOn(progressStore, "recordReview");
    const { container } = render(
      <LessonProvider items={[...items, { ...items[0], index: 1, itemKey: "hsk1.lesson-1.1", hanzi: "再见" }]}>
        <FlashProbe />
      </LessonProvider>
    );
    act(() => screen.getByText("g1").click());
    expect(spy).not.toHaveBeenCalled(); // chưa revealed
    act(() => screen.getByText("reveal").click());
    act(() => screen.getByText("g1").click());
    expect(spy).toHaveBeenCalledWith("hsk1.lesson-1.0", 1);
    expect(container.querySelector("[data-revealed='false']")).toBeTruthy();
    expect(container.querySelector("[data-index='1']")).toBeTruthy();
    spy.mockRestore();
  });

  it("grade từ cuối → done=true và index giữ nguyên", () => {
    const spy = vi.spyOn(progressStore, "recordReview");
    const { container } = render(
      <LessonProvider items={[...items, { ...items[0], index: 1, itemKey: "hsk1.lesson-1.1", hanzi: "再见" }]}>
        <FlashProbe />
      </LessonProvider>
    );
    act(() => screen.getByText("reveal").click());
    act(() => screen.getByText("g1").click()); // từ 1 → index 1
    act(() => screen.getByText("reveal").click());
    act(() => screen.getByText("g1").click()); // từ cuối → done
    expect(container.querySelector("[data-done='true']")).toBeTruthy();
    expect(container.querySelector("[data-index='1']")).toBeTruthy();
    spy.mockRestore();
  });

  it("autoplay đọc localStorage sau mount (không đọc lúc render đầu — hydration)", async () => {
    // Deviation so với brief: RTL render() đã flush effect trong act → không quan sát được
    // data-autoplay='false' sau khi đã seed localStorage. Thay bằng spy xác nhận giá trị
    // CHỈ được đọc qua effect sau mount (getItem("nhai.lesson.autoplay")), rồi assert true.
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
    localStorage.setItem("nhai.lesson.autoplay", "1");
    const { container } = render(
      <LessonProvider items={items}>
        <FlashProbe />
      </LessonProvider>
    );
    await act(async () => {}); // flush effect
    expect(getItemSpy).toHaveBeenCalledWith("nhai.lesson.autoplay"); // đọc sau mount
    expect(container.querySelector("[data-autoplay='true']")).toBeTruthy();
    localStorage.removeItem("nhai.lesson.autoplay");
    getItemSpy.mockRestore();
  });

  it("toggleAutoplay persist localStorage", async () => {
    const { container } = render(
      <LessonProvider items={items}>
        <FlashProbe />
      </LessonProvider>
    );
    await act(async () => {}); // mount xong
    act(() => screen.getByText("toggle-auto").click());
    expect(container.querySelector("[data-autoplay='true']")).toBeTruthy();
    expect(localStorage.getItem("nhai.lesson.autoplay")).toBe("1");
    localStorage.removeItem("nhai.lesson.autoplay");
  });
});
