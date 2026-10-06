// app-next/src/lib/hanzi/__tests__/stroke-quiz.test.ts
import { describe, it, expect } from "vitest";
import { bucket, matchStroke } from "../stroke-quiz";

describe("bucket (8 hướng 45°, port mock)", () => {
  it("len < 14 → DOT bất kể hướng", () => {
    expect(bucket(5, 0)).toBe("DOT");
    expect(bucket(0, -10)).toBe("DOT");
    expect(bucket(9, 9)).toBe("DOT"); // hypot ≈ 12.7
  });
  it("ranh giới ±22.5° quanh trục", () => {
    expect(bucket(100, 0)).toBe("E");
    expect(bucket(100, 100)).toBe("SE");
    expect(bucket(0, 100)).toBe("S");
    expect(bucket(-100, 100)).toBe("SW");
    expect(bucket(-100, 0)).toBe("W");
    expect(bucket(-100, -100)).toBe("W"); // -135°: hướng lên-TRÁI → ô W (NW không có trong Bucket)
    expect(bucket(0, -100)).toBe("N");
    expect(bucket(100, -100)).toBe("NE"); // góc phần tư trên-phải
  });
  it("góc lẻ đúng ô", () => {
    expect(bucket(60, 20)).toBe("E");   // ~18°
    expect(bucket(60, 60)).toBe("SE");  // 45°
    expect(bucket(20, 60)).toBe("S");   // ~72° > 67.5° → S, không phải SE
    expect(bucket(-50, 120)).toBe("SW");
  });
});

describe("matchStroke (so hướng đầu–cuối)", () => {
  const pts = (arr: [number, number][]) => arr.map(([x, y]) => ({ x, y }));
  it("T: chỉ cần > 4 điểm", () => {
    expect(matchStroke(pts([[0, 0], [5, 5], [10, 0], [15, 5], [20, 0], [25, 5]]), "T")).toBe(true);
    expect(matchStroke(pts([[0, 0], [10, 0], [20, 0]]), "T")).toBe(false);
  });
  it("DOT: chỉ chấp nhận khi exp là SE hoặc S", () => {
    expect(matchStroke(pts([[100, 100], [103, 102]]), "SE")).toBe(true);
    expect(matchStroke(pts([[100, 100], [103, 102]]), "S")).toBe(true);
    expect(matchStroke(pts([[100, 100], [103, 102]]), "E")).toBe(false);
  });
  it("đúng hướng / sai hướng", () => {
    expect(matchStroke(pts([[0, 0], [50, 3], [100, 0]]), "E")).toBe(true);
    expect(matchStroke(pts([[0, 0], [50, 3], [100, 0]]), "S")).toBe(false);
    expect(matchStroke(pts([[100, 0], [60, 50], [20, 100]]), "SW")).toBe(true);
  });
});
