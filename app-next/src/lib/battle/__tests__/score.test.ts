import { describe, expect, it } from "vitest";

import { computeBattleScore } from "../score";

/* Decision table (spec W6.1): điểm = floor(100 × correct/total)
   + floor(50 × min(1, 2000 / avgMs)), avgMs = durationMs / total. */
describe("computeBattleScore", () => {
  it.each([
    {
      correct: 13,
      total: 13,
      durationMs: 26_000,
      expected: 150,
      why: "avg đúng 2s/câu → bonus full (biên đúng budget)",
    },
    {
      correct: 13,
      total: 13,
      durationMs: 12_999,
      expected: 150,
      why: "nhanh hơn 2s/câu — bonus không vượt 50 (clamp)",
    },
    {
      correct: 13,
      total: 13,
      durationMs: 26_001,
      expected: 149,
      why: "chậm hơn biên 1ms → mất 1đ tốc độ",
    },
    // LƯU Ý: brief ghi "0" nhưng công thức (chuẩn theo brief: tự tính kỳ vọng
    // từ công thức) cho 0 + floor(50 × 2000/2307.7) = 43 — bonus tốc độ không
    // phụ thuộc correct.
    { correct: 0, total: 13, durationMs: 30_000, expected: 43, why: "0 câu đúng → chỉ mất điểm chính xác, vẫn còn tốc độ" },
    {
      correct: 13,
      total: 13,
      durationMs: 65_000,
      expected: 120,
      why: "chậm hẳn (5s/câu) → 100 chính xác + floor(50×2000/5000)=20 tốc độ",
    },
    {
      correct: 7,
      total: 13,
      durationMs: 39_000,
      expected: 86,
      why: "floor(100×7/13)=53 + floor(50×26000/39000)=33 → 86",
    },
    { correct: 1, total: 0, durationMs: 0, expected: 0, why: "guard chia 0" },
    {
      correct: 5,
      total: 5,
      durationMs: 4_000,
      expected: 150,
      why: "bài 5 câu, avg 800ms — công thức không phụ thuộc số câu",
    },
  ])(
    "correct=$correct total=$total durationMs=$durationMs → $expected ($why)",
    ({ correct, total, durationMs, expected }) => {
      expect(computeBattleScore(correct, total, durationMs)).toBe(expected);
    }
  );
});
