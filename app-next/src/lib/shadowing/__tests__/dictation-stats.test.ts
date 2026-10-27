import { beforeEach, describe, expect, it } from "vitest";
import { getDictStats, recordDictCheck, recordReplay } from "../dictation-stats";

describe("dictation-stats (localStorage)", () => {
  beforeEach(() => localStorage.clear());
  it("video chưa luyện → object rỗng", () => {
    expect(getDictStats("vid1")).toEqual({});
  });
  it("recordDictCheck ghi lastScore + errors theo lineN", () => {
    recordDictCheck("vid1", 2, 80, 1);
    expect(getDictStats("vid1")["2"]).toEqual({ lastScore: 80, errors: 1, replays: 0 });
  });
  it("check lần sau ghi đè lastScore, cộng dồn errors", () => {
    recordDictCheck("vid1", 2, 80, 1);
    recordDictCheck("vid1", 2, 100, 0);
    expect(getDictStats("vid1")["2"]).toEqual({ lastScore: 100, errors: 1, replays: 0 });
  });
  it("recordReplay tăng replays, không đụng score", () => {
    recordDictCheck("vid1", 3, 60, 2);
    recordReplay("vid1", 3);
    recordReplay("vid1", 3);
    expect(getDictStats("vid1")["3"]).toEqual({ lastScore: 60, errors: 2, replays: 2 });
  });
  it("hai video độc lập", () => {
    recordDictCheck("vid1", 1, 50, 1);
    expect(getDictStats("vid2")).toEqual({});
  });
});
