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

  it("sort theo (level, ord): ord thấp hơn nhưng level cao hơn vẫn đứng sau", () => {
    const rows = [
      { id: "x", level: "HSK 2", ord: 0, title: "x", hz: "x", topic: "x", def: "x",
        formula: "[]", pitfall: "[]", ex: "[]" },
      { id: point.id, level: "HSK 1", ord: 5, title: point.title, hz: point.hz,
        topic: point.topic, def: point.def,
        formula: JSON.stringify(point.formula), pitfall: JSON.stringify(point.pitfall),
        ex: JSON.stringify(point.ex) },
    ];
    // ord=0 của HSK 2 không được nhảy lên trước ord=5 của HSK 1
    expect(rowsToGrammarPoints(rows as never).map((p) => p.level)).toEqual(["HSK 1", "HSK 2"]);
  });

  it("JSON string field parse đúng tuple formula/pitfall/ex", () => {
    const ba = rowsToGrammarPoints(grammarRows as never).find((p) => p.id === "ba")!;
    expect(ba.formula).toEqual(point.formula);
    expect(ba.pitfall).toEqual(point.pitfall);
    expect(ba.ex).toEqual(point.ex);
    expect(ba.pitfall.length).toBe(3);
  });

  it("parity: rows đã parse từ static tái tạo đúng shape static (sort theo level, ord=i)", () => {
    const rows = staticPoints.map((p, i) => ({ ...p, ord: i }));
    // ord=i unique toàn cục nên thứ tự = stable sort theo level
    const expected = [...staticPoints].sort((a, b) => a.level.localeCompare(b.level));
    expect(rowsToGrammarPoints(rows)).toEqual(expected);
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
