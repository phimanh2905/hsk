import { describe, it, expect, beforeEach } from "vitest";
import { progressStore } from "../progress-store";

describe("progressStore sound rules best", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("mặc định best = 0", () => {
    expect(progressStore.getSoundRulesBest()).toBe(0);
  });

  it("recordSoundRulesResult: ghi khi cao hơn, giữ khi thấp hơn hoặc bằng", () => {
    progressStore.recordSoundRulesResult(3);
    expect(progressStore.getSoundRulesBest()).toBe(3);
    progressStore.recordSoundRulesResult(1);
    expect(progressStore.getSoundRulesBest()).toBe(3);
    progressStore.recordSoundRulesResult(3);
    expect(progressStore.getSoundRulesBest()).toBe(3);
    progressStore.recordSoundRulesResult(5);
    expect(progressStore.getSoundRulesBest()).toBe(5);
  });

  it("điểm âm bỏ qua (không ghi)", () => {
    progressStore.recordSoundRulesResult(-1);
    expect(progressStore.getSoundRulesBest()).toBe(0);
  });
});
