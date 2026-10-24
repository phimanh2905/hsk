import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { battleAttempts } from "@/lib/db/schema";

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

export async function POST(req: NextRequest) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  if (parsed.data.correctCount > parsed.data.totalCount)
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });

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
          SELECT user_id, MAX(score) AS best FROM battle_attempts
          WHERE book_slug = ${book} AND lesson_slug = ${page}
          GROUP BY user_id
        ) WHERE best > ${parsed.data.score}`
  );
  return NextResponse.json({ id, rank: Number(bestRows[0]?.n ?? 0) + 1 });
}
