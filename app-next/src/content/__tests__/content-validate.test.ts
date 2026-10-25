import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { books, courses } from "../courses";
import { vocab } from "../vocab";
import { vocabSchema, courseSchema } from "../schema";
import { EXPECTED_CUMULATIVE } from "../../../scripts/content/src/hsk-list";

/* Data HSK 3.0 (W2.2/W2.3) nằm ở scripts/content/data/vocab — khi đủ data và
   chạy gen-vocab-static.mts, static vocab/courses được regen theo data này.
   Test assert ĐỘNG theo data nếu lessons-hsk1.json đã có; trước đó giữ assert
   trên bản demo cũ để suite luôn xanh. */
const dataDir = path.resolve(process.cwd(), "scripts/content/data/vocab");
const lessons1Path = path.join(dataDir, "lessons-hsk1.json");
type LessonSplit = { title: string; hanziList: string[] }[];
const lessonsHsk1: LessonSplit | null = existsSync(lessons1Path)
  ? (JSON.parse(readFileSync(lessons1Path, "utf8")) as LessonSplit)
  : null;
const totalHsk1 = lessonsHsk1 ? lessonsHsk1.reduce((a, l) => a + l.hanziList.length, 0) : 0;

describe("courses", () => {
  it("đủ 7 sách đúng meta SPEC-01", () => {
    expect(books.map((b) => b.slug)).toEqual(["hsk1", "hsk2", "hsk3", "hsk4", "hsk5", "hsk6", "hsk79"]);
    if (lessonsHsk1) {
      expect(books[0]).toMatchObject({ slug: "hsk1", name: "Bye HSK 1", lessons: lessonsHsk1.length });
      expect(books[0].cardMeta).toContain(`${totalHsk1} từ vựng`);
    } else {
      expect(books[0]).toMatchObject({ slug: "hsk1", name: "Bye HSK 1", cardMeta: "497 từ vựng · 41 mẫu", lessons: 27 });
    }
    expect(books[6]).toMatchObject({ slug: "hsk79", cardMeta: "5606 từ vựng", lessons: 30 });
  });
  it("hsk1 đủ bài vocab, titles + số từ khớp data chia bài", () => {
    const pages = courses.hsk1.pages.filter((p) => p.skill === "vocab");
    if (lessonsHsk1) {
      expect(pages).toHaveLength(lessonsHsk1.length);
      pages.forEach((p, i) => {
        expect(p.pageId).toBe("lesson-" + (i + 1));
        expect(p.title).toBe(lessonsHsk1[i]!.title);
        expect(p.words).toBe(lessonsHsk1[i]!.hanziList.length);
      });
    } else {
      expect(pages).toHaveLength(15);
      expect(pages[0]).toMatchObject({ pageId: "lesson-1", title: "Xin chào!", words: 13 });
      expect(pages[6]?.title).toBe("Tôi tan làm lúc 6 rưỡi tối");
    }
  });
  it("zod course schema hợp lệ cho 7 sách", () => {
    for (const b of books) expect(courseSchema.safeParse(courses[b.slug]).success).toBe(true);
  });
});

describe("vocab", () => {
  it("bài 1 HSK1 khớp data chia bài, đủ EXPECTED_CUMULATIVE[1] từ", () => {
    const l = vocab.hsk1["lesson-1"];
    if (lessonsHsk1) {
      expect(l.title).toBe(lessonsHsk1[0]!.title);
      expect(l.words).toHaveLength(lessonsHsk1[0]!.hanziList.length);
      const total = Object.values(vocab.hsk1).reduce((a, les) => a + les.words.length, 0);
      // Ruling W2: 3 entry homograph (地/还/干 cặp 2) không gán bài — tổng bài = 497
      expect(total).toBe(497);
    } else {
      expect(l.title).toBe("Xin chào!");
      expect(l.words).toHaveLength(13);
      expect(l.words[0]).toMatchObject({
        hanzi: "你好", pinyin: "nǐ hǎo", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ",
      });
      expect(l.words[0].example).toMatchObject({ zh: "李明，你好。", vi: "Chào Lý Minh" });
      expect(l.words[0].example.pinyinPerChar[0]).toEqual({ c: "李", py: "lǐ" });
    }
  });
  it("mọi lesson có zod schema hợp lệ (pinyin/meaning/example bắt buộc)", () => {
    for (const book of Object.keys(vocab)) {
      for (const [pageId, lesson] of Object.entries(vocab[book])) {
        const res = vocabSchema.safeParse(lesson);
        if (!res.success) throw new Error(`schema fail: ${book}/${pageId}: ${res.error.message}`);
      }
    }
  });
  it("pinyinPerChar khớp 1-1 số ký tự của câu zh", () => {
    for (const book of Object.values(vocab)) {
      for (const lesson of Object.values(book)) {
        for (const w of lesson.words) {
          expect(w.example.pinyinPerChar).toHaveLength(Array.from(w.example.zh).length);
        }
      }
    }
  });
});
