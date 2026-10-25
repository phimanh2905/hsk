/* dev-login — QA automation support (browser thật không set được httpOnly cookie).
   Tạo user QA + session rồi Set-Cookie đúng format better-auth.
   HOÀN TOÀN TẮT ở production: chỉ hoạt động khi DEV_LOGIN_SECRET được set
   (không set → 404) và NODE_ENV !== "production". Cùng cơ chế ký cookie như
   e2e hybrid-sync.spec (makeSignature = base64 HMAC-SHA256 của token thô). */
import { NextResponse } from "next/server";
import { createHmac, randomUUID } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb } from "@/lib/db";
import { user, session } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const DEV_SECRET = process.env.DEV_LOGIN_SECRET;
const ENABLED = !!DEV_SECRET && process.env.NODE_ENV !== "production";

export async function POST(req: Request) {
  if (!ENABLED) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (req.headers.get("x-dev-secret") !== DEV_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // .env.local không vào cloudflare env ở dev (initOpenNext envFiles: []) — fallback process.env
  const { env } = getCloudflareContext();
  const cfEnv = env as unknown as { BETTER_AUTH_SECRET?: string };
  const authSecret = cfEnv.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET ?? "";
  if (!authSecret) return NextResponse.json({ error: "no_secret" }, { status: 500 });

  const name = `QA Browser ${new Date().toISOString().slice(0, 10)}`;
  const email = `qa-browser-${Date.now()}@bye-hsk.local`;
  const userId = randomUUID();
  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 7 * 1000);

  const db = createDb();
  await db.insert(user).values({ id: userId, name, email, emailVerified: true });
  await db.insert(session).values({
    id: randomUUID(),
    expiresAt,
    token,
    ipAddress: null,
    userAgent: "qa-browser",
    userId,
  });

  // better-auth cookie: `${token}.${base64(hmac-sha256(rawToken))}` — ký trên token THÔ
  const sig = createHmac("sha256", authSecret).update(token).digest("base64");
  const cookieValue = `${token}.${sig}`;
  const res = NextResponse.json({ ok: true, user: { id: userId, name, email } });
  res.headers.append(
    "set-cookie",
    `better-auth.session_token=${encodeURIComponent(cookieValue)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
  );
  return res;
}
