/* Config tập trung cho toàn app (spec dehardcode §5 Pha 0) — thay các fallback
   URL cứng rải rác trong sitemap/robots. NEXT_PUBLIC_* được Next inline lúc build,
   nên giá trị phải có sẵn trong môi trường build (xem .env.production). */

function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (raw) return raw.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Thiếu NEXT_PUBLIC_SITE_URL khi build production — sitemap/robots sẽ sinh URL sai."
    );
  }
  return "http://localhost:3100";
}

export const SITE_URL = resolveSiteUrl();
