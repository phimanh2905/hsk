/* Luật merge HybridStore (spec 2026-10-24, nguyên tắc 1) — dùng chung client
   (hybrid-store) và server (route /api/v1/sync). Thuần: không I/O, không mutate input.
   - Counter (reviewCount/xp/correct/knownCount): max.
   - modes: per-key max.
   - Trường còn lại (bao gồm ease/intervalDays/lapses — Constraint 4 Wave 4):
     của bản có updatedAt lớn hơn.
   - Tombstone: thắng bản sống khi deletedAt <= updatedAt của bản sống; chỉ ghi
     có updatedAt > updatedAt của bản tombstone mới hồi sinh (deletedAt: null).
   - reviewLogs: append-only, union theo khóa (itemKey, reviewedAt) — không
     field-wise merge, giữ bản bên a khi trùng. */

/* W5.1 SM-2: thêm review/relearning (format 4); learned/known giữ lại chỉ để
   merge dữ liệu server/payload cũ — client luôn ghi status SM-2 mới. */
export const SRS_STATUSES = ["new", "learning", "review", "relearning", "learned", "known"] as const;

export type SrsSyncStatus = (typeof SRS_STATUSES)[number];

export type SyncSrsRecord = {
  key: string;
  status: SrsSyncStatus;
  dueAt: number | null;
  reviewCount: number;
  lastReviewedAt: number | null;
  ease: number;
  intervalDays: number;
  lapses: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type SyncStudyDayRecord = { date: string; xp: number; correct: number; updatedAt: number };

export type SyncLessonRecord = {
  book: string;
  lesson: string;
  modes: Record<string, number>;
  knownCount: number;
  updatedAt: number;
  deletedAt: number | null;
};

/* W5.2 — domain sync thứ 4: review log append-only. */
export type SyncReviewLogRecord = {
  itemKey: string;
  cardType: "vocab" | "grammar";
  rating: 1 | 2 | 3 | 4;
  durationMs: number;
  reviewedAt: number;
};

/* Domain sync thứ 5 — quiz bài đọc (spec 2026-10-30 §4.4). Không tombstone. */
export type SyncReadingRecord = {
  readingId: string;
  correct: number;
  total: number;
  attempts: number;
  completedAt: string;
  updatedAt: number;
};

/* Domain sync thứ 6 — bài đọc "Bài của tôi" (spec 2026-10-30 §4.3). Structural
   mirror của SavedReadingDraft (progress-store) — không import store. */
export type SyncDraftRecord = {
  id: string;
  title: string;
  textZh: string;
  doc: {
    sentences: { zh: string; py: string; vi: string }[];
    vocab: { word: string; py: string; vi: string }[];
    questions: {
      q: string;
      qVi: string;
      options: string[];
      answer: number;
      evidence?: { si: number; s: number; e: number }[];
    }[];
  };
  chars: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type SyncPayload = {
  srs: SyncSrsRecord[];
  studyDay: SyncStudyDayRecord[];
  lessonProgress: SyncLessonRecord[];
  reviewLogs: SyncReviewLogRecord[];
  readingProgress: SyncReadingRecord[];
  readingDrafts: SyncDraftRecord[];
};

/** Tombstone thắng bản sống khi xóa xảy ra tại/sau lần ghi cuối của bản sống. */
function resolveTombstone(
  winner: { updatedAt: number; deletedAt: number | null },
  loser: { updatedAt: number; deletedAt: number | null }
): number | null {
  if (winner.deletedAt != null) return winner.deletedAt;
  if (loser.deletedAt != null && loser.deletedAt <= winner.updatedAt) return loser.deletedAt;
  return null;
}

export function mergeSrs(a: SyncSrsRecord, b: SyncSrsRecord): SyncSrsRecord {
  const winner = a.updatedAt >= b.updatedAt ? a : b;
  const loser = a.updatedAt >= b.updatedAt ? b : a;
  return {
    key: winner.key,
    status: winner.status,
    dueAt: winner.dueAt,
    reviewCount: Math.max(a.reviewCount, b.reviewCount),
    lastReviewedAt: winner.lastReviewedAt,
    // SM-2: trường đo lường hiện trạng, gắn chặt status/dueAt → theo bản updatedAt lớn hơn
    ease: winner.ease,
    intervalDays: winner.intervalDays,
    lapses: winner.lapses,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
    deletedAt: resolveTombstone(winner, loser),
  };
}

export function mergeStudyDay(a: SyncStudyDayRecord, b: SyncStudyDayRecord): SyncStudyDayRecord {
  return {
    date: a.date,
    xp: Math.max(a.xp, b.xp),
    correct: Math.max(a.correct, b.correct),
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}

export function mergeLesson(a: SyncLessonRecord, b: SyncLessonRecord): SyncLessonRecord {
  const winner = a.updatedAt >= b.updatedAt ? a : b;
  const loser = a.updatedAt >= b.updatedAt ? b : a;
  const modes: Record<string, number> = { ...a.modes };
  for (const [k, v] of Object.entries(b.modes)) modes[k] = Math.max(modes[k] ?? 0, v);
  return {
    book: winner.book,
    lesson: winner.lesson,
    modes,
    knownCount: Math.max(a.knownCount, b.knownCount),
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
    deletedAt: resolveTombstone(winner, loser),
  };
}

/** W5.2 — reviewLogs: union theo khóa `${itemKey}@${reviewedAt}`, giữ bản a khi
    trùng (append-only). Output sort theo khóa → tính xác định 2 chiều. */export function mergeReviewLogs(a: SyncReviewLogRecord[], b: SyncReviewLogRecord[]): SyncReviewLogRecord[] {
  const byKey = new Map<string, SyncReviewLogRecord>();
  for (const rec of a) byKey.set(`${rec.itemKey}@${rec.reviewedAt}`, rec);
  for (const rec of b) {
    const k = `${rec.itemKey}@${rec.reviewedAt}`;
    if (!byKey.has(k)) byKey.set(k, rec);
  }
  return [...byKey.entries()].sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)).map(([, rec]) => rec);
}

/* Spec 2026-10-30 §4.3 — readingDrafts: toàn bộ trường theo bản updatedAt lớn hơn.
   Tombstone chỉ thắng khi xóa xảy ra tại/sau lần ghi cuối của bản sống
   (deletedAt >= updatedAt bên còn lại) — khác resolveTombstone (dùng cho
   lessonProgress) nơi tombstone luôn thắng khi <= updatedAt winner. */
export function mergeReadingDrafts(a: SyncDraftRecord, b: SyncDraftRecord): SyncDraftRecord {
  const winner = a.updatedAt >= b.updatedAt ? a : b;
  const loser = a.updatedAt >= b.updatedAt ? b : a;
  const deletedAt =
    winner.deletedAt != null
      ? winner.deletedAt
      : loser.deletedAt != null && loser.deletedAt >= winner.updatedAt
        ? loser.deletedAt
        : null;
  return { ...winner, updatedAt: Math.max(a.updatedAt, b.updatedAt), deletedAt };
}

/* Spec 2026-10-30 §4.4 — readingProgress: counter (correct/attempts) max,
   trường còn lại của bản updatedAt lớn hơn. Không tombstone. */
export function mergeReadingProgress(a: SyncReadingRecord, b: SyncReadingRecord): SyncReadingRecord {
  const winner = a.updatedAt >= b.updatedAt ? a : b;
  return {
    readingId: a.readingId,
    correct: Math.max(a.correct, b.correct),
    total: winner.total,
    attempts: Math.max(a.attempts, b.attempts),
    completedAt: winner.completedAt,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}
