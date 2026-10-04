import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StationNode } from "../station-node";

describe("StationNode", () => {
  it("done: aria-label đầy đủ, không pulse", () => {
    render(<StationNode state="done" label="Trạm 1: Chào hỏi — hoàn thành" onClick={() => {}} />);
    const node = screen.getByRole("button", { name: "Trạm 1: Chào hỏi — hoàn thành" });
    expect(node.className).not.toContain("hz-node-pulse");
    expect(node.className).toContain("border-jade");
  });
  it("active: có class pulse, disabled animation qua CSS reduced-motion (class tĩnh)", () => {
    render(<StationNode state="active" label="Trạm 4 — đang học" />);
    expect(screen.getByRole("button").className).toContain("hz-node-pulse");
  });
  it("locked: nền muted", () => {
    render(<StationNode state="locked" label="Trạm 5 — đang khóa" />);
    expect(screen.getByRole("button").className).toContain("bg-surface-muted");
  });
  it("milestone: diamond 45° + trophy, vẫn bấm được", async () => {
    const onClick = vi.fn();
    render(<StationNode state="locked" milestone label="Milestone — đang khóa" onClick={onClick} />);
    const node = screen.getByRole("button", { name: "Milestone — đang khóa" });
    expect(node.className).toContain("rotate-45");
    await userEvent.click(node);
    expect(onClick).toHaveBeenCalled();
  });
});
