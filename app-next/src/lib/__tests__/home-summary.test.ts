import { describe, it, expect, beforeEach, vi } from "vitest";

/* progress-store dùng window event; home-summary thuần đọc localStorage → test "readHomeSummary" chạy jsdom bình thường. */
import { readHomeSummary } from "../home-summary";

beforeEach(() => localStorage.clear());

describe("readHomeSummary", () => {
  it("localStorage rỗng → defaults 0, lesson null, không NaN", () => {
    const s = readHomeSummary();
    expect(s).toMatchObject({
      lesson: null, srsDue: 0, srsTotal: 0, recallPct: 0,
      streak: 0, todayXp: 0, lessonsDone: 0, vocabMastered: 0,
    });
    expect(s.lessonsTotal).toBeGreaterThan(0); // từ content/courses
    expect(s.vocabTotal).toBeGreaterThan(0);   // từ content/vocab
    expect(Number.isNaN(s.recallPct)).toBe(false);
  });
  it("JSON hỏng → defaults (try/catch như progressStore)", () => {
    localStorage.setItem("nhai.pageDone", "{không phải json");
    localStorage.setItem("nhai.srs.items", "???");
    expect(() => readHomeSummary()).not.toThrow();
    const s = readHomeSummary();
    expect(s.lessonsDone).toBe(0);
    expect(s.srsTotal).toBe(0);
  });
  it("pageDone + SRS → lesson kế tiếp, due count, recall %", () => {
    localStorage.setItem("nhai.pageDone", JSON.stringify({ "hsk1/lesson-1": 1 }));
    localStorage.setItem(
      "nhai.srs.items",
      JSON.stringify({
        "hsk1.lesson-1.0": { key: "k1", status: "learned", dueAt: Date.now() - 1000, reviewCount: 3, lastReviewedAt: 1, updatedAt: 1 },
        "hsk1.lesson-1.1": { key: "k2", status: "new", dueAt: Date.now() - 1000, reviewCount: 0, lastReviewedAt: null, updatedAt: 1 },
        "hsk1.lesson-1.2": { key: "k3", status: "known", dueAt: null, reviewCount: 5, lastReviewedAt: 1, updatedAt: 1 },
      })
    );
    const s = readHomeSummary();
    expect(s.lesson?.book).toBe("hsk1");
    expect(s.lesson?.pageId).toBe("lesson-2"); // lesson-1 đã done
    expect(s.srsDue).toBe(2);                  // dueAt đã qua, kể cả status new
    expect(s.srsTotal).toBe(3);
    expect(s.recallPct).toBe(100);             // reviewed = 2 (k1 learned, k3 known), good = 2 → 100%
    expect(s.lessonsDone).toBe(1);
    expect(s.vocabMastered).toBe(2);           // learned + known
  });
});
