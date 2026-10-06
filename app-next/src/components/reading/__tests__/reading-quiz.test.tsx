import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ReadingQuiz } from "../reading-quiz";
import { READING_ARTICLES } from "@/content/reading";

const quiz = READING_ARTICLES.tea.quiz; // ≥2 câu, mỗi câu có explanation

function setup(answers: Record<number, number | null> = {}) {
  const onAnswer = vi.fn();
  render(<ReadingQuiz quiz={quiz} answers={answers} onAnswer={onAnswer} />);
  return { onAnswer };
}

/** Scope về câu qi để chữ cái A/B/C không đụng giữa các câu. */
function qScope(qi: number) {
  return within(screen.getAllByRole("listitem")[qi]);
}

const letter = (i: number) => String.fromCharCode(65 + i);

describe("ReadingQuiz", () => {
  it("header hiện đếm động", () => {
    setup();
    expect(screen.getByText("Kiểm tra hiểu bài")).toBeTruthy();
    expect(screen.getByText(`đã đúng 0/${quiz.length}`)).toBeTruthy();
    setup({ 0: quiz[0].answer, 1: (quiz[1].answer + 1) % quiz[1].options.length });
    expect(screen.getByText("đã đúng 1/" + quiz.length)).toBeTruthy();
  });

  it("options sạch (không prefix 'A. ') và key sinh từ index", () => {
    setup();
    const clean = quiz[0].options.every((o) => !/^[A-C]\.\s/.test(o));
    expect(clean).toBe(true);
    expect(qScope(0).getByText(quiz[0].options[0])).toBeTruthy();
    expect(qScope(0).getByText(String.fromCharCode(65))).toBeTruthy(); // badge "A"
  });

  it("chọn đúng → onAnswer(qi, answer)", async () => {
    const user = userEvent.setup();
    const { onAnswer } = setup();
    await user.click(qScope(0).getByRole("button", { name: new RegExp(`^${letter(quiz[0].answer)}\\s*`) }));
    expect(onAnswer).toHaveBeenCalledWith(0, quiz[0].answer);
  });

  it("chọn sai → feedback 'Chưa đúng.' + nêu đáp án đúng + explanation", async () => {
    const user = userEvent.setup();
    const wrong = (quiz[0].answer + 1) % quiz[0].options.length;
    const { rerender } = render(<ReadingQuiz quiz={quiz} answers={{}} onAnswer={vi.fn()} />);
    await user.click(qScope(0).getByRole("button", { name: new RegExp(`^${letter(wrong)}\\s*`) }));
    rerender(<ReadingQuiz quiz={quiz} answers={{ 0: wrong }} onAnswer={vi.fn()} />);
    expect(screen.getByText("Chưa đúng.")).toBeTruthy();
    expect(screen.getByText(/Đáp án đúng:/)).toBeTruthy();
    expect(screen.getByText(new RegExp(quiz[0].explanation.slice(0, 8)))).toBeTruthy();
  });

  it("chọn lại đúng sau khi sai → feedback chuyển sang Chính xác (không lock)", async () => {
    const wrong = (quiz[0].answer + 1) % quiz[0].options.length;
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    const { rerender } = render(<ReadingQuiz quiz={quiz} answers={{ 0: wrong }} onAnswer={onAnswer} />);
    expect(screen.getByText("Chưa đúng.")).toBeTruthy();
    // sau khi trả lời sai, badge là icon X — tên nút giờ là đúng text option
    await user.click(qScope(0).getByRole("button", { name: quiz[0].options[quiz[0].answer] }));
    expect(onAnswer).toHaveBeenCalledWith(0, quiz[0].answer);
    rerender(<ReadingQuiz quiz={quiz} answers={{ 0: quiz[0].answer }} onAnswer={onAnswer} />);
    expect(screen.getByText("Chính xác!")).toBeTruthy();
    expect(screen.queryByText("Chưa đúng.")).toBeNull();
  });

  it("option đã chọn có aria-pressed=true", () => {
    const wrong = (quiz[0].answer + 1) % quiz[0].options.length;
    render(<ReadingQuiz quiz={quiz} answers={{ 0: wrong }} onAnswer={vi.fn()} />);
    const btn = qScope(0).getByRole("button", { name: quiz[0].options[wrong] });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.className).toContain("rose-wash");
  });
});
