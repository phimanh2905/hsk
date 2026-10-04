import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { StrokeStudio } from "../stroke-studio";

afterEach(cleanup);

beforeEach(() => {
  // jsdom thiếu speechSynthesis — stub tối thiểu cho useTts
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [], speaking: false, pending: false },
  });
});

describe("StrokeStudio", () => {
  it("từ 1 chữ có data (爱): 10 nét trong order list, py-pill hiện ài", () => {
    const { container } = render(<StrokeStudio word="爱" onClose={() => {}} />);
    expect(container.textContent).toContain("ài");
    expect(container.textContent).toContain("Bộ Trảo");
    expect(container.querySelectorAll("[data-testid='order-row']")).toHaveLength(10);
    expect(container.textContent).toContain("Phát lại");
  });
  it("từ nhiều chữ (爱好): 2 tab theo chữ, tab active có aria-pressed", () => {
    const { container } = render(<StrokeStudio word="爱好" onClose={() => {}} />);
    const tabs = container.querySelectorAll("[data-testid='char-tab']");
    expect(tabs).toHaveLength(2);
    expect(tabs[0].getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(tabs[1]);
    expect(tabs[1].getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll("[data-testid='order-row']")).toHaveLength(6); // 好 6 nét
  });
  it("chữ không có data: nodata rad-line + order list", () => {
    const { container } = render(<StrokeStudio word="吗" onClose={() => {}} />);
    expect(container.textContent).toContain("sẽ được bổ sung dữ liệu bút thuận");
    expect(container.textContent).toContain("Chưa có dữ liệu nét cho chữ này.");
  });
  it("speed-seg aria-pressed chuyển; click order-row không văng", () => {
    const { container } = render(<StrokeStudio word="爱" onClose={() => {}} />);
    const seg = container.querySelectorAll("[data-testid='speed-btn']");
    expect(seg).toHaveLength(3);
    fireEvent.click(seg[2]);
    expect(seg[2].getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(container.querySelector("[data-testid='order-row']")!);
  });
  it("đổi chữ reset tốc độ về 1x (seg khớp playback)", () => {
    const { container } = render(<StrokeStudio word="爱好" onClose={() => {}} />);
    fireEvent.click(container.querySelectorAll("[data-testid='speed-btn']")[2]); // 1.5x
    expect(container.querySelectorAll("[data-testid='speed-btn']")[2].getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(container.querySelectorAll("[data-testid='char-tab']")[1]);
    const seg = container.querySelectorAll("[data-testid='speed-btn']");
    expect(seg[1].getAttribute("aria-pressed")).toBe("true"); // về 1x
    expect(seg[2].getAttribute("aria-pressed")).toBe("false");
  });
  it("nút đóng gọi onClose", () => {
    const onClose = vi.fn();
    const { container } = render(<StrokeStudio word="爱" onClose={onClose} />);
    fireEvent.click(container.querySelector("[aria-label='Đóng bảng nét chữ']")!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

/* Auto-phát nét (mock .sheet: selectStroke() → playAll()). Hai góc kiểm:
   - spy: đếm lần StrokeStudio gọi api.play() (không phụ thuộc animation),
   - thật: drive rAF thủ công rồi xem nét có tự hiện (dashoffset 0).
   Mock bọc hook thật (importOriginal) nên hành vi các test khác giữ nguyên. */
const playSpy = vi.hoisted(() => vi.fn());
vi.mock("@/components/hanzi/stroke-player", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/hanzi/stroke-player")>();
  return {
    ...actual,
    useStrokePlayer: (...args: Parameters<typeof actual.useStrokePlayer>) => {
      const api = actual.useStrokePlayer(...args);
      return { ...api, play: () => { playSpy(); api.play(); } };
    },
  };
});

let rafQueue: { cb: (ts: number) => void; id: number }[] = [];
let rafId = 0;
function stubRaf() {
  rafQueue = [];
  vi.stubGlobal("requestAnimationFrame", (cb: (ts: number) => void) => {
    rafQueue.push({ cb, id: ++rafId });
    return rafId;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
}
function flushRaf(ts: number) {
  const q = rafQueue;
  rafQueue = [];
  q.forEach(({ cb }) => cb(ts));
}

describe("StrokeStudio auto-phát nét", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("gọi play() khi mở bảng và khi đổi tab chữ (không cần bấm nút)", async () => {
    playSpy.mockClear();
    const { container } = render(<StrokeStudio word="爱好" onClose={() => {}} />);
    await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(1)); // mở bảng → tự phát

    playSpy.mockClear();
    fireEvent.click(container.querySelectorAll("[data-testid='char-tab']")[1]);
    await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(1)); // đổi chữ → tự phát lại

    playSpy.mockClear();
    fireEvent.click(container.querySelectorAll("[data-testid='char-tab']")[0]);
    await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(1));
  });

  it("nét tự hiện hết sau khi mở bảng (không bấm 'Phát lại')", () => {
    stubRaf();
    const { container } = render(<StrokeStudio word="爱" onClose={() => {}} />);
    const strokes = container.querySelectorAll("path[stroke], polyline[stroke]") as NodeListOf<SVGElement>;
    expect(strokes.length).toBeGreaterThan(0);
    expect(strokes[0].style.strokeDashoffset).toBe("1"); // mới mount, chưa flush frame

    for (let ts = 0; ts <= 8000; ts += 20) flushRaf(ts); // 10 nét × (420 + 90)ms
    strokes.forEach((p) => expect(p.style.strokeDashoffset).toBe("0"));
  });
});
