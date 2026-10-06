import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { useRef } from "react";
import { useStudioStrokes } from "../use-studio-strokes";
import { STUDIO_CHARS } from "@/content/hanzi-studio";

const AI = STUDIO_CHARS.find((c) => c.ch === "爱")!; // 10 nét

/* jsdom không có getTotalLength — hook dùng nó để set dasharray/offset */
beforeAll(() => {
  Object.defineProperty(SVGElement.prototype, "getTotalLength", {
    configurable: true,
    value() { return 100; },
  });
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); cleanup(); });

function Harness({ char = AI, onPlayEnd }: { char?: typeof AI; onPlayEnd?: () => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const api = useStudioStrokes(svgRef, char, { onPlayEnd });
  return (
    <div>
      <svg ref={svgRef} data-testid="strokes" />
      <button data-testid="build" onClick={() => api.build()}>build</button>
      <button data-testid="play" onClick={() => api.playAll()}>play</button>
      <button data-testid="step-to3" onClick={() => api.stepTo(3)}>step-to3</button>
      <button data-testid="step-by1" onClick={() => api.stepBy(1)}>step-by1</button>
      <button data-testid="speed2" onClick={() => api.setSpeed(2)}>speed2</button>
      <button data-testid="hint1" onClick={() => api.showHint(1)}>hint1</button>
      <span data-testid="total">{api.total}</span>
    </div>
  );
}

const classes = (el: Element) => el.getAttribute("class") ?? "";

describe("useStudioStrokes", () => {
  it("build: đủ path, toàn bộ todo; total sync theo char", () => {
    const { container } = render(<Harness />);
    expect(container.querySelector('[data-testid="total"]')!.textContent).toBe("10");
    const paths = container.querySelectorAll('[data-testid="strokes"] > path');
    expect(paths.length).toBe(10);
    paths.forEach((p) => expect(classes(p)).toBe("hz-st todo"));
  });

  it("playAll: nét lần lượt todo → now → done, hết chữ gọi onPlayEnd", () => {
    const onPlayEnd = vi.fn();
    const { container } = render(<Harness onPlayEnd={onPlayEnd} />);
    const paths = container.querySelectorAll('[data-testid="strokes"] > path');
    act(() => { (container.querySelector('[data-testid="play"]') as HTMLButtonElement).click(); });
    expect(classes(paths[0])).toBe("hz-st now"); // đang animate nét 0
    act(() => { vi.advanceTimersByTime(780); }); // 720ms + 60ms đệm (speed 1)
    expect(classes(paths[0])).toBe("hz-st done");
    expect(classes(paths[1])).toBe("hz-st now");
    act(() => { vi.advanceTimersByTime(780 * 9); }); // đủ cho 9 nét còn lại
    paths.forEach((p) => expect(classes(p)).toBe("hz-st done"));
    expect(onPlayEnd).toHaveBeenCalledTimes(1);
  });

  it("setSpeed(2) rút ngắn duration (360ms + 60ms)", () => {
    const { container } = render(<Harness />);
    const paths = container.querySelectorAll('[data-testid="strokes"] > path');
    act(() => {
      (container.querySelector('[data-testid="speed2"]') as HTMLButtonElement).click();
      (container.querySelector('[data-testid="play"]') as HTMLButtonElement).click();
    });
    act(() => { vi.advanceTimersByTime(420); });
    expect(classes(paths[0])).toBe("hz-st done");
  });

  it("stepTo/stepBy tĩnh: reveal tới i, không timer", () => {
    const { container } = render(<Harness />);
    const paths = container.querySelectorAll('[data-testid="strokes"] > path');
    act(() => { (container.querySelector('[data-testid="step-to3"]') as HTMLButtonElement).click(); });
    expect(classes(paths[2])).toBe("hz-st done");
    expect(classes(paths[3])).toBe("hz-st todo");
    act(() => { (container.querySelector('[data-testid="step-by1"]') as HTMLButtonElement).click(); });
    expect(classes(paths[3])).toBe("hz-st done");
  });

  it("showHint: path class hint thêm vào cuối; clearHint xoá", () => {
    const { container } = render(<Harness />);
    act(() => { (container.querySelector('[data-testid="hint1"]') as HTMLButtonElement).click(); });
    const strokes = container.querySelector('[data-testid="strokes"]')!;
    expect(strokes.children.length).toBe(11); // 10 nét + 1 hint
    expect(classes(strokes.children[10])).toBe("hz-st hint");
    act(() => { (container.querySelector('[data-testid="build"]') as HTMLButtonElement).click(); });
    expect(strokes.children.length).toBe(10); // build xoá cả hint
  });

  it("đang phát mà build (đổi chữ) → timer cũ huỷ, không văng", () => {
    const { container } = render(<Harness />);
    act(() => { (container.querySelector('[data-testid="play"]') as HTMLButtonElement).click(); });
    act(() => { (container.querySelector('[data-testid="build"]') as HTMLButtonElement).click(); });
    expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
  });
});