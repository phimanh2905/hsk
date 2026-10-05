// app-next/src/lib/__tests__/my-grammar.test.ts
import { describe, it, expect } from "vitest";
import { filterPoints, grammarHero } from "../my-grammar";
import { GRAMMAR_POINTS } from "@/content/grammar-points";

const ids = (list: { id: string }[]) => list.map((p) => p.id);

describe("filterPoints", () => {
  it("level: HSK 4 → lian, yue; all → 6", () => {
    expect(ids(filterPoints(GRAMMAR_POINTS, { level: "HSK 4", topic: "all", q: "" }, []))).toEqual(["lian", "yue"]);
    expect(filterPoints(GRAMMAR_POINTS, { level: "all", topic: "all", q: "" }, []).length).toBe(6);
  });
  it("topic: ba → ba + bei; saved qua savedIds (Review Focus #2)", () => {
    expect(ids(filterPoints(GRAMMAR_POINTS, { level: "all", topic: "ba", q: "" }, []))).toEqual(["ba", "bei"]);
    expect(ids(filterPoints(GRAMMAR_POINTS, { level: "all", topic: "saved", q: "" }, ["bi", "yue"]))).toEqual(["bi", "yue"]);
  });
  it("q: Hán, không dấu, ví dụ py — kết hợp level (Review Focus #5)", () => {
    expect(ids(filterPoints(GRAMMAR_POINTS, { level: "all", topic: "all", q: "把" }, []))).toEqual(["ba"]);
    expect(ids(filterPoints(GRAMMAR_POINTS, { level: "all", topic: "all", q: "so sánh" }, []))).toEqual(["bi"]);
    expect(ids(filterPoints(GRAMMAR_POINTS, { level: "all", topic: "all", q: "límǐ" }, []))).toEqual(["bi"]);
    expect(ids(filterPoints(GRAMMAR_POINTS, { level: "HSK 2", topic: "all", q: "把" }, []))).toEqual([]);
  });
});

describe("grammarHero", () => {
  it("total/savedCount; topLevel = level cao nhất có điểm, topCount theo level đó", () => {
    const h = grammarHero(GRAMMAR_POINTS, ["ba", "bi"]);
    expect(h.total).toBe(6);
    expect(h.savedCount).toBe(2);
    expect(h.topLevel).toBe("HSK 4"); // cao nhất trong {2,3,4}
    expect(h.topCount).toBe(2);       // lian + yue
  });
  it("rỗng → topLevel null", () => {
    expect(grammarHero([], [])).toEqual({ total: 0, savedCount: 0, topLevel: null, topCount: 0 });
  });
});
