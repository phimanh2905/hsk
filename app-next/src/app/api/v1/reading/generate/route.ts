import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { readingDrafts, readingUsage } from "@/lib/db/schema";
import {
  DraftValidationError,
  assertValidInput,
  generateReading,
  type DraftDoc,
} from "@/lib/server/reading-generate";
import { READING_DAILY_LIMIT, hoChiMinhDay, nextQuotaReset } from "@/lib/server/reading-quota";

/* Số ký tự chữ Hán — dùng cho meta "chars" của card Mine. */
function countHan(text: string): number {
  return text.match(/\p{Script=Han}/gu)?.length ?? 0;
}

export async function POST(req: NextRequest) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  if (!body || typeof body.text !== "string") {
    return NextResponse.json({ error: "Văn bản không hợp lệ" }, { status: 400 });
  }
  try {
    assertValidInput(body.text);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Văn bản không hợp lệ" },
      { status: 400 }
    );
  }

  const db = createDb();
  const day = hoChiMinhDay();
  const usageRows = await db
    .select()
    .from(readingUsage)
    .where(and(eq(readingUsage.userId, session.user.id), eq(readingUsage.day, day)));
  const used = usageRows[0]?.count ?? 0;
  if (used >= READING_DAILY_LIMIT) {
    return NextResponse.json(
      { error: "Bạn đã hết lượt tạo bài hôm nay", nextAt: nextQuotaReset() },
      { status: 429 }
    );
  }

  let doc: DraftDoc;
  try {
    doc = await generateReading(body.text);
  } catch (e) {
    if (e instanceof DraftValidationError) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Không tạo được bài đọc, thử lại sau" }, { status: 500 });
  }

  // Quota chỉ trừ khi generate THÀNH CÔNG (spec §4.2).
  await db
    .insert(readingUsage)
    .values({ userId: session.user.id, day, count: 1 })
    .onConflictDoUpdate({
      target: [readingUsage.userId, readingUsage.day],
      set: { count: sql`${readingUsage.count} + 1` },
    });

  const now = Date.now();
  const draft = {
    id: `rd_${crypto.randomUUID().slice(0, 12)}`,
    title: doc.sentences[0].zh.slice(0, 40),
    textZh: body.text,
    doc,
    chars: countHan(body.text),
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(readingDrafts).values({
    id: draft.id,
    userId: session.user.id,
    title: draft.title,
    textZh: draft.textZh,
    doc: draft.doc,
    chars: draft.chars,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  });

  return NextResponse.json({ draft, remaining: READING_DAILY_LIMIT - used - 1 });
}
