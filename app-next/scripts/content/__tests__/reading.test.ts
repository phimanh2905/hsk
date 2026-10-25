/* Test validateReadingPassage thuần (W3 T8): 12–20 câu, 3–5 questions (3 options,
   answer 0–2), vocab 5–8 từ, title/titleVi khác rỗng, id khớp book/stt.
   OOV hanzi theo cumulative level chỉ là warning (oov != rỗng, ok vẫn true). */
import { describe, expect, it } from "vitest";
import { readingId, validateReadingPassage, type ReadingPassageRecord } from "../src/reading";

function validPassage(): ReadingPassageRecord {
  const zh = [
    "我住在一个小公寓。",
    "每天早上七点起床。",
    "我先喝一杯水。",
    "然后我去吃早饭。",
    "早饭是鸡蛋和面包。",
    "八点半我去上班。",
    "我坐地铁去公司。",
    "车上我喜欢看书。",
    "中午我和同事吃饭。",
    "下午我工作很忙。",
    "晚上回家我自己做菜。",
    "我做的菜很好吃。",
    "吃完饭我看电视剧。",
    "一个人的生活很简单。",
    "但是我觉得很幸福。"
  ];
  return {
    id: "hsk1-reading-1",
    book: "hsk1",
    lesson: "lesson-1",
    title: "My simple life",
    titleVi: "Cuộc sống giản đơn",
    sentences: zh.map((s) => ({ zh: s, py: "pinyin", vi: "câu" })),
    vocab: [
      { word: "公寓", py: "gōngyù", vi: "căn hộ" },
      { word: "起床", py: "qǐchuáng", vi: "ngủ dậy" },
      { word: "地铁", py: "dìtiě", vi: "tàu điện" },
      { word: "同事", py: "tóngshì", vi: "đồng nghiệp" },
      { word: "幸福", py: "xìngfú", vi: "hạnh phúc" }
    ],
    questions: [
      { q: "我住在哪里？", qVi: "Tôi sống ở đâu?", options: ["公寓", "学校", "酒店"], answer: 0 },
      { q: "我几点起床？", qVi: "Tôi ngủ dậy mấy giờ?", options: ["六点", "七点", "八点"], answer: 1 },
      { q: "我觉得生活怎么样？", qVi: "Tôi thấy cuộc sống thế nào?", options: ["很累", "很吵", "很简单"], answer: 2 }
    ]
  };
}

/* VOCAB cumulative: mọi hanzi xuất hiện trong passage hợp lệ (câu + question + từ vựng).
   OOV test dùng chữ 咖啡厅热闹 — cố tình KHÔNG có trong set này. */
const VOCAB = new Set(
  (() => {
    const p = validPassage();
    const chars = new Set<string>();
    const collect = (t: string) => (t.match(/[\u4e00-\u9fff]/g) ?? []).forEach((c) => chars.add(c));
    p.sentences.forEach((s) => collect(s.zh));
    p.questions.forEach((q) => collect(q.q));
    p.vocab.forEach((v) => collect(v.word));
    return [...chars];
  })()
);

describe("readingId", () => {
  it("ghép book-reading-stt", () => {
    expect(readingId("hsk1", 1)).toBe("hsk1-reading-1");
    expect(readingId("hsk3", 12)).toBe("hsk3-reading-12");
  });
});

describe("validateReadingPassage — hợp lệ", () => {
  it("passage đủ điều kiện -> ok true, oov rỗng", () => {
    const r = validateReadingPassage(validPassage(), VOCAB);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.oov).toEqual([]);
  });

  it("OOV hanzi (từ chưa học) chỉ là warning, ok vẫn true", () => {
    const p = validPassage();
    p.sentences = [...p.sentences.slice(0, 14), { zh: "咖啡厅很热闹。", py: "py", vi: "vi" }];
    const r = validateReadingPassage(p, VOCAB);
    expect(r.ok).toBe(true);
    expect(r.oov.length).toBeGreaterThan(0);
    expect(r.oov).toContain("咖");
  });
});

