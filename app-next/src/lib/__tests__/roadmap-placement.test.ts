import { describe, it, expect } from "vitest";
import { roadmapStageIndex, suggestedStartStage, gateStatus } from "../roadmap-progress";
import type { ProgressStoreApi } from "../store/progress-store";

const fakeGateStore = {
  getRoadmapDone: () => [],
  getStationProgress: () => ({}),
  getRoadmapGate: () => null,
} as unknown as ProgressStoreApi;

describe("roadmapStageIndex", () => {
  it("pinyin=0, hsk5=5", () => {
    expect(roadmapStageIndex("pinyin")).toBe(0);
    expect(roadmapStageIndex("hsk5")).toBe(5);
  });
});

describe("suggestedStartStage", () => {
  it("có placement → suggestedStage", () => {
    expect(suggestedStartStage({ placement: { suggestedStage: "hsk3" } })).toBe("hsk3");
  });
  it("skip-only / null → null", () => {
    expect(suggestedStartStage(null)).toBeNull();
    expect(suggestedStartStage({})).toBeNull();
  });
});

describe("gateStatus với suggestedStage", () => {
  it("suggestedStage ≥ hsk1 → exempt hsk-1", () => {
    expect(gateStatus("hsk-1", fakeGateStore, 0, "hsk2")).toBe("exempt");
  });
  it("suggestedStage = pinyin → giữ hành vi cũ", () => {
    expect(gateStatus("hsk-1", fakeGateStore, 0, "pinyin")).toBe("locked");
  });
  it("không truyền → giữ hành vi cũ", () => {
    expect(gateStatus("hsk-1", fakeGateStore, 0)).toBe("locked");
    expect(gateStatus("hsk-2", fakeGateStore, 0, "hsk5")).toBe("open");
  });
});
