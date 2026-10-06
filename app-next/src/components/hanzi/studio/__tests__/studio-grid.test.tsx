import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { createRef } from "react";
import { StudioGrid, type StudioGridApi } from "../studio-grid";
import { loadWriterCharData } from "../writer-data";

/* Revised design (ruling 2026-10-07): watch KHÔNG dùng hanzi-writer — nét mẫu thật từ
   loadWriterCharData qua useStudioStrokes; draw dùng useWriter (quiz + outline hint). */
const DATA = { strokes: ["M 100 100 L 200 200", "M 200 100 L 100 200", "M 100 500 L 900 500"], medians: [[[0, 0]]] };

vi.mock("../writer-data", () => ({ loadWriterCharData: vi.fn(), clearWriterDataCache: vi.fn() }));

const writerFns = vi.hoisted(() => ({
  load: vi.fn(async () => true),
  startQuiz: vi.fn(),
  cancelQuiz: vi.fn(),
  showOutline: vi.fn(),
  setSpeed: vi.fn(),
  reset: vi.fn(),
}));
vi.mock("../use-writer", () => ({
  useWriter: () => writerFns,
}));

beforeAll(() => {
  Object.defineProperty(SVGElement.prototype, "getTotalLength", {
    configurable: true, value() { return 100; },
  });
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(loadWriterCharData).mockReset();
  vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
  writerFns.load.mockClear().mockResolvedValue(true);
  writerFns.startQuiz.mockClear();
  writerFns.cancelQuiz.mockClear();
  writerFns.showOutline.mockClear();
  writerFns.setSpeed.mockClear();
  writerFns.reset.mockClear();
});
afterEach(() => { vi.useRealTimers(); cleanup(); });

async function setup(props?: { sel?: { kind: "rad" | "char"; g: string }; mode?: "watch" | "draw" }) {
  const apiRef = createRef<StudioGridApi>();
  const utils = render(
    <StudioGrid
      sel={props?.sel ?? { kind: "rad", g: "水" }}
      mode={props?.mode ?? "watch"}
      apiRef={apiRef}
    />,
  );
  await act(async () => {}); // flush load promise + ready effect
  return { ...utils, apiRef };
}

const classes = (el: Element) => el.getAttribute("class") ?? "";

describe("StudioGrid — load", () => {
  it("load fail → ready=false và render null (cha hiện fallback)", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(null);
    const apiRef = createRef<StudioGridApi>();
    const { container } = render(<StudioGrid sel={{ kind: "rad", g: "龤" }} mode="watch" apiRef={apiRef} />);
    await act(async () => {});
    expect(apiRef.current?.ready).toBe(false);
    expect(container.querySelector('[data-od-id="tianzi-grid"]')).toBeNull();
    expect(writerFns.reset).toHaveBeenCalled(); // drop writer cũ gắn node detached
  });

  it("đổi chữ hợp lệ → invalid → hợp lệ: reset mỗi lần đổi, draw vẫn startQuiz sau", async () => {
    vi.mocked(loadWriterCharData)
      .mockResolvedValueOnce(DATA)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(DATA);
    const apiRef = createRef<StudioGridApi>();
    const { rerender } = render(<StudioGrid sel={{ kind: "rad", g: "水" }} mode="watch" apiRef={apiRef} />);
    await act(async () => {});
    expect(apiRef.current?.ready).toBe(true);
    const resetsAfterFirst = writerFns.reset.mock.calls.length; // 1 (lần đổi sel đầu)
    rerender(<StudioGrid sel={{ kind: "rad", g: "龤" }} mode="watch" apiRef={apiRef} />);
    await act(async () => {});
    expect(apiRef.current?.ready).toBe(false);
    expect(writerFns.reset.mock.calls.length).toBeGreaterThanOrEqual(resetsAfterFirst + 1); // invalid → reset (effect đầu + nhánh fail)
    rerender(<StudioGrid sel={{ kind: "char", g: "没" }} mode="watch" apiRef={apiRef} />);
    await act(async () => {});
    expect(apiRef.current?.ready).toBe(true);
    expect(writerFns.reset.mock.calls.length).toBeGreaterThan(resetsAfterFirst + 1); // valid → reset lại
    // quay lại draw: writer đã reset → startQuiz vẫn được gọi (create lại)
    rerender(<StudioGrid sel={{ kind: "char", g: "没" }} mode="draw" apiRef={apiRef} />);
    await act(async () => {});
    expect(writerFns.startQuiz).toHaveBeenCalledTimes(1);
  });

  it("load xong: ready=true, sample svg 1024 chứa N path stroke-width 44; watch tự phát 1 lần", async () => {
    const { container, apiRef } = await setup();
    expect(apiRef.current?.ready).toBe(true);
    const strokeSvg = container.querySelector('svg[role="img"]')!;
    expect(strokeSvg.getAttribute("viewBox")).toBe("0 0 1024 1024");
    const paths = strokeSvg.querySelectorAll("path");
    expect(paths.length).toBe(3);
    paths.forEach((p) => expect(p.getAttribute("stroke-width")).toBe("44"));
    // auto-play đã khởi động: nét 0 đang animate, không cần gọi api.play
    expect(classes(paths[0])).toBe("hz-st now");
    act(() => { vi.advanceTimersByTime(780 * 3); });
    const done = strokeSvg.querySelectorAll("path.done");
    expect(done.length).toBe(3);
  });
});

