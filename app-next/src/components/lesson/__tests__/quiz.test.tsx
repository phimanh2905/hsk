import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { LessonProvider, type LessonItem } from "../lesson-provider";
import QuizMode, { pickDistractors } from "../modes/quiz";
import { progressStore } from "@/lib/store/progress-store";
import { ToastProvider } from "@/components/shell/toast-provider";

const mk = (i: number): LessonItem => ({
  hanzi: `词${i}`, pinyin: `cí${i}`, hanViet: "TỪ", meaning: `nghĩa ${i}`, pos: "Danh từ",
  example: { zh: "例", pinyinPerChar: [], vi: "ví dụ" }, index: i, itemKey: `hsk1.lesson-1.${i}`,
});
const words = [0, 1, 2, 3].map(mk);

function Harness() {
  return (
    <LessonProvider items={words} book="hsk1" page="lesson-1">
      <ToastProvider>
        <QuizMode />
      </ToastProvider>
    </LessonProvider>
  );
}

beforeEach(() => localStorage.clear());
afterEach(cleanup); // vitest không bật globals -> RTL auto-cleanup không chạy

describe("pickDistractors", () => {
  it("3 nhiễu từ cùng bài, không chứa đáp án đúng, không trùng", () => {
    const d = pickDistractors(words, words[0]);
    expect(d).toHaveLength(3);
    expect(d.every((x) => x.index !== 0)).toBe(true);
    expect(new Set(d.map((x) => x.index)).size).toBe(3);
  });
  it("bài có pinyin trùng (hsk1.lesson-10: 他/她 = tā) không sinh distractor cùng nhãn đáp án", () => {
    const l10: LessonItem[] = [
      { ...mk(0), hanzi: "他", pinyin: "tā" },
      { ...mk(1), hanzi: "她", pinyin: "tā" },
      { ...mk(2), hanzi: "猫", pinyin: "māo" },
      { ...mk(3), hanzi: "狗", pinyin: "gǒu" },
      { ...mk(4), hanzi: "鸟", pinyin: "niǎo" },
    ];
    const d = pickDistractors(l10, l10[0]); // correct = 他 (tā)
    expect(d.every((x) => x.pinyin !== "tā")).toBe(true); // 她 bị loại theo giá trị pinyin
    expect(new Set(d.map((x) => x.pinyin)).size).toBe(d.length); // không trùng nhãn nhau
  });
});

describe("QuizMode", () => {
  it("chọn đúng -> +1 XP; 'Không biết' không cộng XP", () => {
    render(<Harness />);
    const xpBefore = progressStore.getXp();
    act(() => screen.getByRole("button", { name: `cí0` }).click()); // đáp án đúng (pinyin của từ 0)
    expect(progressStore.getXp()).toBe(xpBefore + 1);
    act(() => screen.getByRole("button", { name: /Không biết/ }).click());
    expect(progressStore.getXp()).toBe(xpBefore + 1);
  });
  it("chọn sai -> viền đỏ, tự sang câu kế sau 800ms", () => {
    vi.useFakeTimers();
    render(<Harness />);
    const wrong = screen.getAllByRole("button").find((b) => b.textContent === "cí1")!;
    act(() => wrong.click());
    expect(wrong.className).toContain("border-red");
    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByText(/2 \/ 4/)).toBeInTheDocument();
    vi.useRealTimers();
  });
});
