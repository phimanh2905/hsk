import { describe, it, expect } from "vitest";
import {
  applyGrade,
  isMature,
  memoryStrength,
  memTone,
  memLabel,
  SRS_MATURE_DAYS,
  type Grade,
  type SrsItem,
  type SrsStatus,
} from "../review";

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;

function item(over: Partial<SrsItem> = {}): SrsItem {
  return {
    key: "hsk1.lesson-1.0",
    status: "review",
    dueAt: null,
    reviewCount: 1,
    lastReviewedAt: NOW - DAY,
    updatedAt: NOW,
    ease: 2.5,
    intervalDays: 10,
    lapses: 0,
    ...over,
  };
}

describe("memoryStrength", () => {
  it("new chưa ôn = 25", () => {
    expect(memoryStrength(item({ status: "new", reviewCount: 0 }), NOW)).toBe(25);
  });
  it("base theo status + cap +10 theo reviewCount", () => {
    expect(memoryStrength(item({ status: "learning", reviewCount: 2 }), NOW)).toBe(57);
    expect(memoryStrength(item({ status: "learning", reviewCount: 50 }), NOW)).toBe(65);
    expect(memoryStrength(item({ status: "relearning", reviewCount: 5 }), NOW)).toBe(50);
    expect(memoryStrength(item({ status: "review", reviewCount: 4 }), NOW)).toBe(84);
    expect(memoryStrength(item({ status: "review", reviewCount: 50 }), NOW)).toBe(90);
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

describe("isMature / SRS_MATURE_DAYS", () => {
  it("mature = review với interval ≥ 21 ngày", () => {
    expect(SRS_MATURE_DAYS).toBe(21);
    expect(isMature(item({ status: "review", intervalDays: 21 }))).toBe(true);
    expect(isMature(item({ status: "review", intervalDays: 20 }))).toBe(false);
    expect(isMature(item({ status: "relearning", intervalDays: 30 }))).toBe(false);
  });
});

describe("applyGrade — bảng quyết định SM-2 (4 rating × 4 state)", () => {
  // [từ status, grade, {status, ease, intervalDays, lapses}, dueOffsetMs]
  const cases: [SrsStatus, Grade, Partial<SrsItem>, number][] = [
    // new/learning: giữ ease, interval 0; good graduate 1 ngày; easy graduate 4 ngày + ease+0.15
    ["new", "again", { status: "learning", ease: 2.5, intervalDays: 0, lapses: 0 }, 60_000],
    ["new", "hard", { status: "learning", ease: 2.5, intervalDays: 0, lapses: 0 }, 10 * 60_000],
    ["new", "good", { status: "review", ease: 2.5, intervalDays: 1, lapses: 0 }, DAY],
    ["new", "easy", { status: "review", ease: 2.65, intervalDays: 4, lapses: 0 }, 4 * DAY],
    ["learning", "again", { status: "learning", ease: 2.5, intervalDays: 0, lapses: 0 }, 60_000],
    ["learning", "hard", { status: "learning", ease: 2.5, intervalDays: 0, lapses: 0 }, 10 * 60_000],
    ["learning", "good", { status: "review", ease: 2.5, intervalDays: 1, lapses: 0 }, DAY],
    ["learning", "easy", { status: "review", ease: 2.65, intervalDays: 4, lapses: 0 }, 4 * DAY],
    // relearning: again −0.2 giữ interval, +1 phút; hard −0.15 giữ interval, +10 phút;
    // good graduate giữ interval cũ; easy graduate floor(interval×1.5), ease+0.15
    ["relearning", "again", { status: "relearning", ease: 2.3, intervalDays: 10, lapses: 0 }, 60_000],
    ["relearning", "hard", { status: "relearning", ease: 2.35, intervalDays: 10, lapses: 0 }, 10 * 60_000],
    ["relearning", "good", { status: "review", ease: 2.5, intervalDays: 10, lapses: 0 }, 10 * DAY],
    ["relearning", "easy", { status: "review", ease: 2.65, intervalDays: 15, lapses: 0 }, 15 * DAY],
    // review: again → relearning ease−0.2 interval floor(0.5×iv) lapses+1 +10 phút;
    // hard −0.15 floor(1.2×iv); good ×ease; easy ease+0.15 floor(iv×ease×1.3)
    ["review", "again", { status: "relearning", ease: 2.3, intervalDays: 5, lapses: 1 }, 10 * 60_000],
    ["review", "hard", { status: "review", ease: 2.35, intervalDays: 12, lapses: 0 }, 12 * DAY],
    ["review", "good", { status: "review", ease: 2.5, intervalDays: 25, lapses: 0 }, 25 * DAY],
    ["review", "easy", { status: "review", ease: 2.65, intervalDays: 32, lapses: 0 }, 32 * DAY], // floor(10×2.5×1.3)=32
  ];

  it.each(cases)("SM-2: %s + %s", (from, grade, to, dueOffset) => {
    const orig = item({
      status: from,
      lastReviewedAt: NOW - DAY,
      // item helper default ease 2.5 / interval 10; relearning hard case cần ease 2.5 đầu vào
      ...(from === "relearning" && grade === "hard" ? { ease: 2.5 } : {}),
    });
    const next = applyGrade(orig, grade, NOW);
    expect(next.status).toBe(to.status);
    expect(next.ease).toBe(to.ease);
    expect(next.intervalDays).toBe(to.intervalDays);
    expect(next.lapses).toBe(to.lapses);
    expect(next.dueAt).toBe(NOW + dueOffset);
    expect(next.reviewCount).toBe(orig.reviewCount + 1);
    expect(next.lastReviewedAt).toBe(NOW);
    expect(next.updatedAt).toBe(NOW);
    expect(next.key).toBe(orig.key);
  });

  it("ease kẹp dưới 1.3: review + again khi ease 1.3 đứng nguyên", () => {
    const next = applyGrade(item({ status: "review", ease: 1.3, intervalDays: 10 }), "again", NOW);
    expect(next.ease).toBe(1.3);
    expect(next.status).toBe("relearning");
    expect(next.intervalDays).toBe(5); // floor(0.5×10)
    expect(next.lapses).toBe(1);
  });

  it("ease kẹp trên 3.0: review + easy khi ease 2.9 → 3.0", () => {
    const next = applyGrade(item({ status: "review", ease: 2.9, intervalDays: 10 }), "easy", NOW);
    expect(next.ease).toBe(3.0);
    expect(next.intervalDays).toBe(37); // floor(10×2.9×1.3)=37
  });

  it("reviewCount +1 với mọi rating", () => {
    for (const grade of ["again", "hard", "good", "easy"] as const) {
      expect(applyGrade(item(), grade, NOW).reviewCount).toBe(2);
    }
  });

  it("không mutate item gốc", () => {
    const orig = item({ status: "review", ease: 2.5, intervalDays: 10 });
    const next = applyGrade(orig, "good", NOW);
    expect(next).not.toBe(orig);
    expect(orig).toEqual(item({ status: "review", ease: 2.5, intervalDays: 10 }));
  });

  it("item new init ease 2.5 mặc định", () => {
    const next = applyGrade(
      item({ status: "new", ease: 2.5, intervalDays: 0, reviewCount: 0 }),
      "good",
      NOW,
    );
    expect(next.ease).toBe(2.5);
    expect(next.status).toBe("review");
  });
});
