import { describe, expect, it } from "vitest";
import { READING_LIB, type ReadingLibItem } from "@/content/reading";
import { ctaFor, filterLib, noteFor, type ReadingFilter } from "@/lib/reading/library";

const lib = READING_LIB;
const byId = (id: string) => lib.find((x) => x.id === id) as ReadingLibItem;

const base: ReadingFilter = { level: "all", cat: "all", q: "" };

describe("filterLib", () => {
  it("giữ nguyên thứ tự khi filter all/all/q rỗng", () => {
    expect(filterLib(lib, base, [])).toEqual(lib);
  });

  it("lọc theo level", () => {
    const out = filterLib(lib, { ...base, level: "HSK 4" }, []);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((x) => x.lv === "HSK 4")).toBe(true);
    expect(out.some((x) => x.id === "tea")).toBe(true);
  });

  it("lọc theo cat", () => {
    const out = filterLib(lib, { ...base, cat: "fable" }, []);
    expect(out.map((x) => x.id)).toEqual(["frog"]);
  });

  it('cat="saved" chỉ giữ bài có trong savedIds', () => {
    const out = filterLib(lib, { ...base, cat: "saved" }, ["chongyang", "morning"]);
    expect(out.map((x) => x.id)).toEqual(["chongyang", "morning"]);
  });

  it('cat="saved" + không có bài lưu → rỗng', () => {
    expect(filterLib(lib, { ...base, cat: "saved" }, [])).toEqual([]);
  });

  it("q khớp title (không phân biệt hoa/thường)", () => {
    const out = filterLib(lib, { ...base, q: "茶道" }, []);
    expect(out.map((x) => x.id)).toEqual(["tea"]);
  });

  it("q khớp pinyin", () => {
    const out = filterLib(lib, { ...base, q: "jǐng dǐ" }, []);
    expect(out.map((x) => x.id)).toEqual(["frog"]);
  });

  it("q khớp vi", () => {
    const out = filterLib(lib, { ...base, q: "phỏng vấn" }, []);
    expect(out.map((x) => x.id)).toEqual(["interview"]);
  });

  it("q khớp ex, không phân biệt hoa/thường", () => {
    const out = filterLib(lib, { ...base, q: "LEO NÚI" }, []);
    expect(out.map((x) => x.id)).toEqual(["chongyang"]);
  });

  it("kết hợp level + cat + q (AND)", () => {
    const out = filterLib(
      lib,
      { level: "HSK 4", cat: "culture", q: "trà" },
      [],
    );
    expect(out.map((x) => x.id)).toEqual(["tea"]);
  });

  it("kết hợp không khớp → rỗng", () => {
    expect(filterLib(lib, { level: "HSK 1", cat: "exam", q: "" }, [])).toEqual([]);
  });
});

describe("noteFor", () => {
  const item = byId("tea"); // nw: 8

  it("null → Chưa đọc", () => {
    expect(noteFor(item, null)).toBe("Chưa đọc · 8 từ mới");
  });

  it("pct=0 → Chưa đọc", () => {
    expect(noteFor(item, { pct: 0, quizDone: false })).toBe("Chưa đọc · 8 từ mới");
  });

  it("đang dở → Đang đọc dở (X%)", () => {
    expect(noteFor(item, { pct: 42, quizDone: false })).toBe("Đang đọc dở (42%)");
  });

  it("100% + quiz → Đã đọc 100% · Đạt quiz", () => {
    expect(noteFor(item, { pct: 100, quizDone: true })).toBe("Đã đọc 100% · Đạt quiz");
  });

  it("100% không quiz → Đã đọc 100%", () => {
    expect(noteFor(item, { pct: 100, quizDone: false })).toBe("Đã đọc 100%");
  });
});

describe("ctaFor", () => {
  it("null → Đọc ngay", () => {
    expect(ctaFor(null)).toBe("Đọc ngay");
  });
  it("pct=0 → Đọc ngay", () => {
    expect(ctaFor({ pct: 0, quizDone: false })).toBe("Đọc ngay");
  });
  it("đang dở → Đọc tiếp", () => {
    expect(ctaFor({ pct: 30, quizDone: false })).toBe("Đọc tiếp");
  });
  it("100% → Đọc lại", () => {
    expect(ctaFor({ pct: 100, quizDone: true })).toBe("Đọc lại");
  });
});
