import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { readingDrafts } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = createDb();
  const rows = await db
    .select()
    .from(readingDrafts)
    .where(
      and(eq(readingDrafts.userId, session.user.id), isNull(readingDrafts.deletedAt))
    )
    .orderBy(desc(readingDrafts.updatedAt));
  return NextResponse.json({ drafts: rows });
}
