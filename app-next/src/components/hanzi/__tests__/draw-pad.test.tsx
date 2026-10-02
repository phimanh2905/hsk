import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DrawPad } from "../draw-pad";

const ctxStub = {
  setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
  stroke() {}, fill() {}, arc() {}, fillText() {},
} as unknown as CanvasRenderingContext2D;

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctxStub);
});

function pointer(el: Element, type: string, x = 10, y = 10) {
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
}

describe("DrawPad (canvas imperative)", () => {
  it("chưa vẽ → undo/clear disabled, gợi ý ẩn; vẽ 1 nét → gợi ý 你/好/学 hiện", () => {
    const onPick = vi.fn();
    const { container } = render(<DrawPad onPick={onPick} />);
    const canvas = container.querySelector("canvas")!;
    expect(screen.getByText("Xoá nét cuối")).toBeDisabled();
    expect(screen.getByText("Xoá hết")).toBeDisabled();
    pointer(canvas, "pointerdown", 20, 20);
    pointer(canvas, "pointermove", 60, 60);
    pointer(canvas, "pointerup", 60, 60);
    expect(screen.getByText("Xoá nét cuối")).toBeEnabled();
    expect(screen.getByText(/Có thể là:/)).toBeInTheDocument();
  });
  it("bấm gợi ý 你 → onPick('你'); Xoá hết → disabled trở lại", () => {
    const onPick = vi.fn();
    const { container } = render(<DrawPad onPick={onPick} />);
    const canvas = container.querySelector("canvas")!;
    pointer(canvas, "pointerdown"); pointer(canvas, "pointerup");
    screen.getByText("你").click();
    expect(onPick).toHaveBeenCalledWith("你");
    screen.getByText("Xoá hết").click();
    expect(screen.getByText("Xoá hết")).toBeDisabled();
  });
});
