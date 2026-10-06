import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemSegs } from "../mem-segs";
import { VocabHero } from "../vocab-hero";

afterEach(cleanup);

describe("MemSegs", () => {
  it("master → 5 đoạn jade; study → 3 đoạn amber; new → 1 đoạn rose + b N/5", () => {
    const { container, rerender } = render(<MemSegs status="master" />);
    expect(container.querySelector("b")!.textContent).toBe("5/5");
    expect(container.querySelectorAll(".bg-learning-mastered").length).toBe(5);
    rerender(<MemSegs status="study" />);
    expect(container.querySelectorAll(".bg-learning-progress").length).toBe(3);
    rerender(<MemSegs status="new" />);
    expect(container.querySelectorAll(".bg-action-primary").length).toBe(1);
  });
});

describe("VocabHero", () => {
  it("kicker + h1 số từ tô accent + 3 pills + CTA onReview", () => {
    const onReview = vi.fn();
    const { getByText, container } = render(
      <VocabHero dueCount={18} total={420} mastery={68} hskTarget="HSK 4" onReview={onReview} />,
    );
    expect(getByText("THE MEMORY COMMAND")).toBeTruthy();
    expect(document.body.textContent).toContain("Hôm nay có");
    expect(getByText("18 từ")).toBeTruthy();
    expect(getByText("420 từ")).toBeTruthy();
    expect(getByText("68%")).toBeTruthy();
    expect(getByText("HSK 4")).toBeTruthy();
    act(() => getByText("Luyện tập ngay").click());
    expect(onReview).toHaveBeenCalledTimes(1);
    void container;
  });
  it("hskTarget null → pill ẩn", () => {
    render(<VocabHero dueCount={0} total={0} mastery={0} hskTarget={null} onReview={() => {}} />);
    expect(document.body.textContent).not.toContain("HSK mục tiêu");
  });
});
