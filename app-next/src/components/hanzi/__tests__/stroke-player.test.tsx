import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { useRef } from "react";
import { useStrokePlayer } from "../stroke-player";
import { STROKE_DATA, genericStrokes } from "@/content/hanzi-strokes";

let rafQueue: { cb: (ts: number) => void; id: number }[] = [];
let rafId = 0;
beforeEach(() => {
  rafQueue = [];
  vi.stubGlobal("requestAnimationFrame", (cb: (ts: number) => void) => {
    rafQueue.push({ cb, id: ++rafId });
    return rafId;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

function flush(ts: number) {
  const q = rafQueue; rafQueue = [];
  q.forEach(({ cb }) => cb(ts));
}

function Harness({ char }: { char: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const player = useStrokePlayer(ref, char);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => player.play()}>play</button>
      <button onClick={() => player.showArrows(true)}>arrows</button>
      <button onClick={() => player.setZoom(true)}>zoom</button>
    </div>
  );
}

describe("StrokePlayer (G2)", () => {
  it("你 có 7 polyline; nét ẩn ban đầu (dashoffset 1)", () => {
    const { container } = render(<Harness char="你" />);
    expect(STROKE_DATA["你"]).toHaveLength(7);
    const pls = container.querySelectorAll("polyline");
    expect(pls).toHaveLength(7);
    expect((pls[0] as SVGElement).style.strokeDashoffset).toBe("1");
  });
  it("play: nét 1 xong ở 420ms (dashoffset 0), nét 2 chưa bắt đầu trước gap", () => {
    const { container } = render(<Harness char="你" />);
    (container.querySelector("button") as HTMLButtonElement).click();
    flush(0);                    // frame đầu: k = 0
    flush(100);
    const pls = container.querySelectorAll("polyline") as NodeListOf<SVGElement>;
    expect(pls[0].style.strokeDashoffset).not.toBe("1");
    flush(420);                  // nét 1 xong (k >= 1), bắt đầu nghỉ GAP
    expect(pls[0].style.strokeDashoffset).toBe("0");
    flush(470);                  // giữa GAP 90ms — nét 2 chưa vẽ
    expect(pls[1].style.strokeDashoffset).toBe("1");
    flush(520);                  // 420 + 90 = 510 → nét 2 bắt đầu
    expect(pls[1].style.strokeDashoffset).not.toBe("1");
  });
  it("chữ không có data → generic 4 nét; showArrows gắn marker; zoom đổi viewBox", () => {
    expect(genericStrokes()).toHaveLength(4);
    const { container } = render(<Harness char="好" />);
    expect(container.querySelectorAll("polyline")).toHaveLength(4);
    (container.querySelectorAll("button")[1] as HTMLButtonElement).click();
    expect(container.querySelector("polyline")!.getAttribute("marker-end")).toMatch(/url\(#nhai-hw-.*-arrow\)/);
    (container.querySelectorAll("button")[2] as HTMLButtonElement).click();
    expect(container.querySelector("svg")!.getAttribute("viewBox")).not.toBe("0 0 100 100");
  });
});
