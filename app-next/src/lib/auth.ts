import { getCloudflareContext } from "@opennextjs/cloudflare";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { AUTH_BASE_PATH } from "@/lib/auth-base-path";
import { resolveAuthSecrets } from "@/lib/auth-secrets";

/* Auth được tạo lazily: `getCloudflareContext()` chỉ hợp lệ trong request context
   của Worker, không gọi được lúc import module (build, CLI, test). Cache giữ lại
   instance sau lần đầu để không dựng lại adapter mỗi request. */

function createAuth() {
  const { env } = getCloudflareContext();
  const { BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = resolveAuthSecrets(
    env as Record<string, string | undefined>,
    process.env.NODE_ENV
  );

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