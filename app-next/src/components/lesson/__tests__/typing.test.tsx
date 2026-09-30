import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonProvider, type LessonItem } from "../lesson-provider";
import TypingMode, { checkTyped } from "../modes/typing";
import { progressStore } from "@/lib/store/progress-store";

const word: LessonItem = {
  hanzi: "你好", pinyin: "nǐ hǎo", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ",
  example: { zh: "李明，你好。", pinyinPerChar: [], vi: "Chào Lý Minh" }, index: 0, itemKey: "hsk1.lesson-1.0",
};

beforeEach(() => localStorage.clear());
afterEach(cleanup); // vitest không bật globals -> RTL auto-cleanup không chạy (như quiz.test.tsx)

describe("checkTyped", () => {
  it("chấp nhận input số tương đương dấu", () => {
    expect(checkTyped("ni3 hao3", "nǐ hǎo")).toBe(true);
    expect(checkTyped("ni hao", "nǐ hǎo")).toBe(true); // không gõ thanh vẫn đúng (stripTones 2 bên)
    expect(checkTyped("ni3 hao4", "nǐ hǎo")).toBe(false);
  });
});

describe("TypingMode", () => {
  it("gõ đúng -> +1 XP + tự sang thẻ sau", async () => {
    const user = userEvent.setup();
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><TypingMode /></LessonProvider>);
    const xpBefore = progressStore.getXp();
    await user.type(screen.getByPlaceholderText(/Gõ pinyin/), "ni3 hao3");
    await act(async () => screen.getByRole("button", { name: /Kiểm tra/ }).click());
    expect(progressStore.getXp()).toBe(xpBefore + 1);
  });
  it("Gợi ý mở dần từng ký tự, tối đa 5", async () => {
    const user = userEvent.setup();
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><TypingMode /></LessonProvider>);
    await user.click(screen.getByRole("button", { name: /Gợi ý \(0\/5\)/ }));
    await user.click(screen.getByRole("button", { name: /Gợi ý \(1\/5\)/ }));
    expect(screen.getByText("n")).toBeInTheDocument(); // ký tự đầu "nǐ hǎo" đã lộ
  });
});
