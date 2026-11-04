// app-next/src/lib/store/__tests__/progress-store-onboarding.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProgressStore, type OnboardingState } from "../progress-store";

beforeEach(() => localStorage.clear());

const full: OnboardingState = {
  goal: "hsk5",
  minutes: 15,
  placement: { suggestedStage: "hsk2", blocks: { hsk1: { correct: 3, total: 3 } }, seed: 42, at: 1700000000000 },
  at: 1700000000000,
};

describe("onboarding state", () => {
  it("mặc định null khi chưa set", () => {
    expect(new ProgressStore().getOnboarding()).toBeNull();
  });

  it("roundtrip goal+minutes+placement", () => {
    const s = new ProgressStore();
    s.setOnboarding(full);
    expect(s.getOnboarding()).toEqual(full);
  });

  it("skip-only state (không placement) roundtrip", () => {
    const s = new ProgressStore();
    s.setOnboarding({ goal: "hsk2", minutes: 10, skipped: 1, at: 1 });
    expect(s.getOnboarding()).toEqual({ goal: "hsk2", minutes: 10, skipped: 1, at: 1 });
  });

  it("emit 'bye:progress' khi setOnboarding", () => {
    const s = new ProgressStore();
    const spy = vi.fn();
    window.addEventListener("bye:progress", spy);
    s.setOnboarding(full);
    expect(spy).toHaveBeenCalled();
    window.removeEventListener("bye:progress", spy);
  });

  it("JSON hỏng → null (không throw)", () => {
    localStorage.setItem("bye.onboarding.v1", "{oops");
    expect(new ProgressStore().getOnboarding()).toBeNull();
  });
});
