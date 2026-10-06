import { describe, it, expect, beforeEach, vi } from "vitest";
import { progressStore } from "../progress-store";

describe("progressStore word meta (Review Focus #5)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("mặc định {}", () => {
    expect(progressStore.getWordMeta()).toEqual({});
  });

  it("toggleWordStar: bật → true + persist; tắt + không note → xoá entry", () => {
    expect(progressStore.toggleWordStar("爱")).toBe(true);
    expect(JSON.parse(localStorage.getItem("bye.wordMeta")!)["爱"]).toEqual({ star: 1 });
    expect(progressStore.toggleWordStar("爱")).toBe(false);
    expect(JSON.parse(localStorage.getItem("bye.wordMeta")!)["爱"]).toBeUndefined();
  });

  it("toggleWordStar tắt nhưng còn note → giữ entry", () => {
    progressStore.setWordNote("爱", "mẹo");
    progressStore.toggleWordStar("爱");
    progressStore.toggleWordStar("爱"); // tắt star
    expect(JSON.parse(localStorage.getItem("bye.wordMeta")!)["爱"]).toEqual({ note: "mẹo" });
  });

  it("setWordNote: ghi; rỗng + không star → xoá entry", () => {
    progressStore.setWordNote("爱", "mẹo nhớ");
    expect(progressStore.getWordMeta()["爱"]).toEqual({ note: "mẹo nhớ" });
    progressStore.setWordNote("爱", "   ");
    expect(progressStore.getWordMeta()["爱"]).toBeUndefined();
  });
});
