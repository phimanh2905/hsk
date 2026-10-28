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

const nextConfig: NextConfig = {
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