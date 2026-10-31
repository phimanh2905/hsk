import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/* `next dev` chạy thẳng trong Node nên không có binding Cloudflare nào. Gọi
   initOpenNextCloudflareForDev() để nó proxy qua wrangler.dev.jsonc — từ đó
   getCloudflareContext().env.DB mới tồn tại ở local (auth cần D1, spec 00 §3.1).

   Chỉ gọi lúc dev: lúc build/deploy, binding lấy từ wrangler.jsonc thật của Worker
   nên gọi ở đây vô nghĩa. */
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev({ configPath: "./wrangler.dev.jsonc" });
}

/* EXPORT_BUILD=1: build output:export (HTML thật vào out/) cho static-first prod.
   Route handlers không export được — scripts/build-static.mjs stash src/app/api
   trước khi build. Build thường (dev/e2e/opennext) giữ nguyên cấu hình cũ. */
const isExport = process.env.EXPORT_BUILD === "1";

const nextConfig: NextConfig = {
  ...(isExport ? { output: "export" as const } : {}),
  /* headers() bị export bỏ qua — _headers thay thế ở out/ (copy từ public/). */
  /* strict-origin-when-cross-origin: embed YouTube cần Referer/origin (error 153
     "Video player configuration error"); Kokoro TTS same-origin vẫn nhận origin
     như cũ nên không hồi quy. */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }],
      },
    ];
  },
};

export default nextConfig;