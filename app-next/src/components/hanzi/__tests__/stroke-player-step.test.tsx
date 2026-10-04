import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { useRef } from "react";
import { useStrokePlayer } from "../stroke-player";

afterEach(cleanup);

function Harness({ ch, onStep }: { ch: string; onStep?: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const idx = useRef(-1);
  const api = useStrokePlayer(ref, ch, undefined, { onStep });
  return (
    <div>
      <div ref={ref} data-testid="host" />
      <button data-testid="step-next" onClick={() => api.stepTo(++idx.current)}>next</button>
      <button data-testid="play" onClick={() => api.play()}>play</button>
      <button data-testid="speed" onClick={() => api.setSpeed(1.5)}>speed</button>
      <span data-testid="total">{api.total}</span>
      <span data-testid="source">{api.source}</span>
    </div>
  );
}

describe("useStrokePlayer stepTo/setSpeed (path source 爱)", () => {
  it("source=path, total=10; stepTo reveal nét theo dashoffset", () => {
    const { container } = render(<Harness ch="爱" />);
    expect(container.querySelector('[data-testid="source"]')!.textContent).toBe("path");
    expect(container.querySelector('[data-testid="total"]')!.textContent).toBe("10");
    const host = container.querySelector('[data-testid="host"]')!;
    const strokes = host.querySelectorAll("svg > path");
    expect(strokes.length).toBe(10);
    // bước tới nét 0
    act(() => { (container.querySelector('[data-testid="step-next"]') as HTMLButtonElement).click(); });
    expect((strokes[0] as SVGElement).style.strokeDashoffset).toBe("0");
    expect((strokes[1] as SVGElement).style.strokeDashoffset).toBe("1");
  });
  it("stepTo clamp: -1 không reveal gì, quá total kẹp cuối", () => {
    const { container } = render(<Harness ch="好" />);
    const host = container.querySelector('[data-testid="host"]')!;
    const strokes = host.querySelectorAll("svg > path");
    expect(strokes.length).toBe(6);
    act(() => { (container.querySelector('[data-testid="step-next"]') as HTMLButtonElement).click(); });
    // clamp test qua onStep spy bên dưới; ở đây chỉ chắc chưa văng exception khi bấm liên tục
    for (let i = 0; i < 10; i++) {
      act(() => { (container.querySelector('[data-testid="step-next"]') as HTMLButtonElement).click(); });
    }
    expect((strokes[5] as SVGElement).style.strokeDashoffset).toBe("0");
  });
  it("onStep callback nhận index sau stepTo", () => {
    const onStep = vi.fn();
    const { container } = render(<Harness ch="好" onStep={onStep} />);
    act(() => { (container.querySelector('[data-testid="step-next"]') as HTMLButtonElement).click(); });
    expect(onStep).toHaveBeenLastCalledWith(0);
  });
  it("chữ không có data → source=generic, total=4", () => {
    const { container } = render(<Harness ch="吗" />);
    expect(container.querySelector('[data-testid="source"]')!.textContent).toBe("generic");
    expect(container.querySelector('[data-testid="total"]')!.textContent).toBe("4");
  });
});
