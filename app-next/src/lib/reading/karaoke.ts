/* Ước lượng thời lượng + mapping trackbar → câu, cho karaoke /reading.
   Thuần functions, không audio API (use-reader-audio thuộc task sau). */

import type { ReadingWord } from "@/content/reading";

export const READING_CPS = 3.2; // chữ/giây cơ bản

/** Tổng số chữ (độ dài z) / READING_CPS / rate → giây, làm tròn. */
export function estimateDuration(sentences: ReadingWord[][], rate: number): number {
  const chars = sentences.reduce(
    (sum, s) => sum + s.reduce((n, w) => n + w.z.length, 0),
    0,
  );
  return Math.round(chars / READING_CPS / rate);
}

/** Click trackbar ratio 0..1 → index câu: floor(ratio*N), clamp [0, N-1]. */
export function sentenceAtRatio(sentences: ReadingWord[][], ratio: number): number {
  const n = sentences.length;
  if (n === 0) return 0;
  if (ratio <= 0) return 0;
  if (ratio >= 1) return n - 1;
  return Math.min(n - 1, Math.floor(ratio * n));
}
