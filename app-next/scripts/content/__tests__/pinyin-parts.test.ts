import { describe, expect, it } from "vitest";
import { buildSentenceParts, type WordPinyin } from "../pinyin-parts";

const words: WordPinyin[] = [
  { zh: "你好", py: ["nǐ", "hǎo"] },
  { zh: "世界", py: ["shì", "jiè"] },
];

describe("buildSentenceParts", () => {
  it("1 câu không dấu → 1 part, pinyin viết hoa đầu câu", () => {
    const r = buildSentenceParts("你好世界", words);
    expect(r.parts).toEqual([{ zh: "你好世界" }]);
    expect(r.pinyin).toBe("Nǐ hǎo shì jiè");
  });
  it("tách parts theo dấu phẩy, giữ dấu ở part trước", () => {
    const r = buildSentenceParts("你好，世界！", words);
    expect(r.parts).toEqual([{ zh: "你好，" }, { zh: "世界！" }]);
    expect(r.pinyin).toBe("Nǐ hǎo, shì jiè!");
  });
  it("zh chứa ký tự python bỏ qua (số) không crash", () => {
    const r = buildSentenceParts("你好5世界", [...words, { zh: "5", py: [] }]);
    expect(r.parts).toEqual([{ zh: "你好5世界" }]);
    expect(r.pinyin).toBe("Nǐ hǎo shì jiè");
  });
});
