"use client";

/* StrokePlayer — port clone/js/hanzi-writer.js (class Writer) thành React hook.
   rAF loop: 420ms/nét + 90ms nghỉ, easeInOutQuad, dashoffset animation.
   Nguồn nét (spec §4): STROKE_DATA[char] (polyline 100×100) → STROKE_PATH_DATA[char]
   (SVG path 300×300) → genericStrokes(). */
import { useEffect, useRef, useState } from "react";
import { STROKE_DATA, STROKE_PATH_DATA, genericStrokes, type StrokePolyline } from "@/content/hanzi-strokes";

const NS = "http://www.w3.org/2000/svg";
const DUR = 420; // ms/nét — giữ đúng clone (chia cho speedRef)
const GAP = 90;  // ms nghỉ giữa các nét — giữ đúng clone

let uidSeq = 0;

export interface StrokePlayerApi {
  play: () => void;
  stepTo: (i: number) => void;
  setSpeed: (mult: number) => void;
  showArrows: (on: boolean) => void;
  setZoom: (on: boolean) => void;
  hasCustomStrokes: boolean;
  total: number;
  source: "polyline" | "path" | "generic";
}

export function useStrokePlayer(
  containerRef: React.RefObject<HTMLElement | null>,
  char: string,
  deps?: unknown[],
  opts?: { onStep?: (i: number) => void },
): StrokePlayerApi {
  const pathsRef = useRef<SVGElement[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const strokesRef = useRef<StrokePolyline[]>([]);
  const idRef = useRef<string>("");
  const rafRef = useRef<number | null>(null);
  const arrowsOnRef = useRef(false);
  const curRef = useRef(-1);
  const speedRef = useRef(1);
  const baseViewBoxRef = useRef("0 0 100 100");
  const onStepRef = useRef(opts?.onStep);
  onStepRef.current = opts?.onStep;

  const [meta, setMeta] = useState<{ total: number; source: StrokePlayerApi["source"] }>({ total: 0, source: "generic" });

  const hasCustomStrokes = !!STROKE_DATA[char] || !!STROKE_PATH_DATA[char];

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    const pathEntry = STROKE_PATH_DATA[char] ?? null;
    const polylines = STROKE_DATA[char] ?? null;
    const source: StrokePlayerApi["source"] = polylines ? "polyline" : pathEntry ? "path" : "generic";
    const strokes: StrokePolyline[] = polylines ?? (source === "generic" ? genericStrokes() : []);
    const total = polylines ? polylines.length : pathEntry ? pathEntry.paths.length : genericStrokes().length;
    const id = "nhai-hw-" + (++uidSeq);
    const viewBox = source === "path" ? "0 0 300 300" : "0 0 100 100";

    const svg = document.createElementNS(NS, "svg") as SVGSVGElement;
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("class", "absolute inset-0 w-full h-full pointer-events-none");
    svg.setAttribute("aria-hidden", "true");

    const defs = document.createElementNS(NS, "defs");
    defs.innerHTML =
      '<marker id="' + id + '-arrow" viewBox="0 0 10 10" refX="8" refY="5" ' +
        'markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
        '<path d="M 0 1 L 9 5 L 0 9 z" style="fill:var(--action-primary)"></path>' +
      "</marker>";
    svg.appendChild(defs);

    const paths: SVGElement[] = [];
    if (source === "path" && pathEntry) {
      pathEntry.paths.forEach((d) => {
        const el = document.createElementNS(NS, "path") as SVGElement;
        el.setAttribute("d", d);
        el.setAttribute("fill", "none");
        el.setAttribute("stroke", "var(--action-primary)");
        el.setAttribute("stroke-width", "4.5");
        el.setAttribute("stroke-linecap", "round");
        el.setAttribute("stroke-linejoin", "round");
        el.setAttribute("pathLength", "1");
        el.style.strokeDasharray = "1";
        el.style.strokeDashoffset = "1"; // ẩn cho đến khi animate
        svg.appendChild(el);
        paths.push(el);
      });
    } else {
      strokes.forEach((pts) => {
        const pl = document.createElementNS(NS, "polyline") as SVGElement;
        pl.setAttribute("points", pts.map((p) => p.join(",")).join(" "));
        pl.setAttribute("fill", "none");
        pl.setAttribute("stroke", "var(--action-primary)");
        pl.setAttribute("stroke-width", "4.5");
        pl.setAttribute("stroke-linecap", "round");
        pl.setAttribute("stroke-linejoin", "round");
        pl.setAttribute("pathLength", "1");
        pl.style.strokeDasharray = "1";
        pl.style.strokeDashoffset = "1"; // ẩn cho đến khi animate
        svg.appendChild(pl);
        paths.push(pl);
      });
    }

    host.appendChild(svg);
    svgRef.current = svg;
    pathsRef.current = paths;
    strokesRef.current = strokes;
    idRef.current = id;
    baseViewBoxRef.current = viewBox;
    arrowsOnRef.current = false;
    curRef.current = -1;
    speedRef.current = 1;
    setMeta({ total, source });

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      svg.remove();
      svgRef.current = null;
      pathsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char, ...(deps ?? [])]);

  const play = () => {
    const all = pathsRef.current;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    all.forEach((p) => { p.style.strokeDashoffset = "1"; });

    let idx = 0, t0: number | null = null;
    const frame = (ts: number) => {
      if (t0 === null) t0 = ts;
      const el = Math.max(0, ts - t0);
      if (idx >= all.length) { rafRef.current = null; return; }
      const p = all[idx];
      const dur = Math.max(120, DUR / speedRef.current);
      const k = Math.min(1, el / dur);
      const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // easeInOutQuad
      p.style.strokeDashoffset = String(1 - eased);
      if (k >= 1) {
        p.style.strokeDashoffset = "0";
        idx++;
        curRef.current = idx - 1;
        t0 = ts + GAP;
        if (idx >= all.length) { rafRef.current = null; return; }
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  };

  const stepTo = (i: number) => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    const total = pathsRef.current.length;
    const clamped = Math.max(-1, Math.min(total - 1, i));
    curRef.current = clamped;
    pathsRef.current.forEach((p, idx) => {
      p.style.transition = "";
      p.style.strokeDasharray = "1";
      p.style.strokeDashoffset = idx <= clamped ? "0" : "1";
    });
    onStepRef.current?.(clamped);
  };

  const setSpeed = (mult: number) => { speedRef.current = mult > 0 ? mult : 1; };

  const showArrows = (on: boolean) => {
    arrowsOnRef.current = !!on;
    const id = idRef.current;
    pathsRef.current.forEach((p) => {
      if (arrowsOnRef.current) p.setAttribute("marker-end", "url(#" + id + "-arrow)");
      else p.removeAttribute("marker-end");
    });
    if (arrowsOnRef.current && rafRef.current === null) {
      /* đang tĩnh: hiện đủ nét để thấy mũi tên */
      pathsRef.current.forEach((p) => { p.style.strokeDashoffset = "0"; });
    }
  };

  const setZoom = (on: boolean) => {
    const svg = svgRef.current;
    if (!svg) return;
    if (!on) {
      svg.setAttribute("viewBox", baseViewBoxRef.current);
      return;
    }
    const strokes = strokesRef.current;
    if (strokes.length === 0) return; // nguồn path: không có polyline để đo bounds
    let minX = 100, minY = 100, maxX = 0, maxY = 0;
    strokes.forEach((pts) => {
      pts.forEach((p) => {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
      });
    });
    const pad = 6;
    svg.setAttribute("viewBox", (minX - pad) + " " + (minY - pad) + " " + (maxX - minX + pad * 2) + " " + (maxY - minY + pad * 2));
  };

  return { play, stepTo, setSpeed, showArrows, setZoom, hasCustomStrokes, total: meta.total, source: meta.source };
}
