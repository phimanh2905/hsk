import { sql } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { battleAttempts } from "@/lib/db/schema";
import { json } from "./json";

/* W6.2 — POST /api/v1/battle/attempts: lưu 1 lượt thi Đấu trí và trả hạng
   trong BXH per-lesson (rank = số user có best-score cao hơn, +1). */

const bodySchema = z.object({
  book: z.string().min(1).max(64),
  page: z.string().min(1).max(64),
  correctCount: z.number().int().min(0).max(999),
  totalCount: z.number().int().min(4).max(999),
  durationMs: z.number().int().min(1).max(3_600_000),
  score: z.number().int().min(0).max(150),
});

export async function handleBattleAttempts(req: Request): Promise<Response> {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_body" }, { status: 400 });
  if (parsed.data.correctCount > parsed.data.totalCount)
    return json({ error: "invalid_body" }, { status: 400 });

  const db = createDb();
  const { book, page, ...rest } = parsed.data;
  const id = crypto.randomUUID();
  await db.insert(battleAttempts).values({
    id,
    userId: session.user.id,
    ...rest,
    bookSlug: book,
    lessonSlug: page,
  });

  // rank = số user có best-score per-lesson cao hơn attempt này, +1
  const bestRows = await db.all<{ n: number }>(
    sql`SELECT COUNT(*) AS n FROM (
          SELECT userId, MAX(score) AS best FROM battle_attempts
          WHERE book_slug = ${book} AND lesson_slug = ${page}
          GROUP BY userId
        ) WHERE best > ${parsed.data.score}`
  );
  return json({ id, rank: Number(bestRows[0]?.n ?? 0) + 1 });
}

/* W6.2 — GET /api/v1/battle/leaderboard: BXH công khai (không cần đăng nhập).
   scope=lesson  → top 10 best attempt mỗi user của 1 bài (score max, hòa durationMs min).
   scope=month   → tháng hiện tại (UTC): best attempt mỗi user×lesson, gộp theo user
                   thành totalScore/bestScore/lessonsPlayed, top 10 giảm totalScore. */

type LessonRow = { name: string; score: number; correct: number; total: number; durationMs: number; createdAt: number };
type MonthRow = { userId: string; name: string; bookSlug: string; lessonSlug: string; score: number };

export async function handleBattleLeaderboard(req: Request): Promise<Response> {
  const scope = new URL(req.url).searchParams.get("scope");
  const book = new URL(req.url).searchParams.get("book");
  const page = new URL(req.url).searchParams.get("page");

  if (scope !== "lesson" && scope !== "month")
    return json({ error: "invalid_scope" }, { status: 400 });
  if (scope === "lesson" && (!book || !page || book.length > 64 || page.length > 64))
    return json({ error: "invalid_scope" }, { status: 400 });

  const db = createDb();

  if (scope === "lesson") {
    const rows = await db.all<LessonRow>(
      sql`SELECT u.name, b.score, b.correct_count AS correct, b.total_count AS total,
                 b.duration_ms AS durationMs, b.createdAt AS createdAt
          FROM battle_attempts b JOIN user u ON u.id = b.userId
          WHERE b.book_slug = ${book} AND b.lesson_slug = ${page}
            AND b.id = (SELECT b2.id FROM battle_attempts b2
                        WHERE b2.userId = b.userId AND b2.book_slug = b.book_slug AND b2.lesson_slug = b.lesson_slug
                        ORDER BY b2.score DESC, b2.duration_ms ASC, b2.createdAt ASC LIMIT 1)
          ORDER BY b.score DESC, b.duration_ms ASC LIMIT 10`
    );
    return json({
      items: rows.map((r) => ({ ...r, createdAt: new Date(r.createdAt * 1000).toISOString() })),
    });
  }

  // scope=month — best per user×lesson trong tháng hiện tại (UTC)
  const rows = await db.all<MonthRow>(
    sql`SELECT b.userId AS userId, u.name, b.book_slug AS bookSlug, b.lesson_slug AS lessonSlug, b.score
        FROM battle_attempts b JOIN user u ON u.id = b.userId
        WHERE b.createdAt >= CAST(strftime('%s', 'now', 'start of month') AS INTEGER)
          AND b.id = (SELECT b2.id FROM battle_attempts b2
                      WHERE b2.userId = b.userId AND b2.book_slug = b.book_slug AND b2.lesson_slug = b.lesson_slug
                      ORDER BY b2.score DESC, b2.duration_ms ASC, b2.createdAt ASC LIMIT 1)`
  );

  const byUser = new Map<string, { name: string; totalScore: number; bestScore: number; lessonsPlayed: number }>();
  for (const r of rows) {
    const acc = byUser.get(r.userId) ?? { name: r.name, totalScore: 0, bestScore: 0, lessonsPlayed: 0 };
    acc.totalScore += r.score;
    acc.bestScore = Math.max(acc.bestScore, r.score);
    acc.lessonsPlayed += 1;
    byUser.set(r.userId, acc);
  }
  const items = [...byUser.entries()]
    .map(([, v]) => v)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 10);
  return json({ items });
}
