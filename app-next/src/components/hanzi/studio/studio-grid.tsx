// app-next/src/components/hanzi/studio/studio-grid.tsx
"use client";

/* Ô thiên tự — port .grid-box của opendesign_hsk/hanzi.html (radical-first redesign).
   Watch: nét mẫu thực từ loadWriterCharData (path MMC 1024×1024) qua useStudioStrokes
   — KHÔNG dùng hanzi-writer (ruling controller 2026-10-07).
   Draw: hanzi-writer quiz + outline hint qua useWriter (bỏ engine tự viết + scoring).
   Ký tự/bộ không có data nét → ready=false; khi load fail hẳn → return null (cha hiện fallback). */
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { StudioSelection } from "./studio-model";
import { loadWriterCharData, type WriterCharData } from "./writer-data";
import { useStudioStrokes, type StrokeSource } from "./use-studio-strokes";
import { useWriter } from "./use-writer";

export type StudioGridApi = {
  play: () => void;
  stepPrev: () => void;
  stepNext: () => void;
  setSpeed: (m: number) => void;
  setHint: (on: boolean) => void;
  readonly ready: boolean; // false khi ký tự chưa load xong / không có data nét
};

/* MMC path nằm trong khung 1024×1024 — stroke-width scale từ 13 (khung 300) lên 1024/300×13 ≈ 44 */
const MMC_BOX = 1024;
const STROKE_WIDTH_300 = 13;
const STROKE_WIDTH_MMC = Math.round((13 * MMC_BOX) / 300);

export function StudioGrid({ sel, mode, apiRef }: {
  sel: StudioSelection;
  mode: "watch" | "draw";
  apiRef?: React.Ref<StudioGridApi>;
}) {
  const strokeSvgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const writer = useWriter(containerRef);
  const [charData, setCharData] = useState<WriterCharData | null>(null);
  const [failed, setFailed] = useState(false);
  const hintRef = useRef(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  /* Adapter tối thiểu cho useStudioStrokes (chỉ đọc .p) — path MMC 1024.
     Cast hẹp: hook chỉ truy cập .p, các field meta khác không dùng. */
  const EMPTY_CHAR = useMemo<StrokeSource>(() => ({ p: [] }), []);
  const sampleChar: StrokeSource = useMemo(
    () => (charData ? { p: charData.strokes } : EMPTY_CHAR),
    [charData, EMPTY_CHAR],
  );
  const strokes = useStudioStrokes(strokeSvgRef, sampleChar, { strokeWidth: STROKE_WIDTH_MMC });

  /* Đổi sel: drop writer cũ (instance của nó gắn vào container div có thể đã
     detach khi grid render null) rồi nạp data cho cả renderer lẫn writer;
     fail → null (cha tự hiện fallback). startQuiz sau đó luôn create lại. */
  useEffect(() => {
    let cancelled = false;
    writer.reset();
    setCharData(null);
    setFailed(false);
    void (async () => {
      const [data, ok] = await Promise.all([loadWriterCharData(sel.g), writer.load(sel.g)]);
      if (cancelled) return;
      if (data && data.strokes.length > 0 && ok) setCharData(data);
      else {
        writer.reset();
        setFailed(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel.g]);

  /* Ready lần đầu cho mỗi ký tự: watch tự phát (mock select → playAll);
     draw khởi động quiz + outline hint (startQuiz TRƯỚC showOutline — writer lazy-create) */
  const playedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!charData || playedForRef.current === sel.g) return;
    playedForRef.current = sel.g;
    if (modeRef.current === "watch") {
      strokes.stepTo(-1);
      strokes.playAll();
    } else {
      writer.startQuiz();
      writer.showOutline(hintRef.current, { instant: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charData, sel.g]);

  /* Đổi mode (bỏ lần mount đầu): watch→draw startQuiz + outline;
     draw→watch cancelQuiz + reset renderer + playAll (khớp mock "đổi mode") */
  const prevModeRef = useRef(mode);
  useEffect(() => {
    if (prevModeRef.current === mode) return;
    prevModeRef.current = mode;
    if (!charData) return;
    if (mode === "draw") {
      strokes.stepTo(-1); // reset nét mẫu (sau playback mọi path đang .done — quiz cần nền todo)
      writer.startQuiz();
      writer.showOutline(hintRef.current, { instant: true });
    } else {
      writer.cancelQuiz();
      strokes.stepTo(-1);
      strokes.playAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const play = useCallback(() => {
    strokes.stepTo(-1);
    strokes.playAll();
  }, [strokes]);

  const setHint = useCallback((on: boolean) => {
    hintRef.current = on;
    if (modeRef.current === "draw") writer.showOutline(on, { instant: on });
  }, [writer]);

  useImperativeHandle(apiRef, () => ({
    play,
    stepPrev: () => strokes.stepBy(-1),
    stepNext: () => strokes.stepBy(1),
    setSpeed: (m: number) => { strokes.setSpeed(m); writer.setSpeed(m); },
    setHint,
    get ready() { return charData !== null; },
  }), [play, setHint, strokes, writer, charData]);

  if (failed) return null;

  return (
    <div
      data-od-id="tianzi-grid"
      className="relative mx-auto aspect-square w-full max-w-[300px] overflow-hidden rounded-2xl border border-border-subtle bg-surface-elevated max-[480px]:max-w-[280px]"
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
        viewBox={`0 0 ${MMC_BOX} ${MMC_BOX}`}
        role="img"
        aria-label={sel.kind === "rad" ? `Hoạt họa bút thuận bộ ${sel.g}` : `Hoạt họa bút thuận chữ ${sel.g}`}
        className="absolute inset-0 h-full w-full"
      />
      {/* Writer tự tạo SVG của nó — ẩn hoàn toàn ở watch mode để outline/quiz không lóe */}
      <div
        ref={containerRef}
        aria-label={sel.kind === "rad" ? `Bảng tự luyện viết bộ ${sel.g}` : `Bảng tự luyện viết chữ ${sel.g}`}
        className="absolute inset-0 grid place-items-center [&_svg]:relative [&_svg]:inset-auto"
        style={{ visibility: mode === "draw" ? "visible" : "hidden", touchAction: "none" }}
      />
    </div>
  );
}
