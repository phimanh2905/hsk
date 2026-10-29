import { describe, it, expect } from "vitest";
import { getRoadmapLevel, roadmapLevels } from "@/content/roadmap-stations";
import {
  PASS_PCT,
  PINYIN_SESSIONS,
  bannerSummary,
  deriveStationStates,
  gateStatus,
  overallRoadmapPct,
} from "../roadmap-progress";
import type { StationProgress } from "@/lib/store/progress-store";

/* Task 5 — trọng số động: đếm trạm lesson từ content thay vì assertion tuyệt đối
   (regression Task 2 đã chuyển sang đếm động). */
const lessonWeight = (levelId: string) => {
  const l = getRoadmapLevel(levelId)!;
  return l.stations.filter((s) => s.kind === "lesson").length;
};
const TOTAL_WEIGHT = roadmapLevels
  .filter((l) => l.status === "available")
  .reduce((sum, l) => sum + (l.id === "pinyin" ? PINYIN_SESSIONS : lessonWeight(l.id)), 0);
const weightedOverall = (pinyinPct: number, byLevel: Record<string, number>) => {
  let wSum = 0;
  let wpSum = 0;
  for (const l of roadmapLevels.filter((l) => l.status === "available")) {
    const w = l.id === "pinyin" ? PINYIN_SESSIONS : lessonWeight(l.id);
    if (w === 0) continue;
    const pct = l.id === "pinyin" ? pinyinPct : (byLevel[l.id] ?? 0);
    wSum += w;
    wpSum += w * pct;
  }
  return wSum > 0 ? Math.round(wpSum / wSum) : 0;
};

const hsk2 = getRoadmapLevel("hsk-2")!;
const lessonCount = hsk2.stations.filter((s) => s.kind === "lesson").length;
const stateOf = (record: Record<string, StationProgress>, id: string) => {
  const views = deriveStationStates(hsk2, record);
  const v = views.find((v) => v.station.id === id);
  return v!.state;
};

const rec = (pct: number, stars: 0 | 1 | 2 | 3 = 0): StationProgress => ({ pct, stars });

/** record từ danh sách cặp [stationId, pct] */
const mk = (pairs: Array<[string, number]>): Record<string, StationProgress> =>
  Object.fromEntries(
    pairs.map(([id, pct]) => [
      id,
      rec(pct, pct >= 100 ? 3 : pct >= 90 ? 2 : pct >= PASS_PCT ? 1 : 0),
    ]),
  );

describe("PASS_PCT", () => {
  it("= 80", () => expect(PASS_PCT).toBe(80));
});

describe("deriveStationStates (tuần tự)", () => {
  it("không có record → Trạm 1 active, còn lại locked", () => {
    const views = deriveStationStates(hsk2, {});
    expect(views[0].state).toBe("active");
    expect(views.slice(1).every((v) => v.state === "locked")).toBe(true);
  });

  it("done khi pct >= 80 (không cần 100), giữ sao", () => {
    const views = deriveStationStates(hsk2, mk([["1", 85]]));
    expect(views[0].state).toBe("done");
    expect(views[0].pct).toBe(85);
    expect(views[0].stars).toBe(1);
    expect(views[1].state).toBe("active");
  });

  it("pct 70 chưa done → station vẫn active với pct hiển thị", () => {
    const views = deriveStationStates(hsk2, mk([["1", 70]]));
    expect(views[0].state).toBe("active");
    expect(views[0].pct).toBe(70);
  });

  it("BUG CŨ: Trạm 6 active sau khi 1–5 + Milestone done", () => {
    const views = deriveStationStates(
      hsk2,
      mk([["1", 100], ["2", 100], ["3", 100], ["4", 100], ["5", 100], ["m", 80]]),
    );
    expect(views.find((v) => v.station.id === "m")!.state).toBe("done");
    expect(views.find((v) => v.station.id === "6")!.state).toBe("active");
  });

  it("milestone locked khi còn lesson trước chưa done", () => {
    const views = deriveStationStates(hsk2, mk([["1", 100], ["2", 100]]));
    expect(views.find((v) => v.station.id === "m")!.state).toBe("locked");
    expect(views.find((v) => v.station.id === "3")!.state).toBe("active");
  });

  it("mọi station done → không còn active", () => {
    const views = deriveStationStates(
      hsk2,
      mk(hsk2.stations.map((s) => [s.id, 100])),
    );
    expect(views.every((v) => v.state === "done")).toBe(true);
  });
});

