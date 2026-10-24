/* SRS SM-2 scheduler (Wave 5 W5.1). Nguồn sự thật: bảng quyết định trong
   task-2-brief — mọi trường hợp ngoài bảng là lỗi spec, cấm tự chế. */

export const SRS_DAYS = 21; // window "recent" cho computeReviewStats
export const SRS_MATURE_DAYS = 21; // mature = review và interval ≥ 21 ngày
const DAY = 86_400_000;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.0;
export const INIT_EASE = 2.5;

export type SrsStatus = "new" | "learning" | "review" | "relearning";
export type Grade = "again" | "hard" | "good" | "easy"; // 1 Again · 2 Hard · 3 Good · 4 Easy

export type SrsItem = {
  key: string;
  status: SrsStatus;
  dueAt: number | null;
  reviewCount: number;
  lastReviewedAt: number | null;
  updatedAt: number;
  ease: number; // hệ số SM-2, kẹp [MIN_EASE, MAX_EASE]
  intervalDays: number; // khoảng hiện tại (ngày; learning = 0 + due_at theo phút)
  lapses: number; // số lần Again ở review/relearning
};

export type ReviewStats = { due: number; new: number; learning: number; recent: number; learned: number; total: number };

export function isMature(it: SrsItem): boolean {
  return it.status === "review" && it.intervalDays >= SRS_MATURE_DAYS;
}

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
    else if (c.status === "learning" || c.status === "relearning") { s.learning += 1; s.due += 1; }
    else { // review
      if (c.lastReviewedAt != null && now - c.lastReviewedAt < D) s.recent += 1;
      else s.learned += 1;
    }
    // Cần ôn = learning/relearning HOẶC due_at đến hạn (spec 11 §F1) — learning đã đếm ở trên, tránh cộng trùng
    if (c.status !== "learning" && c.status !== "relearning" && c.dueAt != null && c.dueAt <= now) s.due += 1;
  });
  return s;
}

/* ---------- Độ bền trí nhớ (spec §2.3) ---------- */

const MEM_BASE: Record<SrsStatus, number> = { new: 25, learning: 55, relearning: 45, review: 80 };

export function memoryStrength(it: SrsItem, now: number): number {
  let m = MEM_BASE[it.status] ?? 25;
  m += Math.min(it.reviewCount, 10);
  if (it.dueAt != null && it.dueAt < now) m -= Math.floor((now - it.dueAt) / DAY) * 4;
  return Math.max(5, Math.min(100, Math.round(m)));
}

export type MemTone = "weak" | "mid" | "strong";

export function memTone(m: number): MemTone {
  return m < 55 ? "weak" : m <= 80 ? "mid" : "strong";
}

export function memLabel(m: number): "Yếu" | "Vừa" | "Sâu" {
  return m < 50 ? "Yếu" : m < 70 ? "Vừa" : "Sâu";
}

/* ---------- SM-2 applyGrade (bảng quyết định W5.1) ---------- */

function clampEase(e: number): number {
  return Math.max(MIN_EASE, Math.min(MAX_EASE, e));
}

function fin(
  it: SrsItem,
  status: SrsStatus,
  ease: number,
  intervalDays: number,
  dueAt: number,
  lapses: number,
  reviewCount: number,
  now: number,
): SrsItem {
  return { ...it, status, ease, intervalDays, dueAt, lapses, reviewCount, lastReviewedAt: now, updatedAt: now };
}

export function applyGrade(it: SrsItem, grade: Grade, now: number): SrsItem {
  const reviewCount = it.reviewCount + 1;
  const { status, ease, intervalDays, lapses } = it;
  const learning = status === "new" || status === "learning";
  if (learning) {
    if (grade === "again") return fin(it, "learning", ease, 0, now + 60_000, lapses, reviewCount, now);
    if (grade === "hard") return fin(it, "learning", ease, 0, now + 10 * 60_000, lapses, reviewCount, now);
    if (grade === "good") return fin(it, "review", ease, 1, now + DAY, lapses, reviewCount, now);
    return fin(it, "review", clampEase(ease + 0.15), 4, now + 4 * DAY, lapses, reviewCount, now);
  }
  if (status === "relearning") {
    if (grade === "again") return fin(it, "relearning", clampEase(ease - 0.2), intervalDays, now + 60_000, lapses, reviewCount, now);
    if (grade === "hard") return fin(it, "relearning", clampEase(ease - 0.15), intervalDays, now + 10 * 60_000, lapses, reviewCount, now);
    if (grade === "good") {
      const iv = Math.max(1, intervalDays);
      return fin(it, "review", ease, iv, now + iv * DAY, lapses, reviewCount, now);
    }
    const iv = Math.max(1, Math.floor(intervalDays * 1.5));
    return fin(it, "review", clampEase(ease + 0.15), iv, now + iv * DAY, lapses, reviewCount, now);
  }
  // review
  if (grade === "again") {
    const iv = Math.max(1, Math.floor(0.5 * intervalDays));
    return fin(it, "relearning", clampEase(ease - 0.2), iv, now + 10 * 60_000, lapses + 1, reviewCount, now);
  }
  const easeNext =
    grade === "hard" ? clampEase(ease - 0.15)
    : grade === "easy" ? clampEase(ease + 0.15)
    : ease;
  const iv =
    grade === "hard" ? Math.max(1, Math.floor(1.2 * intervalDays))
    : grade === "good" ? Math.max(1, Math.floor(intervalDays * ease))
    : Math.max(1, Math.floor(intervalDays * ease * 1.3));
  return fin(it, status, easeNext, iv, now + iv * DAY, lapses, reviewCount, now);
}
