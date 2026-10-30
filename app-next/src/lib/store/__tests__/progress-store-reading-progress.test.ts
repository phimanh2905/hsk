import { describe, it, expect, beforeEach } from "vitest";
import { progressStore } from "../progress-store";

describe("progressStore readingProgress", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("không có data → getReadingProgress trả {}", () => {
    expect(progressStore.getReadingProgress()).toEqual({});
  });

  it("saveReadingProgress: lần đầu tạo record đúng shape", () => {
    const rec = progressStore.saveReadingProgress("hsk1-reading-1", 4, 5);
    expect(rec).toEqual({ correct: 4, total: 5, attempts: 1, completedAt: expect.any(String) });
    expect(progressStore.getReadingProgress()["hsk1-reading-1"]).toEqual(rec);
  });

  it("save 2 lần → attempts 2, correct giữ max, total cập nhật, completedAt thay đổi", () => {
    const first = progressStore.saveReadingProgress("hsk1-reading-1", 3, 5);
    const second = progressStore.saveReadingProgress("hsk1-reading-1", 4, 5);
    expect(second.attempts).toBe(2);
    expect(second.correct).toBe(4);
    expect(second.total).toBe(5);
    expect(new Date(second.completedAt).getTime()).toBeGreaterThanOrEqual(new Date(first.completedAt).getTime());
  });

  it("lần sau điểm thấp hơn → correct vẫn giữ max", () => {
    progressStore.saveReadingProgress("hsk1-reading-1", 5, 5);
    const worse = progressStore.saveReadingProgress("hsk1-reading-1", 2, 5);
    expect(worse.correct).toBe(5);
    expect(worse.total).toBe(5);
    expect(worse.attempts).toBe(2);
  });

  it("record lạ trong JSON bị lọc khi đọc", () => {
    localStorage.setItem(
      "nhai.reading.progress",
      JSON.stringify({
        "good": { correct: 3, total: 5, attempts: 1, completedAt: "2026-10-30T00:00:00.000Z" },
        "bad-shape": { foo: "bar" },
        "bad-type": "nope",
      })
    );
    const all = progressStore.getReadingProgress();
    expect(Object.keys(all)).toEqual(["good"]);
  });
});
