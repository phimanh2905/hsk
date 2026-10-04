import { describe, it, expect } from "vitest";
import { memoryStrength, memTone, memLabel, applyGrade, type Grade } from "../review";
import type { SrsItem } from "@/lib/store/progress-store";

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;

function item(over: Partial<SrsItem> = {}): SrsItem {
  return { key: "hsk1.lesson-1.0", status: "new", dueAt: null, reviewCount: 0, lastReviewedAt: null, updatedAt: NOW, ...over };
}

describe("memoryStrength", () => {
  it("new chưa ôn = 25", () => {
    expect(memoryStrength(item(), NOW)).toBe(25);
  });
  it("base theo status + cap +10 theo reviewCount", () => {
    expect(memoryStrength(item({ status: "learning", reviewCount: 2 }), NOW)).toBe(57);
    expect(memoryStrength(item({ status: "learning", reviewCount: 50 }), NOW)).toBe(65);
    expect(memoryStrength(item({ status: "learned", reviewCount: 4 }), NOW)).toBe(84);
    expect(memoryStrength(item({ status: "known", reviewCount: 9 }), NOW)).toBe(100);
  });
  it("quá hạn decay -4/ngày, floor 5", () => {
    expect(memoryStrength(item({ status: "learning", reviewCount: 3, dueAt: NOW - 2 * DAY }), NOW)).toBe(50);
    expect(memoryStrength(item({ status: "new", dueAt: NOW - 100 * DAY }), NOW)).toBe(5);
  });
  it("chưa đến hạn không decay", () => {
    expect(memoryStrength(item({ status: "learning", reviewCount: 3, dueAt: NOW + 3 * DAY }), NOW)).toBe(58);
  });
});

describe("memTone / memLabel", () => {
  it("ngưỡng tone 55/80", () => {
    expect(memTone(54)).toBe("weak");
    expect(memTone(55)).toBe("mid");
    expect(memTone(80)).toBe("mid");
    expect(memTone(81)).toBe("strong");
  });
  it("ngưỡng label 50/70", () => {
    expect(memLabel(49)).toBe("Yếu");
    expect(memLabel(50)).toBe("Vừa");
    expect(memLabel(69)).toBe("Vừa");
    expect(memLabel(70)).toBe("Sâu");
  });
});

describe("applyGrade", () => {
  const cases: [Grade, Partial<SrsItem>, Partial<SrsItem>][] = [
    ["forgot", { status: "learning" }, { status: "learning", dueAt: NOW + 60_000 }],
    ["hard", { status: "learning" }, { status: "learning", dueAt: NOW + 300_000 }],
    ["good", { status: "learning", reviewCount: 0 }, { status: "learning", dueAt: NOW + 3 * DAY }],
    ["good", { status: "learned", reviewCount: 3 }, { status: "learned", dueAt: NOW + 7 * DAY }],
  ];
  it.each(cases)("%s từ %s → dueAt/status đúng bảng spec 2.1", (grade, from, to) => {
    const next = applyGrade(item({ ...from, lastReviewedAt: NOW - DAY }), grade, NOW);
    expect(next.status).toBe(to.status);
    expect(next.dueAt).toBe(to.dueAt);
    expect(next.reviewCount).toBe((from.reviewCount ?? 0) + 1);
    expect(next.lastReviewedAt).toBe(NOW);
    expect(next.updatedAt).toBe(NOW);
  });
  it("good thăng cấp: learning đạt 3 lần ôn → learned; learned đạt 6 lần → known", () => {
    expect(applyGrade(item({ status: "learning", reviewCount: 2 }), "good", NOW).status).toBe("learned");
    expect(applyGrade(item({ status: "learned", reviewCount: 5 }), "good", NOW).status).toBe("known");
  });
  it("forgot/hard luôn kéo về learning (kể cả learned/known)", () => {
    expect(applyGrade(item({ status: "known" }), "forgot", NOW).status).toBe("learning");
    expect(applyGrade(item({ status: "learned" }), "hard", NOW).status).toBe("learning");
  });
  it("không mutate item gốc", () => {
    const orig = item({ status: "learning" });
    const next = applyGrade(orig, "good", NOW);
    expect(orig.status).toBe("learning");
    expect(next).not.toBe(orig);
  });
});
