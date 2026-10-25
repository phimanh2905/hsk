import { describe, expect, it } from "vitest";

import {
  mergeLesson,
  mergeReviewLogs,
  mergeSrs,
  mergeStudyDay,
  type SyncLessonRecord,
  type SyncReviewLogRecord,
  type SyncSrsRecord,
  type SyncStudyDayRecord,
} from "../sync-merge";

const srs = (over: Partial<SyncSrsRecord>): SyncSrsRecord => ({
  key: "hsk1.u1.3",
  status: "new",
  dueAt: null,
  reviewCount: 0,
  lastReviewedAt: null,
  ease: 2.5,
  intervalDays: 0,
  lapses: 0,
  updatedAt: 1000,
  deletedAt: null,
  ...over,
});

const rlog = (over: Partial<SyncReviewLogRecord>): SyncReviewLogRecord => ({
  itemKey: "hsk1.u1.3",
  cardType: "vocab",
  rating: 3,
  durationMs: 1200,
  reviewedAt: 5000,
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

  it("SM-2: ease/intervalDays/lapses theo bản updatedAt lớn hơn (cùng nhóm status/dueAt), reviewCount vẫn max", () => {
    const a = srs({ ease: 2.5, intervalDays: 0, lapses: 0, updatedAt: 1000 });
    const b = srs({ ease: 1.9, intervalDays: 6, lapses: 2, updatedAt: 2000 });
    const m = mergeSrs(a, b);
    expect(m.ease).toBe(1.9);
    expect(m.intervalDays).toBe(6);
    expect(m.lapses).toBe(2);
    expect(m.updatedAt).toBe(2000);
    // chiều ngược — bản mới hơn vẫn thắng cả 3 trường
    const m2 = mergeSrs(b, a);
    expect(m2.ease).toBe(1.9);
    expect(m2.intervalDays).toBe(6);
    expect(m2.lapses).toBe(2);
    // reviewCount là counter — vẫn max dù nằm ở bản cũ
    const old = srs({ reviewCount: 9, ease: 1.3, intervalDays: 1, lapses: 5, updatedAt: 1000 });
    const cur = srs({ reviewCount: 2, ease: 2.6, intervalDays: 10, lapses: 0, updatedAt: 3000 });
    const m3 = mergeSrs(old, cur);
    expect(m3.reviewCount).toBe(9);
    expect(m3.ease).toBe(2.6);
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

describe("mergeReviewLogs", () => {
  it("union theo khóa itemKey@reviewedAt — log mới ở cả 2 bên đều xuất hiện", () => {
    const a = [rlog({ itemKey: "k1", reviewedAt: 100 })];
    const b = [rlog({ itemKey: "k2", reviewedAt: 200 })];
    expect(mergeReviewLogs(a, b)).toHaveLength(2);
    expect(mergeReviewLogs(a, b)).toEqual(mergeReviewLogs(b, a));
  });

  it("dedupe trùng khóa — giữ bản a, không nhân đôi", () => {
    const a = [rlog({ itemKey: "k1", reviewedAt: 100, rating: 3, durationMs: 900 })];
    const b = [rlog({ itemKey: "k1", reviewedAt: 100, rating: 4, durationMs: 1500 })];
    const m = mergeReviewLogs(a, b);
    expect(m).toHaveLength(1);
    expect(m[0].rating).toBe(3);
    expect(m[0].durationMs).toBe(900);
  });

  it("append-only: không merge field-wise — mọi log trùng khóa giữ nguyên bản a", () => {
    const a = [rlog({ itemKey: "k1", reviewedAt: 100, durationMs: 100 })];
    const b = [rlog({ itemKey: "k1", reviewedAt: 100, durationMs: 999 }), rlog({ itemKey: "k3", reviewedAt: 300 })];
    const m = mergeReviewLogs(a, b);
    expect(m.find((l) => l.itemKey === "k1")!.durationMs).toBe(100);
    expect(m).toHaveLength(2);
  });

  it("tính xác định: thứ tự output độc lập với thứ tự input", () => {
    const a = [rlog({ itemKey: "k2", reviewedAt: 200 }), rlog({ itemKey: "k1", reviewedAt: 100 })];
    const b = [rlog({ itemKey: "k3", reviewedAt: 300 }), rlog({ itemKey: "k1", reviewedAt: 50 })];
    expect(mergeReviewLogs(a, b)).toEqual(mergeReviewLogs(b, a));
  });

  it("input không bị mutate", () => {
    const a = [rlog({ itemKey: "k1" })];
    const b = [rlog({ itemKey: "k2" })];
    const aCopy = structuredClone(a);
    const bCopy = structuredClone(b);
    mergeReviewLogs(a, b);
    expect(a).toEqual(aCopy);
    expect(b).toEqual(bCopy);
  });
});
