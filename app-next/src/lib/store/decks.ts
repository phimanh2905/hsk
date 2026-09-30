/* Đọc deck tự tạo từ ProgressStore storage (key `nhai.decks`) — port clone/js/lesson.js:41-52 (readStore + loadData nhánh ?custom=).
   Shape clone là MẢNG [{ id, name, rows: [{ hanzi, pinyin, hanviet, meaning }] }] — CHỈ ĐỌC,
   không ghi (CRUD deck thuộc trang my-vocab/notebook, domain khác). */

export type DeckRow = {
  hanzi: string;
  pinyin?: string;
  hanViet?: string;
  meaning?: string;
  exampleZh?: string;
};

export type Deck = {
  id: string;
  name: string;
  rows: DeckRow[];
};

type RawDeck = {
  id?: string;
  name?: string;
  rows?: { hanzi?: string; pinyin?: string; hanviet?: string; meaning?: string; exampleZh?: string }[];
};

/* Đọc raw JSON, trả mảng (shape MẢNG của clone); JSON hỏng / không phải mảng → []. */
function readRawDecks(): RawDeck[] {
  try {
    const v = JSON.parse(localStorage.getItem("nhai.decks") || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function mapDeck(d: RawDeck): Deck {
  const rows = Array.isArray(d.rows) ? d.rows : [];
  return {
    id: String(d.id ?? ""),
    name: String(d.name ?? ""),
    rows: rows.map((r) => ({
      hanzi: (r && r.hanzi) || "",
      pinyin: (r && r.pinyin) || undefined,
      hanViet: (r && r.hanviet) || undefined, // clone ghi thường `hanviet` → map sang `hanViet`
      meaning: (r && r.meaning) || undefined,
      exampleZh: (r && r.exampleZh) || undefined,
    })),
  };
}

export function getDeck(deckId: string): Deck | null {
  const d = readRawDecks().find((x) => String(x && x.id) === String(deckId));
  return d ? mapDeck(d) : null;
}

export function listDecks(): Deck[] {
  return readRawDecks().map(mapDeck);
}
