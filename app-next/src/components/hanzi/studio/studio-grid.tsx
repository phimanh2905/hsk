// app-next/src/components/hanzi/studio/studio-grid.tsx
"use client";

/* Ô thiên tự — port .grid-box + khối vẽ/chấm điểm của opendesign_hsk/hanzi.html.
   Nét mẫu (watch) qua useStudioStrokes; mực vẽ imperative như mock (polyline append).
   Scoring qua lib/hanzi/stroke-quiz (pure); thống kê đẩy lên workbench qua onStats. */
import { useCallback, useEffect, useImperativeHandle, useRef } from "react";
import type { StudioChar } from "@/content/hanzi-studio";
import { matchStroke, type InkPoint } from "@/lib/hanzi/stroke-quiz";
import { useStudioStrokes } from "./use-studio-strokes";

const NS = "http://www.w3.org/2000/svg";

export type GridStats = { done: number; ok: number; total: number };

export type StudioGridApi = {
  play: () => void;
  stepPrev: () => void;
  stepNext: () => void;
  setSpeed: (m: number) => void;
  clearInk: () => void;
  undoInk: () => void;
  setHint: (on: boolean) => void;
};

export function StudioGrid({
  char,
  mode,
  apiRef,
  onStats,
}: {
  char: StudioChar;
  mode: "watch" | "draw";
  apiRef?: React.Ref<StudioGridApi>;
  onStats?: (s: GridStats) => void;
}) {
  const strokeSvgRef = useRef<SVGSVGElement | null>(null);
  const inkSvgRef = useRef<SVGSVGElement | null>(null);
  const strokesRef = useRef<{ el: SVGPolylineElement; ok: boolean }[]>([]);
  const drawingRef = useRef<{ el: SVGPolylineElement; pts: InkPoint[] } | null>(null);
  const hintOnRef = useRef(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const charRef = useRef(char);
  charRef.current = char;
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  const api = useStudioStrokes(strokeSvgRef, char);

  const emitStats = useCallback(() => {
    const done = strokesRef.current.length;
    const ok = strokesRef.current.filter((s) => s.ok).length;
    onStatsRef.current?.({ done, ok, total: charRef.current.n });
  }, []);

  const showHint = useCallback(() => {
    // hint chỉ tồn tại ở draw mode (mock buildGrid: if(hintOn&&mode==='draw'))
    if (!hintOnRef.current || modeRef.current !== "draw") return;
    const total = charRef.current.p.length;
    const n = strokesRef.current.length;
    if (n >= total) { api.clearHint(); return; } // mock: đủ nét thì không hint
    api.showHint(Math.min(n, total - 1));
  }, [api]);

  const clearInk = useCallback(() => {
    if (inkSvgRef.current) inkSvgRef.current.innerHTML = "";
    strokesRef.current = [];
    drawingRef.current = null;
    showHint();
    emitStats();
  }, [showHint, emitStats]);

  const undoInk = useCallback(() => {
    strokesRef.current.pop()?.el.remove();
    showHint();
    emitStats();
  }, [showHint, emitStats]);

  useImperativeHandle(apiRef, () => ({
    play: () => { if (modeRef.current === "watch") api.playAll(); },
    stepPrev: () => api.stepBy(-1),
    stepNext: () => api.stepBy(1),
    setSpeed: api.setSpeed,
    clearInk,
    undoInk,
    setHint: (on: boolean) => {
      hintOnRef.current = on;
      if (on) showHint();
      else api.clearHint();
    },
  }), [api, clearInk, undoInk, showHint]);

  /* Đổi chữ: dựng lại nét mẫu, xoá mực; draw mode hiện cả chữ làm mẫu + hint nếu bật */
  useEffect(() => {
    api.build();
    if (inkSvgRef.current) inkSvgRef.current.innerHTML = "";
    strokesRef.current = [];
    drawingRef.current = null;
    emitStats();
    if (modeRef.current === "draw") {
      // stepTo(i) reveal 0..i-1 — dùng n để hiện đủ n nét mẫu
      api.stepTo(char.p.length);
      showHint();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char]);

  /* Đổi mode (bỏ lần mount đầu — mock select() khởi tạo im lặng) */
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    api.stop();
    if (mode === "watch") {
      clearInk();
      api.stepTo(-1);
      api.playAll();
    } else {
      api.stepTo(char.p.length);
      showHint();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /* --- vẽ tay (port pointer handlers của mock) --- */
  const svgPoint = (e: MouseEvent): InkPoint => {
    const r = inkSvgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 300, y: ((e.clientY - r.top) / r.height) * 300 };
  };

  const onPointerDown = useCallback((e: Event) => {
    if (modeRef.current !== "draw") return;
    const ev = e as PointerEvent;
    try { inkSvgRef.current?.setPointerCapture(ev.pointerId); } catch { /* jsdom */ }
    const pt = svgPoint(ev);
    const el = document.createElementNS(NS, "polyline") as SVGPolylineElement;
    el.setAttribute("class", "hz-ink-path good"); // đổi thành bad khi nhả nếu lệch hướng
    el.setAttribute("points", `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
    inkSvgRef.current?.appendChild(el);
    drawingRef.current = { el, pts: [pt] };
  }, []);

  const onPointerMove = useCallback((e: Event) => {
    const drawing = drawingRef.current;
    if (!drawing) return;
    const pt = svgPoint(e as PointerEvent);
    const last = drawing.pts[drawing.pts.length - 1];
    if (Math.hypot(pt.x - last.x, pt.y - last.y) < 3) return; // mock: lọc rung
    drawing.pts.push(pt);
    drawing.el.setAttribute("points", drawing.el.getAttribute("points") + " " + `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
  }, []);

  const finishStroke = useCallback(() => {
    const drawing = drawingRef.current;
    if (!drawing) return;
    drawingRef.current = null;
    const c = charRef.current;
    const idx = strokesRef.current.length;
    const ok = drawing.pts.length >= 4 && matchStroke(drawing.pts, c.d[Math.min(idx, c.d.length - 1)]);
    drawing.el.setAttribute("class", "hz-ink-path " + (ok ? "good" : "bad"));
    strokesRef.current.push({ el: drawing.el, ok });
    showHint();
    emitStats();
  }, [showHint, emitStats]);

  useEffect(() => {
    const ink = inkSvgRef.current;
    if (!ink) return;
    ink.addEventListener("pointerdown", onPointerDown);
    ink.addEventListener("pointermove", onPointerMove);
    ink.addEventListener("pointerup", finishStroke);
    ink.addEventListener("pointercancel", finishStroke);
    return () => {
      ink.removeEventListener("pointerdown", onPointerDown);
      ink.removeEventListener("pointermove", onPointerMove);
      ink.removeEventListener("pointerup", finishStroke);
      ink.removeEventListener("pointercancel", finishStroke);
    };
  }, [onPointerDown, onPointerMove, finishStroke]);

  return (
    <div
      data-od-id="tianzi-grid"
      className="relative mx-auto aspect-square w-full max-w-[340px] overflow-hidden rounded-2xl border border-border-subtle bg-surface-elevated max-[480px]:max-w-[280px]"
    >
      <svg viewBox="0 0 300 300" aria-hidden="true" className="absolute inset-0 h-full w-full">
        <rect x="4" y="4" width="292" height="292" fill="none" stroke="var(--text-secondary)" strokeOpacity="0.45" strokeWidth="1.5" rx="4" />
        <line x1="150" y1="4" x2="150" y2="296" stroke="var(--text-secondary)" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="7 6" />
        <line x1="4" y1="150" x2="296" y2="150" stroke="var(--text-secondary)" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="7 6" />
        <line x1="4" y1="4" x2="296" y2="296" stroke="var(--text-secondary)" strokeOpacity="0.32" strokeWidth="1" strokeDasharray="5 7" />
        <line x1="296" y1="4" x2="4" y2="296" stroke="var(--text-secondary)" strokeOpacity="0.32" strokeWidth="1" strokeDasharray="5 7" />
      </svg>
      <svg
        ref={strokeSvgRef}
        viewBox="0 0 300 300"
        role="img"
        aria-label={`Hoạt họa bút thuận chữ ${char.ch}`}
        className="absolute inset-0 h-full w-full"
      />
      <svg
        ref={inkSvgRef}
        viewBox="0 0 300 300"
        aria-label="Bảng tự luyện viết"
        className={`absolute inset-0 h-full w-full ${mode === "draw" ? "" : "hidden"}`}
        style={{ touchAction: "none" }}
      />
    </div>
  );
}
