import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildStationQuestions,
  levelPool,
  sampleMilestoneQuestions,
  submitStationResult,
  type StationPool,
} from "../station-quiz";
import { getRoadmapLevel, type Station } from "@/content/roadmap-stations";

const hsk2 = getRoadmapLevel("hsk-2")!;
const s1 = hsk2.stations.find((s) => s.id === "1")!;
const s5 = hsk2.stations.find((s) => s.id === "5")!; // vocab mỏng (3 từ)
const milestone = hsk2.stations.find((s) => s.id === "m")!;

/** rng deterministic: xen kẽ 0/1 để shuffle ổn định cho assert */
const detRng = () => 0.42;

describe("levelPool", () => {
  it("gom vocab/gram của mọi lesson station, loại milestone", () => {
    const pool = levelPool(hsk2);
    // 5 lesson + trạm 6 vocab; milestone bị loại
    expect(pool.vocab.length).toBeGreaterThan(20);
    expect(pool.gram.length).toBeGreaterThan(8);
    expect(pool.vocab).not.toContainEqual(["Tổng ôn 60 từ", "zǒng fùxí", "flashcard chặng 1"]);
  });
});

describe("buildStationQuestions", () => {
  it("số câu = vocab + gram; mỗi câu có đáp án trong options", () => {
    const qs = buildStationQuestions(s1, undefined, detRng);
    expect(qs.length).toBe(s1.vocab.length + s1.gram.length);
    for (const q of qs) {
      expect(q.options.length).toBe(4);
      expect(q.options[q.answerIndex]).toBeTruthy();
      expect(q.prompt.length).toBeGreaterThan(0);
      expect(new Set(q.options).size).toBe(q.options.length); // không trùng option
    }
  });

  it("station vocab mỏng: vẫn đủ câu, options lấp từ level pool", () => {
    const pool = levelPool(hsk2);
    const qs = buildStationQuestions(s5, pool, detRng);
    expect(qs.length).toBe(s5.vocab.length + s5.gram.length);
    for (const q of qs) expect(q.options.length).toBe(4);
  });

  it("F1 — gram distractor cùng loại: câu nghĩa → options toàn nghĩa, câu tên mẫu → toàn tên", () => {
    const station: Station = {
      ...s1,
      vocab: [],
      gram: [
        ["Mẫu G1", "nghĩa một"], ["Mẫu G2", "nghĩa hai"],
        ["Mẫu G3", "nghĩa ba"], ["Mẫu G4", "nghĩa bốn"],
      ],
    };
    const qs = buildStationQuestions(station, undefined, detRng);
    const descs = station.gram.map(([, d]) => d);
    const names = station.gram.map(([n]) => n);
    const descQs = qs.filter((q) => q.prompt.includes("diễn đạt"));
    const nameQs = qs.filter((q) => q.prompt.includes("ứng với"));
    expect(descQs.length).toBe(2);
    expect(nameQs.length).toBe(2);
    for (const q of descQs) {
      expect(q.options.every((o) => descs.includes(o))).toBe(true);
    }
    for (const q of nameQs) {
      expect(q.options.every((o) => names.includes(o))).toBe(true);
    }
  });

  it("F1 — pool gram mỏng (station 1: 2 mục) vẫn đủ 4 options qua fallback trộn", () => {
    const qs = buildStationQuestions(s1, undefined, detRng);
    const gramQs = qs.filter((q) => q.prompt.includes("diễn đạt") || q.prompt.includes("ứng với"));
    expect(gramQs.length).toBe(s1.gram.length);
    for (const q of gramQs) {
      expect(q.options.length).toBe(4);
      expect(new Set(q.options).size).toBe(4);
    }
  });

  it("rng được dùng cho shuffle (cùng seed → cùng kết quả)", () => {
    const a = buildStationQuestions(s1, undefined, detRng);
    const b = buildStationQuestions(s1, undefined, detRng);
    expect(a).toEqual(b);
  });
});

describe("sampleMilestoneQuestions", () => {
  it("đúng 10 câu (8 vocab + 2 gram), 4 options mỗi câu", () => {
    const qs = sampleMilestoneQuestions(hsk2, detRng);
    expect(qs.length).toBe(10);
    for (const q of qs) expect(q.options.length).toBe(4);
  });
});

describe("submitStationResult", () => {
  const mkStore = () => {
    const data: Record<string, Record<string, { pct: number; stars: 0 | 1 | 2 | 3 }>> = {};
    return {
      data,
      getStationProgress: (id: string) => data[id] ?? {},
      setStationProgress: vi.fn((id: string, sid: string, rec: { pct: number; stars: 0 | 1 | 2 | 3 }) => {
        data[id] = { ...(data[id] ?? {}), [sid]: rec };
      }),
    };
  };
  let store: ReturnType<typeof mkStore>;
  beforeEach(() => { store = mkStore(); });

  it("6/8 = 75% → chưa pass, stars 0, ghi record", () => {
    const r = submitStationResult("hsk-2", "1", 6, 8, store);
    expect(r).toEqual({ pct: 75, passed: false, stars: 0, improved: true }); // 6/8 = 75
  });

  it("7/8 = 88% → passed 1 sao; 9/10 = 90% → 2 sao; 10/10 → 3 sao", () => {
    expect(submitStationResult("hsk-2", "1", 7, 8, store).stars).toBe(1);
    expect(submitStationResult("hsk-2", "2", 9, 10, store).stars).toBe(2);
    expect(submitStationResult("hsk-2", "3", 10, 10, store).stars).toBe(3);
  });

  it("best-of: điểm thấp hơn không ghi đè", () => {
    submitStationResult("hsk-2", "1", 10, 10, store);
    const r = submitStationResult("hsk-2", "1", 5, 10, store);
    expect(r.improved).toBe(false);
    expect(store.data["hsk-2"]!["1"]).toEqual({ pct: 100, stars: 3 });
  });

  it("dưới 80 vẫn ghi pct (thanh progress fill) với stars 0", () => {
    const r = submitStationResult("hsk-2", "1", 3, 7, store);
    expect(r.passed).toBe(false);
    expect(store.data["hsk-2"]!["1"]).toEqual({ pct: 43, stars: 0 });
  });
});
