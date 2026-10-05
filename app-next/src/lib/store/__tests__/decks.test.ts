import { describe, it, expect, beforeEach } from "vitest";
import { getDeck, listDecks } from "../decks";

beforeEach(() => localStorage.clear());

describe("getDeck / listDecks", () => {
  it("đọc deck từ bye.decks, map đúng trường rows", () => {
    localStorage.setItem(
      "bye.decks",
      JSON.stringify([
        {
          id: "nb-1",
          name: "Bộ thử",
          rows: [{ hanzi: "时间", pinyin: "shíjiān", hanviet: "thời gian", meaning: "thời gian" }],
          updatedAt: new Date().toISOString(),
        },
      ])
    );
    const d = getDeck("nb-1");
    expect(d?.name).toBe("Bộ thử");
    expect(d?.rows[0]).toEqual({ hanzi: "时间", pinyin: "shíjiān", hanViet: "thời gian", meaning: "thời gian" });
    expect(listDecks()).toHaveLength(1);
  });
  it("trả null khi không tồn tại / JSON hỏng", () => {
    expect(getDeck("nope")).toBeNull();
    localStorage.setItem("bye.decks", "{broken");
    expect(listDecks()).toEqual([]);
  });
});
