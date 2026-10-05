import { describe, expect, it } from "vitest";
import type { ReadingWord } from "@/content/reading";
import { estimateDuration, READING_CPS, sentenceAtRatio } from "@/lib/reading/karaoke";

const w = (z: string): ReadingWord => ({ z, p: "pīn", h: "hán", m: "nghĩa" });

// 3 câu: 2 + 4 + 6 = 12 chữ
const sentences: ReadingWord[][] = [
  [w("你"), w("好")],
  [w("我"), w("是"), w("学生")],
  [w("今"), w("天"), w("天气"), w("很好")],
];

describe("estimateDuration", () => {
  it("rate 1.0 → tổng chữ / READING_CPS, làm tròn", () => {
    expect(estimateDuration(sentences, 1)).toBe(Math.round(12 / READING_CPS / 1));
    expect(estimateDuration(sentences, 1)).toBe(4); // 12 / 3.2 = 3.75 → 4
  });

  it("rate 0.5 → chậm gấp đôi", () => {
    expect(estimateDuration(sentences, 0.5)).toBe(Math.round(12 / READING_CPS / 0.5));
    expect(estimateDuration(sentences, 0.5)).toBe(8);
  });
});

describe("sentenceAtRatio", () => {
  it("ratio <= 0 → câu 0", () => {
    expect(sentenceAtRatio(sentences, 0)).toBe(0);
    expect(sentenceAtRatio(sentences, -0.5)).toBe(0);
  });

  it("ratio >= 1 → câu cuối", () => {
    expect(sentenceAtRatio(sentences, 1)).toBe(2);
    expect(sentenceAtRatio(sentences, 1.5)).toBe(2);
  });

  it("giữa → floor(ratio*N)", () => {
    expect(sentenceAtRatio(sentences, 0.4)).toBe(1);
    expect(sentenceAtRatio(sentences, 0.99)).toBe(2);
  });
});
