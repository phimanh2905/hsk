"use client";

/* Bút thuận Hanzi Studio — port animate()/playAll()/paintIdle()/showHint() của
   opendesign_hsk/hanzi.html. Khác useStrokePlayer (review): nét mờ hiện SẴN toàn chữ
   (.hz-st todo), trạng thái per-nét qua class, hint là path append cuối svg.
   setTimeout chain giữ đúng mock để fake timers test được (rAF khó advance). */
import { useCallback, useEffect, useRef } from "react";
import type { StudioChar } from "@/content/hanzi-studio";

const NS = "http://www.w3.org/2000/svg";

export function useStudioStrokes(
  svgRef: React.RefObject<SVGSVGElement | null>,
  char: StudioChar,
  opts?: { onPlayEnd?: () => void },
) {
  const pathsRef = useRef<SVGPathElement[]>([]);
  const hintRef = useRef<SVGPathElement | null>(null);
  const stepRef = useRef(-1);
  const speedRef = useRef(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charRef = useRef(char);
  charRef.current = char;
  const onPlayEndRef = useRef(opts?.onPlayEnd);
  onPlayEndRef.current = opts?.onPlayEnd;

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearHint = useCallback(() => {
    hintRef.current?.remove();
    hintRef.current = null;
  }, []);

  const paintIdle = useCallback(() => {
    pathsRef.current.forEach((el, i) => {
      el.style.transition = "";
      el.style.strokeDasharray = "";
      el.style.strokeDashoffset = "";
      el.setAttribute("class", "hz-st " + (i <= stepRef.current ? "done" : "todo"));
    });
  }, []);

  /* Dựng lại path theo charRef — reset step về -1 (mock buildGrid + paintIdle) */
  const build = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    stop();
    clearHint();
    stepRef.current = -1;
    svg.innerHTML = "";
    pathsRef.current = charRef.current.p.map((d) => {
      const el = document.createElementNS(NS, "path") as SVGPathElement;
      el.setAttribute("d", d);
      svg.appendChild(el);
      return el;
    });
    paintIdle();
  }, [svgRef, stop, clearHint, paintIdle]);

  const animate = (i: number, done: () => void) => {
    const el = pathsRef.current[i];
    if (!el) { done(); return; }
    stepRef.current = i;
    const len = el.getTotalLength();
    el.setAttribute("class", "hz-st now");
    el.style.transition = "none";
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    void el.getBoundingClientRect(); // reflow — port mock
    const dur = Math.max(280, 720 / speedRef.current);
    el.style.transition = `stroke-dashoffset ${dur}ms ease`;
    el.style.strokeDashoffset = "0";
    timerRef.current = setTimeout(() => {
      el.setAttribute("class", "hz-st done");
      el.style.transition = "";
      el.style.strokeDasharray = "";
      el.style.strokeDashoffset = "";
      timerRef.current = null;
      done();
    }, dur + 60);
  };

  const playAll = useCallback(() => {
    if (timerRef.current !== null) return; // đang phát — port mock if(timer)return
    stepRef.current = -1;
    paintIdle();
    let i = 0;
    const next = () => {
      if (i >= pathsRef.current.length) {
        stepRef.current = pathsRef.current.length - 1;
        paintIdle();
        onPlayEndRef.current?.();
        return;
      }
      animate(i, () => { i++; next(); });
    };
    next();
  }, [paintIdle]);

  /* i = nét ĐANG ĐẾN — hiện tới i-1 (stepRef là index nét cuối đã done) */
  const stepTo = useCallback((i: number) => {
    stop();
    stepRef.current = Math.max(-1, Math.min(pathsRef.current.length - 1, i - 1));
    paintIdle();
  }, [stop, paintIdle]);

  const stepBy = useCallback((delta: number) => {
    stop();
    stepRef.current = Math.max(-1, Math.min(pathsRef.current.length - 1, stepRef.current + delta));
    paintIdle();
  }, [stop, paintIdle]);

  const setSpeed = useCallback((m: number) => { speedRef.current = m > 0 ? m : 1; }, []);

  const showHint = useCallback((i: number) => {
    clearHint();
    if (i < 0 || i >= pathsRef.current.length) return;
    const svg = svgRef.current;
    if (!svg) return;
    const el = document.createElementNS(NS, "path") as SVGPathElement;
    el.setAttribute("d", charRef.current.p[i]);
    el.setAttribute("class", "hz-st hint");
    svg.appendChild(el);
    hintRef.current = el;
  }, [svgRef, clearHint]);

  useEffect(() => { build(); }, [build, char]); // dựng path lần đầu + khi đổi chữ
  useEffect(() => stop, [stop]); // unmount giữa lúc phát → huỷ timer

  return { build, playAll, stop, stepTo, stepBy, setSpeed, showHint, clearHint, total: char.p.length };
}

export type StudioStrokesApi = ReturnType<typeof useStudioStrokes>;