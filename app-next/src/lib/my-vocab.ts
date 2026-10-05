/* Sổ tay từ vựng — hợp nhất 3 nguồn data thật (spec 2026-10-05 §2.1):
   SRS (status/last/level suy) ∪ user deck rows ∪ vocabBook, dedupe theo Hán tự.
   Pure functions; resolveWord đọc progressStore (jsdom OK, như srs-session). */

import { formatLastLabel, resolveWord, srsLevelFromKey } from "@/lib/srs-session";
import type { DeckItem, SrsItem, VocabBookEntry, WordMeta } from "@/lib/store/progress-store";

export type VocabStatus = "master" | "study" | "new";

export type VocabRow = {
  zh: string;
  py: string;
  hv: string;
  vi: string;
  hsk: string;        // "HSK N" khi có SRS, ngược lại "—"
  status: VocabStatus;
  last: string;
  star: boolean;
  note: string;
  hasSrs: boolean;
  deckIds: string[];
};

export type VocabIndex = {
  rows: VocabRow[];
  dueCount: number;   // hasSrs && status !== "master" (semantics mock st!=='master')
  mastery: number;    // weighted %: master 1 / study .5 / new 0
  hskTarget: string | null;
};

const STATUS_MAP: Record<SrsItem["status"], VocabStatus> = {
  known: "master",
  learned: "master",
  learning: "study",
  new: "new",
};

function emptyRow(zh: string): VocabRow {
  return { zh, py: "", hv: "", vi: "", hsk: "—", status: "new", last: "Chưa ôn", star: false, note: "", hasSrs: false, deckIds: [] };
}

export function buildVocabIndex(input: {
  srs: SrsItem[];
  decks: DeckItem[];
  vocabBook: VocabBookEntry[];
  meta: Record<string, WordMeta>;
  now: number;
}): VocabIndex {
  const byZh = new Map<string, VocabRow>();
  const get = (zh: string): VocabRow => {
    let r = byZh.get(zh);
    if (!r) { r = emptyRow(zh); byZh.set(zh, r); }
    return r;
  };

  /* 1) SRS — first-wins cho py/vi/hsk/status/last */
  for (const it of input.srs) {
    const w = resolveWord(it.key);
    if (!w || !w.zh) continue; // Review Focus #2: key chết bỏ qua
    const row = get(w.zh);
    if (!row.hasSrs) {
      row.py = w.pinyin || row.py;
      row.vi = w.meaning || row.vi;
      row.hsk = srsLevelFromKey(it.key);
      row.status = STATUS_MAP[it.status] ?? "new";
      row.last = formatLastLabel(it.lastReviewedAt ?? null, input.now);
      row.hasSrs = true;
    }
  }

  /* 2) user deck rows — bổ sung hv + deck membership */
  for (const d of input.decks) {
    for (const r of d.rows) {
      if (!r.hanzi) continue;
      const row = get(r.hanzi);
      if (!row.deckIds.includes(d.id)) row.deckIds.push(d.id);
      if (!row.py) row.py = r.pinyin ?? "";
      if (!row.hv) row.hv = r.hanviet ?? "";
      if (!row.vi) row.vi = r.meaning ?? "";
    }
  }

  /* 3) vocabBook */
  for (const e of input.vocabBook) {
    const row = get(e.hanzi);
    if (!row.py) row.py = e.pinyin || "";
    if (!row.vi) row.vi = e.vi || "";
  }

  /* 4) meta (star/note) */
  const rows = [...byZh.values()];
  for (const r of rows) {
    const m = input.meta[r.zh];
    if (m) { r.star = !!m.star; r.note = m.note ?? ""; }
  }

  const dueCount = rows.filter((r) => r.hasSrs && r.status !== "master").length;
  const mastery = rows.length
    ? Math.round((rows.reduce((a, r) => a + (r.status === "master" ? 1 : r.status === "study" ? 0.5 : 0), 0) / rows.length) * 100)
    : 0;
  let maxLv = 0;
  for (const r of rows) {
    const m = /^HSK (\d+)$/.exec(r.hsk);
    if (m) maxLv = Math.max(maxLv, Number(m[1]));
  }
  return { rows, dueCount, mastery, hskTarget: maxLv ? `HSK ${maxLv}` : null };
}
