/* Scoring Đấu trí (W6.1, spec Wave 6 — port từ RE đối thủ):
   điểm = floor(100 × correct/total) + floor(50 × min(1, 2s / avg_ms_per_câu)),
   max 150/bài. Pure function — KHÔNG import React. */

const ACCURACY_MAX = 100;
const SPEED_MAX = 50;
const SPEED_BUDGET_MS = 2_000;

export function computeBattleScore(correct: number, total: number, durationMs: number): number {
  if (total <= 0 || durationMs <= 0) return 0;
  const clamped = Math.max(0, Math.min(correct, total));
  const accuracy = Math.floor((ACCURACY_MAX * clamped) / total);
  const avgMs = durationMs / total;
  const speed = Math.floor(SPEED_MAX * Math.min(1, SPEED_BUDGET_MS / avgMs));
  return accuracy + speed;
}
