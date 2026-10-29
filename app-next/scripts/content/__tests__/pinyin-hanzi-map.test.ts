import { describe, expect, it } from "vitest";
import {
  selectHanzi,
  parseCedictLine,
  collectCedictCandidates,
} from "../gen-pinyin-hanzi-map.mts";

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

describe("parseCedictLine", () => {
  it("dòng chuẩn 1 ký tự", () => {
    const e = parseCedictLine("媽 妈 [ma1] /mother/mama/");
    expect(e).toEqual({ simplified: "妈", traditional: "媽", tokens: ["ma1"] });
  });
  it("ü cedict convention u: → ü", () => {
    const e = parseCedictLine("女 女 [nü3] /female/woman/");
    expect(e).not.toBeNull();
    expect(e!.tokens).toEqual(["nü3"]);
  });
  it("bỏ comment và entry đa ký tự", () => {
    expect(parseCedictLine("# comment")).toBeNull();
    expect(parseCedictLine("沉默 沉默 [chen2 mo4] /silent/")).toBeNull();
  });
  it("dòng méo → null", () => {
    expect(parseCedictLine("garbage line")).toBeNull();
  });
});

describe("collectCedictCandidates", () => {
  it("ưu tiên traditional === simplified, không đè ứng viên đầu nếu không có same-form", () => {
    const text = [
      "僞 伪 [wei3] /fake/", // first cho wei3, traditional ≠ simplified
      "伟 伟 [wei3] /great/", // same-form (traditional === simplified) → ưu tiên
      "駡 骂 [ma4] /to scold/", // chỉ có ứng viên khác-form → lấy first
    ].join("\n");
    const m = collectCedictCandidates(text);
    expect(m.get("wei|3")!.first.char).toBe("伪");
    expect(m.get("wei|3")!.firstSame!.char).toBe("伟");
    expect(m.get("ma|4")!.first.char).toBe("骂");
    expect(m.get("ma|4")!.firstSame).toBeNull();
  });
  it("một chữ nhiều cách đọc → mỗi (syl, tone) một cell", () => {
    const m = collectCedictCandidates("得 得 [de5 dei3 de2] /get/");
    expect(m.get("de|5")!.first.char).toBe("得");
    expect(m.get("dei|3")!.first.char).toBe("得");
  });
});
