"use client";
/* Port 1:1 từ clone/js/draw-pad.js — PLAN-03 canvas vẽ chữ Hán (pointer events: chuột + touch).
   Imperative canvas: useRef + useEffect (chạy 1 lần; [size] dependency) — grid 4×4 mờ,
   nút Xoá nét cuối / Xoá hết (disabled khi chưa vẽ nét nào), gợi ý giả khi có nét. */
import { useEffect, useRef } from "react";

const DEFAULT_SUGGESTIONS = ["你", "好", "学"]; // gợi ý giả theo SPEC-03 (không nhận diện thật)

export function DrawPad({
  size = 280,
  suggestions = DEFAULT_SUGGESTIONS,
  onPick,
}: {
  size?: number;
  suggestions?: string[];
  onPick?: (ch: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const undoRef = useRef<HTMLButtonElement | null>(null);
  const clearRef = useRef<HTMLButtonElement | null>(null);
  const suggestRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const btnUndo = undoRef.current;
    const btnClear = clearRef.current;
    const suggestBox = suggestRef.current;
    if (!canvas || !btnUndo || !btnClear || !suggestBox) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const strokes: number[][][] = []; // mỗi nét: mảng [x, y] theo toạ độ canvas size×size
    let current: number[][] | null = null;
    let drawing = false;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function cssVar(name: string, fallback: string): string {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    }

    function redraw() {
      const w = size;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, w, w);
      const border = cssVar("--nhai-border", "#e7e0d4");
      const ink = cssVar("--nhai-ink", "#1f1e1d");

      /* grid 4×4 nét mờ */
      ctx!.strokeStyle = border;
      ctx!.lineWidth = 1;
      ctx!.globalAlpha = 0.7;
      for (let i = 1; i < 4; i++) {
        const p = (w / 4) * i;
        ctx!.beginPath(); ctx!.moveTo(p, 0); ctx!.lineTo(p, w); ctx!.stroke();
        ctx!.beginPath(); ctx!.moveTo(0, p); ctx!.lineTo(w, p); ctx!.stroke();
      }
      ctx!.globalAlpha = 1;

      /* placeholder khi trống */
      if (strokes.length === 0 && !current) {
        ctx!.fillStyle = border;
        ctx!.font = "600 16px system-ui, sans-serif";
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText("Vẽ chữ Hán vào đây", w / 2, w / 2);
      }

      /* các nét đã vẽ + nét đang vẽ */
      ctx!.strokeStyle = ink;
      ctx!.lineWidth = 4;
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";
      strokes.concat(current ? [current] : []).forEach((s) => {
        if (s.length < 2) { // chạm nhanh = chấm
          ctx!.beginPath();
          ctx!.arc(s[0][0], s[0][1], 2, 0, Math.PI * 2);
          ctx!.fillStyle = ink;
          ctx!.fill();
          return;
        }
        ctx!.beginPath();
        ctx!.moveTo(s[0][0], s[0][1]);
        for (let j = 1; j < s.length; j++) ctx!.lineTo(s[j][0], s[j][1]);
        ctx!.stroke();
      });

      btnUndo!.disabled = btnClear!.disabled = strokes.length === 0;
      suggestBox!.classList.toggle("hidden", strokes.length === 0 && !current);
    }

    function pos(e: PointerEvent | MouseEvent): [number, number] {
      const r = canvas!.getBoundingClientRect();
      return [
        Math.round((e.clientX - r.left) * (size / r.width)),
        Math.round((e.clientY - r.top) * (size / r.height)),
      ];
    }

    function onDown(e: PointerEvent) {
      e.preventDefault();
      drawing = true;
      current = [pos(e)];
      try { canvas!.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      redraw();
    }
    function onMove(e: PointerEvent) {
      if (!drawing) return;
      e.preventDefault();
      current!.push(pos(e));
      redraw();
    }
    function endStroke(e: PointerEvent) {
      if (!drawing) return;
      drawing = false;
      if (e && e.pointerId !== undefined) { try { canvas!.releasePointerCapture(e.pointerId); } catch { /* ignore */ } }
      if (current && current.length) strokes.push(current);
      current = null;
      redraw();
    }

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointercancel", endStroke);
    canvas.addEventListener("pointerleave", endStroke);

    function onUndo() { strokes.pop(); redraw(); }
    function onClear() { strokes.length = 0; redraw(); }
    btnUndo.addEventListener("click", onUndo);
    btnClear.addEventListener("click", onClear);

    redraw();
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", endStroke);
      canvas.removeEventListener("pointercancel", endStroke);
      canvas.removeEventListener("pointerleave", endStroke);
      btnUndo.removeEventListener("click", onUndo);
      btnClear.removeEventListener("click", onClear);
    };
  }, [size]);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        className="w-full max-w-[280px] rounded-lg border-2 border-[var(--nhai-border)] bg-[var(--nhai-card)]"
        style={{ touchAction: "none", aspectRatio: "1/1", cursor: "crosshair" }}
        aria-label="Vẽ chữ Hán vào đây"
      />
      <div className="flex gap-2 mt-3">
        <button ref={undoRef} type="button" className="btn-ghost px-3 py-1.5 text-sm" disabled>↩ Xoá nét cuối</button>
        <button ref={clearRef} type="button" className="btn-ghost px-3 py-1.5 text-sm" disabled>✕ Xoá hết</button>
      </div>
      <div ref={suggestRef} className="hidden mt-3 text-sm font-semibold text-[var(--nhai-muted)]">
        Có thể là:{" "}
        {suggestions.map((ch) => (
          <button key={ch} type="button" className="pill ml-1 zh text-base" onClick={() => onPick?.(ch)}>{ch}</button>
        ))}
      </div>
    </div>
  );
}
