import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { shadowingProgress } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = createDb();
  const rows = await db
    .select()
    .from(shadowingProgress)
    .where(eq(shadowingProgress.userId, session.user.id));
  return NextResponse.json({
    items: rows.map((r) => ({
      videoId: r.videoId,
      status: r.status,
      score: r.score,
      seconds: r.seconds,
      linesDone: r.linesDone,
      updatedAt: new Date(r.updatedAt).toISOString(),
    })),
  });
}
