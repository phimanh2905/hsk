import type { SrsItem } from "@/lib/store/progress-store";

export const SRS_DAYS = 21;
const DAY = 86_400_000;
export type ReviewStats = { due: number; new: number; learning: number; recent: number; learned: number; total: number };

// SP1: kind suy đoán từ content vocab — key <book>.<page>.<i> có lesson vocab thật là vocab;
// deck.* học qua khuôn lesson chung → tính grammar (comment: UPG-2 đọc kind từ srs_states).
export function itemKeyKind(key: string, hasVocabEntry: (book: string, page: string) => boolean): "vocab" | "grammar" {
  const m = /^([^.]+)\.([^.]+)\.\d+$/.exec(key);
  if (!m) return "grammar";
  return hasVocabEntry(m[1], m[2]) ? "vocab" : "grammar";
}

export function computeReviewStats(
  items: SrsItem[], kind: "vocab" | "grammar", now: number,
  hasVocabEntry: (book: string, page: string) => boolean,
): ReviewStats {
  const D = SRS_DAYS * DAY;
  const s: ReviewStats = { due: 0, new: 0, learning: 0, recent: 0, learned: 0, total: 0 };
  items.forEach((c) => {
    if (itemKeyKind(c.key, hasVocabEntry) !== kind) return;
    s.total += 1;
    if (c.status === "new") s.new += 1;
    else if (c.status === "learning") { s.learning += 1; s.due += 1; }
    else { // learned | known
      if (c.lastReviewedAt != null && now - c.lastReviewedAt < D) s.recent += 1;
      else s.learned += 1;
    }
    // Cần ôn = learning HOẶC due_at đến hạn (spec 11 §F1) — learning đã đếm ở trên, tránh cộng trùng
    if (c.status !== "learning" && c.dueAt != null && c.dueAt <= now) s.due += 1;
  });
  return s;
}