describe("StudioGrid — mode switch (draw qua useWriter)", () => {
  it("watch→draw: startQuiz + showOutline(hint); draw→watch: cancelQuiz", async () => {
    const { apiRef, rerender } = await setup({ mode: "watch" });
    expect(writerFns.startQuiz).not.toHaveBeenCalled();
    act(() => apiRef.current!.setHint(true)); // watch: chỉ nhớ flag
    rerender(<StudioGrid sel={{ kind: "rad", g: "水" }} mode="draw" apiRef={apiRef} />);
    await act(async () => {});
    expect(writerFns.startQuiz).toHaveBeenCalledTimes(1);
    expect(writerFns.showOutline).toHaveBeenCalledWith(true, { instant: true });
    rerender(<StudioGrid sel={{ kind: "rad", g: "水" }} mode="watch" apiRef={apiRef} />);
    await act(async () => {});
    expect(writerFns.cancelQuiz).toHaveBeenCalledTimes(1);
  });

  it("watch→draw sau playback xong: reset nét mẫu (không còn .done) + vẫn startQuiz", async () => {
    const { container, apiRef, rerender } = await setup({ mode: "watch" });
    act(() => { vi.advanceTimersByTime(780 * 3 + 200); }); // playback xong: cả 3 nét .done
    const strokeSvg = container.querySelector('svg[role="img"]')!;
    expect(strokeSvg.querySelectorAll("path.done").length).toBe(3);
    rerender(<StudioGrid sel={{ kind: "rad", g: "水" }} mode="draw" apiRef={apiRef} />);
    await act(async () => {});
    expect(writerFns.startQuiz).toHaveBeenCalledTimes(1);
    expect(writerFns.showOutline).toHaveBeenCalledWith(false, { instant: true });
    const paths = strokeSvg.querySelectorAll("path");
    expect(paths.length).toBe(3);
    paths.forEach((p) => {
      expect(classes(p)).not.toContain("done");
      expect(classes(p)).toBe("hz-st todo"); // reset về nền mờ
    });
  });

  it("setHint(false) ở draw → showOutline(false); setSpeed đẩy cả 2 renderer", async () => {
    const { apiRef } = await setup({ mode: "draw" });
    await act(async () => {}); // ready effect: startQuiz + showOutline(false)
    expect(writerFns.startQuiz).toHaveBeenCalledTimes(1);
    act(() => apiRef.current!.setHint(false));
    expect(writerFns.showOutline).toHaveBeenCalledWith(false, { instant: false });
    act(() => apiRef.current!.setSpeed(1.5));
    expect(writerFns.setSpeed).toHaveBeenCalledWith(1.5);
  });
});

describe("StudioGrid — step (watch, useStudioStrokes)", () => {
  it("stepNext reveal nét kế; stepPrev ẩn lại", async () => {
    const { container, apiRef } = await setup();
    const paths = container.querySelectorAll('svg[role="img"] > path');
    // auto-play đang chạy: qua 780ms → nét 0 done, nét 1 "now" (stepRef=1)
    act(() => { vi.advanceTimersByTime(780); });
    expect(classes(paths[1])).toBe("hz-st now");
    act(() => apiRef.current!.stepNext()); // stepRef=2
    expect(classes(paths[2])).toBe("hz-st done");
    act(() => apiRef.current!.stepPrev()); // stepRef=1 — nét 2 ẩn lại
    expect(classes(paths[2])).toBe("hz-st todo");
    expect(classes(paths[0])).toBe("hz-st done");
  });
});
