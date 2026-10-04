import { afterEach, describe, expect, it, vi } from "vitest";
import { ProgressStore } from "../progress-store";

describe("progressStore — station progress (nhai.roadmap.stations.v1)", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("roundtrip set/get theo level, level khác trả rỗng", () => {
    const store = new ProgressStore();
    store.setStationProgress("hsk-2", "4", { pct: 55, stars: 0 });
    store.setStationProgress("hsk-2", "1", { pct: 100, stars: 3 });
    expect(store.getStationProgress("hsk-2")).toEqual({
      "1": { pct: 100, stars: 3 },
      "4": { pct: 55, stars: 0 },
    });
    expect(store.getStationProgress("hsk-1")).toEqual({});
  });

  it("set phát sự kiện nhai:progress để hook sync", () => {
    const store = new ProgressStore();
    const listener = vi.fn();
    window.addEventListener("nhai:progress", listener);
    store.setStationProgress("hsk-2", "1", { pct: 100, stars: 3 });
    expect(listener).toHaveBeenCalled();
  });

  it("JSON hỏng trong localStorage → trả {} không crash", () => {
    localStorage.setItem("nhai.roadmap.stations.v1", "{not json");
    const store = new ProgressStore();
    expect(store.getStationProgress("hsk-2")).toEqual({});
  });
});
