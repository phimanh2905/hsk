import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemBar } from "../mem-bar";

afterEach(cleanup);

describe("MemBar", () => {
  it("hiện % + nhãn; tone weak → fill action-primary + pill feedback-error-text", () => {
    const { container } = render(<MemBar value={45} />);
    expect(container.textContent).toContain("45%");
    expect(container.textContent).toContain("Yếu");
    expect(container.querySelector(".bg-action-primary")).not.toBeNull();
    expect(container.querySelector(".text-feedback-error-text")).not.toBeNull();
  });
  it("mid → amber fill + pill amber-ink; strong → jade fill + pill mastered", () => {
    const { container } = render(<MemBar value={60} />);
    expect(container.querySelector(".bg-learning-progress")).not.toBeNull();
    expect(container.textContent).toContain("Vừa");
    const { container: c2 } = render(<MemBar value={90} />);
    expect(c2.querySelector(".bg-learning-mastered")).not.toBeNull();
    expect(c2.textContent).toContain("Sâu");
  });
  it("width fill = value%", () => {
    // 72 thuộc tone "mid" (memTone ≤80) → dùng 85 (strong) để truy vấn fill jade.
    const { container } = render(<MemBar value={85} />);
    expect((container.querySelector(".bg-learning-mastered") as HTMLElement).style.width).toBe("85%");
  });
});
