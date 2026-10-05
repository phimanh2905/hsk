import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { notebookEntries } from "@/lib/db/schema";
import { rowToApi } from "../route";

const patchBody = z.object({ saved: z.boolean() });

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = patchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const { id } = await ctx.params;
  const db = createDb();
  const updated = await db
    .update(notebookEntries)
    .set({ saved: parsed.data.saved, updatedAt: new Date() })
    .where(and(eq(notebookEntries.id, id), eq(notebookEntries.userId, session.user.id)))
    .returning();
  if (!updated.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ item: rowToApi(updated[0]) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = createDb();
  const deleted = await db
    .delete(notebookEntries)
    .where(and(eq(notebookEntries.id, id), eq(notebookEntries.userId, session.user.id)))
    .returning();
  if (!deleted.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
