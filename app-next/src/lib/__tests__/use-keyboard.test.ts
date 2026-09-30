import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboard } from "../use-keyboard";

function press(key: string, target?: Partial<HTMLElement>) {
  const e = new KeyboardEvent("keydown", { key, bubbles: true });
  Object.defineProperty(e, "target", { value: target ?? window });
  window.dispatchEvent(e);
}

describe("useKeyboard", () => {
  it("gọi handler theo key", () => {
    const onArrowLeft = vi.fn();
    renderHook(() => useKeyboard({ ArrowLeft: onArrowLeft }));
    press("ArrowLeft");
    expect(onArrowLeft).toHaveBeenCalledTimes(1);
  });
  it("bỏ qua phím khi đang focus input", () => {
    const onA = vi.fn();
    renderHook(() => useKeyboard({ a: onA }));
    press("a", { tagName: "INPUT", isContentEditable: false });
    expect(onA).not.toHaveBeenCalled();
  });
});
