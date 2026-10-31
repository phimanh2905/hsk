import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { readingUsage } from "@/lib/db/schema";
import { READING_DAILY_LIMIT, hoChiMinhDay, nextQuotaReset } from "@/lib/server/reading-quota";

export async function GET(req: NextRequest) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = createDb();
  const rows = await db
    .select()
    .from(readingUsage)
    .where(and(eq(readingUsage.userId, session.user.id), eq(readingUsage.day, hoChiMinhDay())));
  const used = rows[0]?.count ?? 0;
  return NextResponse.json({ used, limit: READING_DAILY_LIMIT, nextAt: nextQuotaReset() });
}
