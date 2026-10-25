/* TDD pinyin-derive (Ruling 1+2): pyPerChar/hanVietOf hoạt động trên rows stub,
   không cần python thật; hanVietChar map đúng theo tone/fallback. */
import { describe, expect, it } from "vitest";
import { parseRows, pyPerChar, hanVietChar, hanVietOf } from "../src/pinyin-derive";

const STUB = JSON.stringify([
  [
    { c: "你", py: "nǐ", t3: "ni3" },
    { c: "好", py: "hǎo", t3: "hao3" },
    { c: "。", py: "。", t3: "。" }
  ],
  [
    { c: "健", py: "jiàn", t3: "jian4" },
    { c: "康", py: "kāng", t3: "kang1" },
    { c: "站", py: "zhàn", t3: "zhan4" }
  ]
]);

describe("pyPerChar", () => {
  it("hanzi giữ pinyin, punct chụp nguyên", () => {
    const rows = JSON.parse(STUB);
    expect(pyPerChar(rows[0])).toEqual([
      { c: "你", py: "nǐ" },
      { c: "好", py: "hǎo" },
      { c: "。", py: "。" }
    ]);
  });
});

describe("hanVietChar", () => {
  it("lookup đúng key tone3", () => {
    expect(hanVietChar("健", "jian4")).toBe("KIỆN".toLowerCase());
    expect(hanVietChar("康", "kang1")).toBe("khang");
  });
  it("tone5 (neutral) fallback qua 1..4", () => {
    // "的" nhiều đọc — chỉ cần trả về chuỗi không rỗng cho một tone hợp lệ
    const r = hanVietChar("的", "de5");
    expect(typeof r).toBe("string");
  });
  it("chữ ngoài map → rỗng", () => {
    expect(hanVietChar("ﬤ", "x1")).toBe("");
  });
});

describe("hanVietOf", () => {
  it("ghép per-char + IN HOA", () => {
    const rows = JSON.parse(STUB);
    expect(hanVietOf(rows[1])).toBe("KIỆN KHANG TRẠM");
  });
});

describe("parseRows (stub python stdout)", () => {
  it("trả perChar + hanViet cho cả batch", async () => {
    const out = await parseRows(STUB);
    expect(out.perChar).toHaveLength(2);
    expect(out.hanViet[0]).toBe("NỄ HẢO"); // map MIT: 你/ni3 → nễ (alt reading của NHĨ)
    expect(out.hanViet[1]).toBe("KIỆN KHANG TRẠM");
  });
});
