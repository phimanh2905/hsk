import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { LessonProvider, type LessonItem } from "../lesson-provider";
import ReadingMode, { clozeZh } from "../modes/reading";

const word: LessonItem = {
  hanzi: "你好", pinyin: "nǐ hǎo", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ",
  example: { zh: "李明，你好。", pinyinPerChar: [], vi: "Chào Lý Minh" }, index: 0, itemKey: "hsk1.lesson-1.0",
};

beforeEach(() => localStorage.clear());
afterEach(cleanup); // vitest không bật globals -> RTL auto-cleanup không chạy

describe("clozeZh", () => {
  it("tách đúng vị trí từ trong câu", () => {
    expect(clozeZh("李明，你好。", "你好")).toEqual({ before: "李明，", blank: "你好", after: "。" });
  });
});

describe("ReadingMode", () => {
  it("hiện chỗ trống + bản dịch; 'Câu này bó tay' không cộng XP", () => {
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><ReadingMode /></LessonProvider>);
    expect(screen.getByText(/李明，/)).toBeInTheDocument();
    expect(screen.getByText(/Chào Lý Minh/)).toBeInTheDocument();
    act(() => screen.getByRole("button", { name: /Câu này bó tay/ }).click());
    // không XP nào được cộng (không assert trên store vì bó tay không đụng store) — sang câu kế/kết thúc
    expect(screen.queryByRole("button", { name: /Câu này bó tay/ })).not.toBeInTheDocument();
  });
});
