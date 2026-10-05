import { describe, it, expect } from "vitest";
import { scoreFor, toneChipsFor } from "@/lib/shadowing/scoring";

describe("scoreFor — heuristic nhịp nói (mock stopRec)", () => {
  it("bản ghi đúng độ dài kỳ vọng → điểm cao", () => {
    const expect6 = 6 * 0.55 / 1; // zhLen 6, rate 1 → expect 3.3s
    expect(scoreFor(3.3, 6, 1, false)).toBeGreaterThanOrEqual(85);
  });
  it("quá ngắn/quá dài → bị trừ nhưng không dưới 55", () => {
    expect(scoreFor(0.2, 6, 1, false)).toBe(55);
    expect(scoreFor(0.2, 6, 1, false)).toBeLessThanOrEqual(70);
  });
  it("simMode cộng điểm nhẹ", () => {
    expect(scoreFor(1, 6, 1, true)).toBe(scoreFor(1, 6, 1, false) + 4 - 6); // cùng closeness, khác bonus
  });
});

describe("toneChipsFor", () => {
  const parts = ["你好", "请问", "您", "喝", "点", "什么"];
  it("score ≥ 80 → all ok", () => {
    expect(toneChipsFor(85, parts).every((c) => c.ok)).toBe(true);
  });
  it("score thấp → có chip warn", () => {
    expect(toneChipsFor(60, parts).some((c) => !c.ok)).toBe(true);
    expect(toneChipsFor(60, parts)).toHaveLength(6);
  });
});
