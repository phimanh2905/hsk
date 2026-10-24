import { describe, expect, it } from "vitest";
import { buildWord } from "../src/vocab-word";
import { buildVocabPrompt, parseVocabResponse } from "../src/vocab-draft";
import { vocab } from "../../../src/content/vocab";

const CHUNK = [
  { hanzi: "你好", pinyin: "nǐ hǎo" },
  { hanzi: "谢谢", pinyin: "xièxie" }
];

describe("buildWord", () => {
  it("khớp 1:1 word 0 lesson-1 hsk1 (seed hiện có)", () => {
    const w = buildWord("你好", "ni3 hao3", "NHĨ HẢO", "Xin chào", "Cụm từ", "李明，你好。", "li3 ming2 , ni3 hao3 .", "Chào Lý Minh");
    expect(w).toEqual(vocab.hsk1["lesson-1"].words[0]);
  });

  it("pinyin đã có dấu giữ nguyên", () => {
    const w = buildWord("好", "hǎo", "HẢO", "Tốt", "Tính từ", "你好。", "nǐ hǎo .", "Xin chào");
    expect(w.pinyin).toBe("hǎo");
    expect(w.example.pinyinPerChar).toEqual([
      { c: "你", py: "nǐ" },
      { c: "好", py: "hǎo" },
      { c: "。", py: "。" }
    ]);
  });
});

describe("buildVocabPrompt", () => {
  const chunk = Array.from({ length: 20 }, (_, i) => ({ hanzi: `字${i}`, pinyin: `zì${i}` }));
  const messages = buildVocabPrompt(3, chunk);

  it("có system + user", () => {
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
  });

  it("system yêu cầu JSON words + schema fields + pos enum", () => {
    const s = messages[0].content;
    expect(s).toContain('{"words":[...]}');
    for (const f of ["hanzi", "hanViet", "meaning", "pos", "exZh", "exPy", "exVi"]) expect(s).toContain(f);
    expect(s).toContain("CHỮ IN HOA");
    for (const p of ["Danh từ", "Động từ", "Tính từ", "Phó từ", "Đại từ", "Số từ", "Lượng từ", "Trợ từ", "Liên từ", "Thán từ", "Hậu tố", "Cụm từ"])
      expect(s).toContain(p);
  });

  it("user chứa đúng 20 hanzi của chunk dạng JSON list", () => {
    const user = messages[1].content;
    const list = JSON.parse(user) as { hanzi: string }[];
    expect(list).toHaveLength(20);
    expect(list[0]).toEqual({ hanzi: "字0", pinyin: "zì0" });
  });

  it("prompt cấm chép nội dung có bản quyền", () => {
    expect(messages[0].content + messages[1].content).toContain("bản quyền");
  });
});

describe("parseVocabResponse", () => {
  it("parse response hợp lệ ra đúng thứ tự, qua buildWord", () => {
    const content = JSON.stringify({
      words: [
        {
          hanzi: "你好", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ",
          exZh: "李明，你好。", exPy: "li3 ming2 , ni3 hao3 .", exVi: "Chào Lý Minh"
        },
        {
          hanzi: "谢谢", hanViet: "TẠ TẠ", meaning: "Cảm ơn", pos: "Động từ",
          exZh: "老师，谢谢您。", exPy: "lao3 shi1 , xie4 xie5 nin2 .", exVi: "Thưa thầy, cảm ơn thầy"
        }
      ]
    });
    const words = parseVocabResponse(1, CHUNK, content);
    expect(words.map((w) => w.hanzi)).toEqual(["你好", "谢谢"]);
    expect(words[0]).toEqual(vocab.hsk1["lesson-1"].words[0]);
  });

  it("thiếu 1 từ -> throw liệt kê hanzi thiếu", () => {
    const content = JSON.stringify({
      words: [
        { hanzi: "你好", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ", exZh: "你好。", exPy: "nǐ hǎo .", exVi: "Xin chào" }
      ]
    });
    expect(() => parseVocabResponse(1, CHUNK, content)).toThrow(/谢谢/);
  });

  it("tứ tự sai -> throw", () => {
    const mk = (hanzi: string) =>
      JSON.stringify({
        words: [
          { hanzi, hanViet: "X", meaning: "y", pos: "Danh từ", exZh: "你好。", exPy: "nǐ hǎo .", exVi: "z" },
          { hanzi: "khác", hanViet: "X", meaning: "y", pos: "Danh từ", exZh: "你好。", exPy: "nǐ hǎo .", exVi: "z" }
        ]
      });
    expect(() => parseVocabResponse(1, CHUNK, mk("谢谢"))).toThrow(/thứ tự/);
  });

  it("pos sai -> throw kèm index + hanzi", () => {
    const content = JSON.stringify({
      words: [
        { hanzi: "你好", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "danh tu", exZh: "李明，你好。", exPy: "li3 ming2 , ni3 hao3 .", exVi: "Chào Lý Minh" },
        { hanzi: "谢谢", hanViet: "TẠ TẠ", meaning: "Cảm ơn", pos: "Động từ", exZh: "谢谢。", exPy: "xie4 xie5 .", exVi: "Cảm ơn" }
      ]
    });
    expect(() => parseVocabResponse(1, CHUNK, content)).toThrow(/你好/);
    expect(() => parseVocabResponse(1, CHUNK, content)).toThrow(/pos/);
  });

  it("pinyinPerChar sai độ dài -> throw", () => {
    const content = JSON.stringify({
      words: [
        { hanzi: "你好", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ", exZh: "李明，你好。", exPy: "li3 ming2", exVi: "Chào Lý Minh" },
        { hanzi: "谢谢", hanViet: "TẠ TẠ", meaning: "Cảm ơn", pos: "Động từ", exZh: "谢谢。", exPy: "xie4 xie5 .", exVi: "Cảm ơn" }
      ]
    });
    expect(() => parseVocabResponse(1, CHUNK, content)).toThrow(/pinyinPerChar/);
  });
});
