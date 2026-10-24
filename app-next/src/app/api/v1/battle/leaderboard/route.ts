import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { createDb } from "@/lib/db";

/* W6.2 — GET /api/v1/battle/leaderboard: BXH công khai (không cần đăng nhập).
   scope=lesson  → top 10 best attempt mỗi user của 1 bài (score max, hòa durationMs min).
   scope=month   → tháng hiện tại (UTC): best attempt mỗi user×lesson, gộp theo user
                   thành totalScore/bestScore/lessonsPlayed, top 10 giảm totalScore. */

type LessonRow = { name: string; score: number; correct: number; total: number; durationMs: number; createdAt: number };
type MonthRow = { userId: string; name: string; bookSlug: string; lessonSlug: string; score: number };

export async function GET(req: NextRequest) {
  const scope = new URL(req.url).searchParams.get("scope");
  const book = new URL(req.url).searchParams.get("book");
  const page = new URL(req.url).searchParams.get("page");

  if (scope !== "lesson" && scope !== "month")
    return NextResponse.json({ error: "invalid_scope" }, { status: 400 });
  if (scope === "lesson" && (!book || !page || book.length > 64 || page.length > 64))
    return NextResponse.json({ error: "invalid_scope" }, { status: 400 });

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
    return NextResponse.json({
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
  return NextResponse.json({ items });
}
