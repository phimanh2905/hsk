import { describe, expect, it } from "vitest";
import {
  filterRadicals, filterChars, radicalOf, charOf, radicalOfChar, fold,
} from "../studio-model";

describe("fold", () => {
  it("bỏ dấu: 'Thủy → thuy'", () => expect(fold("Thủy")).toBe("thuy"));
});

describe("filterRadicals", () => {
  it("lọc số nét", () => {
    const all = filterRadicals({ stroke: "all", cat: "core", q: "" });
    const three = filterRadicals({ stroke: "3", cat: "core", q: "" });
    expect(three.length).toBeLessThanOrEqual(all.length);
    expect(three.every((r) => r.strokes === 3)).toBe(true);
    const wide = filterRadicals({ stroke: "5+", cat: "core", q: "" });
    expect(wide.every((r) => r.strokes >= 5)).toBe(true);
  });
  it("cat 'core' chỉ trả core:true; cat khác trả đúng nhóm", () => {
    expect(filterRadicals({ stroke: "all", cat: "core", q: "" }).every((r) => r.core)).toBe(true);
    expect(filterRadicals({ stroke: "all", cat: "animal", q: "" }).every((r) => r.cat === "animal")).toBe(true);
  });
  it("search khớp char/hanViet/meaning bỏ dấu, không phân biệt hoa thường", () => {
    expect(filterRadicals({ stroke: "all", cat: "core", q: "thuy" }).map((r) => r.char)).toContain("水");
    expect(filterRadicals({ stroke: "all", cat: "core", q: "nước" }).map((r) => r.char)).toContain("水");
  });
});

describe("filterChars", () => {
  it("lọc theo level", () => {
    const lv1 = filterChars({ level: "HSK 1", q: "" });
    expect(lv1.every((c) => c.level === "HSK 1")).toBe(true);
    expect(filterChars({ level: "all", q: "" }).length).toBeGreaterThanOrEqual(lv1.length);
  });
  it("search theo ch/py", () => {
    const mei = filterChars({ level: "all", q: "mei" });
    expect(mei.map((c) => c.ch)).toContain("没");
  });
});

describe("radicalOf/charOf", () => {
  it("tra đúng", () => {
    expect(radicalOf("水")?.hanViet).toBeTruthy();
    expect(charOf("没")?.level).toBeTruthy();
    expect(radicalOf("龤")).toBeUndefined();
  });
});

describe("radicalOfChar", () => {
  it("tra ngược bộ thủ chứa chữ", () => {
    expect(radicalOfChar("没")?.char).toBe("水");
    expect(radicalOfChar("龤")).toBeUndefined();
  });
});
