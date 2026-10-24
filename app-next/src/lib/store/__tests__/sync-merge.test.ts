import { describe, expect, it } from "vitest";

import {
  mergeLesson,
  mergeSrs,
  mergeStudyDay,
  type SyncLessonRecord,
  type SyncSrsRecord,
  type SyncStudyDayRecord,
} from "../sync-merge";

const srs = (over: Partial<SyncSrsRecord>): SyncSrsRecord => ({
  key: "hsk1.u1.3",
  status: "new",
  dueAt: null,
  reviewCount: 0,
  lastReviewedAt: null,
  updatedAt: 1000,
  deletedAt: null,
  ...over,
});

const day = (over: Partial<SyncStudyDayRecord>): SyncStudyDayRecord => ({
  date: "2026-10-24",
  xp: 0,
  correct: 0,
  updatedAt: 1000,
  ...over,
});

const lesson = (over: Partial<SyncLessonRecord>): SyncLessonRecord => ({
  book: "hsk1",
  lesson: "u1",
  modes: {},
  knownCount: 0,
  updatedAt: 1000,
  deletedAt: null,
  ...over,
});

describe("mergeSrs", () => {
  it("bản updatedAt lớn hơn thắng status/dueAt/lastReviewedAt", () => {
    const a = srs({ status: "learning", dueAt: 500, lastReviewedAt: 900, updatedAt: 1000 });
    const b = srs({ status: "learned", dueAt: 2000, lastReviewedAt: 1500, updatedAt: 2000 });
    const m = mergeSrs(a, b);
    expect(m.status).toBe("learned");
    expect(m.dueAt).toBe(2000);
    expect(m.lastReviewedAt).toBe(1500);
    expect(m.updatedAt).toBe(2000);
  });

  it("reviewCount = max cả hai", () => {
    const a = srs({ reviewCount: 5, updatedAt: 2000 });
    const b = srs({ reviewCount: 3, updatedAt: 1000 });
    expect(mergeSrs(a, b).reviewCount).toBe(5);
    expect(mergeSrs(b, a).reviewCount).toBe(5);
  });

  it("tombstone thắng bản sống khi deletedAt <= updatedAt của bản sống", () => {
    const live = srs({ status: "learning", updatedAt: 1000, deletedAt: null });
    const dead = srs({ status: "known", updatedAt: 800, deletedAt: 900 });
    const m = mergeSrs(live, dead);
    expect(m.deletedAt).toBe(900);
  });

  it("ghi trước thời điểm xóa bị tombstone nuốt (deletedAt > updatedAt của bản sống vẫn hồi sinh)", () => {
    // live ghi lúc 1200, tombstone xóa lúc 1500 (record tombstone updatedAt 1000):
    // deletedAt(1500) > updatedAt(1200) của bản sống → bản sống thắng, hồi sinh.
    const live = srs({ status: "learning", updatedAt: 1200, deletedAt: null });
    const dead = srs({ updatedAt: 1000, deletedAt: 1500 });
    expect(mergeSrs(dead, live).deletedAt).toBeNull();
    expect(mergeSrs(dead, live).status).toBe("learning");
  });

  it("tombstone có updatedAt lớn hơn thắng hẳn (deletedAt giữ nguyên)", () => {
    const live = srs({ status: "learning", updatedAt: 1000, deletedAt: null });
    const dead = srs({ status: "known", updatedAt: 2000, deletedAt: 2500 });
    const m = mergeSrs(dead, live);
    expect(m.deletedAt).toBe(2500);
    expect(m.updatedAt).toBe(2000);
  });

  it("input không bị mutate", () => {
    const a = srs({ reviewCount: 1, updatedAt: 1000 });
    const b = srs({ reviewCount: 9, status: "known", updatedAt: 2000 });
    const aCopy = structuredClone(a);
    const bCopy = structuredClone(b);
    mergeSrs(a, b);
    expect(a).toEqual(aCopy);
    expect(b).toEqual(bCopy);
  });

  it("tính xác định: mergeSrs(a,b) deep-equal mergeSrs(b,a)", () => {
    const a = srs({ reviewCount: 2, status: "learning", updatedAt: 1000 });
    const b = srs({ reviewCount: 7, status: "known", dueAt: 42, lastReviewedAt: 5, updatedAt: 1500 });
    expect(mergeSrs(a, b)).toEqual(mergeSrs(b, a));
  });
});

describe("mergeStudyDay", () => {
  it("xp/correct/updatedAt lấy max", () => {
    const a = day({ xp: 120, correct: 10, updatedAt: 1000 });
    const b = day({ xp: 80, correct: 15, updatedAt: 2000 });
    expect(mergeStudyDay(a, b)).toEqual({ date: "2026-10-24", xp: 120, correct: 15, updatedAt: 2000 });
  });
});

describe("mergeLesson", () => {
  it("modes merge per-key max", () => {
    const a = lesson({ modes: { flash: 1 }, updatedAt: 1000 });
    const b = lesson({ modes: { flash: 3, quiz: 2 }, updatedAt: 2000 });
    expect(mergeLesson(a, b).modes).toEqual({ flash: 3, quiz: 2 });
  });

  it("knownCount lấy max", () => {
    const a = lesson({ knownCount: 4, updatedAt: 2000 });
    const b = lesson({ knownCount: 9, updatedAt: 1000 });
    expect(mergeLesson(a, b).knownCount).toBe(9);
  });

  it("tombstone như mergeSrs: thắng khi deletedAt <= updatedAt của bản sống; hồi sinh khi deletedAt > updatedAt", () => {
    const live = lesson({ modes: { flash: 2 }, updatedAt: 1000 });
    const dead = lesson({ updatedAt: 500, deletedAt: 900 });
    expect(mergeLesson(live, dead).deletedAt).toBe(900);

    const revived = lesson({ modes: { flash: 5 }, updatedAt: 1200 });
    const oldDead = lesson({ updatedAt: 1000, deletedAt: 1500 });
    const m = mergeLesson(revived, oldDead);
    expect(m.deletedAt).toBeNull();
    expect(m.modes).toEqual({ flash: 5 });
  });

  it("input không bị mutate (modes)", () => {
    const a = lesson({ modes: { flash: 1 } });
    const b = lesson({ modes: { flash: 3, quiz: 2 } });
    mergeLesson(a, b);
    expect(a.modes).toEqual({ flash: 1 });
    expect(b.modes).toEqual({ flash: 3, quiz: 2 });
  });

  it("tính xác định: mergeLesson(a,b) deep-equal mergeLesson(b,a)", () => {
    const a = lesson({ modes: { flash: 1 }, knownCount: 2, updatedAt: 1000 });
    const b = lesson({ modes: { flash: 3, quiz: 1 }, knownCount: 5, updatedAt: 1500 });
    expect(mergeLesson(a, b)).toEqual(mergeLesson(b, a));
  });
});
