import { describe, it, expect } from "vitest";
import { distPercents, donutSlices, DIST_META, type Dist } from "../donut";
import { mulberry32, vnDay, heatData, heatClass, computeStreak } from "../heatmap";
import { computeReviewStats, itemKeyKind, SRS_DAYS } from "../review";
import type { SrsItem } from "@/lib/store/progress-store";

const DAY = 86_400_000;

describe("donut largest-remainder", () => {
  it("tổng % luôn đúng 100 với dist bất kỳ", () => {
    const cases: Dist[] = [
      { forgot: 8, hard: 5, good: 14, easy: 3 },
      { forgot: 1, hard: 1, good: 1, easy: 2 },
      { forgot: 7, hard: 5, good: 3, easy: 3 },
      { forgot: 0, hard: 0, good: 0, easy: 1 }, // 1 lát đơn → 100%
    ];
    for (const d of cases) expect(distPercents(d).reduce((a, b) => a + b, 0)).toBe(100);
  });
  it("dist chuẩn {8,5,14,3} → làm tròn theo phần lẻ, tổng 100", () => {
    expect(distPercents({ forgot: 8, hard: 5, good: 14, easy: 3 })).toEqual([27, 17, 46, 10]); // 26.67/16.67/46.67/10 — 3 phần lẻ .67 hòa nhau, stable sort → +1 vào forgot, hard
  });
  it("1 lát đơn → [0,0,0,100]", () => {
    expect(distPercents({ forgot: 0, hard: 0, good: 0, easy: 1 })).toEqual([0, 0, 0, 100]);
  });
  it("donutSlices: khe −1.5, offset cộng dồn âm, bỏ lát 0", () => {
    const slices = donutSlices({ forgot: 1, hard: 0, good: 1, easy: 0 });
    expect(slices).toHaveLength(2);
    const C = 2 * Math.PI * 15.9155;
    expect(slices[0].len).toBeCloseTo(C / 2 - 1.5, 5);
    expect(slices[0].offset).toBeCloseTo(0, 5); // -0 khi acc=0
    expect(slices[1].offset).toBeCloseTo(-(C / 2), 5);
    expect(DIST_META.map((m) => m.label)).toEqual(["Quên rồi", "Khó", "Tốt", "Dễ"]);
  });
});

describe("heatmap + streak (giờ VN +07)", () => {
  it("vnDay quy đổi đúng múi giờ +07", () => {
    // 2026-01-31T17:30Z = 00:30 +07 ngày 1/2
    expect(vnDay(new Date("2026-01-31T17:30:00Z"))).toBe("2026-02-01");
    expect(vnDay(new Date("2026-09-30T00:00:00Z"))).toBe("2026-09-30"); // 07:00 +07
  });
  it("heatData đủ 12 tháng với đúng số ngày/tháng thực (28–31)", () => {
    const now = new Date(2026, 8, 30); // tháng 9/2026 (index 8)
    const map = heatData(null, now);
    let cells = 0;
    for (let back = 11; back >= 0; back--) {
      const d = new Date(2026, 8 - back, 1);
      cells += new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    }
    expect(Object.keys(map)).toHaveLength(cells);
    expect(map["2026-09-30"]).toBeDefined();
  });
  it("real data thắng seeded", () => {
    const map = heatData({ "2026-09-30": 42 }, new Date(2026, 8, 30));
    expect(map["2026-09-30"]).toBe(42);
  });
  it("heatClass: alpha jade 20/40/60/80/100 theo mức xp", () => {
    expect(heatClass(0)).toBe("bg-border-subtle");
    expect(heatClass(2)).toBe("bg-action-primary/20");
    expect(heatClass(5)).toBe("bg-action-primary/40");
    expect(heatClass(6)).toBe("bg-action-primary/60");
    expect(heatClass(12)).toBe("bg-action-primary/80");
    expect(heatClass(20)).toBe("bg-action-primary");
  });
  it("computeStreak: 2 ngày liên tiếp = 2", () => {
    const days = { "2026-09-29": 3, "2026-09-30": 1 };
    expect(computeStreak(days, "2026-09-30")).toBe(2);
  });
  it("hôm nay 0 nhưng hôm qua có → streak giữ (sống qua hôm qua)", () => {
    const days = { "2026-09-28": 3, "2026-09-29": 2 };
    expect(computeStreak(days, "2026-09-30")).toBe(2);
  });
  it("thiếu cả hôm nay lẫn hôm qua → 0", () => {
    const days = { "2026-09-27": 3, "2026-09-28": 2 };
    expect(computeStreak(days, "2026-09-30")).toBe(0);
  });
});

describe("computeReviewStats (chu kỳ 21 ngày)", () => {
  const now = 1_000_000_000_000;
  const hasVocab = (book: string, page: string) => book === "hsk1" && page === "lesson-1";
  function item(partial: Partial<SrsItem> & { key: string }): SrsItem {
    return { status: "new", dueAt: null, reviewCount: 0, lastReviewedAt: null, updatedAt: now, ...partial };
  }
  it("phân loại đúng 5 nhóm theo status/dueAt/lastReviewedAt", () => {
    const items = [
      item({ key: "hsk1.lesson-1.0", status: "learning" }),                                  // learning → learning + due
      item({ key: "hsk1.lesson-1.1", status: "new" }),                                       // new, chưa đến hạn → không due
      item({ key: "hsk1.lesson-1.2", status: "learned", lastReviewedAt: now - 20 * DAY }),   // recent (< 21 ngày)
      item({ key: "hsk1.lesson-1.3", status: "known", lastReviewedAt: now - 22 * DAY, dueAt: now }), // dài hạn (biên 21 ngày) + đến hạn → due
      item({ key: "hsk1.lesson-1.4", status: "learned", lastReviewedAt: null }),             // learned (lastReviewed null)
      item({ key: "hsk2.lesson-1.0", status: "new" }),                                       // grammar kind → bị lọc
    ];
    const s = computeReviewStats(items, "vocab", now, hasVocab);
    expect(s).toEqual({ due: 2, new: 1, learning: 1, recent: 1, learned: 2, total: 5 });
    const g = computeReviewStats(items, "grammar", now, hasVocab);
    expect(g.total).toBe(1);
  });
  it("item learning luôn tính là due; item new chưa đến hạn không due; new đến hạn thì due", () => {
    const items = [
      item({ key: "hsk1.lesson-1.0", status: "learning", dueAt: now + DAY }),
      item({ key: "hsk1.lesson-1.1", status: "new", dueAt: now + DAY }),
      item({ key: "hsk1.lesson-1.2", status: "new", dueAt: now - DAY }),
    ];
    expect(computeReviewStats(items, "vocab", now, hasVocab).due).toBe(2);
  });
  it("itemKeyKind: deck.* → grammar", () => {
    expect(itemKeyKind("deck.nb-1.3", hasVocab)).toBe("grammar");
    expect(itemKeyKind("hsk1.lesson-1.0", hasVocab)).toBe("vocab");
  });
  it("SRS_DAYS = 21", () => expect(SRS_DAYS).toBe(21));
});
