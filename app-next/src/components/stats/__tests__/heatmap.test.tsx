import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Heatmap } from "../heatmap";

describe("Heatmap (F2)", () => {
  it("12 cột tháng, ô có title đúng format, ô có XP màu mức alpha", () => {
    const { container } = render(<Heatmap real={{ "2026-09-30": 6 }} now={new Date(2026, 8, 30)} />);
    expect(container.textContent).toContain("12 tháng gần đây");
    expect(container.textContent).toContain("Tháng 9");
    const cells = container.querySelectorAll("[data-heat-cell]");
    expect(cells.length).toBeGreaterThan(300); // 12 tháng × 28–31 ngày
    const hot = Array.from(cells).find((c) => c.getAttribute("title") === "Tháng 9 ngày 30: Xp 6");
    expect(hot).toBeDefined();
    expect(hot!.className).toContain("bg-action-primary/60"); // xp 6 → mức alpha 60%
  });
  it("real-only: chỉ ngày có real mới khác 0, còn lại bg-border-subtle (không còn mock seeded)", () => {
    const { container } = render(
      <Heatmap real={{ "2026-09-30": 6, "2026-08-15": 1 }} now={new Date(2026, 8, 30)} />,
    );
    const cells = Array.from(container.querySelectorAll("[data-heat-cell]"));
    const lit = cells.filter((c) => !c.className.includes("bg-border-subtle"));
    expect(lit).toHaveLength(2);
    expect(cells.find((c) => c.getAttribute("title") === "Tháng 9 ngày 30: Xp 6")!.className).toContain("bg-action-primary/60");
    expect(cells.find((c) => c.getAttribute("title") === "Tháng 8 ngày 15: Xp 1")!.className).toContain("bg-action-primary/20");
  });
  it("không có real → tất cả ô = 0 (bg-border-subtle), title vẫn Xp 0", () => {
    const { container } = render(<Heatmap real={null} now={new Date(2026, 8, 30)} />);
    const cells = Array.from(container.querySelectorAll("[data-heat-cell]"));
    expect(cells.length).toBeGreaterThan(0);
    for (const c of cells) {
      expect(c.className).toContain("bg-border-subtle");
      expect(c.getAttribute("title")).toMatch(/^Tháng \d+ ngày \d+: Xp 0$/);
    }
  });
});
