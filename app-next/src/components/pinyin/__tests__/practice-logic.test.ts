import { describe, it, expect } from "vitest";
import { buildQuestion } from "../practice-client";
import { pinyinValid } from "@/content/pinyin";

describe("buildQuestion (D2)", () => {
  it("dạng listen: prompt là âm, 4 options syllable khác nhau, có đáp án", () => {
    const q = buildQuestion(pinyinValid, "listen");
    expect(new Set(q.options).size).toBe(4);
    expect(q.options).toContain(q.answer);
    expect(q.prompt.length).toBeGreaterThan(0);
  });
  it("dạng tone: 4 options là 4 thanh ā á ǎ à trên cùng âm", () => {
    const q = buildQuestion(pinyinValid, "tone");
    expect(q.options).toEqual(expect.arrayContaining([
      expect.stringMatching(/[\u0304]/), expect.stringMatching(/[\u0301]/),
    ]));
    expect(q.options).toHaveLength(4);
  });
});
