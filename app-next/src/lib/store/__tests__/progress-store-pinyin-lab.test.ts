import { describe, it, expect, beforeEach } from "vitest";
import { progressStore } from "../progress-store";

describe("progressStore pinyin lab best", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("mặc định best = 0", () => {
    expect(progressStore.getPinyinLabBest()).toBe(0);
  });

  it("recordPinyinLabResult: ghi best khi cao hơn; không giảm khi thấp hơn", () => {
    progressStore.recordPinyinLabResult(6);
    expect(progressStore.getPinyinLabBest()).toBe(6);
    progressStore.recordPinyinLabResult(3);
    expect(progressStore.getPinyinLabBest()).toBe(6);
    progressStore.recordPinyinLabResult(9);
    expect(progressStore.getPinyinLabBest()).toBe(9);
  });
});
