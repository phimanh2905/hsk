import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StreakPill } from "../streak-pill";

describe("StreakPill", () => {
  it("mini: hiện số ngày trong pill", () => {
    render(<StreakPill days={12} />);
    expect(screen.getByText("12")).toBeInTheDocument();
  });
  it("full: hiện '12 ngày liên tục' + caption", () => {
    render(<StreakPill days={12} variant="full" />);
    expect(screen.getByText("12 ngày liên tục")).toBeInTheDocument();
    expect(screen.getByText("Streak · giữ lửa mỗi ngày")).toBeInTheDocument();
  });
  it("nền amber-wash ở cả 2 variant", () => {
    const { container, rerender } = render(<StreakPill days={1} />);
    expect(container.firstElementChild!.className).toContain("bg-amber-wash");
    rerender(<StreakPill days={1} variant="full" />);
    expect(container.firstElementChild!.className).toContain("bg-surface-elevated");
    expect(container.textContent).toContain("ngày liên tục");
  });
});
