import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import SoundQuiz from "../quiz-client";
import { soundRulesData } from "@/content/soundrules";

describe("SoundQuiz (D4)", () => {
  it("5 câu, chọn đúng tăng counter + hiện giải thích", () => {
    render(<SoundQuiz />);
    expect(screen.getAllByRole("button", { name: /.*/ }).length).toBeGreaterThanOrEqual(5 * 4);
    const correct = soundRulesData.quiz[0].options[soundRulesData.quiz[0].answer];
    act(() => screen.getByRole("button", { name: correct }).click());
    expect(screen.getByText(/Đúng 1\/5/)).toBeInTheDocument();
    expect(screen.getByText(soundRulesData.quiz[0].explain)).toBeInTheDocument();
  });
});

import { beforeEach, vi } from "vitest";
import { progressStore } from "@/lib/store/progress-store";

vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn(), speaking: false, getVoices: vi.fn(() => []) });

beforeEach(() => {
  localStorage.clear();
});

function answerAll(correctIndexes: number[]) {
  soundRulesData.quiz.forEach((q, qi) => {
    const want = correctIndexes.includes(qi) ? q.answer : (q.answer + 1) % q.options.length;
    act(() => screen.getByText(q.options[want]).click());
  });
}

describe("SoundQuiz — lưu best (W0.3)", () => {
  it("trả lời đủ câu → recordSoundRulesResult với số câu đúng", () => {
    render(<SoundQuiz />);
    answerAll([0]);
    expect(progressStore.getSoundRulesBest()).toBe(1);
    expect(screen.getByTestId("sound-quiz-best").textContent).toContain("1/5");
  });

  it("lượt sau điểm thấp hơn → best giữ nguyên", () => {
    const { unmount } = render(<SoundQuiz />);
    answerAll(soundRulesData.quiz.map((_, i) => i));
    unmount();
    expect(progressStore.getSoundRulesBest()).toBe(5);
    render(<SoundQuiz />);
    answerAll([0]);
    expect(progressStore.getSoundRulesBest()).toBe(5);
    expect(screen.getByTestId("sound-quiz-best").textContent).toContain("5/5");
  });
});
