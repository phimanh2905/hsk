import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq, isNotNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { srsCards, studyDay, lessonProgress, reviewLogs, readingProgress, readingDrafts } from "@/lib/db/schema";
import {
  mergeSrs,
  mergeStudyDay,
  mergeLesson,
  mergeReadingProgress,
  mergeReadingDrafts,
  SRS_STATUSES,
  type SrsSyncStatus,
  type SyncSrsRecord,
  type SyncStudyDayRecord,
  type SyncLessonRecord,
  type SyncReadingRecord,
  type SyncReviewLogRecord,
  type SyncDraftRecord,
} from "@/lib/store/sync-merge";

const bodySchema = z.object({
  srs: z
    .array(
      z.object({
        key: z.string().min(1).max(200),
        status: z.enum(SRS_STATUSES), // learned/known: payload cũ
        dueAt: z.number().int().nullable(),
        reviewCount: z.number().int().min(0),
        lastReviewedAt: z.number().int().nullable(),
        // SM-2 (Wave 5) — optional để nhận payload legacy chưa có 3 trường
        ease: z.number().min(1.3).max(3).optional(),
        intervalDays: z.number().int().min(0).optional(),
        lapses: z.number().int().min(0).optional(),
        updatedAt: z.number().int().positive(),
        deletedAt: z.number().int().nullable(),
      })
    )
    .max(500)
    .default([]),
  studyDay: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        xp: z.number().int().min(0),
        correct: z.number().int().min(0),
        updatedAt: z.number().int().positive(),
      })
    )
    .max(500)
    .default([]),
  lessonProgress: z
    .array(
      z.object({
        book: z.string().min(1).max(100),
        lesson: z.string().min(1).max(200),
        modes: z.record(z.string(), z.number().int().min(0)).default({}),
        knownCount: z.number().int().min(0),
        updatedAt: z.number().int().positive(),
        deletedAt: z.number().int().nullable(),
      })
    )
    .max(500)
    .default([]),
  reviewLogs: z
    .array(
      z.object({
        itemKey: z.string().min(1).max(200),
        cardType: z.enum(["vocab", "grammar"]),
        rating: z.number().int().min(1).max(4),
        durationMs: z.number().int().min(0),
        reviewedAt: z.number().int().positive(),
      })
    )
    .max(1000)
    .default([]),
  readingProgress: z
    .array(
      z.object({
        readingId: z.string().min(1).max(200),
        correct: z.number().int().min(0),
        total: z.number().int().min(0),
        attempts: z.number().int().min(0),
        completedAt: z.string().max(50),
        updatedAt: z.number().int().positive(),
      })
    )
    .max(500)
    .default([]),
  readingDrafts: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        title: z.string().max(255),
        textZh: z.string().max(4000),
        doc: z.object({
          sentences: z.array(z.object({ zh: z.string().max(2000), py: z.string().max(2000), vi: z.string().max(2000) })),
          vocab: z.array(z.object({ word: z.string().max(200), py: z.string().max(200), vi: z.string().max(500) })),
          questions: z.array(
            z.object({
              q: z.string().max(2000),
              qVi: z.string().max(2000),
              options: z.array(z.string().max(500)),
              answer: z.number().int().min(0),
              evidence: z
                .array(z.object({ si: z.number().int().min(0), s: z.number().int().min(0), e: z.number().int().min(0) }))
                .optional(),
            })
          ),
        }),
        chars: z.number().int().min(0),
        createdAt: z.number().int().positive(),
        updatedAt: z.number().int().positive(),
        deletedAt: z.number().int().nullable(),
      })
    )
    .max(100)
    .default([]),
});

/* Payload legacy chưa có SM-2: ease 2.5, lapses 0, interval map theo status
   (learned→7, known→21 — cùng mapping backfill migration 0007). */
const LEGACY_INTERVAL: Partial<Record<SrsSyncStatus, number>> = { learned: 7, known: 21 };

function normalizeSrsInc(inc: z.infer<typeof bodySchema>["srs"][number]): SyncSrsRecord {
  return {
    ...inc,
    ease: inc.ease ?? 2.5,
    intervalDays: inc.intervalDays ?? LEGACY_INTERVAL[inc.status] ?? 0,
    lapses: inc.lapses ?? 0,
  };
}

const TOMBSTONE_TTL_MS = 90 * 24 * 3600 * 1000;


/* D1 giới hạn 100 bind parameters/query — mỗi row 5-11 cột nên chunk batch
   insert ≤ 8 rows/statement (an toàn cho mọi domain, vượt limit sẽ 500
   "too many SQL variables" — bug sync payload > 9 cards). */
