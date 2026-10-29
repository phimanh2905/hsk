import { describe, expect, it } from "vitest";
import { generatedLessons } from "../roadmap-generated";

describe("roadmap-generated", () => {
  it("đủ 27/40/41/41/45 bài cho hsk1..hsk5, không có vocab body", () => {
    const byBook = new Map<string, number>();
    for (const l of generatedLessons) byBook.set(l.book, (byBook.get(l.book) ?? 0) + 1);
    expect(byBook.get("hsk1")).toBe(27);
    expect(byBook.get("hsk2")).toBe(40);
    expect(byBook.get("hsk3")).toBe(41);
    expect(byBook.get("hsk4")).toBe(41);
    expect(byBook.get("hsk5")).toBe(45);
    expect(generatedLessons.every((l) => /^[a-z0-9-]+$/.test(l.page))).toBe(true);
    expect(generatedLessons[0]).toMatchObject({ book: "hsk1", page: "lesson-1" });
    expect(generatedLessons[0].title.length).toBeGreaterThan(0);
    expect(generatedLessons[0].wordCount).toBeGreaterThan(0);
    // metadata only — không nhúng từ vựng
    expect(JSON.stringify(generatedLessons).length).toBeLessThan(40_000);
  });
});
