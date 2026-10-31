import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { hskExamResults } from "@/lib/db/schema";
import { json } from "./json";

/* W6.3 — /api/v1/exam/results: lưu + đọc lịch sử thi demo HSK của user hiện tại.
   POST body { level, totalScore, maxScore, sections[] } → 200 { id }.
   GET ?level=hsk1 → { items: [...] }, mới nhất trước. */

const bodySchema = z.object({
  level: z.enum(["hsk1", "hsk2", "hsk3", "hsk4", "hsk5", "hsk6"]),
  totalScore: z.number().int().min(0),
  maxScore: z.number().int().min(1),
  sections: z
    .array(
      z.object({
        section: z.enum(["listening", "reading", "writing"]),
        score: z.number().int().min(0),
        maxScore: z.number().int().min(0),
      })
    )
    .min(1),
});

export async function handleExamResultsPost(req: Request): Promise<Response> {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_body" }, { status: 400 });

  const sumSections = parsed.data.sections.reduce((acc, s) => acc + s.score, 0);
  if (parsed.data.totalScore !== sumSections)
    return json({ error: "total_score_mismatch" }, { status: 400 });

  const id = crypto.randomUUID();
  await createDb().insert(hskExamResults).values({
    id,
    userId: session.user.id,
    ...parsed.data,
  });
  return json({ id });
}

export async function handleExamResultsGet(req: Request): Promise<Response> {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return json({ error: "unauthorized" }, { status: 401 });

  const level = new URL(req.url).searchParams.get("level");
  if (!level || !/^hsk[1-6]$/.test(level))
    return json({ error: "invalid_level" }, { status: 400 });

  const rows = await createDb()
    .select()
    .from(hskExamResults)
    .where(and(eq(hskExamResults.userId, session.user.id), eq(hskExamResults.level, level)))
    .orderBy(desc(hskExamResults.createdAt));

  return json({
    items: rows.map((r) => ({
      id: r.id,
      totalScore: r.totalScore,
      maxScore: r.maxScore,
      sections: r.sections,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
