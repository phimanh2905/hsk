// app-next/src/lib/my-grammar.ts
/* Sổ tay ngữ pháp — filter + hero metrics (spec 2026-10-05 §2.3). Pure functions. */

import type { GrammarPoint } from "@/content/grammar-points";

export type GrammarFilters = { level: string; topic: string; q: string };

export function filterPoints(points: GrammarPoint[], f: GrammarFilters, savedIds: string[]): GrammarPoint[] {
  const q = f.q.trim().toLowerCase();
  return points.filter((p) => {
    if (f.level !== "all" && p.level !== f.level) return false;
    if (f.topic === "saved") { if (!savedIds.includes(p.id)) return false; }
    else if (f.topic !== "all" && p.topic !== f.topic) return false;
    if (q) {
      const hay = (p.title + p.hz + p.def + p.ex.map((e) => e.hz + e.py + e.vi).join("")).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function grammarHero(points: GrammarPoint[], savedIds: string[]): {
  total: number; savedCount: number; topLevel: string | null; topCount: number;
} {
  const savedCount = points.filter((p) => savedIds.includes(p.id)).length;
  let topLevel: string | null = null;
  let topCount = 0;
  let topNum = 0;
  const byLevel = new Map<string, number>();
  for (const p of points) byLevel.set(p.level, (byLevel.get(p.level) ?? 0) + 1);
  for (const [level, count] of byLevel) {
    const num = Number(/^HSK (\d+)$/.exec(level)?.[1] ?? 0);
    if (num > topNum) { topNum = num; topLevel = level; topCount = count; }
  }
  return { total: points.length, savedCount, topLevel, topCount };
}
