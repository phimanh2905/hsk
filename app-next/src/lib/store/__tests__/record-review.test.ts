import { describe, it, expect, beforeEach, vi } from "vitest";
import { progressStore, normalizeSrsItem } from "../progress-store";
import type { SrsItem } from "../progress-store";

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;

beforeEach(() => localStorage.clear());

/* vnDayString tương tự progress-store (không export để giữ bề mặt gọn) */
function vnDay(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

describe("normalizeSrsItem — migration format 4 (thiếu ease/intervalDays/lapses, status cũ)", () => {
  it("status learned → review, intervalDays 7, ease 2.5, lapses 0", () => {
    const out = normalizeSrsItem({
      key: "hsk1.1.0", status: "learned", dueAt: NOW, reviewCount: 4,
      lastReviewedAt: NOW - 1000, updatedAt: NOW,
    } as never);
    expect(out.item.status).toBe("review");
    expect(out.item.ease).toBe(2.5);
    expect(out.item.intervalDays).toBe(7);
    expect(out.item.lapses).toBe(0);
    expect(out.changed).toBe(true);
  });
  it("status known → review, intervalDays 21", () => {
    const out = normalizeSrsItem({
      key: "hsk1.1.1", status: "known", dueAt: NOW, reviewCount: 9,
      lastReviewedAt: NOW, updatedAt: NOW,
    } as never);
    expect(out.item.status).toBe("review");
    expect(out.item.intervalDays).toBe(21);
  });
  it("status new/learning giữ, giá trị lạ → new; đã chuẩn → changed false (idempotent)", () => {
    const keep: SrsItem = { key: "k", status: "new", dueAt: null, reviewCount: 0, lastReviewedAt: null, updatedAt: NOW, ease: 2.5, intervalDays: 0, lapses: 0 };
    expect(normalizeSrsItem(keep).changed).toBe(false);
    expect(normalizeSrsItem(keep).item).toEqual(keep);
    const weird = normalizeSrsItem({ ...keep, status: "bananas" } as never);
    expect(weird.item.status).toBe("new");
    // chuẩn hóa lần 2 trên kết quả lần 1 → không đổi
    expect(normalizeSrsItem(normalizeSrsItem({ ...keep, ease: undefined } as never).item).changed).toBe(false);
  });
  it("seed legacy qua getAllSrs → chuẩn hóa + ghi lại, gọi lần 2 idempotent (không đúp)", () => {
    localStorage.setItem(
      "bye.srs.items",
      JSON.stringify({
        "hsk1.1.0": { key: "hsk1.1.0", status: "learned", dueAt: NOW, reviewCount: 4, lastReviewedAt: NOW - 1000, updatedAt: NOW },
      })
    );
    const first = progressStore.getAllSrs();
    expect(first).toHaveLength(1);
    expect(first[0].status).toBe("review");
    expect(first[0].ease).toBe(2.5);
    expect(first[0].intervalDays).toBe(7);
    expect(first[0].lapses).toBe(0);
    const stored = JSON.parse(localStorage.getItem("bye.srs.items")!);
    expect(stored["hsk1.1.0"].ease).toBe(2.5); // đã ghi lại
    progressStore.getAllSrs();
    expect(JSON.parse(localStorage.getItem("bye.srs.items")!)["hsk1.1.0"]).toEqual(first[0]);
  });
});

describe("progressStore.recordReview (SM-2 + review log + correct counter)", () => {
  it("good: status review, dueAt NOW+DAY, intervalDays 1, ease 2.5, reviewCount 1 + 1 log entry", () => {
    progressStore.toggleSrs("hsk1.lesson-1.0");
    const next = progressStore.recordReview("hsk1.lesson-1.0", "good", NOW)!;
    expect(next.status).toBe("review");
    expect(next.dueAt).toBe(NOW + DAY);
    expect(next.intervalDays).toBe(1);
    expect(next.ease).toBe(2.5);
    expect(next.reviewCount).toBe(1);
    expect(progressStore.getSrs("hsk1.lesson-1.0")!.reviewCount).toBe(1); // persist thật
    const logs = JSON.parse(localStorage.getItem("bye.review.logs")!);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toEqual({ cardType: "vocab", itemKey: "hsk1.lesson-1.0", rating: 3, durationMs: 0, reviewedAt: NOW });
    expect(progressStore.getReviewLogs()).toHaveLength(1);
  });
  it("easy với durationMs: log rating 4 + durationMs 5200; bye.heat.correct[vnDay] = 1; good lần 2 → 2; again/hard không tăng", () => {
    progressStore.toggleSrs("hsk1.lesson-1.0");
    progressStore.recordReview("hsk1.lesson-1.0", "easy", NOW, 5200);
    let logs = progressStore.getReviewLogs();
    expect(logs[0].rating).toBe(4);
    expect(logs[0].durationMs).toBe(5200);
    const correct = JSON.parse(localStorage.getItem("bye.heat.correct")!);
    expect(correct[vnDay()]).toBe(1);
    expect(progressStore.getHeatCorrect()[vnDay()]).toBe(1);

    progressStore.recordReview("hsk1.lesson-1.0", "good", NOW + 1);
    expect(progressStore.getHeatCorrect()[vnDay()]).toBe(2);

    progressStore.recordReview("hsk1.lesson-1.0", "again", NOW + 2);
    progressStore.recordReview("hsk1.lesson-1.0", "hard", NOW + 3);
    expect(progressStore.getHeatCorrect()[vnDay()]).toBe(2);
    logs = progressStore.getReviewLogs();
    expect(logs).toHaveLength(4);
    expect(logs.map((l) => l.rating)).toEqual([4, 3, 1, 2]);
  });
  it("cardType heuristic: deck.a.1 → grammar, hsk1.u1.3 → vocab", () => {
    progressStore.toggleSrs("deck.a.1");
    progressStore.toggleSrs("hsk1.u1.3");
    progressStore.recordReview("deck.a.1", "good", NOW);
    progressStore.recordReview("hsk1.u1.3", "good", NOW);
    const logs = progressStore.getReviewLogs();
    expect(logs.find((l) => l.itemKey === "deck.a.1")!.cardType).toBe("grammar");
    expect(logs.find((l) => l.itemKey === "hsk1.u1.3")!.cardType).toBe("vocab");
  });
  it("log cap 2000 — cũ nhất bị cắt", () => {
    progressStore.toggleSrs("k.1.0");
    for (let i = 0; i < 2001; i++) progressStore.recordReview("k.1.0", "good", NOW + i);
    const logs = progressStore.getReviewLogs();
    expect(logs).toHaveLength(2000);
    expect(logs[0].reviewedAt).toBe(NOW + 1); // entry NOW bị cắt
    expect(logs[1999].reviewedAt).toBe(NOW + 2000);
  });
  it("giữ hành vi cũ: bắn bye:progress đúng 1 lần; key lạ → null và không ghi log", () => {
    progressStore.toggleSrs("hsk1.lesson-1.0");
    const spy = vi.fn();
    window.addEventListener("bye:progress", spy);
    progressStore.recordReview("hsk1.lesson-1.0", "good", NOW);
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener("bye:progress", spy);
    expect(progressStore.recordReview("hsk1.khong-co.0", "good", NOW)).toBeNull();
    expect(progressStore.getReviewLogs()).toHaveLength(1);
  });
  it("bye.review.logs hỏng JSON → getReviewLogs trả []", () => {
    localStorage.setItem("bye.review.logs", "{broken");
    expect(progressStore.getReviewLogs()).toEqual([]);
  });
});
