import { describe, expect, it } from "vitest";
import { sentenceToRow, buildSeedSql } from "../build-shadowing-from-youtube";

describe("sentenceToRow", () => {
  it("đúng shape row subtitles", () => {
    const row = sentenceToRow(2, {
      zh: "你好，世界！",
      start: 0.5,
      end: 1.5,
      words: [
        { zh: "你好", py: ["nǐ", "hǎo"] },
        { zh: "世界", py: ["shì", "jiè"] },
      ],
    });
    expect(row).toEqual({
      n: 2,
      start: 0.5,
      end: 1.5,
      parts: [{ zh: "你好，" }, { zh: "世界！" }],
      pinyin: "Nǐ hǎo, shì jiè!",
      vi: "",
    });
  });

  it("vi luôn rỗng (owner bổ sung tay)", () => {
    expect(
      sentenceToRow(1, { zh: "好", start: 0, end: 1, words: [{ zh: "好", py: ["hǎo"] }] }).vi
    ).toBe("");
  });
});

describe("buildSeedSql", () => {
  it("mỗi video 1 dòng INSERT OR REPLACE, escape nháy đơn", () => {
    const sql = buildSeedSql([
      {
        videoId: "EA3rwvr99Q0",
        sentences: [
          {
            n: 1,
            start: 0,
            end: 1,
            parts: [{ zh: "你好。" }],
            pinyin: "Nǐ hǎo.",
            vi: "",
          },
        ],
      },
    ]);
    const json = JSON.stringify([
      { n: 1, start: 0, end: 1, parts: [{ zh: "你好。" }], pinyin: "Nǐ hǎo.", vi: "" },
    ]);
    expect(sql).toBe(
      `INSERT OR REPLACE INTO content_shadowing_subtitles (video_id, sentences) VALUES ('EA3rwvr99Q0', '${json}');\n`
    );
    // escape dấu ' trong chuỗi SQL (trường hợp videoId/pinyin chứa nháy đơn)
    const tricky = buildSeedSql([{ videoId: "abc", sentences: [] }]);
    expect(tricky).toContain("VALUES ('abc', '[]')");
  });
});