describe("deriveStationStates (cũ — regression gate)", () => {
  it("Review Focus #1 — store rỗng: deterministic, trạm 1 active, còn lại locked", () => {
    const views = deriveStationStates(hsk2, {});
    expect(views.map((v) => v.state)).toEqual([
      "active", ...hsk2.stations.slice(1).map(() => "locked" as const),
    ]);
    expect(views[0].pct).toBe(0);
  });

  it("trạm 1 done 3 sao → trạm 2 active với pct riêng", () => {
    const rec2 = { "1": { pct: 100, stars: 3 as const } };
    expect(stateOf(rec2, "1")).toBe("done");
    expect(stateOf(rec2, "2")).toBe("active");
    const v2 = deriveStationStates(hsk2, rec2).find((v) => v.station.id === "2")!;
    expect(v2.pct).toBe(0);
  });

  it("trạm active giữ pct từ record (55%)", () => {
    const rec2 = {
      "1": { pct: 100, stars: 3 as const },
      "2": { pct: 100, stars: 3 as const },
      "3": { pct: 100, stars: 3 as const },
      "4": { pct: 55, stars: 0 as const },
    };
    const v4 = deriveStationStates(hsk2, rec2).find((v) => v.station.id === "4")!;
    expect(v4.state).toBe("active");
    expect(v4.pct).toBe(55);
  });

  it("Review Focus #4 (mới) — milestone không có record done → locked dù record lạ; có record ≥ PASS_PCT → done tuần tự", () => {
    // record lạ: trạm 1 chưa done nhưng milestone có pct 100 → tuần tự coi milestone là mắt xích thường → done
    const recStrange = { m: { pct: 100, stars: 3 as const } };
    expect(stateOf(recStrange, "m")).toBe("done");
    expect(stateOf(recStrange, "1")).toBe("active"); // trạm 1 vẫn là station active đầu tiên
    // milestone chưa có record → locked (đúng nghĩa cũ: chưa đạt thì không mở)
    expect(stateOf({}, "m")).toBe("locked");
  });

  it("tất cả lesson done → milestone active; milestone done khi record đủ PASS_PCT", () => {
    const allDone = Object.fromEntries(
      ["1", "2", "3", "4", "5", "6"].map((id) => [id, { pct: 100, stars: 3 as const }]),
    );
    expect(stateOf(allDone, "m")).toBe("active");
    expect(stateOf({ ...allDone, m: { pct: PASS_PCT, stars: 1 as const } }, "m")).toBe("done");
    // 70 < PASS_PCT → chưa done, vẫn active
    expect(stateOf({ ...allDone, m: { pct: 70, stars: 0 as const } }, "m")).toBe("active");
  });

  it("I-2 — gate theo vị trí: 1–5 done + milestone chưa làm → milestone active, Trạm 6 locked", () => {
    const rec2 = Object.fromEntries(
      ["1", "2", "3", "4", "5"].map((id) => [id, { pct: 100, stars: 3 as const }]),
    );
    expect(stateOf(rec2, "m")).toBe("active");
    expect(stateOf(rec2, "6")).toBe("locked"); // tuần tự: sau active là locked
  });

  it("active chỉ gán cho station đầu tiên chưa done (dù record rải rác)", () => {
    const rec2 = { "2": { pct: 50, stars: 0 as const } };
    expect(stateOf(rec2, "1")).toBe("active");
    expect(stateOf(rec2, "2")).toBe("locked");
  });
});

