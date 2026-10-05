import { describe, it, expect } from "vitest";
import { barHeights } from "@/lib/shadowing/waveform";

describe("barHeights — deterministic (spec §3 waveform)", () => {
  it("cùng seed → cùng mảng 72 phần tử trong [0,1]", () => {
    const a = barHeights(3, 1);
    const b = barHeights(3, 1);
    expect(a).toEqual(b);
    expect(a).toHaveLength(72);
    for (const h of a) { expect(h).toBeGreaterThanOrEqual(0); expect(h).toBeLessThanOrEqual(1); }
  });
  it("seed khác → mảng khác; amp co giãn biên", () => {
    expect(barHeights(1, 1)).not.toEqual(barHeights(2, 1));
    const amp = barHeights(1, 0.4);
    const full = barHeights(1, 1);
    expect(amp.every((h, i) => Math.abs(h - full[i] * 0.4) < 1e-9 || Math.abs(h) < 1e-9)).toBe(true);
  });
});
