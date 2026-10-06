/* SRS session data (spec 2026-10-04 §2.2, §2.4). Thuần function — memoryStrength
   từ lib/stats/review, đọc decks qua progressStore (client singleton, jsdom OK). */

import { progressStore, type SrsItem } from "@/lib/store/progress-store";
import { memoryStrength } from "@/lib/stats/review";
import type { VocabData } from "@/lib/content/vocab";

/* Nguồn vocab client-side: inject 1 lần qua setVocabData (ContentBridge →
   vocab-client loader), thay import trực tiếp content/vocab — dataset lên D1
   thì client không đọc được. Module singleton giống progressStore;
   resolveWord trả null cho key vocab khi chưa inject (deck keys vẫn OK). */
let vocabData: VocabData | null = null;

export function setVocabData(d: VocabData | null): void {
  vocabData = d;
}

export function getVocabData(): VocabData | null {
  return vocabData;
}

const DAY = 86_400_000;

export type ReviewableWord = {
  key: string;
  zh: string;
  pinyin: string;
  meaning: string;
  level: string;
  mem: number;
  lastLabel: string;
  isNew: boolean;
};

export function srsLevelFromKey(key: string): string {
  const m = /^hsk(\d+)\./.exec(key);
  return m ? `HSK ${m[1]}` : "HSK 2";
}

export function formatLastLabel(ts: number | null, now: number): string {
  if (ts == null) return "Chưa ôn";
  const days = Math.floor((now - ts) / DAY);
  if (days <= 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  return `${days} ngày trước`;
}

export function resolveWord(key: string): { zh: string; pinyin: string; meaning: string } | null {
  const dm = /^deck\.([^.]+)\.(\d+)$/.exec(key);
  if (dm) {
    for (const kind of ["vocab", "grammar"] as const) {
      const deck = progressStore.getDeckItem(kind, dm[1]);
      const row = deck?.rows[Number(dm[2])];
      if (row) return { zh: row.hanzi, pinyin: row.pinyin ?? "", meaning: row.meaning ?? "" };
    }
    return null;
  }
  const m = /^([^.]+)\.([^.]+)\.(\d+)$/.exec(key);
  if (!m) return null;
  const word = vocabData?.[m[1]]?.[m[2]]?.words[Number(m[3])];
  return word ? { zh: word.hanzi, pinyin: word.pinyin, meaning: word.meaning } : null;
}

/* Đến hạn (status != known && dueAt <= now) → 0; new/learning → 1; learned/known → 2. */
function orderBucket(it: SrsItem, now: number): number {
  if (it.status !== "known" && it.dueAt != null && it.dueAt <= now) return 0;
  if (it.status === "new" || it.status === "learning") return 1;
  return 2;
}

export function buildQueue(items: SrsItem[], level: string, now: number): ReviewableWord[] {
  const entries: { it: SrsItem; w: ReviewableWord }[] = [];
  for (const it of items) {
    if (srsLevelFromKey(it.key) !== level) continue;
    const r = resolveWord(it.key);
    if (!r) continue; // Review Focus #2 — key lạ bị loại, không NaN
    entries.push({
      it,
      w: {
        key: it.key,
        ...r,
        level,
        mem: memoryStrength(it, now),
        lastLabel: formatLastLabel(it.lastReviewedAt, now),
        isNew: it.reviewCount === 0,
      },
    });
  }
  entries.sort((a, b) => orderBucket(a.it, now) - orderBucket(b.it, now) || a.w.key.localeCompare(b.w.key));
  return entries.map((e) => e.w);
}
