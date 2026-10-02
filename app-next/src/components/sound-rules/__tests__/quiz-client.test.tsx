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
