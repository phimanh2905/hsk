import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Progress } from "../progress";

describe("Progress", () => {
  it("hiện label + số % (luôn kèm số)", () => {
    render(<Progress value={25} max={100} label="Tiến độ" />);
    expect(screen.getByText("Tiến độ")).toBeTruthy();
    expect(screen.getByText("25%")).toBeTruthy();
  });

  it("role=progressbar với giá trị đúng", () => {
    render(<Progress value={3} max={4} label="Ôn tập" />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("75");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
  });

  it("fill bg-action-primary, track bg-border-subtle", () => {
    render(<Progress value={50} label="T" />);
    const track = screen.getByRole("progressbar");
    expect(track.className).toContain("bg-border-subtle");
    const fill = track.firstElementChild as HTMLElement;
    expect(fill.className).toContain("bg-action-primary");
  });
});
