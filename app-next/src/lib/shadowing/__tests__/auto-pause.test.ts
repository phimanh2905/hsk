import { describe, expect, it } from "vitest";
import { activeWordIndex, sentencePauseMs } from "../auto-pause";
import type { ShadowWord } from "@/content/shadowing";

const w = (zh: string, s: number, e: number): ShadowWord => ({ zh, py: "", startMs: s * 1000, endMs: e * 1000 });
const WORDS = [w("我", 0, 0.5), w("没", 0.5, 1.2), w("你们", 1.2, 2.0)];

describe("auto-pause", () => {
  it("sentencePauseMs: có words → endMs từ cuối", () => {
    expect(sentencePauseMs(WORDS, 3000)).toBe(2000);
  });
  it("sentencePauseMs: endMs từ cuối vượt cuối câu → kẹp về cuối câu", () => {
    expect(sentencePauseMs(WORDS, 1500)).toBe(1500);
  });
  it("sentencePauseMs: words rỗng/undefined → null (fallback cuối câu ở engine)", () => {
    expect(sentencePauseMs(undefined, 3000)).toBeNull();
    expect(sentencePauseMs([], 3000)).toBeNull();
  });
  it("activeWordIndex: tMs trong [start, end) → index", () => {
    expect(activeWordIndex(WORDS, 700)).toBe(1);
    expect(activeWordIndex(WORDS, 0)).toBe(0);
  });
  it("activeWordIndex: ngoài mọi khoảng → -1", () => {
    expect(activeWordIndex(WORDS, 2500)).toBe(-1);
  });
});
