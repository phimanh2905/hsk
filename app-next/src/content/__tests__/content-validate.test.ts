import { describe, it, expect } from "vitest";
import { books, courses } from "../courses";
import { vocab } from "../vocab";
import { vocabSchema, courseSchema } from "../schema";

describe("courses", () => {
  it("đủ 7 sách đúng meta SPEC-01", () => {
    expect(books.map((b) => b.slug)).toEqual(["hsk1", "hsk2", "hsk3", "hsk4", "hsk5", "hsk6", "hsk79"]);
    expect(books[0]).toMatchObject({ slug: "hsk1", name: "Bye HSK 1", cardMeta: "333 từ vựng · 41 mẫu", lessons: 15 });
    expect(books[6]).toMatchObject({ slug: "hsk79", cardMeta: "5606 từ vựng", lessons: 30 });
  });
  it("hsk1 đủ 15 bài vocab tên thật, bài 1 có 13 từ", () => {
    const pages = courses.hsk1.pages.filter((p) => p.skill === "vocab");
    expect(pages).toHaveLength(15);
    expect(pages[0]).toMatchObject({ pageId: "lesson-1", title: "Xin chào!", words: 13 });
    expect(pages[6]?.title).toBe("Tôi tan làm lúc 6 rưỡi tối");
  });
  it("zod course schema hợp lệ cho 7 sách", () => {
    for (const b of books) expect(courseSchema.safeParse(courses[b.slug]).success).toBe(true);
  });
});

describe("vocab", () => {
  it("bài 1 HSK1 đủ 13 từ, từ đầu đúng theo SPEC-02", () => {
    const l = vocab.hsk1["lesson-1"];
    expect(l.title).toBe("Xin chào!");
    expect(l.words).toHaveLength(13);
    expect(l.words[0]).toMatchObject({
      hanzi: "你好", pinyin: "nǐ hǎo", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ",
    });
    expect(l.words[0].example).toMatchObject({ zh: "李明，你好。", vi: "Chào Lý Minh" });
    expect(l.words[0].example.pinyinPerChar[0]).toEqual({ c: "李", py: "lǐ" });
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
    for (const w of vocab.hsk1["lesson-1"].words) {
      expect(w.example.pinyinPerChar).toHaveLength(Array.from(w.example.zh).length);
    }
  });
});
