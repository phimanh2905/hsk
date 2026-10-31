import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/* Serve trang prerendered (SSG/ISR) từ static assets: không có incremental cache
   nào cấu hình thì OpenNext 404 mọi trang SSG dynamic-segment (lesson/cert/
   notebook/session...). App đổi content bằng redeploy nên không cần revalidation —
   đúng use case được khuyến nghị của cache này. */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
