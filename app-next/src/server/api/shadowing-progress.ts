import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { shadowingProgress } from "@/lib/db/schema";
import { getShadowingVideoById } from "@/lib/content/shadowing";
import { json } from "./json";

export async function handleShadowingProgressGet(req: Request): Promise<Response> {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return json({ error: "unauthorized" }, { status: 401 });
  const db = createDb();
  const rows = await db
    .select()
    .from(shadowingProgress)
    .where(eq(shadowingProgress.userId, session.user.id));
  return json({
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

const bodySchema = z.object({
  status: z.enum(["new", "mid", "done"]).optional(),
  score: z.number().int().min(0).max(100).optional(),
  secondsDelta: z.number().int().min(0).max(3600).optional(),
  linesDoneDelta: z.number().int().min(0).max(50).optional(),
});

export async function handleShadowingProgressVideo(req: Request, params: Record<string, string>): Promise<Response> {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return json({ error: "unauthorized" }, { status: 401 });
  const videoId = params.videoId;
  if (!(await getShadowingVideoById(videoId))) return json({ error: "unknown videoId" }, { status: 400 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid body" }, { status: 400 });
  const body = parsed.data;

  const db = createDb();
  const [existing] = await db
    .select()
    .from(shadowingProgress)
    .where(and(eq(shadowingProgress.userId, session.user.id), eq(shadowingProgress.videoId, videoId)));

  // merge: seconds/lines cộng dồn, score lấy max, done không bị hạ về mid
  const merged = {
    userId: session.user.id,
    videoId,
    status:
      existing?.status === "done"
        ? ("done" as const)
        : body.status === "done"
          ? ("done" as const)
          : ("mid" as const),
    score: Math.max(existing?.score ?? 0, body.score ?? 0) || null,
    seconds: (existing?.seconds ?? 0) + (body.secondsDelta ?? 0),
    linesDone: (existing?.linesDone ?? 0) + (body.linesDoneDelta ?? 0),
    updatedAt: new Date(),
  };

  await db
    .insert(shadowingProgress)
    .values({ id: existing?.id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? new Date(), ...merged })
    .onConflictDoUpdate({
      target: [shadowingProgress.userId, shadowingProgress.videoId],
      set: merged,
    });

  return json({
    videoId,
    status: merged.status,
    score: merged.score,
    seconds: merged.seconds,
    linesDone: merged.linesDone,
    updatedAt: merged.updatedAt.toISOString(),
  });
}
