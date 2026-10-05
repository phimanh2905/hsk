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

/* ---------- Review redesign (spec 2026-10-04 §2.1, §2.3) ---------- */

export type Grade = "forgot" | "hard" | "good";

const MEM_BASE: Record<SrsItem["status"], number> = { new: 25, learning: 55, learned: 80, known: 92 };

/* Độ bền trí nhớ suy diễn (spec §2.3): base theo status, + min(reviewCount, 10),
   -4/ngày khi quá hạn (floor 5). Không thêm trường mới vào SrsItem. */
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

/* Bảng grade spec §2.1. Thăng cấp khi "good" (quyết định plan, spec không định nghĩa):
   learning/new đạt 3 lần ôn → learned; learned đạt 6 lần → known. */
export function applyGrade(it: SrsItem, grade: Grade, now: number): SrsItem {
  const reviewCount = it.reviewCount + 1;
  let status: SrsItem["status"];
  let dueAt: number;
  if (grade === "forgot") {
    status = "learning";
    dueAt = now + 60_000;
  } else if (grade === "hard") {
    status = "learning";
    dueAt = now + 300_000;
  } else {
    if (it.status === "known") status = "known";
    else if (it.status === "learned") status = reviewCount >= 6 ? "known" : "learned";
    else status = reviewCount >= 3 ? "learned" : "learning";
    dueAt = now + (status === "learned" || status === "known" ? 7 : 3) * DAY;
  }
  return { ...it, status, dueAt, reviewCount, lastReviewedAt: now, updatedAt: now };
}
