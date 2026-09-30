import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Donut } from "../donut";
import { SevenDayBars } from "../seven-day-bars";

describe("Donut", () => {
  it("SVG 4 lát với dasharray/offset từ donutSlices, legend tổng % = 100", () => {
    const { container } = render(<Donut dist={{ forgot: 8, hard: 5, good: 14, easy: 3 }} footer="Tổng: 30 lượt · Tháng này: 30 lượt" />);
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(5); // 1 nền + 4 lát
    expect(container.textContent).toContain("Quên rồi — 8 (27%)");
    expect(container.textContent).toContain("Tổng: 30 lượt · Tháng này: 30 lượt");
  });
  it("dist rỗng → chỉ circle nền, không lát", () => {
    const { container } = render(<Donut dist={{ forgot: 0, hard: 0, good: 0, easy: 0 }} />);
    expect(container.querySelectorAll("circle").length).toBe(1);
  });
});

describe("SevenDayBars", () => {
  it("7 cột, nhãn T3…T2, cột cuối hôm nay màu chính", () => {
    const { container } = render(<SevenDayBars last7={[3, 5, 0, 8, 12, 4, 0]} />);
    const bars = container.querySelectorAll("[data-bar]");
    expect(bars).toHaveLength(7);
    expect(bars[6].getAttribute("style")).toContain("var(--nhai-main)");
    expect(bars[0].getAttribute("style")).toContain("var(--nhai-soft)");
    expect(container.textContent).toContain("T3");
    expect(container.textContent).toContain("T2");
  });
});
