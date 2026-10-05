/* Đọc deck tự tạo qua ProgressStore (key `bye.decks`, shape MẢNG [{ id, name, rows, updatedAt }] của clone) —
   port clone/js/lesson.js:41-52 (readStore + loadData nhánh ?custom=).
   CHỈ ĐỌC: CRUD deck thuộc ProgressStore (sp1-personal-tools Task 1); file này chỉ map
   DeckRow.hanviet → Deck.hanViet để route /lesson/custom/[deckId] tiếp tục dùng được. */

import { progressStore, type DeckRow } from "./progress-store";

export type Deck = {
  id: string;
  name: string;
  rows: {
    hanzi: string;
    pinyin?: string;
    hanViet?: string;
    meaning?: string;
    exampleZh?: string;
  }[];
};

function toDeck(d: { id: string; name: string; rows: DeckRow[] }): Deck {
  return {
    id: d.id,
    name: d.name,
    rows: d.rows.map((r) => ({
      hanzi: r.hanzi,
      pinyin: r.pinyin,
      hanViet: r.hanviet,
      meaning: r.meaning,
      // trường phụ clone ghi thêm trong rows (nếu có) — giữ cho lesson custom dùng được
      exampleZh: (r as DeckRow & { exampleZh?: string }).exampleZh,
    })),
  };
}

export function listDecks(): Deck[] {
  return progressStore.listDecks("vocab").map(toDeck);
}

export function getDeck(deckId: string): Deck | null {
  const d = progressStore.getDeckItem("vocab", deckId);
  return d ? toDeck(d) : null;
}
