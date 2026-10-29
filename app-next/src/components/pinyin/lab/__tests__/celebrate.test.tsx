import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfettiBurst } from "../confetti-burst";
import { QuizView } from "../quiz-view";

describe("ConfettiBurst", () => {
  it("render overlay aria-hidden + pointer-events-none", () => {
    const { container } = render(<ConfettiBurst />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el.className).toContain("pointer-events-none");
  });
});

describe("QuizView celebrate", () => {
  /* QuizView render header + deck ở mọi state; khi !done && picked === null
     chỉ ẩn opts/feedback — target null vẫn an toàn. */
  const base = {
    qi: 10, total: 10, score: 9, streak: 0, done: true, opts: [],
    target: null, picked: null, playing: false,
    onChoose: () => {}, onNext: () => {}, onReplay: () => {}, onSlow: () => {}, onReset: () => {},
  };
  it("score >= 8 → hiện confetti", () => {
    const { container } = render(<QuizView {...base} />);
    expect(container.querySelector("[aria-hidden='true'].pointer-events-none")).not.toBeNull();
  });
  it("score < 8 → không confetti", () => {
    const { container } = render(<QuizView {...base} score={4} />);
    expect(container.querySelector(".pointer-events-none")).toBeNull();
  });
  it("streak >= 5 giữa phiên → badge chuỗi nổi bật", () => {
    render(<QuizView {...base} done={false} qi={5} score={5} streak={5} target={null} />);
    expect(screen.getByTestId("streak-celebrate")).toBeInTheDocument();
  });
});
