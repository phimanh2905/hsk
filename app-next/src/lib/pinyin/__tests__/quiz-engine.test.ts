import { describe, it, expect } from "vitest";
import { buildPool, pickTarget, distractors, type PinyinLabPoolItem } from "../quiz-engine";

function seqRng(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("buildPool", () => {
  it("92 items (23 âm × 4 thanh), shape đúng", () => {
    const pool = buildPool();
    expect(pool.length).toBe(92);
    expect(pool.find((p) => p.ini === "b" && p.tone === 1)).toEqual({
      py: "bā", zh: "八", vi: "Số 8", tone: 1, ini: "b",
    });
  });
});

describe("pickTarget (Review Focus #1)", () => {
  it("drillIni lọc đúng nhóm âm", () => {
    const t = pickTarget(buildPool(), "sh", seqRng([0]));
    expect(t.ini).toBe("sh");
  });
  it("drillIni không có trong pool → fallback toàn pool, không crash", () => {
    const t = pickTarget(buildPool(), "ng", seqRng([0.999]));
    expect(t.ini).toBe("y"); // phần tử cuối toàn pool
  });
});

describe("distractors", () => {
  const pool = buildPool();
  it("2 cùng ini khác py + 1 khác ini cùng tone, không trùng target", () => {
    const target: PinyinLabPoolItem = { py: "bà", zh: "爸", vi: "Bố", tone: 4, ini: "b" };
    const out = distractors(pool, target, seqRng([0, 0, 0, 0, 0, 0, 0]));
    expect(out).toHaveLength(3);
    expect(out.filter((o) => o.ini === "b")).toHaveLength(2);
    expect(out.filter((o) => o.ini !== "b" && o.tone === 4)).toHaveLength(1);
    expect(out.every((o) => o.py !== target.py)).toBe(true);
  });
  it("không chọn trùng nhau (rng thật)", () => {
    const out = distractors(pool, pool[0], Math.random);
    expect(new Set(out.map((o) => o.py)).size).toBe(3);
  });
});
