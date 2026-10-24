import { describe, expect, it } from "vitest";
import { rowsToGrammarPoints, ContentNotFoundError } from "@/lib/content/grammar";
import { GRAMMAR_POINTS as staticPoints } from "@/content/grammar-points";
import type { GrammarPoint } from "@/content/grammar-points";

/* Fixture = đúng shape seed sinh ra (gen-grammar-seed.mts): JSON fields có thể
   là string (D1 raw) hoặc đã parse (drizzle mode:json). */
const point = staticPoints[0]; // ba
const grammarRows = [
  { id: point.id, level: point.level, ord: 1, title: point.title, hz: point.hz,
    topic: point.topic, def: point.def,
    formula: JSON.stringify(point.formula), pitfall: JSON.stringify(point.pitfall),
    ex: JSON.stringify(point.ex) },
  { ...staticPoints[1], ord: 0 }, // bi — ord nhỏ hơn nhưng đứng sau trong mảng
];

describe("rowsToGrammarPoints", () => {
  it("rows rỗng → []", () => {
    expect(rowsToGrammarPoints([])).toEqual([]);
  });

  it("sort theo ord (bi ord=0 đứng trước ba ord=1)", () => {
    const out = rowsToGrammarPoints(grammarRows as never);
    expect(out.map((p) => p.id)).toEqual(["bi", "ba"]);
  });

  it("JSON string field parse đúng tuple formula/pitfall/ex", () => {
    const ba = rowsToGrammarPoints(grammarRows as never).find((p) => p.id === "ba")!;
    expect(ba.formula).toEqual(point.formula);
    expect(ba.pitfall).toEqual(point.pitfall);
    expect(ba.ex).toEqual(point.ex);
    expect(ba.pitfall.length).toBe(3);
  });

  it("parity: rows đã parse từ static tái tạo đúng shape static", () => {
    const rows = staticPoints.map((p, i) => ({ ...p, ord: i }));
    expect(rowsToGrammarPoints(rows)).toEqual(staticPoints);
  });

  it("pitfall luôn 3 phần giữ nguyên", () => {
    const rows = staticPoints.map((p, i) => ({ ...p, ord: i }));
    for (const p of rowsToGrammarPoints(rows)) expect(p.pitfall.length).toBe(3);
  });
});

describe("ContentNotFoundError re-export", () => {
  it("từ vocab content layer", () => {
    const e = new ContentNotFoundError("content_grammars");
    expect(e.name).toBe("ContentNotFoundError");
    expect(e.message).toContain("content_grammars");
  });
});
