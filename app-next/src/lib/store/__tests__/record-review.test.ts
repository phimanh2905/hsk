import { describe, it, expect, beforeEach, vi } from "vitest";
import { progressStore } from "../progress-store";

const NOW = 1_800_000_000_000;

beforeEach(() => localStorage.clear());

describe("progressStore.recordReview", () => {
  it("ghi grade good: reviewCount+1, lastReviewedAt, dueAt 3 ngày (learning)", () => {
    progressStore.toggleSrs("hsk1.lesson-1.0");
    const next = progressStore.recordReview("hsk1.lesson-1.0", "good", NOW)!;
    expect(next.status).toBe("learning");
    expect(next.dueAt).toBe(NOW + 3 * 86_400_000);
    expect(next.reviewCount).toBe(1);
    // persist thật
    expect(progressStore.getSrs("hsk1.lesson-1.0")!.reviewCount).toBe(1);
  });
  it("bắn nhai:progress", () => {
    progressStore.toggleSrs("hsk1.lesson-1.0");
    const spy = vi.fn();
    window.addEventListener("nhai:progress", spy);
    progressStore.recordReview("hsk1.lesson-1.0", "forgot", NOW);
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener("nhai:progress", spy);
  });
  it("key không tồn tại → null, không throw (Review Focus #4)", () => {
    expect(progressStore.recordReview("hsk1.khong-co.0", "good", NOW)).toBeNull();
  });
});
