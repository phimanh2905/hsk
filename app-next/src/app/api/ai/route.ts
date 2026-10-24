import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAuth } from "@/lib/auth";
import { resolveAiConfig, callUpstream, UpstreamError } from "@/lib/ai";

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) }))
    .min(1)
    .max(20),
  maxTokens: z.number().int().min(16).optional(),
});

/* Prompt hệ thống ghép đầu messages trong route — KHÔNG nhận từ client. */
const SYSTEM_PROMPT =
  "Bạn là Tiểu Ngữ, trợ lý học tiếng Trung của app Bye HSK. Trả lời ngắn gọn bằng " +
  "tiếng Việt, giải thích pinyin/ý nghĩa khi hữu ích, khuyến khích người học.";

/* Giới hạn tổng content là giới hạn kích thước payload → 413; giới hạn
   per-message chỉ là safety bound (8000) — tổng > 4000 ký tự bị chặn ngay sau đó. */
const MAX_TOTAL_CHARS = 4000;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

/* Rate limit in-memory per userId — hạn chế per-isolate, chấp nhận theo plan. */
const buckets = new Map<string, number[]>();

export function __resetRateLimitForTest() {
  buckets.clear();
}

export async function POST(req: NextRequest) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = (await req.json().catch(() => null)) as unknown;
  // > 20 messages → 413 (quá dài) thay vì 400: giới hạn là about payload size
  if (
    typeof raw === "object" && raw !== null &&
    Array.isArray((raw as { messages?: unknown }).messages) &&
    ((raw as { messages: unknown[] }).messages).length > 20
  ) {
    return NextResponse.json({ error: "tooLong" }, { status: 413 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalidBody" }, { status: 400 });
  const body = parsed.data;

  // 413: chặn vượt giới hạn prompt trước khi gọi upstream
  const totalChars = body.messages.reduce((n, m) => n + m.content.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) return NextResponse.json({ error: "tooLong" }, { status: 413 });

  // Rate limit: lọc timestamps > 60s trước, push hiện tại, > 10 → 429
  const userId = session.user.id;
  const now = Date.now();
  const bucket = (buckets.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  bucket.push(now);
  buckets.set(userId, bucket);
  if (bucket.length > RATE_LIMIT_MAX) return NextResponse.json({ error: "rateLimit" }, { status: 429 });

  let cfg: ReturnType<typeof resolveAiConfig>;
  try {
    const { env } = getCloudflareContext();
    cfg = resolveAiConfig(env as Record<string, string | undefined>, process.env.NODE_ENV);
  } catch {
    return NextResponse.json({ error: "noConfig" }, { status: 503 });
  }

  try {
    const { text } = await callUpstream(
      cfg,
      [{ role: "system", content: SYSTEM_PROMPT }, ...body.messages],
      { maxTokens: Math.min(body.maxTokens ?? 1024, 2048) }
    );
    return NextResponse.json({ text });
  } catch (e) {
    if (e instanceof UpstreamError) return NextResponse.json({ error: "upstreamDown" }, { status: 502 });
    throw e;
  }
}
