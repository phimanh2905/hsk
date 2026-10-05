import { describe, it, expect, beforeEach, vi } from "vitest";
import { progressStore } from "../progress-store";

describe("progressStore grammar meta (Review Focus #4)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("mặc định {}", () => {
    expect(progressStore.getGrammarMeta()).toEqual({});
  });

  it("toggleGrammarSaved: bật → true; tắt → xoá entry sạch khỏi bye.grammarMeta", () => {
    expect(progressStore.toggleGrammarSaved("ba")).toBe(true);
    expect(JSON.parse(localStorage.getItem("bye.grammarMeta")!)["ba"]).toEqual({ saved: 1 });
    expect(progressStore.toggleGrammarSaved("ba")).toBe(false);
    expect(JSON.parse(localStorage.getItem("bye.grammarMeta")!)["ba"]).toBeUndefined();
  });

  it("toggle nhanh 2 lần về đúng giá trị ban đầu", () => {
    const a = progressStore.toggleGrammarSaved("bi");
    const b = progressStore.toggleGrammarSaved("bi");
    expect([a, b]).toEqual([true, false]);
    expect(progressStore.getGrammarMeta()).toEqual({});
  });
});
