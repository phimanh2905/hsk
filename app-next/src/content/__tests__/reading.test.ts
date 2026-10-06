import { describe, it, expect } from "vitest";
import {
  READING_LIB,
  READING_ARTICLES,
  READING_LEVELS,
  READING_CATS,
  type ReadingCat,
} from "../reading";

const hanziCount = (z: string) => (z.match(/[\u4e00-\u9fff]/g) ?? []).length;

describe("READING_LIB (redesign /reading 2026-10-05)", () => {
  it("đủ 7 item, id duy nhất, lv/cat hợp lệ", () => {
    expect(READING_LIB).toHaveLength(7);
    const ids = READING_LIB.map((i) => i.id);
    expect(new Set(ids).size).toBe(7);
    expect(ids).toEqual(["tea", "chongyang", "interview", "frog", "hsk4mock", "morning", "demo-1"]);
    for (const item of READING_LIB) {
      expect(READING_LEVELS).toContain(item.lv);
      expect(READING_CATS.some((c) => c.key === item.cat)).toBe(true);
      expect(item.min).toBeGreaterThan(0);
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.py.length).toBeGreaterThan(0);
      expect(item.vi.length).toBeGreaterThan(0);
      expect(item.ex.length).toBeGreaterThan(0);
    }
  });
});

describe("READING_ARTICLES (data 100%)", () => {
  it("mọi id trong LIB đều có article thật", () => {
    for (const item of READING_LIB) {
      expect(READING_ARTICLES[item.id], `missing article ${item.id}`).toBeDefined();
    }
  });

  it("mọi từ trong mọi câu đủ {z,p,h,m} không rỗng", () => {
    for (const [id, article] of Object.entries(READING_ARTICLES)) {
      expect(article.sentences.length).toBeGreaterThanOrEqual(2);
      for (const sentence of article.sentences) {
        for (const w of sentence) {
          expect(w.z.trim(), `${id}: z rỗng`).not.toBe("");
          expect(w.p.trim(), `${id}/${w.z}: p rỗng`).not.toBe("");
          expect(w.h.trim(), `${id}/${w.z}: h rỗng`).not.toBe("");
          expect(w.m.trim(), `${id}/${w.z}: m rỗng`).not.toBe("");
        }
      }
    }
  });

  it("mọi từ: h (Hán-Việt) viết hoa toàn bộ (kể cả dấu tiếng Việt)", () => {
    for (const [id, article] of Object.entries(READING_ARTICLES)) {
      for (const sentence of article.sentences) {
        for (const w of sentence) {
          expect(w.h, `${id}/${w.z}: h không viết hoa: "${w.h}"`).toMatch(/^[A-ZÀ-ỸĐ ]+$/u);
        }
      }
    }
  });

  it("mọi quiz: answer trong range, đủ explanation, options sạch prefix 'A. '", () => {
    for (const [id, article] of Object.entries(READING_ARTICLES)) {
      expect(article.quiz.length).toBeGreaterThanOrEqual(2);
      for (const quiz of article.quiz) {
        expect(quiz.answer).toBeGreaterThanOrEqual(0);
        expect(quiz.answer).toBeLessThan(quiz.options.length);
        expect(quiz.explanation.trim(), `${id}: thiếu explanation`).not.toBe("");
        for (const opt of quiz.options) {
          expect(opt).not.toMatch(/^A\. /);
        }
      }
    }
  });

  it("n của mỗi LIB item ≈ tổng số chữ Hán trong article (±20%)", () => {
    for (const item of READING_LIB) {
      const article = READING_ARTICLES[item.id];
      const actual = article.sentences.reduce((sum, s) => sum + s.reduce((n, w) => n + hanziCount(w.z), 0), 0);
      expect(
        Math.abs(item.n - actual) / actual,
        `${item.id}: n=${item.n} vs actual=${actual}`
      ).toBeLessThan(0.2);
    }
  });

  it("demo-1 hấp thụ demoDoc cũ: 13 câu, 3 quiz, câu đầu giữ nguyên", () => {
    const demo = READING_ARTICLES["demo-1"];
    expect(demo.sentences).toHaveLength(13);
    expect(demo.quiz).toHaveLength(3);
    expect(demo.sentences[0].map((w) => w.z).join("")).toBe("我一个人住在一间小小的公寓里");
  });
});

describe("READING_LEVELS + READING_CATS", () => {
  it("6 mức HSK đúng thứ tự", () => {
    expect(READING_LEVELS).toEqual(["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"]);
  });
  it("4 thể loại + label VI", () => {
    expect(READING_CATS.map((c) => c.key as ReadingCat)).toEqual(["daily", "culture", "fable", "exam"]);
    expect(READING_CATS.map((c) => c.label)).toEqual(["Đời sống", "Văn hoá", "Ngụ ngôn", "Luyện đề"]);
  });
});
