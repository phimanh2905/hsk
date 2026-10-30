import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { readingDrafts } from "@/lib/db/schema";

/* PATCH rename + DELETE tombstone (spec §4.2). Draft là tài sản per-user:
   where ghép userId nên row của user khác trả về returning rỗng → 404. */

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { title?: unknown } | null;
  if (!body || typeof body.title !== "string") {
    return NextResponse.json({ error: "Tiêu đề không hợp lệ" }, { status: 400 });
  }
  const title = body.title.trim();
  if (title.length < 1 || title.length > 255) {
    return NextResponse.json({ error: "Tiêu đề phải từ 1 đến 255 ký tự" }, { status: 400 });
  }
  const { id } = await ctx.params;
  const db = createDb();
  const updated = await db
    .update(readingDrafts)
    .set({ title, updatedAt: Date.now() })
    .where(and(eq(readingDrafts.id, id), eq(readingDrafts.userId, session.user.id)))
    .returning();
  if (!updated.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ draft: updated[0] });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = createDb();
  const updated = await db
    .update(readingDrafts)
    .set({ deletedAt: Date.now(), updatedAt: Date.now() })
    .where(and(eq(readingDrafts.id, id), eq(readingDrafts.userId, session.user.id)))
    .returning();
  if (!updated.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