describe("bannerSummary", () => {
  it("pct = trung bình lesson; currentTitle theo station active", () => {
    const views = deriveStationStates(hsk2, mk([["1", 100], ["2", 50]]));
    const s = bannerSummary(hsk2, views);
    // lessons: 1(100) 2(50) còn lại 0 — milestone không tính
    expect(s.pct).toBe(Math.round((100 + 50) / lessonCount));
    expect(s.currentTitle).toContain("Trạm 2");
    expect(s.remainingToMilestone).toBe(4); // 2,3,4,5 chưa hết trước m (1 done)
  });

  it("pct = trung bình pct các trạm lesson (milestone không tính)", () => {
    const rec2: Record<string, { pct: number; stars: 0 }> = {};
    ["1", "2", "3"].forEach((id) => (rec2[id] = { pct: 100, stars: 0 }));
    rec2["4"] = { pct: 50, stars: 0 };
    const views = deriveStationStates(hsk2, rec2);
    // 3 trăm + 1 nửa trên toàn bộ lesson = (100+100+100+50+0…)/lessonCount
    expect(bannerSummary(hsk2, views).pct).toBe(Math.round(350 / lessonCount));
  });

  it("currentTitle = 'Trạm 4: Sở thích & Thời gian rảnh'", () => {
    const rec2: Record<string, { pct: number; stars: 0 }> = {};
    ["1", "2", "3"].forEach((id) => (rec2[id] = { pct: 100, stars: 0 }));
    const views = deriveStationStates(hsk2, rec2);
    expect(bannerSummary(hsk2, views).currentTitle).toBe("Trạm 4: Sở thích & Thời gian rảnh");
  });

  it("remainingToMilestone = số lesson trước milestone chưa done", () => {
    const rec2: Record<string, { pct: number; stars: 0 }> = {};
    ["1", "2", "3"].forEach((id) => (rec2[id] = { pct: 100, stars: 0 }));
    const views = deriveStationStates(hsk2, rec2);
    expect(bannerSummary(hsk2, views).remainingToMilestone).toBe(2); // trạm 4, 5
  });

  it("level không trạm (pinyin banner-only): pct 100, current null", () => {
    const pinyin = getRoadmapLevel("pinyin")!;
    const s = bannerSummary(pinyin, deriveStationStates(pinyin, {}));
    expect(s.pct).toBe(100);
    expect(s.currentTitle).toBeNull();
  });
});

describe("overallRoadmapPct", () => {
  it("trong số có trọng số: pinyin 4/8 = 50% chia cho tổng trọng số toàn chặng", () => {
    const store = {
      getRoadmapDone: () => [1, 2, 3, 4], // 4/8 = 50%
      getStationProgress: () => ({}),
    };
    expect(overallRoadmapPct(store)).toBe(weightedOverall(50, {}));
  });

  it("hsk-2 có record → đóng góp theo trọng số = số trạm lesson", () => {
    const store = {
      getRoadmapDone: () => [1, 2, 3, 4],
      getStationProgress: (id: string) => (id === "hsk-2" ? mk([["1", 100]]) : {}),
    };
    const hsk2w = lessonWeight("hsk-2");
    const hsk2Pct = Math.round(100 / hsk2w); // bannerSummary: trạm 1=100, còn lại 0
    expect(overallRoadmapPct(store)).toBe(weightedOverall(50, { "hsk-2": hsk2Pct }));
  });

  it("trống → 0", () => {
    const store = { getRoadmapDone: () => [], getStationProgress: () => ({}) };
    expect(overallRoadmapPct(store)).toBe(0);
  });

  it("bỏ level upcoming (hsk-6, hsk-7-9) và level không trạm lesson", () => {
    const store = {
      getRoadmapDone: () => Array.from({ length: PINYIN_SESSIONS }, (_, i) => i + 1), // pinyin 100%
      getStationProgress: () => ({}),
    };
    expect(overallRoadmapPct(store)).toBe(weightedOverall(100, {}));
  });
});

