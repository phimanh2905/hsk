export type AuthSecrets = {
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
};

/* Fallback process.env CHỈ cho dev: .env.local của Next không nằm trong binding
   wrangler (initOpenNextCloudflareForDev gọi getPlatformProxy với envFiles: []).
   Production phải lấy secret từ `wrangler secret put` — nếu thiếu thì fail sớm
   thay vì chạy với secret rò từ .env. */
export function resolveAuthSecrets(
  env: Record<string, string | undefined>,
  nodeEnv: string | undefined
): AuthSecrets {
  const allowFallback = nodeEnv !== "production";
  const { BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = {
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET ?? (allowFallback ? process.env.BETTER_AUTH_SECRET : undefined),
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID ?? (allowFallback ? process.env.GOOGLE_CLIENT_ID : undefined),
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET ?? (allowFallback ? process.env.GOOGLE_CLIENT_SECRET : undefined),
  };
  if (!BETTER_AUTH_SECRET || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error(
      "Thiếu BETTER_AUTH_SECRET / GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. " +
        "Production: wrangler secret put <tên>. Local: thêm vào app-next/.env.local."
    );
  }
  return { BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET };
}
