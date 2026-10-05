import { describe, it, expect } from "vitest";
import { reviewData } from "../review";
import { dictionary } from "../dictionary";
import { hanziChars, hanziLevels } from "../hanzi";
import { notebooks } from "../notebooks";

describe("reviewData (SPEC-17)", () => {
  it("counts seeded 6 ô + last7 + dist đúng clone", () => {
    expect(reviewData.counts).toEqual([12, 34, 8, 41, 96, 191]);
    expect(reviewData.last7).toEqual([3, 5, 0, 8, 12, 4, 0]);
    expect(reviewData.dist).toEqual({ forgot: 8, hard: 5, good: 14, easy: 3 });
    expect(reviewData.total).toBe(30);
  });
  it("copy đổi tab đúng chuỗi verbatim + href route Next", () => {
    expect(reviewData.copy.vocab).toEqual({
      emptyDesc: "Bấm nút ⭐ cạnh mỗi từ trong bài học để thêm từ vào bộ thẻ ôn.",
      emptyLink: "Vào kệ sách →", emptyHref: "/course",
    });
    expect(reviewData.copy.grammar.emptyLink).toBe("Vào mục ngữ pháp →");
    expect(reviewData.copy.grammar.emptyHref).toBe("/course/hsk1?skill=grammar");
  });
});

describe("dictionary (SPEC-09)", () => {
  it("đủ 20 entries, nhóm 学习 đủ 5 kết quả", () => {
    expect(dictionary).toHaveLength(20);
    const group = dictionary.filter((e) => e.hanzi.startsWith("学习"));
    expect(group.map((e) => e.hanzi)).toEqual(["学习", "学习刻苦", "学习强国", "学习时报", "学习委员"]);
  });
  it("entry 学习 đúng nghĩa + phồn thể + ví dụ", () => {
    const e = dictionary[0];
    expect(e).toMatchObject({ hanzi: "学习", traditional: "學習", pos: "Động từ", level: "HSK 1" });
    expect(e.meanings[0]).toBe("học tập; học");
    expect(e.pinyinPerChar).toEqual(["xué", "xí"]);
    expect(e.examples[0]).toMatchObject({ zh: "我在学习汉语。", vi: "Tôi đang học tiếng Trung." });
  });
});

describe("hanzi data (SPEC-03)", () => {
  it("你 đầy đủ: 7 nét, bộ thủ 亻, 12 từ thực chiến", () => {
    const ni = hanziChars["你"];
    expect(ni).toMatchObject({ hanViet: "NHĨ", hanVietAlt: "NỄ", pinyin: "nǐ", level: "HSK 1", strokes: 7, radical: "亻", type: "Hội ý" });
    expect(ni.composition).toEqual(["亻", "尔"]);
    expect(ni.practical).toHaveLength(12);
    expect(ni.vocabInBook?.[0]).toMatchObject({ word: "你好", link: "/lesson/hsk1/lesson-1" });
  });
  it("levels đủ 8 pill (7 sách + Bộ thủ → /radicals)", () => {
    expect(hanziLevels).toHaveLength(8);
    expect(hanziLevels[0]).toMatchObject({ id: "hsk1", label: "HSK 1", count: "247 chữ Hán mới trong cuốn này" });
    expect(hanziLevels[7]).toMatchObject({ label: "214 Bộ thủ", href: "/radicals" });
  });
  it("bộ thủ 亻 có bản rút gọn (link composition hoạt động)", () => {
    expect(hanziChars["亻"]).toBeDefined();
  });
});

describe("notebooks (SPEC-18)", () => {
  it("vocab + grammar đúng chuỗi khuôn chung", () => {
    expect(notebooks.vocab).toMatchObject({ h1: "Sổ tay từ vựng", cta: "Tạo bộ mới", empty: "Chưa có bộ từ vựng nào", modalTitle: "Tạo bộ từ vựng mới", countUnit: "từ" });
    expect(notebooks.grammar).toMatchObject({ h1: "Sổ tay ngữ pháp", cta: "Tạo sổ tay mới", empty: "Chưa có sổ tay ngữ pháp nào", modalTitle: "Tạo sổ tay ngữ pháp mới", countUnit: "mẫu" });
  });
  it("3 sample vocab (128/64/45) + 2 sample grammar (12/8) + 12 rows mẫu", () => {
    expect(notebooks.vocab.samples.map((s) => [s.name, s.count])).toEqual([
      ["Từ vực HSK 3.0", 128], ["Từ trong sách giáo khoa", 64], ["Ngày thường giao tiếp", 45],
    ]);
    expect(notebooks.grammar.samples.map((s) => [s.name, s.count])).toEqual([
      ["Mẫu câu gọi thoại", 12], ["Ngữ pháp hay sai", 8],
    ]);
    expect(notebooks.vocab.samples[0].rows).toHaveLength(12);
    expect(notebooks.vocab.samples[0].rows[0]).toEqual({ hanzi: "时间", pinyin: "shíjiān", hanviet: "thời gian", meaning: "thời gian" });
  });
});
