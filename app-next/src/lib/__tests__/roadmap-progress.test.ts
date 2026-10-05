import { describe, it, expect } from "vitest";
import { getRoadmapLevel } from "@/content/roadmap-stations";
import { deriveStationStates, bannerSummary } from "../roadmap-progress";
import type { StationProgress } from "@/lib/store/progress-store";

const hsk2 = getRoadmapLevel("hsk-2")!;
const stateOf = (record: Record<string, StationProgress>, id: string) =>
  deriveStationStates(hsk2, record).find((v) => v.station.id === id)!.state;

describe("deriveStationStates", () => {
  it("Review Focus #1 — store rỗng: deterministic, trạm 1 active, còn lại locked", () => {
    const views = deriveStationStates(hsk2, {});
    expect(views.map((v) => v.state)).toEqual([
      "active", "locked", "locked", "locked", "locked", "locked", "locked",
    ]);
    expect(views[0].pct).toBe(0);
  });

  it("trạm 1 done 3 sao → trạm 2 active với pct riêng", () => {
    const rec = { "1": { pct: 100, stars: 3 as const } };
    expect(stateOf(rec, "1")).toBe("done");
    expect(stateOf(rec, "2")).toBe("active");
    const v2 = deriveStationStates(hsk2, rec).find((v) => v.station.id === "2")!;
    expect(v2.pct).toBe(0);
  });

  it("trạm active giữ pct từ record (55%)", () => {
    const rec = { "4": { pct: 55, stars: 0 as const } };
    // trạm 4 active giả định khi 1–3 done
    const rec2 = { ...rec, "1": { pct: 100, stars: 3 as const }, "2": { pct: 100, stars: 3 as const }, "3": { pct: 100, stars: 3 as const } };
    const v4 = deriveStationStates(hsk2, rec2).find((v) => v.station.id === "4")!;
    expect(v4.state).toBe("active");
    expect(v4.pct).toBe(55);
  });

  it("Review Focus #4 — milestone luôn locked khi còn lesson chưa done, kể cả record lạ", () => {
    const rec = { m: { pct: 100, stars: 3 as const } }; // milestone có record nhưng trạm 1 chưa done
    expect(stateOf(rec, "m")).toBe("locked");
  });

  it("tất cả lesson done → milestone active; milestone done khi record 100", () => {
    const allDone = Object.fromEntries(
      ["1", "2", "3", "4", "5", "6"].map((id) => [id, { pct: 100, stars: 3 as const }]),
    );
    expect(stateOf(allDone, "m")).toBe("active");
    const recM = { ...allDone, m: { pct: 100, stars: 3 as const } };
    expect(stateOf(recM, "m")).toBe("done");
  });

  it("I-2 — gate theo vị trí: Trạm 1–5 done, Trạm 6 (sau milestone) chưa → milestone active", () => {
    const rec = Object.fromEntries(
      ["1", "2", "3", "4", "5"].map((id) => [id, { pct: 100, stars: 3 as const }]),
    );
    expect(stateOf(rec, "m")).toBe("active");
    expect(stateOf(rec, "6")).toBe("active"); // lesson đầu chưa done → active, không giữ milestone locked
  });

  it("active chỉ gán cho lesson đầu tiên chưa done (dù record rải rác)", () => {
    const rec = { "2": { pct: 50, stars: 0 as const } };
    expect(stateOf(rec, "1")).toBe("active");
    expect(stateOf(rec, "2")).toBe("locked");
  });
});

describe("bannerSummary", () => {
  it("pct = trung bình pct các trạm lesson (milestone không tính)", () => {
    const rec: Record<string, { pct: number; stars: 0 }> = {};
    ["1", "2", "3"].forEach((id) => (rec[id] = { pct: 100, stars: 0 }));
    rec["4"] = { pct: 50, stars: 0 };
    const views = deriveStationStates(hsk2, rec);
    // 3 trăm + 1 nửa trên 6 lesson = (100+100+100+50+0+0)/6 ≈ 58
    expect(bannerSummary(hsk2, views).pct).toBe(58);
  });
  it("currentTitle = 'Trạm 4: Sở thích & Thời gian rảnh'", () => {
    const rec: Record<string, { pct: number; stars: 0 }> = {};
    ["1", "2", "3"].forEach((id) => (rec[id] = { pct: 100, stars: 0 }));
    const views = deriveStationStates(hsk2, rec);
    expect(bannerSummary(hsk2, views).currentTitle).toBe("Trạm 4: Sở thích & Thời gian rảnh");
  });
  it("remainingToMilestone = số lesson trước milestone chưa done", () => {
    const rec: Record<string, { pct: number; stars: 0 }> = {};
    ["1", "2", "3"].forEach((id) => (rec[id] = { pct: 100, stars: 0 }));
    const views = deriveStationStates(hsk2, rec);
    expect(bannerSummary(hsk2, views).remainingToMilestone).toBe(2); // trạm 4, 5
  });
  it("level không trạm (hsk-1): pct 100, current null", () => {
    const hsk1 = getRoadmapLevel("hsk-1")!;
    const s = bannerSummary(hsk1, deriveStationStates(hsk1, {}));
    expect(s.pct).toBe(100);
    expect(s.currentTitle).toBeNull();
  });
});