describe("gateStatus", () => {
  const mkStore = (gatePct: number | null) => ({
    getRoadmapDone: () => [] as number[],
    getStationProgress: () => ({}) as Record<string, StationProgress>,
    getRoadmapGate: (id: string) => (gatePct != null ? { pct: gatePct, at: 0 } : null),
  });

  it("level ≠ hsk-1 → open (kể cả khi không có gate)", () => {
    expect(gateStatus("hsk-2", mkStore(null), 0)).toBe("open");
    expect(gateStatus("hsk-3", mkStore(null), 0)).toBe("open");
    expect(gateStatus("pinyin", mkStore(null), 0)).toBe("open");
  });

  it("hsk-1: gate pct ≥ PASS_PCT → open", () => {
    expect(gateStatus("hsk-1", mkStore(PASS_PCT), 0)).toBe("open");
    expect(gateStatus("hsk-1", mkStore(90), 0)).toBe("open");
  });

  it("hsk-1: gate thiếu hoặc pct < PASS_PCT → locked", () => {
    expect(gateStatus("hsk-1", mkStore(null), 0)).toBe("locked");
    expect(gateStatus("hsk-1", mkStore(PASS_PCT - 1), 0)).toBe("locked");
  });

  it("hsk-1: pinyinDoneCount ≥ PINYIN_SESSIONS → exempt (ưu tiên hơn gate)", () => {
    expect(gateStatus("hsk-1", mkStore(null), PINYIN_SESSIONS)).toBe("exempt");
    expect(gateStatus("hsk-1", mkStore(null), PINYIN_SESSIONS + 3)).toBe("exempt");
    // exempt kể cả khi gate đã open — hoàn thành pinyin thay thế gate
    expect(gateStatus("hsk-1", mkStore(100), PINYIN_SESSIONS)).toBe("exempt");
    expect(gateStatus("hsk-1", mkStore(null), PINYIN_SESSIONS - 1)).not.toBe("exempt");
  });
});

describe("deriveStationStates — lessonDone (Task 5)", () => {
  const doneTrue = () => true;
  const doneFor = (pages: string[]) => (_book: string, page: string) => pages.includes(page);

  it("trạm 1 bài, lessonDone true → pct 100, done dù không có record", () => {
    const views = deriveStationStates(hsk2, {}, doneTrue);
    expect(views.find((v) => v.station.id === "1")!.pct).toBe(100);
    expect(views.find((v) => v.station.id === "1")!.state).toBe("done");
    expect(views.find((v) => v.station.id === "2")!.state).toBe("done");
  });

  it("pct = max(rec.pct, doneLessons/totalLessons) — record 50 + 1/1 bài done → 100", () => {
    const views = deriveStationStates(hsk2, mk([["1", 50]]), doneTrue);
    const v = views.find((v) => v.station.id === "1")!;
    expect(v.pct).toBe(100);
    expect(v.state).toBe("done");
  });

  it("record 100 nhưng chưa có bài nào done → giữ pct record (merge = max)", () => {
    const views = deriveStationStates(hsk2, mk([["1", 100]]), doneFor([]));
    const v = views.find((v) => v.station.id === "1")!;
    expect(v.pct).toBe(100);
    expect(v.state).toBe("done");
  });

  it("trạm milestone 'm' (curated, lessons rỗng) giữ hành vi cũ — chỉ rec.pct", () => {
    const views = deriveStationStates(hsk2, {}, doneTrue);
    const m = views.find((v) => v.station.id === "m")!;
    expect(m.pct).toBe(0);
    // tuần tự: các trạm trước done (theo lessonDone) → m là mắt xích chưa done đầu tiên = active
    expect(m.state).toBe("active");
    // có record → như cũ
    const withRec = deriveStationStates(hsk2, mk([["m", 85]]), doneTrue);
    expect(withRec.find((v) => v.station.id === "m")!.state).toBe("done");
  });

  it("không truyền lessonDone → hành vi cũ nguyên vẹn (record-only)", () => {
    const views = deriveStationStates(hsk2, mk([["1", 50]]));
    expect(views.find((v) => v.station.id === "1")!.pct).toBe(50);
    expect(views.find((v) => v.station.id === "1")!.state).toBe("active");
  });

  it("done theo pct đã merge: generator trạm nhiều bài, 4/5 bài done = 80 → done", () => {
    const hsk1 = getRoadmapLevel("hsk-1")!;
    const g1 = hsk1.stations[0]; // trạm generator, lessons 5 bài
    expect(g1.lessons!.length).toBe(5);
    const pages = g1.lessons!.slice(0, 4).map((l) => l.page);
    const views = deriveStationStates(hsk1, {}, doneFor(pages));
    const v = views.find((v2) => v2.station.id === g1.id)!;
    expect(v.pct).toBe(80);
    expect(v.state).toBe("done");
  });
});
