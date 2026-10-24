/* Luật merge HybridStore (spec 2026-10-24, nguyên tắc 1) — dùng chung client
   (hybrid-store) và server (route /api/v1/sync). Thuần: không I/O, không mutate input.
   - Counter (reviewCount/xp/correct/knownCount): max.
   - modes: per-key max.
   - Trường còn lại: của bản có updatedAt lớn hơn.
   - Tombstone: thắng bản sống khi deletedAt <= updatedAt của bản sống; chỉ ghi
     có updatedAt > updatedAt của bản tombstone mới hồi sinh (deletedAt: null). */

/* W5.1 SM-2: thêm review/relearning (format 4); learned/known giữ lại chỉ để
   merge dữ liệu server/payload cũ — client luôn ghi status SM-2 mới. */
export type SrsSyncStatus = "new" | "learning" | "review" | "relearning" | "learned" | "known";

export type SyncSrsRecord = {
  key: string;
  status: SrsSyncStatus;
  dueAt: number | null;
  reviewCount: number;
  lastReviewedAt: number | null;
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

export type SyncPayload = {
  srs: SyncSrsRecord[];
  studyDay: SyncStudyDayRecord[];
  lessonProgress: SyncLessonRecord[];
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
