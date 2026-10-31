import { describe, expect, it } from "vitest";
import { countHanChars, readingSqlRows } from "../gen-reading-seed.mts";
import type { ReadingPassage } from "../gen-reading-seed.mts";

/* Fixture nhỏ: có ';' trong vi, apostrophe trong titleVi, JSON lồng vocab/questions. */
const passages: ReadingPassage[] = [
  {
    id: "hsk1-reading-1",
    book: "hsk1",
    lesson: "lesson-1",
    title: "我的家",
    titleVi: "Nhà của tôi — gia đình",
    sentences: [
      { zh: "我家在北京。", py: "Wǒ jiā zài Běijīng.", vi: "Nhà tôi ở Bắc Kinh." },
      { zh: "我家有五个人。", py: "Wǒ jiā yǒu wǔ ge rén.", vi: "Nhà có; năm người." },
    ],
    vocab: [{ word: "家", py: "jiā", vi: "nhà" }],
    questions: [
      { q: "我家有几口人？", qVi: "Nhà tôi có mấy người?", options: ["五口", "三口"], answer: 0, evidence: [{ si: 1, s: 0, e: 3 }] },
    ],
  },
  {
    id: "hsk1-reading-2",
    book: "hsk1",
    lesson: "lesson-2",
    title: "买东西",
    titleVi: "Mua sắm",
    sentences: [{ zh: "这个多少钱？", py: "Zhège duōshao qián?", vi: "Cái này bao nhiêu tiền?" }],
    vocab: [],
    questions: [],
  },
];

const audioIndex = {
  "hsk1-reading-1": {
    sentences: [
      { audio: "sent-1.mp3", durSec: 2.41 },
      { audio: "sent-2.mp3", durSec: 3.6 },
    ],
  },
  "hsk1-reading-2": { sentences: [{ audio: "sent-1.mp3", durSec: 1.9 }] },
};

describe("readingSqlRows (seed content_readings)", () => {
  const rows = readingSqlRows(passages, audioIndex);

  it("sinh INSERT OR REPLACE INTO content_readings cho từng passage", () => {
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatch(/^INSERT OR REPLACE INTO content_readings /);
    expect(rows[0]).toContain("'hsk1-reading-1'");
    expect(rows[1]).toContain("'hsk1-reading-2'");
  });

  it("level/ord/audio_dir/chars/duration_sec đúng", () => {
    // chars hsk1-reading-1: 我家在北京 = 5 Han, 我家有五个人 = 6 Han
    expect(rows[0]).toContain("'audio/reading/hsk1-reading-1', 11, 6");
    expect(rows[1]).toContain("'audio/reading/hsk1-reading-2', 5, 2"); // 这个多少钱 = 5 Han, round(1.9)
  });

  it("JSON column không chứa ';' trần (chỉ \\u003b) và chứa \\u003b khi data có ';'", () => {
    for (const line of rows) {
      // bỏ chuỗi \u003b đã mã hoá rồi đếm ';' còn lại — chỉ được phép dấu ';' kết thúc statement
      const stripped = line.replace(/\\u003b/g, "");
      expect(stripped.endsWith(";")).toBe(true);
      expect(stripped.slice(0, -1)).not.toContain(";");
    }
    expect(rows[0]).toContain("\\u003b");
  });

  it("apostrophe trong column thường escape thành ''", () => {
    const apostrophePassage: ReadingPassage[] = [
      { ...passages[0], titleVi: "Nhà của tôi's ABC" },
    ];
    const out = readingSqlRows(apostrophePassage, null);
    expect(out[0]).toContain("Nhà của tôi''s ABC");
  });

  it("chạy 2 lần cùng output (idempotent theo INSERT OR REPLACE)", () => {
    expect(readingSqlRows(passages, audioIndex)).toEqual(rows);
  });

  it("audio-index không tồn tại → audio null + durSec 0 từng câu, duration_sec 0", () => {
    const out = readingSqlRows(passages, null);
    expect(out[0]).toContain('"audio":null');
    expect(out[0]).toContain('"durSec":0');
    expect(out[0]).toContain("'audio/reading/hsk1-reading-1', 11, 0");
    // câu vẫn giữ zh/py/vi
    expect(out[0]).toContain("Wǒ jiā zài Běijīng.");
  });

  it("audio-index thiếu passage/câu → fallback null/0 cho phần thiếu", () => {
    const partial = { "hsk1-reading-1": { sentences: [{ audio: "sent-1.mp3", durSec: 2.4 }] } };
    const out = readingSqlRows(passages, partial);
    expect(out[0]).toContain('"audio":"sent-1.mp3"');
    expect(out[0]).toContain('"durSec":2.4');
    // câu 2 của reading-1 và cả reading-2 thiếu → null/0
    expect(out[0]).toContain('"durSec":0');
    expect(out[1]).toContain('"audio":null');
  });
});

describe("countHanChars", () => {
  it("chỉ đếm ký tự Hán, bỏ dấu câu và latin", () => {
    expect(countHanChars("我家在北京。")).toBe(5);
    expect(countHanChars("Wǒ jiā! 123 这个多少钱？")).toBe(5);
    expect(countHanChars("")).toBe(0);
  });
});
