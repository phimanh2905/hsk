"use client";

/* StrokePlayer — port clone/js/hanzi-writer.js (class Writer) thành React hook.
   rAF loop: 420ms/nét + 90ms nghỉ, easeInOutQuad, dashoffset animation. */
import { useEffect, useRef } from "react";
import { STROKE_DATA, genericStrokes, type StrokePolyline } from "@/content/hanzi-strokes";

const NS = "http://www.w3.org/2000/svg";
const DUR = 420; // ms/nét — giữ đúng clone
const GAP = 90;  // ms nghỉ giữa các nét — giữ đúng clone

let uidSeq = 0;

export interface StrokePlayerApi {
  play: () => void;
  showArrows: (on: boolean) => void;
  setZoom: (on: boolean) => void;
  hasCustomStrokes: boolean;
}

export function useStrokePlayer(
  containerRef: React.RefObject<HTMLElement | null>,
  char: string,
  deps?: unknown[],
): StrokePlayerApi {
  const pathsRef = useRef<SVGElement[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const strokesRef = useRef<StrokePolyline[]>([]);
  const idRef = useRef<string>("");
  const rafRef = useRef<number | null>(null);
  const arrowsOnRef = useRef(false);

  const hasCustomStrokes = !!STROKE_DATA[char];

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    const strokes = STROKE_DATA[char] || genericStrokes();
    const id = "nhai-hw-" + (++uidSeq);

    const svg = document.createElementNS(NS, "svg") as SVGSVGElement;
    svg.setAttribute("viewBox", "0 0 100 100");
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

    host.appendChild(svg);
    svgRef.current = svg;
    pathsRef.current = paths;
    strokesRef.current = strokes;
    idRef.current = id;
    arrowsOnRef.current = false;

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
      const k = Math.min(1, el / DUR);
      const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // easeInOutQuad
      p.style.strokeDashoffset = String(1 - eased);
      if (k >= 1) {
        p.style.strokeDashoffset = "0";
        idx++;
        t0 = ts + GAP;
        if (idx >= all.length) { rafRef.current = null; return; }
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  };

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
    if (on) {
      const strokes = strokesRef.current;
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
    } else {
      svg.setAttribute("viewBox", "0 0 100 100");
    }
  };

  return { play, showArrows, setZoom, hasCustomStrokes };
}
