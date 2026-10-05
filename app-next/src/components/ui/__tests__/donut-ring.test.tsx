import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DonutRing } from "../donut-ring";

describe("DonutRing", () => {
  it("tính đúng stroke-dashoffset theo tỉ lệ value/total", () => {
    const { container } = render(
      <DonutRing value={61} total={100} size={96} strokeWidth={9} label="Tiến độ" />
    );
    const arcs = container.querySelectorAll("circle");
    const arc = arcs[1] as SVGCircleElement; // circle thứ 2 là arc màu
    const r = (96 - 9) / 2;
    const c = 2 * Math.PI * r;
    expect(Number(arc.getAttribute("stroke-dasharray"))).toBeCloseTo(c, 1);
    expect(Number(arc.getAttribute("stroke-dashoffset"))).toBeCloseTo(c * 0.39, 1);
  });
  it("aria-label mô tả giá trị", () => {
    render(<DonutRing value={185} total={300} label="Đã nhớ 185 trên 300 từ, đạt 61 phần trăm" />);
    expect(screen.getByRole("img", { name: "Đã nhớ 185 trên 300 từ, đạt 61 phần trăm" })).toBeInTheDocument();
  });
  it("clamp: value > total không vượt vòng đầy; total=0 → offset = chu vi (rỗng)", () => {
    const { container } = render(<DonutRing value={500} total={300} size={96} strokeWidth={9} label="x" />);
    const arc = container.querySelectorAll("circle")[1] as SVGCircleElement;
    expect(Number(arc.getAttribute("stroke-dashoffset"))).toBe(0);
    const { container: c2 } = render(<DonutRing value={5} total={0} size={96} strokeWidth={9} label="y" />);
    const arc2 = c2.querySelectorAll("circle")[1] as SVGCircleElement;
    const r = (96 - 9) / 2;
    expect(Number(arc2.getAttribute("stroke-dashoffset"))).toBeCloseTo(2 * Math.PI * r, 1);
  });
  it("render children (text giữa ring)", () => {
    render(
      <DonutRing value={1} total={2} label="z">
        <text x="48" y="46">50%</text>
      </DonutRing>
    );
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});
