import { getCloudflareContext } from "@opennextjs/cloudflare";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { AUTH_BASE_PATH } from "@/lib/auth-base-path";

/* Auth được tạo lazily: `getCloudflareContext()` chỉ hợp lệ trong request context
   của Worker, không gọi được lúc import module (build, CLI, test). Cache giữ lại
   instance sau lần đầu để không dựng lại adapter mỗi request. */

function createAuth() {
  const { env } = getCloudflareContext();
  /* Lúc dev, initOpenNextCloudflareForDev() gọi getPlatformProxy với envFiles: []
     nên .env.local của Next KHÔNG nằm trong `env` — chỉ binding wrangler mới có.
     Thêm fallback process.env để lấy secret từ .env.local; production thì
     `env` (wrangler secret) có sẵn nên nhánh này không kích hoạt. */
  const { BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = {
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
  };
  if (!BETTER_AUTH_SECRET || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error(
      "Thiếu BETTER_AUTH_SECRET / GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. " +
        "Production: wrangler secret put <tên>. Local: thêm vào app-next/.env.local."
    );
  }

  return betterAuth({
    basePath: AUTH_BASE_PATH,
    secret: BETTER_AUTH_SECRET,
    database: drizzleAdapter(createDb(), { provider: "sqlite", schema }),
    socialProviders: {
      google: { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET },
    },
  });
}

let cached: ReturnType<typeof createAuth> | null = null;

export function getAuth(): ReturnType<typeof createAuth> {
  if (cached) return cached;
  cached = createAuth();
  return cached;
}

export type Auth = ReturnType<typeof getAuth>;