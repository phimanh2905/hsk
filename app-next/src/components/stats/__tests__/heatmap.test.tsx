import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Heatmap } from "../heatmap";

describe("Heatmap (F2)", () => {
  it("12 cột tháng, ô có title đúng format, ô có XP màu mức đỏ", () => {
    const { container } = render(<Heatmap real={{ "2026-09-30": 6 }} now={new Date(2026, 8, 30)} />);
    expect(container.textContent).toContain("12 tháng gần đây");
    expect(container.textContent).toContain("Tháng 9");
    const cells = container.querySelectorAll("[data-heat-cell]");
    expect(cells.length).toBeGreaterThan(300); // 12 tháng × 28–31 ngày
    const hot = Array.from(cells).find((c) => c.getAttribute("title") === "Tháng 9 ngày 30: Xp 6");
    expect(hot).toBeDefined();
    expect(hot!.className).toContain("bg-action-primary/60"); // xp 6 → mức alpha 60%
  });
  it("không có real → seeded, ô vẫn có title Xp", () => {
    const { container } = render(<Heatmap real={null} now={new Date(2026, 8, 30)} />);
    expect(container.querySelector("[data-heat-cell]")).not.toBeNull();
    expect(container.querySelector("[data-heat-cell]")!.getAttribute("title")).toMatch(/^Tháng \d+ ngày \d+: Xp \d+$/);
  });
});
