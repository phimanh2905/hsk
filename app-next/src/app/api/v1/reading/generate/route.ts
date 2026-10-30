import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { lt, sql } from "drizzle-orm";
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
  const userId = session.user.id;
  const day = hoChiMinhDay();
  /* Claim slot nguyên tử TRƯỚC khi generate (P1a TOCTOU): INSERT count=1 hoặc
     ON CONFLICT count+1 chỉ khi count < limit. Hai request song song không thể
     cùng vượt 3 bài/ngày. RETURNING rỗng → hết lượt: 429, không tốn lượt,
     không gọi LLM. */
  const claimed = await db
    .insert(readingUsage)
    .values({ userId, day, count: 1 })
    .onConflictDoUpdate({
      target: [readingUsage.userId, readingUsage.day],
      set: { count: sql`${readingUsage.count} + 1` },
      setWhere: lt(readingUsage.count, READING_DAILY_LIMIT),
    })
    .returning({ count: readingUsage.count });
  if (claimed.length === 0) {
    return NextResponse.json(
      { error: "Bạn đã hết lượt tạo bài hôm nay", nextAt: nextQuotaReset() },
      { status: 429 }
    );
  }

  let doc: DraftDoc;
  try {
    doc = await generateReading(body.text);
  } catch (e) {
    // Generate FAIL → trả lại slot đã claim (bù count - 1).
    await db
      .insert(readingUsage)
      .values({ userId, day, count: 0 })
      .onConflictDoUpdate({
        target: [readingUsage.userId, readingUsage.day],
        set: { count: sql`${readingUsage.count} - 1` },
      });
    if (e instanceof DraftValidationError) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Không tạo được bài đọc, thử lại sau" }, { status: 500 });
  }

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
    userId,
    title: draft.title,
    textZh: draft.textZh,
    doc: draft.doc,
    chars: draft.chars,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  });

  return NextResponse.json({ draft, remaining: READING_DAILY_LIMIT - claimed[0].count });
}
