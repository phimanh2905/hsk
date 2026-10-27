import { describe, expect, it } from "vitest";
import { seedFor, shuffleSeeded } from "../arrange";

describe("arrange", () => {
  it("cùng seed → cùng thứ tự, không mất phần tử", () => {
    const a = shuffleSeeded([1, 2, 3, 4, 5], 42);
    const b = shuffleSeeded([1, 2, 3, 4, 5], 42);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it("không mutate mảng gốc", () => {
    const orig = [1, 2, 3];
    shuffleSeeded(orig, 7);
    expect(orig).toEqual([1, 2, 3]);
  });
  it("seed khác → thứ tự khác (xác suất trùng 1/120 chấp nhận được với seed cố định này)", () => {
    expect(shuffleSeeded([1, 2, 3, 4, 5], 1)).not.toEqual(shuffleSeeded([1, 2, 3, 4, 5], 2));
  });
  it("mảng rỗng/1 phần tử ổn", () => {
    expect(shuffleSeeded([], 9)).toEqual([]);
    expect(shuffleSeeded(["只"], 9)).toEqual(["只"]);
  });
  it("seedFor cùng (videoId, lineN) → cùng số", () => {
    expect(seedFor("EA3rwvr99Q0", 3)).toBe(seedFor("EA3rwvr99Q0", 3));
    expect(seedFor("EA3rwvr99Q0", 3)).not.toBe(seedFor("EA3rwvr99Q0", 4));
  });
});
