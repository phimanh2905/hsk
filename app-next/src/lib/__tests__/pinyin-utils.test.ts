import { describe, it, expect } from "vitest";
import { toPinyin, stripTones, shuffle, splitPinyin, pinyinLine } from "../pinyin-utils";

describe("toPinyin", () => {
  it("đổi số thành dấu đúng nguyên âm chính", () => {
    expect(toPinyin("ni3")).toBe("nǐ");
    expect(toPinyin("zhong1")).toBe("zhōng");
    expect(toPinyin("hao3")).toBe("hǎo");
    expect(toPinyin("ni3 hao3")).toBe("nǐ hǎo");
  });
  it("lv -> ü, dấu đặt trên ü", () => {
    expect(toPinyin("lv4")).toBe("lǜ");
    expect(toPinyin("nv3")).toBe("nǚ");
  });
  it("iu/ui đặt dấu đúng ngoại lệ", () => {
    expect(toPinyin("liu4")).toBe("liù");
    expect(toPinyin("hui4")).toBe("huì");
  });
  it("giữ nguyên token không hợp lệ / đã có dấu", () => {
    expect(toPinyin("Wáng lǎoshī")).toBe("Wáng lǎoshī");
    expect(toPinyin("nǐ, hǎo")).toBe("nǐ, hǎo");
  });
});

describe("stripTones", () => {
  it("bỏ dấu thanh, ü -> v", () => {
    expect(stripTones("nǐ hǎo")).toBe("ni hao");
    expect(stripTones("lǜ")).toBe("lv");
    expect(stripTones("Zhōng")).toBe("zhong");
  });
});

describe("shuffle / splitPinyin / pinyinLine", () => {
  it("shuffle giữ nguyên phần tử và input gốc", () => {
    const a = [1, 2, 3, 4, 5];
    const b = shuffle(a);
    expect([...b].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(a).toEqual([1, 2, 3, 4, 5]);
  });
  it("splitPinyin tách âm tiết có sẵn dấu", () => {
    expect(splitPinyin("Wáng lǎoshī")).toEqual(["wáng", "lǎo", "shī"]);
  });
  it("pinyinLine ghép không chèn space quanh dấu câu", () => {
    expect(
      pinyinLine([
        { c: "李", py: "lǐ" }, { c: "明", py: "míng" }, { c: "，", py: "，" }, { c: "你", py: "nǐ" },
      ])
    ).toBe("lǐ míng，nǐ");
  });
});
