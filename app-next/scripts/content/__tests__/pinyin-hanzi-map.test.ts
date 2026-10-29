import { describe, expect, it } from "vitest";
import { selectHanzi } from "../gen-pinyin-hanzi-map.mts";

describe("selectHanzi", () => {
  it("chữ xuất hiện trước (phổ biến hơn) thắng", () => {
    const entries = [
      { char: "罵", syl: "ma", tone: 4 },
      { char: "媽", syl: "ma", tone: 1 },
      { char: "妈", syl: "ma", tone: 1 },
    ];
    expect(selectHanzi(entries, "ma", 1)).toBe("媽"); // first wins
  });
  it("ô chưa có chữ → null", () => {
    expect(selectHanzi([{ char: "媽", syl: "ma", tone: 1 }], "ma", 4)).toBeNull();
  });
});
