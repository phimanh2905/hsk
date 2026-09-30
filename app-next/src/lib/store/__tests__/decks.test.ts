import { describe, it, expect, beforeEach } from "vitest";
import { getDeck, listDecks } from "../decks";

beforeEach(() => localStorage.clear());

describe("getDeck / listDecks", () => {
  it("đọc deck từ nhai.decks, map đúng trường rows", () => {
    localStorage.setItem("nhai.decks", JSON.stringify([
      { id: "d1", name: "Bộ thi HSK 1", rows: [{ hanzi: "你好", pinyin: "nǐ hǎo", hanviet: "NHĨ HẢO", meaning: "Xin chào" }] },
    ]));
    const d = getDeck("d1");
    expect(d?.name).toBe("Bộ thi HSK 1");
    expect(d?.rows[0]).toMatchObject({ hanzi: "你好", pinyin: "nǐ hǎo", meaning: "Xin chào" });
    expect(listDecks()).toHaveLength(1);
  });
  it("trả null khi không tồn tại / JSON hỏng", () => {
    expect(getDeck("nope")).toBeNull();
    localStorage.setItem("nhai.decks", "{broken");
    expect(listDecks()).toEqual([]);
  });
});
