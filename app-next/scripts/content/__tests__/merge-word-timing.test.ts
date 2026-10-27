import { describe, expect, it } from "vitest";
import { wordsForSentence } from "../merge-word-timing.mts";
import type { SentenceDraft, WhisperToken } from "../split-sentences.ts";

const tok = (text: string, start: number, end: number): WhisperToken => ({ text, start, end });

describe("wordsForSentence", () => {
  it("gán py theo số chữ CJK của từng token, ms làm tròn", () => {
    const draft: SentenceDraft = {
      zh: "我没你们",
      start: 0.1, end: 2.0,
      tokens: [tok("我", 0.1, 0.5), tok("没", 0.5, 1.2), tok("你们", 1.2, 2.0)],
    };
    expect(wordsForSentence(draft, ["wǒ", "méi", "nǐ", "men"])).toEqual([
      { zh: "我", py: "wǒ", startMs: 100, endMs: 500 },
      { zh: "没", py: "méi", startMs: 500, endMs: 1200 },
      { zh: "你们", py: "nǐ men", startMs: 1200, endMs: 2000 },
    ]);
  });
  it("token chỉ dấu câu/khoảng trắng → bỏ, không tiêu thụ âm tiết", () => {
    const draft: SentenceDraft = {
      zh: "我，你们",
      start: 0, end: 2,
      tokens: [tok("我", 0, 0.5), tok("，", 0.5, 0.6), tok("你们", 0.6, 2)],
    };
    const words = wordsForSentence(draft, ["wǒ", "nǐ", "men"]);
    expect(words.map((w) => w.zh)).toEqual(["我", "你们"]);
  });
  it("py cạn (ASR lệch) → py rỗng, vẫn giữ timing", () => {
    const draft: SentenceDraft = { zh: "我们", start: 0, end: 1, tokens: [tok("我们", 0, 1)] };
    expect(wordsForSentence(draft, [])).toEqual([{ zh: "我们", py: "", startMs: 0, endMs: 1000 }]);
  });
  it("word ngoài khoảng [start, end] của câu → bỏ (spec: verify khi merge)", () => {
    const draft: SentenceDraft = { zh: "我们", start: 1, end: 2, tokens: [tok("我", 0, 0.5), tok("们", 1, 2)] };
    expect(wordsForSentence(draft, ["wǒ", "men"]).map((w) => w.zh)).toEqual(["们"]);
  });
  it("py nhiều hơn chữ (dư âm tiết) → cắt đúng số chữ", () => {
    const draft: SentenceDraft = { zh: "我", start: 0, end: 1, tokens: [tok("我", 0, 1)] };
    expect(wordsForSentence(draft, ["wǒ", "men"])[0].py).toBe("wǒ");
  });
});
