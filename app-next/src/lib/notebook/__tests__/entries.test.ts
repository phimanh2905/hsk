import { describe, it, expect, beforeEach } from "vitest";
import { readLocalEntries, writeLocalEntries, notebookStats, newEntryId, NOTEBOOK_KEY, type NotebookEntry } from "@/lib/notebook/entries";

const entry = (over: Partial<NotebookEntry> = {}): NotebookEntry => ({
  id: "e1", kind: "wrong", tag: "t", tagTone: "red",
  payload: { q: "q", wrong: null, right: { zh: "x" }, cause: "c" },
  saved: false, hsk: null, source: "auto",
  createdAt: new Date(Date.now() - 86_400_000).toISOString(), // 1 ngày trước
  updatedAt: new Date().toISOString(),
  ...over,
});

beforeEach(() => localStorage.clear());

describe("localStorage round-trip (spec §3.5)", () => {
  it("ghi/đọc list", () => {
    writeLocalEntries([entry()]);
    expect(readLocalEntries()).toHaveLength(1);
  });
  it("JSON hỏng → []", () => {
    localStorage.setItem(NOTEBOOK_KEY, "{oops");
    expect(readLocalEntries()).toEqual([]);
  });
  it("newEntryId unique", () => {
    expect(newEntryId()).not.toBe(newEntryId());
  });
});

describe("notebookStats (spec §2.2 + §3.5)", () => {
  it("đếm tổng + wrong trong 7 ngày + chưa ghim", () => {
    const s = notebookStats([
      entry({ id: "a" }),                                            // wrong, 1 ngày trước → wrongWeek
      entry({ id: "b", saved: true }),                               // wrong đã khắc phục
      entry({ id: "c", kind: "personal", tagTone: "per", payload: { note: "n" }, createdAt: new Date(Date.now() - 30 * 86_400_000).toISOString() }),
      entry({ id: "d", createdAt: new Date(Date.now() - 10 * 86_400_000).toISOString() }), // wrong cũ → không tính week
    ]);
    expect(s).toEqual({ total: 4, wrongTotal: 3, wrongWeek: 2, wrongUnfixedWeek: 1, fixedPct: 33 });
  });
  it("rỗng → fixedPct null", () => {
    expect(notebookStats([])).toMatchObject({ total: 0, wrongTotal: 0, fixedPct: null });
  });
});
