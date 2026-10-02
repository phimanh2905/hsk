import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { LessonProvider, type LessonItem } from "../lesson-provider";
import ListenMode, { listenRates } from "../modes/listen";

const word: LessonItem = {
  hanzi: "你好", pinyin: "nǐ hǎo", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ",
  example: { zh: "李明，你好。", pinyinPerChar: [], vi: "Chào Lý Minh" }, index: 0, itemKey: "hsk1.lesson-1.0",
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn(), getVoices: vi.fn(() => []), speaking: false });
});

afterEach(cleanup); // vitest không bật globals -> RTL auto-cleanup không chạy

describe("ListenMode", () => {
  it("5 mức tốc độ, active đỏ, 'Nghe câu' phát với rate đang chọn", async () => {
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><ListenMode /></LessonProvider>);
    expect(listenRates).toEqual([0.5, 0.8, 1, 1.5, 2]);
    await act(async () => screen.getByRole("button", { name: "2x" }).click());
    await act(async () => screen.getByRole("button", { name: /Nghe câu/ }).click());
    const u = (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(u.rate).toBe(2);
  });
  it("ghép đúng thứ tự chữ -> xanh + +1 XP; 'Gõ lại' reset về pool", async () => {
    const { progressStore } = await import("@/lib/store/progress-store");
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><ListenMode /></LessonProvider>);
    const xpBefore = progressStore.getXp();
    for (const ch of ["李", "明", "，", "你", "好", "。"]) {
      await act(async () => screen.getByRole("button", { name: ch }).click());
    }
    await act(async () => screen.getByRole("button", { name: /Ghép câu/ }).click());
    expect(progressStore.getXp()).toBe(xpBefore + 1);
    await act(async () => screen.getByRole("button", { name: /Gõ lại/ }).click());
    expect(screen.getByRole("button", { name: "李" })).toBeInTheDocument(); // về pool
  });
});