function chunk<T>(arr: T[], size = 8): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: NextRequest) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const body = parsed.data;

  const db = createDb();
  const userId = session.user.id;
  const now = Date.now();

  // 1) SRS
  // Dedupe trong batch: 2 bản cùng key phải merge trước, nếu không
  // ON CONFLICT sẽ raise do trùng conflict target trong cùng statement.
  const incSrsMap = new Map<string, SyncSrsRecord>();
  for (const raw of body.srs) {
    const inc = normalizeSrsInc(raw);
    const prev = incSrsMap.get(inc.key);
    incSrsMap.set(inc.key, prev ? mergeSrs(prev, inc) : inc);
  }
  const existingSrs = await db.select().from(srsCards).where(eq(srsCards.userId, userId));
  const srsMap = new Map(existingSrs.map((r) => [r.key, r]));
  const mergedSrs: SyncSrsRecord[] = [...incSrsMap.values()].map((inc) => {
    const ex = srsMap.get(inc.key);
    if (!ex) return inc;
    const serverRec: SyncSrsRecord = {
      key: ex.key,
      status: ex.status,
      dueAt: ex.dueAt,
      reviewCount: ex.reviewCount,
      lastReviewedAt: ex.lastReviewedAt,
      ease: ex.ease,
      intervalDays: ex.intervalDays,
      lapses: ex.lapses,
      updatedAt: ex.updatedAt,
      deletedAt: ex.deletedAt,
    };
    return mergeSrs(serverRec, inc);
  });
  // W5.1 SM-2: status legacy (learned/known từ payload cũ) → review trước khi ghi DB
  // (migration 0007 đã backfill learned→review/7, known→review/21 cùng mapping).
  const dbStatus = (st: SrsSyncStatus): "new" | "learning" | "review" | "relearning" =>
    st === "learned" || st === "known" ? "review" : st;
  if (mergedSrs.length) {
    for (const part of chunk(mergedSrs.map((r) => ({
          userId,
          key: r.key,
          status: dbStatus(r.status),
          dueAt: r.dueAt,
          reviewCount: r.reviewCount,
          lastReviewedAt: r.lastReviewedAt,
          ease: r.ease,
          intervalDays: r.intervalDays,
          lapses: r.lapses,
          updatedAt: r.updatedAt,
          deletedAt: r.deletedAt,
        })))) {
        await db
          .insert(srsCards)
          .values(part)
            .onConflictDoUpdate({
          target: [srsCards.userId, srsCards.key],
          // merge đã tính giá trị cuối ở bước map → ghi đè bằng excluded
          set: {
            status: sql`excluded.status`,
            dueAt: sql`excluded.due_at`,
            reviewCount: sql`excluded.review_count`,
            lastReviewedAt: sql`excluded.last_reviewed_at`,
            ease: sql`excluded.ease`,
            intervalDays: sql`excluded.interval_days`,
            lapses: sql`excluded.lapses`,
            updatedAt: sql`excluded.updated_at`,
            deletedAt: sql`excluded.deleted_at`,
          },
        });
      }
  }

  // 2) studyDay (dedupe cùng date trước khi merge với server)
  const incDayMap = new Map<string, SyncStudyDayRecord>();
  for (const inc of body.studyDay) {
    const prev = incDayMap.get(inc.date);
    incDayMap.set(inc.date, prev ? mergeStudyDay(prev, inc) : inc);
  }
  const existingDays = await db.select().from(studyDay).where(eq(studyDay.userId, userId));
  const dayMap = new Map(existingDays.map((r) => [r.date, r]));
  const mergedDays: SyncStudyDayRecord[] = [...incDayMap.values()].map((inc) => {
    const ex = dayMap.get(inc.date);
    if (!ex) return inc;
    return mergeStudyDay({ date: ex.date, xp: ex.xp, correct: ex.correct, updatedAt: ex.updatedAt }, inc);
  });
  if (mergedDays.length) {
    for (const part of chunk(mergedDays.map((r) => ({
          userId,
          date: r.date,
          xp: r.xp,
          correct: r.correct,
          updatedAt: r.updatedAt,
        })))) {
        await db
          .insert(studyDay)
          .values(part)
            .onConflictDoUpdate({
          target: [studyDay.userId, studyDay.date],
          set: {
            xp: sql`excluded.xp`,
            correct: sql`excluded.correct`,
            updatedAt: sql`excluded.updated_at`,
          },
        });
      }
  }

  // 3) lessonProgress (dedupe cùng book+lesson trước khi merge với server)
  const incLessonMap = new Map<string, SyncLessonRecord>();
  for (const inc of body.lessonProgress) {
    const k = `${inc.book}/${inc.lesson}`;
    const prev = incLessonMap.get(k);
    incLessonMap.set(k, prev ? mergeLesson(prev, inc) : inc);
  }
  const existingLessons = await db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId));
  const lessonMap = new Map(existingLessons.map((r) => [`${r.book}/${r.lesson}`, r]));
  const mergedLessons: SyncLessonRecord[] = [...incLessonMap.values()].map((inc) => {
    const ex = lessonMap.get(`${inc.book}/${inc.lesson}`);
    if (!ex) return inc;
    const serverRec: SyncLessonRecord = {
      book: ex.book,
      lesson: ex.lesson,
      modes: ex.modes,
      knownCount: ex.knownCount,
      updatedAt: ex.updatedAt,
      deletedAt: ex.deletedAt,
    };
    return mergeLesson(serverRec, inc);
  });
  if (mergedLessons.length) {
    for (const part of chunk(mergedLessons.map((r) => ({
          userId,
          book: r.book,
          lesson: r.lesson,
          modes: r.modes,
          knownCount: r.knownCount,
          updatedAt: r.updatedAt,
          deletedAt: r.deletedAt,
        })))) {
        await db
          .insert(lessonProgress)
          .values(part)
            .onConflictDoUpdate({
          target: [lessonProgress.userId, lessonProgress.book, lessonProgress.lesson],
          set: {
            modes: sql`excluded.modes`,
            knownCount: sql`excluded.known_count`,
            updatedAt: sql`excluded.updated_at`,
            deletedAt: sql`excluded.deleted_at`,
          },
        });
      }
  }

  // 4) reviewLogs (W5.2 — append-only, không merge: upsert excluded thuần).
  // Dedupe trong batch theo khóa tự nhiên (itemKey, reviewedAt) — giữ bản đầu.
  const incLogMap = new Map<string, SyncReviewLogRecord>();
  for (const inc of body.reviewLogs) {
    const k = `${inc.itemKey}@${inc.reviewedAt}`;
    if (!incLogMap.has(k)) incLogMap.set(k, { ...inc, rating: inc.rating as 1 | 2 | 3 | 4 });
  }
  if (incLogMap.size) {
    for (const part of chunk([...incLogMap.values()].map((r) => ({
          userId,
          itemKey: r.itemKey,
          cardType: r.cardType,
          rating: r.rating,
          durationMs: r.durationMs,
          reviewedAt: r.reviewedAt,
        })))) {
        await db
          .insert(reviewLogs)
          .values(part)
            .onConflictDoUpdate({
          target: [reviewLogs.userId, reviewLogs.itemKey, reviewLogs.reviewedAt],
          set: {
            cardType: sql`excluded.card_type`,
            rating: sql`excluded.rating`,
            durationMs: sql`excluded.duration_ms`,
          },
        });
      }
  }

  // 5) readingProgress (spec 2026-10-30 §4.4 — không tombstone).
  const incReadingMap = new Map<string, SyncReadingRecord>();
  for (const inc of body.readingProgress) {
    const prev = incReadingMap.get(inc.readingId);
    incReadingMap.set(inc.readingId, prev ? mergeReadingProgress(prev, inc) : inc);
  }
  const existingReadings = await db.select().from(readingProgress).where(eq(readingProgress.userId, userId));
  const readingMap = new Map(existingReadings.map((r) => [r.readingId, r]));
  const mergedReadings: SyncReadingRecord[] = [...incReadingMap.values()].map((inc) => {
    const ex = readingMap.get(inc.readingId);
    if (!ex) return inc;
    return mergeReadingProgress(
      {
        readingId: ex.readingId,
        correct: ex.correct,
        total: ex.total,
        attempts: ex.attempts,
        completedAt: ex.completedAt ?? "",
        updatedAt: ex.updatedAt,
      },
      inc
    );
  });
  if (mergedReadings.length) {
    for (const part of chunk(mergedReadings.map((r) => ({
          userId,
          readingId: r.readingId,
          correct: r.correct,
          total: r.total,
          attempts: r.attempts,
          completedAt: r.completedAt,
          updatedAt: r.updatedAt,
        })))) {
        await db
          .insert(readingProgress)
          .values(part)
            .onConflictDoUpdate({
          target: [readingProgress.userId, readingProgress.readingId],
          set: {
            correct: sql`excluded.correct`,
            total: sql`excluded.total`,
            attempts: sql`excluded.attempts`,
            completedAt: sql`excluded.completed_at`,
            updatedAt: sql`excluded.updated_at`,
          },
        });
      }
  }

  // 6) readingDrafts (spec 2026-10-30 §4.3 — tombstone nằm trên record, merge
  //    per-id updatedAt thắng; PK id — createdAt bất biến sau khi tạo).
  const incDraftMap = new Map<string, SyncDraftRecord>();
  for (const inc of body.readingDrafts) {
    const prev = incDraftMap.get(inc.id);
    incDraftMap.set(inc.id, prev ? mergeReadingDrafts(prev, inc) : inc);
  }
  const existingDrafts = await db.select().from(readingDrafts).where(eq(readingDrafts.userId, userId));
  const draftMap = new Map(existingDrafts.map((r) => [r.id, r]));
  const mergedDrafts: SyncDraftRecord[] = [...incDraftMap.values()].map((inc) => {
    const ex = draftMap.get(inc.id);
    if (!ex) return inc;
    return mergeReadingDrafts(
      {
        id: ex.id,
        title: ex.title,
        textZh: ex.textZh,
        doc: ex.doc,
        chars: ex.chars,
        createdAt: ex.createdAt,
        updatedAt: ex.updatedAt,
        deletedAt: ex.deletedAt,
      },
      inc
    );
  });
  if (mergedDrafts.length) {
    // DraftDocRow yêu cầu evidence luôn có — record từ client có thể thiếu
    const toRowDoc = (r: SyncDraftRecord) => ({
      ...r.doc,
      questions: r.doc.questions.map((q) => ({ ...q, evidence: q.evidence ?? [] })),
    });
    for (const part of chunk(mergedDrafts.map((r) => ({
          userId,
          id: r.id,
          title: r.title,
          textZh: r.textZh,
          doc: toRowDoc(r),
          chars: r.chars,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          deletedAt: r.deletedAt,
        })))) {
        await db
          .insert(readingDrafts)
          .values(part)
            .onConflictDoUpdate({
          target: [readingDrafts.id],
          set: {
            title: sql`excluded.title`,
            textZh: sql`excluded.text_zh`,
            doc: sql`excluded.doc`,
            chars: sql`excluded.chars`,
            updatedAt: sql`excluded.updated_at`,
            deletedAt: sql`excluded.deleted_at`,
          },
        });
      }
  }

  // 7) Purge tombstone >90 ngày
  await db
    .delete(srsCards)
    .where(and(eq(srsCards.userId, userId), isNotNull(srsCards.deletedAt), lt(srsCards.deletedAt, now - TOMBSTONE_TTL_MS)));
  await db
    .delete(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        isNotNull(lessonProgress.deletedAt),
        lt(lessonProgress.deletedAt, now - TOMBSTONE_TTL_MS)
      )
    );
  await db
    .delete(readingDrafts)
    .where(and(eq(readingDrafts.userId, userId), isNotNull(readingDrafts.deletedAt), lt(readingDrafts.deletedAt, now - TOMBSTONE_TTL_MS)));

  // 7) Trả về toàn bộ state server của user sau merge
  const [finalSrs, finalDays, finalLessons, finalLogs, finalReadings, finalDrafts] = await Promise.all([
    db.select().from(srsCards).where(eq(srsCards.userId, userId)),
    db.select().from(studyDay).where(eq(studyDay.userId, userId)),
    db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId)),
    db.select().from(reviewLogs).where(eq(reviewLogs.userId, userId)),
    db.select().from(readingProgress).where(eq(readingProgress.userId, userId)),
    db.select().from(readingDrafts).where(eq(readingDrafts.userId, userId)),
  ]);

  const srsOut: SyncSrsRecord[] = finalSrs.map((r) => ({
    key: r.key,
    status: r.status,
    dueAt: r.dueAt,
    reviewCount: r.reviewCount,
    lastReviewedAt: r.lastReviewedAt,
    ease: r.ease,
    intervalDays: r.intervalDays,
    lapses: r.lapses,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
  }));
  const studyDayOut: SyncStudyDayRecord[] = finalDays.map((r) => ({
    date: r.date,
    xp: r.xp,
    correct: r.correct,
    updatedAt: r.updatedAt,
  }));
  const lessonOut: SyncLessonRecord[] = finalLessons.map((r) => ({
    book: r.book,
    lesson: r.lesson,
    modes: r.modes,
    knownCount: r.knownCount,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
  }));
  const reviewLogsOut: SyncReviewLogRecord[] = finalLogs.map((r) => ({
    itemKey: r.itemKey,
    cardType: r.cardType,
    rating: r.rating as 1 | 2 | 3 | 4,
    durationMs: r.durationMs,
    reviewedAt: r.reviewedAt,
  }));

  const readingOut: SyncReadingRecord[] = finalReadings.map((r) => ({
    readingId: r.readingId,
    correct: r.correct,
    total: r.total,
    attempts: r.attempts,
    completedAt: r.completedAt ?? "",
    updatedAt: r.updatedAt,
  }));

  const draftsOut: SyncDraftRecord[] = finalDrafts.map((r) => ({
    id: r.id,
    title: r.title,
    textZh: r.textZh,
    doc: r.doc,
    chars: r.chars,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt,
  }));

  return NextResponse.json({
    serverTime: now,
    srs: srsOut,
    studyDay: studyDayOut,
    lessonProgress: lessonOut,
    reviewLogs: reviewLogsOut,
    readingProgress: readingOut,
    readingDrafts: draftsOut,
  });
}
