import { describe, it, expect } from "vitest";
import { searchEntries, isCJK, pyJoin } from "../dictionary";
import { dictionary } from "@/content/dictionary";

describe("dictionary search 3 kiểu (G1)", () => {
  it("CJK 学习 → đủ 5 kết quả nhóm 学习", () => {
    const r = searchEntries(dictionary, "学习");
    expect(r.map((e) => e.hanzi)).toEqual(["学习", "学习刻苦", "学习强国", "学习时报", "学习委员"]);
  });
  it("pinyin không dấu xuexi và có dấu xuéxí → cùng kết quả (学习 trước)", () => {
    const a = searchEntries(dictionary, "xuexi");
    const b = searchEntries(dictionary, "xuéxí");
    expect(a.map((e) => e.hanzi)).toEqual(b.map((e) => e.hanzi));
    expect(a[0].hanzi).toBe("学习");
    expect(a.length).toBeGreaterThanOrEqual(5);
  });
  it("nghĩa Việt 'học' → có 学习 trong kết quả", () => {
    const r = searchEntries(dictionary, "học");
    expect(r.some((e) => e.hanzi === "学习")).toBe(true);
  });
  it("nghĩa Việt 'xin chào' → 你好", () => {
    expect(searchEntries(dictionary, "xin chào")[0]?.hanzi).toBe("你好");
  });
  it("không khớp → mảng rỗng", () => {
    expect(searchEntries(dictionary, "zzzzz")).toEqual([]);
    expect(searchEntries(dictionary, "")).toEqual([]);
  });
  it("isCJK + pyJoin", () => {
    expect(isCJK("学习")).toBe(true);
    expect(isCJK("xuexi")).toBe(false);
    expect(pyJoin({ pinyinPerChar: ["xué", "xí"] })).toBe("xué xí");
  });
});
