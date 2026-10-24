import { describe, expect, it } from "vitest";
import { splitSentences, type WhisperToken } from "../split-sentences";

const tok = (text: string, start: number, end: number): WhisperToken => ({ text, start, end });

describe("splitSentences", () => {
  it("cắt câu theo dấu 。？！", () => {
    const s = splitSentences([tok("你", 0, 0.3), tok("好", 0.3, 0.6), tok("。", 0.6, 0.7), tok("再", 1, 1.3), tok("见", 1.3, 1.6), tok("！", 1.6, 1.7)]);
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ zh: "你好。", start: 0, end: 0.7 });
    expect(s[1]).toMatchObject({ zh: "再见！", start: 1, end: 1.7 });
  });
  it("cắt khi gap > maxGap (mặc định 1.5s)", () => {
    const s = splitSentences([tok("你好", 0, 0.5), tok("大家好", 3, 3.6), tok("。", 3.6, 3.7)]);
    expect(s).toHaveLength(2);
    expect(s[0].zh).toBe("你好");
    expect(s[1].zh).toBe("大家好。");
  });
  it("cắt câu quá maxLen ký tự", () => {
    const tokens = Array.from({ length: 40 }, (_, i) => tok("字", i * 0.1, i * 0.1 + 0.05));
    const s = splitSentences(tokens, { maxLen: 20 });
    expect(s.every((x) => x.zh.length <= 21)).toBe(true);
    expect(s.length).toBeGreaterThan(1);
  });
  it("bỏ token rỗng và trả mảng rỗng cho input rỗng", () => {
    expect(splitSentences([])).toEqual([]);
    expect(splitSentences([tok("", 0, 0.1), tok("。", 0.1, 0.2)])).toEqual([]);
  });
});
