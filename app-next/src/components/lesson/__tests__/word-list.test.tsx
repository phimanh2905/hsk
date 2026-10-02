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
  it("⭐ thêm vào SRS với item_key chuẩn, vàng persist, bấm lại bỏ", () => {
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><WordList /></LessonProvider>);
    const star = screen.getByTitle("Thêm vào bộ thẻ ôn tập");
    act(() => star.click());
    expect(progressStore.getSrs("hsk1.lesson-1.0")?.status).toBe("new"); // item_key <book>.<page>.<index>
    expect(star.className).toContain("text-yellow");
    act(() => star.click());
    expect(progressStore.getSrs("hsk1.lesson-1.0")).toBeNull();
  });
  it("toast 'Đã thêm vào ôn tập' khi bấm ⭐", () => {
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><WordList /></LessonProvider>);
    act(() => screen.getByTitle("Thêm vào bộ thẻ ôn tập").click());
    expect(screen.getByText("Đã thêm vào ôn tập")).toBeInTheDocument();
  });
  it("🔊 phát âm từ", () => {
    vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn(), getVoices: vi.fn(() => []) });
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><WordList /></LessonProvider>);
    act(() => screen.getByTitle("Phát âm từ").click());
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });
});
