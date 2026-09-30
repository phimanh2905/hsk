import { describe, it, expect, beforeEach } from "vitest";
import { ProgressStore } from "../progress-store";

beforeEach(() => localStorage.clear());

describe("mock login + streak", () => {
  it("isLoggedIn/setMockLogin theo key nhai.mockLogin", () => {
    const s = new ProgressStore();
    expect(s.isLoggedIn()).toBe(false);
    s.setMockLogin(true);
    expect(localStorage.getItem("nhai.mockLogin")).toBe("1");
    expect(s.isLoggedIn()).toBe(true);
    s.setMockLogin(false);
    expect(s.isLoggedIn()).toBe(false);
  });
  it("getStreak đọc nhai.streak, hỏng → 0", () => {
    const s = new ProgressStore();
    expect(s.getStreak()).toBe(0);
    localStorage.setItem("nhai.streak", "7");
    expect(s.getStreak()).toBe(7);
    localStorage.setItem("nhai.streak", "abc");
    expect(s.getStreak()).toBe(0);
  });
});

describe("decks CRUD — shape mảng [{id, name, rows, updatedAt}]", () => {
  it("createDeck unshift vào nhai.decks, listDecks trả đủ", () => {
    const s = new ProgressStore();
    const a = s.createDeck("vocab", "Từ vựng giáo trình 2");
    const b = s.createDeck("vocab", "Bộ thứ hai");
    expect(a.id).toMatch(/^nb-/);
    expect(a.rows).toEqual([]);
    expect(a.updatedAt).toBeTruthy();
    const all = s.listDecks("vocab");
    expect(all.map((d) => d.name)).toEqual(["Bộ thứ hai", "Từ vựng giáo trình 2"]); // mới nhất đầu
    expect(all[0].id).toBe(b.id);
  });
  it("grammar ghi nhai.notebooks — hai kind không trộn", () => {
    const s = new ProgressStore();
    s.createDeck("grammar", "Mẫu câu của tôi");
    expect(JSON.parse(localStorage.getItem("nhai.notebooks")!)).toHaveLength(1);
    expect(localStorage.getItem("nhai.decks")).toBeNull();
    expect(s.listDecks("vocab")).toEqual([]);
  });
  it("renameDeck + deleteDeck", () => {
    const s = new ProgressStore();
    const d = s.createDeck("vocab", "Cũ");
    s.renameDeck("vocab", d.id, "Mới");
    expect(s.getDeckItem("vocab", d.id)?.name).toBe("Mới");
    s.deleteDeck("vocab", d.id);
    expect(s.getDeckItem("vocab", d.id)).toBeNull();
    expect(s.listDecks("vocab")).toEqual([]);
  });
  it("JSON hỏng → [] (an toàn như clone notebook.js)", () => {
    localStorage.setItem("nhai.decks", "{broken");
    expect(new ProgressStore().listDecks("vocab")).toEqual([]);
  });
});

describe("vocabBook (nhai.vocabBook)", () => {
  it("addToVocabBook push mới, trùng hanzi trả false", () => {
    const s = new ProgressStore();
    expect(s.addToVocabBook({ hanzi: "学习", pinyin: "xué xí", vi: "học tập; học" })).toBe(true);
    expect(s.addToVocabBook({ hanzi: "学习", pinyin: "xué xí", vi: "học tập; học" })).toBe(false);
    expect(s.getVocabBook()).toEqual([{ hanzi: "学习", pinyin: "xué xí", vi: "học tập; học" }]);
  });
});
