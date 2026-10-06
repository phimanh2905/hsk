import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { createRef } from "react";
import { StudioGrid, type StudioGridApi, type GridStats } from "../studio-grid";
import { STUDIO_CHARS } from "@/content/hanzi-studio";

const REN = STUDIO_CHARS.find((c) => c.ch === "人")!; // 2 nét: SW, SE — đơn giản để vẽ

beforeAll(() => {
  Object.defineProperty(SVGElement.prototype, "getTotalLength", {
    configurable: true, value() { return 100; },
  });
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); cleanup(); });

/* vẽ 1 nét trên ink svg: xuống ở (x0,y0), kéo tới (x1,y1) — toạ độ client 0..300 */
function drawStroke(svg: SVGSVGElement, x0: number, y0: number, x1: number, y1: number) {
  const fire = (type: string, x: number, y: number) =>
    act(() => { svg.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y })); });
  fire("pointerdown", x0, y0);
  // 5 điểm giữa để qua ngưỡng pts.length >= 4 và min-distance 3px
  for (let i = 1; i <= 4; i++) fire("pointermove", x0 + ((x1 - x0) * i) / 5, y0 + ((y1 - y0) * i) / 5);
  fire("pointerup", x1, y1);
}

function setup(props?: { mode?: "watch" | "draw"; onStats?: (s: GridStats) => void }) {
  const apiRef = createRef<StudioGridApi>();
  const stats: GridStats[] = [];
  const utils = render(
    <StudioGrid
      char={REN}
      mode={props?.mode ?? "watch"}
      apiRef={apiRef}
      onStats={(s) => { stats.push(s); props?.onStats?.(s); }}
    />,
  );
  const ink = utils.container.querySelector('svg[aria-label="Bảng tự luyện viết"]')!;
  // jsdom getBoundingClientRect trả 0 — stub về hình vuông 300
  ink.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 300, height: 300, x: 0, y: 0, right: 300, bottom: 300, toJSON: () => ({}) }) as DOMRect;
  return { ...utils, apiRef, stats, ink: ink as SVGSVGElement };
}

describe("StudioGrid — watch", () => {
  it("nét mẫu: đủ path class todo; hint mờ khi bật setHint", () => {
    const { container, apiRef } = setup();
    const strokeSvg = container.querySelector('svg[role="img"]')!;
    expect(strokeSvg.querySelectorAll("path").length).toBe(2);
    strokeSvg.querySelectorAll("path").forEach((p) =>
      expect(p.getAttribute("class")).toBe("hz-st todo"));
    // Ruling controller 2026-10-05: hint chỉ tồn tại ở draw mode — mock hanzi.html:343.
    act(() => apiRef.current!.setHint(true));
    expect(strokeSvg.querySelectorAll("path").length).toBe(2); // watch mode KHÔNG hint (mock buildGrid: hintOn&&mode==='draw')
  });

  it("api.play phát tuần tự; stepPrev/stepNext reveal tĩnh", () => {
    const { container, apiRef } = setup();
    const paths = container.querySelectorAll('svg[role="img"] > path');
    act(() => apiRef.current!.play());
    expect(paths[0].getAttribute("class")).toBe("hz-st now");
    act(() => { vi.advanceTimersByTime(800); });
    expect(paths[0].getAttribute("class")).toBe("hz-st done");
    act(() => apiRef.current!.stepNext());
    expect(paths[1].getAttribute("class")).toBe("hz-st done");
    act(() => apiRef.current!.stepPrev());
    expect(paths[1].getAttribute("class")).toBe("hz-st todo");
  });
});

describe("StudioGrid — draw", () => {
  it("mode draw: nét mẫu thành done (mẫu tham chiếu); ink svg hiện", () => {
    const { container, ink } = setup({ mode: "draw" });
    container.querySelectorAll('svg[role="img"] > path').forEach((p) =>
      expect(p.getAttribute("class")).toBe("hz-st done"));
    expect((ink as SVGElement).classList.contains("hidden")).toBe(false);
  });

  it("vẽ đúng hướng → good + stats ok; sai hướng → bad", () => {
    const onStats = vi.fn();
    const { ink, stats } = setup({ mode: "draw", onStats });
    // nét 1 mong đợi SW: vẽ từ phải-trên xuống trái-dưới
    drawStroke(ink, 200, 60, 100, 200);
    const polylines = ink.querySelectorAll("polyline");
    expect(polylines.length).toBe(1);
    expect(polylines[0].getAttribute("class")).toBe("hz-ink-path good");
    expect(stats.at(-1)).toEqual({ done: 1, ok: 1, total: 2 });
    // nét 2 mong đợi SE: vẽ ngược (S→N) → bad
    drawStroke(ink, 100, 200, 200, 60);
    expect(ink.querySelectorAll("polyline")[1].getAttribute("class")).toBe("hz-ink-path bad");
    expect(stats.at(-1)).toEqual({ done: 2, ok: 1, total: 2 });
  });

  it("vẽ quá số nét không crash, chấm theo hướng nét mẫu cuối", () => {
    const { ink, stats } = setup({ mode: "draw" });
    drawStroke(ink, 200, 60, 100, 200); // nét 1 SW ✓
    drawStroke(ink, 100, 60, 200, 200); // nét 2 SE ✓ (vẽ đúng hết để idxNeo không can thiệp)
    drawStroke(ink, 200, 60, 100, 200); // nét thừa — d[idx] neo về nét cuối (SE), nhưng vẽ SW → bad
    expect(ink.querySelectorAll("polyline").length).toBe(3);
    expect(stats.at(-1)!.done).toBe(3);
    expect(stats.at(-1)!.ok).toBe(2);
  });

  it("undoInk/clearInk cập nhật stats; setHint hiện nét kế", () => {
    const { ink, apiRef, container } = setup({ mode: "draw" });
    drawStroke(ink, 200, 60, 100, 200);
    act(() => apiRef.current!.undoInk());
    expect(ink.querySelectorAll("polyline").length).toBe(0);
    act(() => apiRef.current!.setHint(true));
    const strokeSvg = container.querySelector('svg[role="img"]')!;
    expect(strokeSvg.lastElementChild!.getAttribute("class")).toBe("hz-st hint"); // nét 0 mẫu
    drawStroke(ink, 200, 60, 100, 200); // nét 0 đúng → hint chuyển sang nét 1
    expect(strokeSvg.lastElementChild!.getAttribute("d")).toBe(REN.p[1]);
    act(() => apiRef.current!.clearInk());
    expect(ink.querySelectorAll("polyline").length).toBe(0);
  });
});
