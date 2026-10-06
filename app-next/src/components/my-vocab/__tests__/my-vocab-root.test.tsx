// app-next/src/components/my-vocab/__tests__/my-vocab-root.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import MyVocabRoot from "../my-vocab-root";
import { progressStore } from "@/lib/store/progress-store";

const speakMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak: speakMock, cancel: () => {}, speaking: false }),
}));
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: () => {}, back: () => {} }),
}));

function getByOD(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}

beforeEach(() => {
  localStorage.clear();
  speakMock.mockClear(); pushMock.mockReset();
  /* data thật: 1 SRS (deck key → cần bye.decks) + 1 user deck + vocabBook */
  localStorage.setItem("bye.decks", JSON.stringify([
    { id: "nb-1", name: "Bộ e2e", rows: [
      { hanzi: "时间", pinyin: "shíjiān", hanviet: "THỜI GIAN", meaning: "thời gian" },
      { hanzi: "朋友", pinyin: "péngyou", hanviet: "BẰNG HỮU", meaning: "bạn bè" },
    ], updatedAt: "2026-10-05T00:00:00.000Z" },
  ]));
  /* getAllSrs đọc bye.srs.items (map key → item) — seed format store thật */
  localStorage.setItem("bye.srs.items", JSON.stringify({
    "deck.nb-1.0": {
      key: "deck.nb-1.0", status: "learning", dueAt: Date.now() - 1000,
      reviewCount: 2, lastReviewedAt: Date.now() - 2 * 86_400_000, updatedAt: Date.now(),
    },
  }));
  localStorage.setItem("bye.vocabBook", JSON.stringify([{ hanzi: "爱", pinyin: "ài", vi: "yêu" }]));
});
afterEach(cleanup);

describe("MyVocabRoot", () => {
  it("hero + deck grid mặc định: 2 fixed (due có 时间, star rỗng) + user deck 'Bộ e2e'", () => {
    render(<MyVocabRoot />);
    expect(getByOD("memory-hero").textContent).toContain("cần làm mới");
    expect(getByOD("deck-due").textContent).toContain("Từ cần ôn ngay");
    expect(getByOD("deck-due").textContent).toContain("1 từ đến hạn");
    expect(getByOD("deck-star").textContent).toContain("Từ đã sao");
    expect(getByOD("deck-nb-1").textContent).toContain("Bộ e2e");
    expect(getByOD("deck-nb-1").textContent).toContain("2 từ trong deck");
  });

  it("view list: bảng đủ 3 row (SRS + deck + vocabBook, dedupe theo zh)", () => {
    render(<MyVocabRoot />);
    act(() => (document.querySelector('[role="group"][aria-label="Chế độ xem"] button:nth-child(2)') as HTMLElement).click());
    expect(document.querySelectorAll("tbody tr").length).toBe(3);
    expect(document.body.textContent).toContain("THỜI GIAN");
  });

  it("Review Focus #3: filter HSK khi đang decks → tự chuyển list + lọc đúng", () => {
    render(<MyVocabRoot />);
    act(() => (document.querySelector('[role="group"][aria-label="Lọc HSK"] button:nth-child(3)') as HTMLElement).click()); // HSK 2
    expect(getByOD("vocab-table").closest("div")!.className).not.toContain("hidden");
    expect(getByOD("deck-grid").closest("div")!.className).toContain("hidden"); // wrapper ẩn deck grid
    expect(document.querySelectorAll("tbody tr").length).toBe(1); // 时间 có SRS → HSK 2
  });

  it("search 'ai' → chỉ 爱; star filter → row đã sao", () => {
    render(<MyVocabRoot />);
    act(() => (document.querySelector('[role="group"][aria-label="Chế độ xem"] button:nth-child(2)') as HTMLElement).click());
    const input = document.querySelector('input[type="search"]') as HTMLInputElement;
    act(() => { fireEvent.change(input, { target: { value: "ai" } }); });
    expect(document.querySelectorAll("tbody tr").length).toBe(1);
    act(() => { fireEvent.change(input, { target: { value: "" } }); });
    act(() => (document.querySelector('[role="group"][aria-label="Lọc HSK"] button:last-child') as HTMLElement).click()); // Đã lưu
    expect(document.querySelectorAll("tbody tr").length).toBe(0); // chưa ai được sao
  });

  it("drawer: mở từ row → star toggle lưu store + toast; Escape đóng (kể cả focus textarea) (Review Focus #4)", () => {
    render(<MyVocabRoot />);
    act(() => (document.querySelector('[role="group"][aria-label="Chế độ xem"] button:nth-child(2)') as HTMLElement).click());
    act(() => (document.querySelector("tbody tr") as HTMLElement).click());
    expect(getByOD("vocab-drawer")).toBeTruthy();
    act(() => (document.querySelector('[aria-label="Đánh dấu sao"]') as HTMLElement).click());
    expect(progressStore.getWordMeta()["时间"]).toEqual({ star: 1 });
    const textarea = document.querySelector("textarea")!;
    textarea.focus();
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(document.querySelector('[data-od-id="vocab-drawer"]')).toBeNull();
  });

  it("onStudy: deck user → /lesson/custom/<id>; deck due → /review", () => {
    render(<MyVocabRoot />);
    act(() => getByOD("deck-nb-1").querySelector("button:last-of-type")!.click());
    expect(pushMock).toHaveBeenCalledWith("/lesson/custom/nb-1");
    act(() => getByOD("deck-due").querySelector("button:last-of-type")!.click());
    expect(pushMock).toHaveBeenCalledWith("/review");
  });

  it("tạo deck: tên hợp lệ → thêm grid + store + toast mock", () => {
    render(<MyVocabRoot />);
    act(() => getByOD("new-deck").click());
    const input = document.querySelector('[aria-label="Tên deck"]') as HTMLInputElement;
    act(() => { fireEvent.change(input, { target: { value: "Từ phỏng vấn" } }); });
    const createBtn = [...document.querySelectorAll("button")].find((b) => b.textContent === "Tạo deck")!;
    act(() => createBtn.click());
    expect(getByOD("deck-grid").textContent).toContain("Từ phỏng vấn");
    expect(progressStore.listDecks("vocab").some((d) => d.name === "Từ phỏng vấn")).toBe(true);
  });
});
