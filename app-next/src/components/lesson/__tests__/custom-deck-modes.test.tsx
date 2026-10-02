import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import LessonClient from "../lesson-client";
import type { LessonItem } from "../lesson-provider";

/* Fix hasExample (customNoExample — clone/js/lesson.js:66,118): deck không có
   câu ví dụ riêng (example.zh === hanzi fallback) → ẩn mode Reading + Listen
   khỏi sidebar; deck có example → bình thường. */

const withExample: LessonItem = {
  hanzi: "你好",
  pinyin: "nǐ hǎo",
  hanViet: "NHĨ HẢO",
  meaning: "Xin chào",
  pos: "",
  example: { zh: "李明，你好。", pinyinPerChar: [], vi: "Chào Lý Minh" },
  index: 0,
  itemKey: "deck.d1.0",
};

const noExample: LessonItem = {
  ...withExample,
  example: { zh: "你好", pinyinPerChar: [], vi: "Xin chào" }, // fallback zh === hanzi
  itemKey: "deck.d2.0",
};

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("LessonClient hasExample guard (custom deck)", () => {
  it("deck không example riêng → sidebar ẩn Đọc hiểu + Nghe ghép câu, tab Ví dụ trống", () => {
    render(<LessonClient items={[noExample]} deckName="Bộ của tôi" />);
    expect(screen.queryByRole("button", { name: /Đọc hiểu/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Nghe ghép câu/ })).toBeNull();
    // các mode còn lại vẫn hiện
    expect(screen.getByRole("button", { name: /Flashcard/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Trắc nghiệm/ })).toBeInTheDocument();
    // tab Ví dụ không render item không có example riêng (không có card + nút 🔊 câu ví dụ)
    screen.getByRole("button", { name: "Ví dụ" }).click();
    expect(screen.queryByTitle("Phát âm câu ví dụ")).toBeNull();
  });
  it("deck có example → Reading/Listen vẫn hiện trong sidebar", () => {
    render(<LessonClient items={[withExample]} deckName="Bộ của tôi" />);
    expect(screen.getByRole("button", { name: /Đọc hiểu/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nghe ghép câu/ })).toBeInTheDocument();
  });
});
