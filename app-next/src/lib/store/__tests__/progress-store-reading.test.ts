import { describe, it, expect, beforeEach } from "vitest";
import { progressStore } from "../progress-store";

describe("progressStore reading progress", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("getReadingProgress: null khi chưa ghi", () => {
    expect(progressStore.getReadingProgress("tea")).toBeNull();
  });

  it("recordReadingProgress: giữ max (40 rồi 20 → 40; 100 → 100), shape đúng", () => {
    progressStore.recordReadingProgress("tea", 40);
    expect(progressStore.getReadingProgress("tea")).toEqual({ pct: 40, quizDone: false });
    progressStore.recordReadingProgress("tea", 20);
    expect(progressStore.getReadingProgress("tea")).toEqual({ pct: 40, quizDone: false });
    progressStore.recordReadingProgress("tea", 100);
    expect(progressStore.getReadingProgress("tea")).toEqual({ pct: 100, quizDone: false });
  });

  it("recordReadingQuizDone: true lần đầu, false lần sau; giữ nguyên pct", () => {
    progressStore.recordReadingProgress("demo-1", 55);
    expect(progressStore.recordReadingQuizDone("demo-1")).toBe(true);
    expect(progressStore.getReadingProgress("demo-1")).toEqual({ pct: 55, quizDone: true });
    expect(progressStore.recordReadingQuizDone("demo-1")).toBe(false);
  });

  it("recordReadingQuizDone: quizDone mặc định false khi chưa ghi progress", () => {
    expect(progressStore.recordReadingQuizDone("quiz-only")).toBe(true);
    expect(progressStore.getReadingProgress("quiz-only")).toEqual({ pct: 0, quizDone: true });
  });
});

describe("progressStore reading saved", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("getReadingSavedIds: [] khi trống", () => {
    expect(progressStore.getReadingSavedIds()).toEqual([]);
  });

  it("toggleReadingSaved: thêm rồi bỏ id; không trùng lặp", () => {
    progressStore.toggleReadingSaved("tea");
    expect(progressStore.getReadingSavedIds()).toEqual(["tea"]);
    progressStore.toggleReadingSaved("tea");
    expect(progressStore.getReadingSavedIds()).toEqual([]);
  });

  it("toggleReadingSaved: 2 id khác nhau cùng tồn tại", () => {
    progressStore.toggleReadingSaved("tea");
    progressStore.toggleReadingSaved("demo-1");
    expect(progressStore.getReadingSavedIds()).toEqual(["tea", "demo-1"]);
  });
});
