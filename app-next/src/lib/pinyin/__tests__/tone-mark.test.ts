import { describe, expect, it } from "vitest";
import { applyTone, toneForms } from "../tone-mark";
import { pinyinValid } from "@/content/pinyin";

describe("applyTone", () => {
  it("tone 5 trả nguyên văn", () => {
    expect(applyTone("ba", 5)).toBe("ba");
  });
  it("đặt dấu trên nguyên âm chính", () => {
    expect(applyTone("ba", 4)).toBe("bà");
    expect(applyTone("mao", 1)).toBe("māo");
    expect(applyTone("hou", 2)).toBe("hóu");
    expect(applyTone("zhei", 1)).toBe("zhēi");
    expect(applyTone("er", 3)).toBe("ěr");
  });
  it("iu → dấu trên u, ui → dấu trên i", () => {
    expect(applyTone("liu", 2)).toBe("liú");
    expect(applyTone("dui", 4)).toBe("duì");
    expect(applyTone("zhui", 1)).toBe("zhuī");
  });
  it("nguyên âm đơn và y/w", () => {
    expect(applyTone("yi", 1)).toBe("yī");
    expect(applyTone("wu", 4)).toBe("wù");
    expect(applyTone("yu", 1)).toBe("yū");
    expect(applyTone("wo", 3)).toBe("wǒ");
  });
  it("ü: nü/lü → ǖǘǚǜ, üe → dấu trên e", () => {
    expect(applyTone("nü", 3)).toBe("nǚ");
    expect(applyTone("lü", 2)).toBe("lǘ");
    expect(applyTone("yue", 4)).toBe("yuè");
    expect(applyTone("xue", 3)).toBe("xuě");
  });
  it("âm không có nguyên âm → trả nguyên văn, không throw", () => {
    expect(applyTone("xyz", 2)).toBe("xyz");
  });
  it("full-matrix: 405 ô × tone 1..4 luôn sinh âm có dấu hợp lệ", () => {
    const re = /^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+$/;
    for (const finals of Object.values(pinyinValid)) {
      for (const base of Object.values(finals)) {
        for (const t of [1, 2, 3, 4] as const) {
          const out = applyTone(base, t);
          expect(out).not.toBe(base);
          expect(out).toMatch(re);
        }
      }
    }
  });
  it("toneForms trả đủ 5 dạng theo thứ tự", () => {
    expect(toneForms("ma")).toEqual(["mā", "má", "mǎ", "mà", "ma"]);
  });
});
