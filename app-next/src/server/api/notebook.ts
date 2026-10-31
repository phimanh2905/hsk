import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { notebookEntries } from "@/lib/db/schema";
import { safeParsePayload, parsePayload, type EntryKind, type EntryPayload } from "@/lib/notebook/payload";
import { json } from "./json";

type Row = typeof notebookEntries.$inferSelect;
type RowLike = Omit<Row, "createdAt" | "updatedAt" | "saved" | "userId"> & {
  createdAt: Date | number; updatedAt: Date | number; saved: boolean | number;
};

/* Dùng chung GET (lọc payload hỏng) và Task PATCH/DELETE (render 1 row). */
export function rowToApi(row: RowLike): {
  id: string; kind: EntryKind; tag: string; tagTone: "red" | "lav" | "per";
  payload: EntryPayload; saved: boolean; hsk: string | null; source: "auto" | "manual";
  createdAt: string; updatedAt: string;
} | null {
  let payload: EntryPayload | null = null;
  try { payload = safeParsePayload(row.kind, JSON.parse(row.payload)); } catch { return null; }
  if (!payload) return null;
  return {
    id: row.id, kind: row.kind, tag: row.tag, tagTone: row.tagTone, payload,
    saved: Boolean(row.saved), hsk: row.hsk, source: row.source,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

const postBody = z.object({
  id: z.string().min(1).max(64).optional(),
  kind: z.enum(["wrong", "chars", "personal"]),
  tag: z.string().min(1).max(80),
  tagTone: z.enum(["red", "lav", "per"]).default("red"),
  payload: z.unknown(),
  hsk: z.string().regex(/^HSK[1-6]$/).nullable().optional(),
  source: z.enum(["auto", "manual"]).default("manual"),
  saved: z.boolean().default(false),
});

const patchBody = z.object({ saved: z.boolean() });

export async function handleNotebookEntriesGet(req: Request): Promise<Response> {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return json({ error: "unauthorized" }, { status: 401 });
  const db = createDb();
  const rows = await db
    .select()
    .from(notebookEntries)
    .where(eq(notebookEntries.userId, session.user.id))
    .orderBy(desc(notebookEntries.createdAt));
  return json({ items: rows.map(rowToApi).filter((x) => x !== null) });
}

export async function handleNotebookEntriesPost(req: Request): Promise<Response> {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return json({ error: "unauthorized" }, { status: 401 });
  const parsed = postBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid body" }, { status: 400 });
  let payload: EntryPayload;
  try { payload = parsePayload(parsed.data.kind, parsed.data.payload); }
  catch { return json({ error: "invalid payload" }, { status: 400 }); }

  const db = createDb();
  const now = new Date();
  const values = {
    id: parsed.data.id ?? crypto.randomUUID(),
    userId: session.user.id,
    kind: parsed.data.kind,
    tag: parsed.data.tag,
    tagTone: parsed.data.tagTone,
    payload: JSON.stringify(payload),
    saved: parsed.data.saved,
    hsk: parsed.data.hsk ?? null,
    source: parsed.data.source,
    createdAt: now,
    updatedAt: now,
  };
  // F1: conflict row phải thuộc về user này — nếu không, where khiến update là no-op
  // → returning rỗng → 404 (không cho overwrite entry của user khác).
  const inserted = await db.insert(notebookEntries).values(values).onConflictDoUpdate({
    target: notebookEntries.id,
    set: {
      tag: values.tag, tagTone: values.tagTone, payload: values.payload,
      saved: values.saved, hsk: values.hsk, updatedAt: now,
    },
    where: eq(notebookEntries.userId, session.user.id),
  }).returning();
  if (inserted.length === 0) return json({ error: "not found" }, { status: 404 });
  return json({ item: rowToApi(inserted[0]) }, { status: 201 });
}

export async function handleNotebookEntryPatch(req: Request, params: Record<string, string>): Promise<Response> {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return json({ error: "unauthorized" }, { status: 401 });
  const parsed = patchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid body" }, { status: 400 });
  const id = params.id;
  const db = createDb();
  const updated = await db
    .update(notebookEntries)
    .set({ saved: parsed.data.saved, updatedAt: new Date() })
    .where(and(eq(notebookEntries.id, id), eq(notebookEntries.userId, session.user.id)))
    .returning();
  if (!updated.length) return json({ error: "not found" }, { status: 404 });
  return json({ item: rowToApi(updated[0]) });
}

export async function handleNotebookEntryDelete(req: Request, params: Record<string, string>): Promise<Response> {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return json({ error: "unauthorized" }, { status: 401 });
  const id = params.id;
  const db = createDb();
  const deleted = await db
    .delete(notebookEntries)
    .where(and(eq(notebookEntries.id, id), eq(notebookEntries.userId, session.user.id)))
    .returning();
  if (!deleted.length) return json({ error: "not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
