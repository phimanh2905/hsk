import { describe, expect, it } from "vitest";
import { subtitlePct } from "../subtitle-progress";

const rec = (linesDone: number, status: "new" | "mid" | "done" = "mid") =>
  ({ status, score: null, seconds: 0, linesDone, updatedAt: "2026-01-01T00:00:00Z" });

describe("subtitlePct", () => {
  it("undefined rec → null", () => expect(subtitlePct(undefined, 9)).toBeNull());
  it("totalLines 0 → null", () => expect(subtitlePct(rec(3), 0)).toBeNull());
  it("done → 100", () => expect(subtitlePct(rec(3, "done"), 9)).toBe(100));
  it("mid → round(linesDone/total*100)", () => expect(subtitlePct(rec(4), 9)).toBe(44));
  it("cap 100", () => expect(subtitlePct(rec(20), 9)).toBe(100));
});
