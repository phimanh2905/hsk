"use client";

/* Bọc hanzi-writer cho StudioGrid. Mỗi container 1 instance; load(ch) tạo/tạo lại
   writer với data từ writer-data (chunk local). Speed qua options lúc animate
   (hanzi-writer không có setSpeed runtime). Màu qua CSS var để ăn dark mode. */
import { useCallback, useRef } from "react";
import HanziWriter from "hanzi-writer";
import { loadWriterCharData, type WriterCharData } from "./writer-data";

type WriterInstance = ReturnType<typeof HanziWriter.create> & {
  /* hanzi-writer 3.7.3 (bản mới nhất) chưa khai báo setState/pauseQuiz trong
     d.ts — khai báo cấu trúc hẹp tại đây; gọi optional-chaining để an toàn runtime. */
  setState?: (state: Record<string, unknown>) => void;
  pauseQuiz?: () => void;
};

export type WriterApi = {
  load: (ch: string) => Promise<boolean>;
  playAll: () => void;
  animateStroke: (i: number) => void;
  showStrokes: (n: number) => void;
  startQuiz: () => void;
  stopQuiz: () => void;
  setSpeed: (x: number) => void;
  setOutline: (on: boolean) => void;
};

export function useWriter(containerRef: React.RefObject<HTMLDivElement | null>): WriterApi {
  const writerRef = useRef<WriterInstance | null>(null);
  const charRef = useRef<string | null>(null);
  const dataRef = useRef<WriterCharData | null>(null);
  const speedRef = useRef(1);

  const createWriter = useCallback((char: string, data: WriterCharData) => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = "";
    dataRef.current = data;
    writerRef.current = HanziWriter.create(el, char, {
      charDataLoader: () => data,
      width: 300,
      height: 300,
      padding: 12,
      strokeColor: "var(--text-primary)",
      outlineColor: "var(--text-secondary)",
      drawingColor: "var(--action-primary)",
      showOutline: false,
      showCharacter: true,
      strokeAnimationSpeed: speedRef.current,
      delayBetweenStrokes: 220,
      highlightColor: "var(--action-focus)",
    }) as WriterInstance;
    charRef.current = char;
  }, [containerRef]);

  const load = useCallback(async (ch: string) => {
    if (charRef.current === ch && writerRef.current) return true;
    const data = await loadWriterCharData(ch);
    if (!data || data.strokes.length === 0) return false;
    createWriter(ch, data);
    return true;
  }, [createWriter]);

  const playAll = useCallback(() => {
    // lib types chỉ khai báo onComplete nhưng runtime nhận thêm speed opts (bị
    // copy qua renderState ở bản sau); cast hẹp thay vì weaken public API.
    writerRef.current?.animateCharacter({
      strokeAnimationSpeed: speedRef.current,
      delayBetweenStrokes: 220,
    } as Parameters<WriterInstance["animateCharacter"]>[0]);
  }, []);

  const animateStroke = useCallback((i: number) => {
    writerRef.current?.animateStroke(i);
  }, []);

  const showStrokes = useCallback((n: number) => {
    const total = dataRef.current?.strokes.length ?? 0;
    if (total === 0) return;
    const k = Math.max(0, Math.min(total, n));
    writerRef.current?.setState?.({
      character: { strokes: Array.from({ length: total }, (_, i) => (i < k ? 1 : 0)) },
    } as Record<string, unknown>);
  }, []);

  const startQuiz = useCallback(() => {
    writerRef.current?.quiz({});
  }, []);

  const stopQuiz = useCallback(() => {
    writerRef.current?.pauseQuiz?.();
  }, []);

  const setSpeed = useCallback((x: number) => { speedRef.current = x > 0 ? x : 1; }, []);

  const setOutline = useCallback((on: boolean) => {
    writerRef.current?.setState?.({ outline: { opacity: on ? 1 : 0 } } as Record<string, unknown>);
  }, []);

  return { load, playAll, animateStroke, showStrokes, startQuiz, stopQuiz, setSpeed, setOutline };
}
