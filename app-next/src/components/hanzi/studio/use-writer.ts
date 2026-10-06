"use client";

/* Bọc hanzi-writer 3.7.3 cho StudioGrid — CHỈ dùng cho draw/quiz + outline hint
   (API thật của lib: showCharacter/hideCharacter/animateCharacter/animateStroke/
   showOutline/hideOutline/updateColor/quiz/cancelQuiz/setCharacter — KHÔNG có
   setState/pauseQuiz/setSpeed). Watch mode dùng useStudioStrokes + SVG riêng,
   không đi qua đây. Writer tạo LAZY trong startQuiz; load() chỉ nạp data vào ref.
   Màu qua CSS var để ăn dark mode; speed chỉ áp cho create opts. */
import { useCallback, useEffect, useRef } from "react";
import HanziWriter from "hanzi-writer";
import { loadWriterCharData, type WriterCharData } from "./writer-data";

type WriterInstance = ReturnType<typeof HanziWriter.create>;

export type WriterApi = {
  /** Chỉ nạp data của chữ vào ref — không tạo writer. false nếu không có data. */
  load: (ch: string) => Promise<boolean>;
  /** Tạo writer lần đầu nếu chưa có (showCharacter:false, showOutline:false), rồi quiz(). */
  startQuiz: (onComplete?: () => void) => void;
  /** cancelQuiz() passthrough — ở lại trạng thái watch. */
  cancelQuiz: () => void;
  /** Hint nét mờ (draw mode): showOutline/hideOutline của lib. */
  showOutline: (on: boolean, opts?: { instant?: boolean }) => void;
  /** Chỉ áp cho create opts (speed của watch renderer riêng, lib chỉ nhớ). */
  setSpeed: (x: number) => void;
  /** Huỷ quiz + drop instance + xoá data nạp — dùng khi đổi chữ/load fail để
      tránh writer cũ còn gắn vào container div đã detach (grid render null). */
  reset: () => void;
};

export function useWriter(containerRef: React.RefObject<HTMLDivElement | null>): WriterApi {
  const writerRef = useRef<WriterInstance | null>(null);
  const createdCharRef = useRef<string | null>(null); // chữ mà writer instance đang giữ
  const charRef = useRef<string | null>(null);
  const dataRef = useRef<WriterCharData | null>(null);
  const speedRef = useRef(1);

  const load = useCallback(async (ch: string) => {
    if (charRef.current === ch && dataRef.current) return true;
    const data = await loadWriterCharData(ch);
    if (!data || data.strokes.length === 0) {
      dataRef.current = null;
      charRef.current = null;
      return false;
    }
    dataRef.current = data;
    charRef.current = ch;
    return true;
  }, []);

  const startQuiz = useCallback(
    (onComplete?: () => void) => {
      const ch = charRef.current;
      const data = dataRef.current;
      if (!ch || !data) return;
      const el = containerRef.current;
      if (!el) return;
      if (!writerRef.current) {
        el.innerHTML = "";
        writerRef.current = HanziWriter.create(el, ch, {
          charDataLoader: () => data,
          width: 300,
          height: 300,
          padding: 12,
          strokeColor: "var(--text-primary)",
          outlineColor: "var(--text-secondary)",
          drawingColor: "var(--action-primary)",
          showOutline: false,
          showCharacter: false,
          strokeAnimationSpeed: speedRef.current,
          delayBetweenStrokes: 220,
          highlightColor: "var(--action-focus)",
        });
        createdCharRef.current = ch;
      } else if (createdCharRef.current !== ch) {
        // setCharacter async: chỉ quiz SAU khi swap xong; fail → reset để startQuiz sau thử lại
        void writerRef.current
          .setCharacter(ch)
          .then(() => {
            createdCharRef.current = ch;
            return writerRef.current?.quiz({ onComplete });
          })
          .catch(() => {
            createdCharRef.current = null;
          });
        return;
      }
      writerRef.current.quiz({ onComplete });
    },
    [containerRef],
  );

  const cancelQuiz = useCallback(() => {
    writerRef.current?.cancelQuiz();
  }, []);

  const showOutline = useCallback((on: boolean, opts?: { instant?: boolean }) => {
    const w = writerRef.current;
    if (!w) return;
    const o = { duration: opts?.instant ? 0 : undefined };
    if (on) w.showOutline(o);
    else w.hideOutline(o);
  }, []);

  const setSpeed = useCallback((x: number) => {
    speedRef.current = x > 0 ? x : 1;
  }, []);

  const reset = useCallback(() => {
    writerRef.current?.cancelQuiz();
    writerRef.current = null;
    createdCharRef.current = null;
    dataRef.current = null;
    charRef.current = null;
  }, []);

  // Unmount: dừng quiz + drop instance (tránh giữ DOM writer sau khi grid ẩn)
  useEffect(
    () => () => {
      writerRef.current?.cancelQuiz?.();
      writerRef.current = null;
    },
    [],
  );

  return { load, startQuiz, cancelQuiz, showOutline, setSpeed, reset };
}
