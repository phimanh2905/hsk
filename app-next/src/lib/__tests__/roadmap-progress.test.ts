import { describe, it, expect } from "vitest";
import { getRoadmapLevel } from "@/content/roadmap-stations";
import {
  PASS_PCT,
  bannerSummary,
  deriveStationStates,
  overallRoadmapPct,
} from "../roadmap-progress";
import type { StationProgress } from "@/lib/store/progress-store";

const hsk2 = getRoadmapLevel("hsk-2")!;
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
      mk([["1", 100], ["2", 100], ["3", 100], ["4", 100], ["5", 100], ["m", 100], ["6", 100]]),
    );
    expect(views.every((v) => v.state === "done")).toBe(true);
  });
});

describe("deriveStationStates (cũ — regression gate)", () => {
  it("Review Focus #1 — store rỗng: deterministic, trạm 1 active, còn lại locked", () => {
    const views = deriveStationStates(hsk2, {});
    expect(views.map((v) => v.state)).toEqual([
      "active", "locked", "locked", "locked", "locked", "locked", "locked",
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
    // lessons: 1(100) 2(50) 3(0) 4(0) 5(0) 6(0) — milestone không tính
    expect(s.pct).toBe(Math.round((100 + 50 + 0 + 0 + 0 + 0) / 6));
    expect(s.currentTitle).toContain("Trạm 2");
    expect(s.remainingToMilestone).toBe(4); // 2,3,4,5 chưa hết trước m (1 done)
  });

  it("pct = trung bình pct các trạm lesson (milestone không tính)", () => {
    const rec2: Record<string, { pct: number; stars: 0 }> = {};
    ["1", "2", "3"].forEach((id) => (rec2[id] = { pct: 100, stars: 0 }));
    rec2["4"] = { pct: 50, stars: 0 };
    const views = deriveStationStates(hsk2, rec2);
    // 3 trăm + 1 nửa trên 6 lesson = (100+100+100+50+0+0)/6 ≈ 58
    expect(bannerSummary(hsk2, views).pct).toBe(58);
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

  it("level không trạm (hsk-1): pct 100, current null", () => {
    const hsk1 = getRoadmapLevel("hsk-1")!;
    const s = bannerSummary(hsk1, deriveStationStates(hsk1, {}));
    expect(s.pct).toBe(100);
    expect(s.currentTitle).toBeNull();
  });
});

describe("overallRoadmapPct", () => {
  it("trung bình pinyin % và hsk-2 summary %, làm tròn", () => {
    const store = {
      getRoadmapDone: () => [1, 2, 3, 4], // 4/8 = 50%
      getStationProgress: (id: string) => (id === "hsk-2" ? mk([["1", 100]]) : {}),
    };
    // hsk-2 lessons: 1(100) còn lại 0 → 100/6 ≈ 17 → round 17; overall = round((50+17)/2) = 34
    expect(overallRoadmapPct(store)).toBe(Math.round((50 + Math.round(100 / 6)) / 2));
  });

  it("trống → 0", () => {
    const store = { getRoadmapDone: () => [], getStationProgress: () => ({}) };
    expect(overallRoadmapPct(store)).toBe(0);
  });
});
