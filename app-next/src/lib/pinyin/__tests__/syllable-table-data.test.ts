import { describe, expect, it } from "vitest";
import { buildSyllableTable, examplesFor, SYLLABLE_CELL_COUNT } from "../syllable-table-data";

describe("buildSyllableTable", () => {
  const t = buildSyllableTable();
  it("đúng 405 ô hợp lệ", () => {
    expect(t.cells.size).toBe(405);
    expect(SYLLABLE_CELL_COUNT).toBe(405);
  });
  it("22 hàng initial theo thứ tự pinyinInitials, Ø đầu tiên", () => {
    expect(t.initials.length).toBe(22);
    expect(t.initials[0]).toBe("Ø");
  });
  it("36 cột final theo thứ tự pinyinFinals, không có '-i' (zhi-class không nằm trong pinyinValid)", () => {
    expect(t.finals).not.toContain("-i");
    expect(t.finals).toContain("i");
    expect(t.finals).toContain("ü");
  });
  it("ô ba = initial b final a", () => {
    expect(t.cells.get("b|a")).toEqual({ initial: "b", final: "a", base: "ba", hasExample: true });
  });
  it("ô rỗng không nằm trong map", () => {
    // "b|i" = "bi" là ô hợp lệ trong dữ liệu thật; dùng ô rỗng thật: "m|ong"
    expect(t.cells.has("b|i")).toBe(true);
    expect(t.cells.has("m|ong")).toBe(false);
  });
  it("mọi ô có base đều nằm trong hàng/cột khai báo", () => {
    for (const [key, cell] of t.cells) {
      expect(t.initials).toContain(cell.initial);
      expect(t.finals).toContain(cell.final);
      expect(key).toBe(`${cell.initial}|${cell.final}`);
    }
  });
});
describe("examplesFor", () => {
  it("trả tối đa 4 ví dụ từ pinyinExamples", () => {
    const ex = examplesFor("ba");
    expect(ex.length).toBeGreaterThan(0);
    expect(ex.length).toBeLessThanOrEqual(4);
    expect(ex[0]).toEqual(["八", "bā", "tám"]);
  });
  it("âm không có ví dụ → mảng rỗng", () => {
    expect(examplesFor("zhzzz")).toEqual([]);
  });
});
