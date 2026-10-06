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
  /* Referrer-Policy same-origin: request cross-site (vd fetch model Kokoro từ
     HuggingFace) không gửi Referer — HF trả 404 không-CORS cho mọi Referer
     *.workers.dev; request same-origin vẫn giữ hành vi cũ. */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Referrer-Policy", value: "same-origin" }],
      },
    ];
  },
};

export default nextConfig;