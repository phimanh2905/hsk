import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { LessonProvider, type LessonItem } from "../lesson-provider";
import WordList from "../word-list";
import { progressStore } from "@/lib/store/progress-store";

const word: LessonItem = {
  hanzi: "你好", pinyin: "nǐ hǎo", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ",
  example: { zh: "李明，你好。", pinyinPerChar: [{ c: "李", py: "lǐ" }, { c: "明", py: "míng" }, { c: "，", py: "，" }, { c: "你", py: "nǐ" }, { c: "好", py: "hǎo" }, { c: "。", py: "。" }], vi: "Chào Lý Minh" },
  index: 0, itemKey: "hsk1.lesson-1.0",
};

beforeEach(() => localStorage.clear());
afterEach(cleanup); // vitest không bật globals -> RTL auto-cleanup không chạy

describe("WordList + SRS (C9)", () => {
  it("star thêm vào SRS với item_key chuẩn, amber persist, bấm lại bỏ", () => {
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><WordList /></LessonProvider>);
    const star = screen.getByRole("button", { name: "Thêm vào bộ thẻ ôn tập" });
    act(() => star.click());
    expect(progressStore.getSrs("hsk1.lesson-1.0")?.status).toBe("new"); // item_key <book>.<page>.<index>
    expect(star.querySelector(".text-learning-streak")).not.toBeNull(); // tone streak qua icon Flame/Star
    act(() => star.click());
    expect(progressStore.getSrs("hsk1.lesson-1.0")).toBeNull();
  });
  it("toast 'Đã thêm vào ôn tập' khi bấm star", () => {
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><WordList /></LessonProvider>);
    act(() => screen.getByRole("button", { name: "Thêm vào bộ thẻ ôn tập" }).click());
    expect(screen.getByText("Đã thêm vào ôn tập")).toBeInTheDocument();
  });
  it("phát âm từ (nút loa)", () => {
    vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn(), getVoices: vi.fn(() => []) });
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><WordList /></LessonProvider>);
    act(() => screen.getByRole("button", { name: "Phát âm từ" }).click());
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });
  /* final review: grade ở màn flash bắn nhai:progress → ngôi sao phải tự đồng bộ,
     không đọc 1 lần lúc mount rồi để cứng. */
  it("ngôi sao đồng bộ lại khi nhai:progress bắn (grade ở màn flash)", () => {
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><WordList /></LessonProvider>);
    const star = screen.getByRole("button", { name: "Thêm vào bộ thẻ ôn tập" });
    expect(star.querySelector(".text-learning-streak")).toBeNull();
    act(() => progressStore.recordReview("hsk1.lesson-1.0", 3));
    expect(star.querySelector(".text-learning-streak")).not.toBeNull();
  });
  it("bỏ listener nhai:progress khi unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(
      <LessonProvider items={[word]} book="hsk1" page="lesson-1"><WordList /></LessonProvider>
    );
    unmount();
    expect(remove).toHaveBeenCalledWith("nhai:progress", expect.any(Function));
    remove.mockRestore();
  });
});
