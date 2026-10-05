/* Logic thuần cho Thư viện bài đọc (redesign /reading, spec 2026-10-05).
   Không React, không rng/date/localStorage — dùng chung cho UI + tests. */

import type { ReadingCat, ReadingLevel, ReadingLibItem } from "@/content/reading";

export type ReadingFilter = { level: ReadingLevel | "all"; cat: ReadingCat | "all" | "saved"; q: string };

export type ReadingProgress = { pct: number; quizDone: boolean };

export function filterLib(lib: ReadingLibItem[], f: ReadingFilter, savedIds: string[]): ReadingLibItem[] {
  const q = f.q.toLowerCase();
  const saved = new Set(savedIds);
  return lib.filter((item) => {
    if (f.level !== "all" && item.lv !== f.level) return false;
    if (f.cat === "saved") {
      if (!saved.has(item.id)) return false;
    } else if (f.cat !== "all" && item.cat !== f.cat) {
      return false;
    }
    if (q) {
      const hay = `${item.title}${item.py}${item.vi}${item.ex}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function noteFor(item: ReadingLibItem, progress: ReadingProgress | null): string {
  if (!progress || progress.pct <= 0) return `Chưa đọc · ${item.nw} từ mới`;
  if (progress.pct < 100) return `Đang đọc dở (${progress.pct}%)`;
  return progress.quizDone ? "Đã đọc 100% · Đạt quiz" : "Đã đọc 100%";
}

export function ctaFor(progress: ReadingProgress | null): string {
  if (!progress || progress.pct <= 0) return "Đọc ngay";
  if (progress.pct < 100) return "Đọc tiếp";
  return "Đọc lại";
}