describe("validateReadingPassage — lỗi", () => {
  it("11 câu -> lỗi (dưới 12)", () => {
    const p = validPassage();
    p.sentences = p.sentences.slice(0, 11);
    const r = validateReadingPassage(p, VOCAB);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("12"))).toBe(true);
  });

  it("21 câu -> lỗi (trên 20)", () => {
    const p = validPassage();
    p.sentences = [
      ...p.sentences,
      { zh: "我再补一句话。", py: "py", vi: "vi" },
      { zh: "还要再来一句话。", py: "py", vi: "vi" },
      { zh: "最后补足二十一句。", py: "py", vi: "vi" },
      { zh: "这样就是二十一句。", py: "py", vi: "vi" },
      { zh: "多出来的一句很长。", py: "py", vi: "vi" },
      { zh: "凑够二十一句就行。", py: "py", vi: "vi" }
    ];
    expect(validateReadingPassage(p, VOCAB).ok).toBe(false);
  });

  it("6 questions -> lỗi", () => {
    const p = validPassage();
    p.questions = [
      ...p.questions,
      { q: "第4题？", qVi: "Câu 4?", options: ["甲", "乙", "丙"], answer: 0 },
      { q: "第5题？", qVi: "Câu 5?", options: ["甲", "乙", "丙"], answer: 1 },
      { q: "第6题？", qVi: "Câu 6?", options: ["甲", "乙", "丙"], answer: 2 }
    ];
    const r = validateReadingPassage(p, VOCAB);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("questions"))).toBe(true);
  });

  it("2 questions -> lỗi", () => {
    const p = validPassage();
    p.questions = p.questions.slice(0, 2);
    expect(validateReadingPassage(p, VOCAB).ok).toBe(false);
  });

  it("question chỉ 2 options -> lỗi; 4 options -> lỗi", () => {
    const p = validPassage();
    p.questions[0]!.options = ["甲", "乙"];
    expect(validateReadingPassage(p, VOCAB).ok).toBe(false);
    const p2 = validPassage();
    p2.questions[0]!.options = ["甲", "乙", "丙", "丁"];
    expect(validateReadingPassage(p2, VOCAB).ok).toBe(false);
  });

  it("answer=3 -> lỗi; answer=-1 -> lỗi; answer=2 hợp lệ", () => {
    const p = validPassage();
    p.questions[0]!.answer = 3;
    const r = validateReadingPassage(p, VOCAB);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("answer"))).toBe(true);

    const p2 = validPassage();
    p2.questions[0]!.answer = -1;
    expect(validateReadingPassage(p2, VOCAB).ok).toBe(false);

    const p3 = validPassage();
    p3.questions[0]!.answer = 2;
    expect(validateReadingPassage(p3, VOCAB).ok).toBe(true);
  });

  it("vocab trống -> lỗi; vocab 9 từ -> lỗi; vocab 4 từ -> lỗi", () => {
    const p = validPassage();
    p.vocab = [];
    const r = validateReadingPassage(p, VOCAB);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("vocab"))).toBe(true);

    const p2 = validPassage();
    p2.vocab = [
      ...p2.vocab,
      { word: "面包", py: "miànbāo", vi: "bánh mì" },
      { word: "鸡蛋", py: "jīdàn", vi: "trứng" },
      { word: "公司", py: "gōngsī", vi: "công ty" },
      { word: "电视剧", py: "diànshìjù", vi: "phim truyền hình" }
    ];
    expect(validateReadingPassage(p2, VOCAB).ok).toBe(false);

    const p3 = validPassage();
    p3.vocab = p3.vocab.slice(0, 4);
    expect(validateReadingPassage(p3, VOCAB).ok).toBe(false);
  });

  it("title/titleVi rỗng -> lỗi", () => {
    const p = validPassage();
    p.title = "";
    expect(validateReadingPassage(p, VOCAB).ok).toBe(false);
    const p2 = validPassage();
    p2.titleVi = "  ";
    expect(validateReadingPassage(p2, VOCAB).ok).toBe(false);
  });

  it("id không khớp expectedStt -> lỗi; id sai dạng -> lỗi", () => {
    const p = validPassage();
    const r = validateReadingPassage(p, VOCAB, 1);
    p.id = "hsk1-reading-2";
    const r2 = validateReadingPassage(p, VOCAB, 1);
    expect(r.ok).toBe(true);
    expect(r2.ok).toBe(false);
    expect(r2.errors.some((e) => e.includes("id"))).toBe(true);

    const p3 = validPassage();
    p3.id = "hsk1/lesson-1";
    expect(validateReadingPassage(p3, VOCAB).ok).toBe(false);
  });

  it("câu thiếu zh/py/vi -> lỗi", () => {
    const p = validPassage();
    (p.sentences[0] as { py?: string }).py = "";
    expect(validateReadingPassage(p, VOCAB).ok).toBe(false);
  });

  it("question thiếu q/qVi hoặc options rỗng -> lỗi", () => {
    const p = validPassage();
    (p.questions[0] as { qVi?: string }).qVi = "";
    expect(validateReadingPassage(p, VOCAB).ok).toBe(false);
    const p2 = validPassage();
    p2.questions[1]!.options = [];
    expect(validateReadingPassage(p2, VOCAB).ok).toBe(false);
  });

  it("vocab thiếu word/py/vi -> lỗi", () => {
    const p = validPassage();
    (p.vocab[0] as { vi?: string }).vi = "";
    expect(validateReadingPassage(p, VOCAB).ok).toBe(false);
  });
});
