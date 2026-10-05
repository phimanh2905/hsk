import { describe, it, expect, beforeEach } from "vitest";
import { readLocalProgress, writeLocalProgress, computeMetrics, type ProgressRec } from "@/lib/shadowing/progress";

const rec = (over: Partial<ProgressRec> = {}): ProgressRec => ({
  status: "mid", score: 70, seconds: 30, linesDone: 2, updatedAt: "2026-10-05T00:00:00Z", ...over,
});

beforeEach(() => localStorage.clear());

describe("progress localStorage", () => {
  it("round-trip map", () => {
    writeLocalProgress({ v1: rec() });
    expect(readLocalProgress().v1).toMatchObject({ status: "mid", score: 70 });
  });
  it("file rỗng/hỏng → {}", () => {
    localStorage.setItem("bye.shadow.progress", "{oops");
    expect(readLocalProgress()).toEqual({});
  });
});

describe("computeMetrics (spec §5.3)", () => {
  it("practiced = mid + done, avgScore chỉ tính done", () => {
    const m = computeMetrics({ a: rec({ status: "done", score: 90 }), b: rec(), c: rec({ status: "new", score: null }) });
    expect(m).toEqual({ practiced: 2, seconds: 60, avgScore: 90 });
  });
  it("không có gì → 0/0/null", () => {
    expect(computeMetrics({})).toEqual({ practiced: 0, seconds: 0, avgScore: null });
  });
});
