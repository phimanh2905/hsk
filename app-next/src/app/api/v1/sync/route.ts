import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq, isNotNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { srsCards, studyDay, lessonProgress } from "@/lib/db/schema";
import {
  mergeSrs,
  mergeStudyDay,
  mergeLesson,
  type SrsSyncStatus,
  type SyncSrsRecord,
  type SyncStudyDayRecord,
  type SyncLessonRecord,
} from "@/lib/store/sync-merge";

const bodySchema = z.object({
  srs: z
    .array(
      z.object({
        key: z.string().min(1).max(200),
        status: z.enum(["new", "learning", "review", "relearning", "learned", "known"]), // learned/known: payload cũ
        dueAt: z.number().int().nullable(),
        reviewCount: z.number().int().min(0),
        lastReviewedAt: z.number().int().nullable(),
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
});

const TOMBSTONE_TTL_MS = 90 * 24 * 3600 * 1000;

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
  for (const inc of body.srs) {
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
    await db
      .insert(srsCards)
      .values(
        mergedSrs.map((r) => ({
          userId,
          key: r.key,
          status: dbStatus(r.status),
          dueAt: r.dueAt,
          reviewCount: r.reviewCount,
          lastReviewedAt: r.lastReviewedAt,
          updatedAt: r.updatedAt,
          deletedAt: r.deletedAt,
        }))
      )
      .onConflictDoUpdate({
        target: [srsCards.userId, srsCards.key],
        // merge đã tính giá trị cuối ở bước map → ghi đè bằng excluded
        set: {
          status: sql`excluded.status`,
          dueAt: sql`excluded.due_at`,
          reviewCount: sql`excluded.review_count`,
          lastReviewedAt: sql`excluded.last_reviewed_at`,
          updatedAt: sql`excluded.updated_at`,
          deletedAt: sql`excluded.deleted_at`,
        },
      });
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
    await db
      .insert(studyDay)
      .values(
        mergedDays.map((r) => ({
          userId,
          date: r.date,
          xp: r.xp,
          correct: r.correct,
          updatedAt: r.updatedAt,
        }))
      )
      .onConflictDoUpdate({
        target: [studyDay.userId, studyDay.date],
        set: {
          xp: sql`excluded.xp`,
          correct: sql`excluded.correct`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
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
    await db
      .insert(lessonProgress)
      .values(
        mergedLessons.map((r) => ({
          userId,
          book: r.book,
          lesson: r.lesson,
          modes: r.modes,
          knownCount: r.knownCount,
          updatedAt: r.updatedAt,
          deletedAt: r.deletedAt,
        }))
      )
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

  // 4) Purge tombstone >90 ngày
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

  // 5) Trả về toàn bộ state server của user sau merge
  const [finalSrs, finalDays, finalLessons] = await Promise.all([
    db.select().from(srsCards).where(eq(srsCards.userId, userId)),
    db.select().from(studyDay).where(eq(studyDay.userId, userId)),
    db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId)),
  ]);

  const srsOut: SyncSrsRecord[] = finalSrs.map((r) => ({
    key: r.key,
    status: r.status,
    dueAt: r.dueAt,
    reviewCount: r.reviewCount,
    lastReviewedAt: r.lastReviewedAt,
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

  return NextResponse.json({
    serverTime: now,
    srs: srsOut,
    studyDay: studyDayOut,
    lessonProgress: lessonOut,
  });
}
