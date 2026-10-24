/* TDD vocab-draft (Ruling 1+2): prompt không yêu cầu pinyin/hanViet/exPy;
   validateRawResponse thuần; parseVocabResponse derive deterministic qua rows stub. */
import { describe, expect, it } from "vitest";
import { assembleWords, buildVocabPrompt, validateRawResponse, parseVocabResponse } from "../src/vocab-draft";
import type { CharPy } from "../src/pinyin-derive";

const CHUNK = [
  { hanzi: "你好", pinyin: "nǐ hǎo" },
  { hanzi: "谢谢", pinyin: "xièxie" }
];

const CONTENT = JSON.stringify({
  words: [
    { hanzi: "你好", meaning: "Xin chào", pos: "Cụm từ", exZh: "李明，你好。", exVi: "Chào Lý Minh" },
    { hanzi: "谢谢", meaning: "Cảm ơn", pos: "Động từ", exZh: "老师，谢谢您。", exVi: "Thưa thầy, cảm ơn thầy" }
  ]
});

const ROWS: CharPy[][] = [
  [{ c: "你", py: "nǐ", t3: "ni3" }, { c: "好", py: "hǎo", t3: "hao3" }],
  [{ c: "谢", py: "xiè", t3: "xie4", t: "謝" }, { c: "谢", py: "xiè", t3: "xie4", t: "謝" }],
  [
    { c: "李", py: "lǐ", t3: "li3" }, { c: "明", py: "míng", t3: "ming2" },
    { c: "，", py: "，", t3: "，" }, { c: "你", py: "nǐ", t3: "ni3" },
    { c: "好", py: "hǎo", t3: "hao3" }, { c: "。", py: "。", t3: "。" }
  ],
  [
    { c: "老", py: "lǎo", t3: "lao3" }, { c: "师", py: "shī", t3: "shi1" },
    { c: "，", py: "，", t3: "，" }, { c: "谢", py: "xiè", t3: "xie4", t: "謝" },
    { c: "谢", py: "xiè", t3: "xie4", t: "謝" }, { c: "您", py: "nín", t3: "nin2" },
    { c: "。", py: "。", t3: "。" }
  ]
];

describe("buildVocabPrompt", () => {
  const chunk = Array.from({ length: 20 }, (_, i) => ({ hanzi: `字${i}`, pinyin: `zì${i}` }));
  const messages = buildVocabPrompt(3, chunk);

  it("có system + user", () => {
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
  });

  it("system chỉ yêu cầu hanzi/meaning/pos/exZh/exVi — KHÔNG pinyin/hanViet/exPy", () => {
    const s = messages[0].content;
    expect(s).toContain('{"words":[...]}');
    for (const f of ["hanzi", "meaning", "pos", "exZh", "exVi"]) expect(s).toContain(f);
    expect(s).not.toContain("hanViet");
    expect(s).not.toContain("exPy");
    expect(s).not.toContain("exPy");
    for (const p of ["Danh từ", "Động từ", "Tính từ", "Phó từ", "Đại từ", "Số từ", "Lượng từ", "Trợ từ", "Liên từ", "Thán từ", "Hậu tố", "Cụm từ"])
      expect(s).toContain(p);
  });

  it("user chỉ chứa hanzi (không pinyin)", () => {
    const list = JSON.parse(messages[1].content) as { hanzi: string; pinyin?: string }[];
    expect(list).toHaveLength(20);
    expect(list[0]).toEqual({ hanzi: "字0" });
  });

  it("prompt cấm chép nội dung có bản quyền", () => {
    expect(messages[0].content + messages[1].content).toContain("bản quyền");
  });
});

describe("validateRawResponse (pure)", () => {
  it("response hợp lệ -> raw words đúng thứ tự", () => {
    const raws = validateRawResponse(CHUNK, CONTENT);
    expect(raws.map((r) => r.hanzi)).toEqual(["你好", "谢谢"]);
    expect(raws[0].meaning).toBe("Xin chào");
  });

  it("thiếu 1 từ -> throw liệt kê hanzi thiếu", () => {
    const one = JSON.stringify({ words: [JSON.parse(CONTENT).words[0]] });
    expect(() => validateRawResponse(CHUNK, one)).toThrow(/谢谢/);
  });

  it("thứ tự sai -> throw", () => {
    const words = JSON.parse(CONTENT).words.slice().reverse();
    expect(() => validateRawResponse(CHUNK, JSON.stringify({ words }))).toThrow(/thứ tự/);
  });

  it("pos sai -> throw kèm index + hanzi", () => {
    const words = JSON.parse(CONTENT).words;
    words[1].pos = "danh tu";
    expect(() => validateRawResponse(CHUNK, JSON.stringify({ words }))).toThrow(/pos/);
    expect(() => validateRawResponse(CHUNK, JSON.stringify({ words }))).toThrow(/谢谢/);
  });

  it("thiếu field (exVi rỗng) -> throw field lỗi", () => {
    const words = JSON.parse(CONTENT).words;
    words[0].exVi = "";
    expect(() => validateRawResponse(CHUNK, JSON.stringify({ words }))).toThrow(/exVi/);
  });
});

describe("parseVocabResponse (derive qua rows stub)", () => {
  it("ghép pinyin dataset + hanViet map + perChar derive", async () => {
    const words = await parseVocabResponse(CHUNK, CONTENT, { rows: ROWS });
    expect(words[0].pinyin).toBe("nǐ hǎo"); // từ dataset, không phải LLM
    expect(words[0].hanViet).toBe("NỄ HẢO"); // map MIT (alt reading của NHĨ)
    expect(words[1].hanViet).toBe("TẠ TẠ");
    expect(words[0].example.pinyinPerChar).toEqual([
      { c: "李", py: "lǐ" }, { c: "明", py: "míng" }, { c: "，", py: "，" },
      { c: "你", py: "nǐ" }, { c: "好", py: "hǎo" }, { c: "。", py: "。" }
    ]);
  });

  it("response lỗi vẫn throw trước khi derive", async () => {
    const one = JSON.stringify({ words: [JSON.parse(CONTENT).words[0]] });
    await expect(parseVocabResponse(CHUNK, one, { rows: ROWS })).rejects.toThrow(/谢谢/);
  });
});

describe("assembleWords", () => {
  it("qua rows stub", async () => {
    const raws = validateRawResponse(CHUNK, CONTENT);
    const words = await assembleWords(CHUNK, raws, { rows: ROWS });
    expect(words).toHaveLength(2);
    expect(words[1].example.pinyinPerChar.at(-1)).toEqual({ c: "。", py: "。" });
  });
});
