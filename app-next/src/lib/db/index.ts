import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/* Drizzle client trên D1 của Worker.
   Binding `DB` không có sẵn ở `next dev` — chỉ tồn tại sau khi bật
   `initOpenNextCloudflareForDev()` trong next.config.ts (xem file đó). */

export type Db = ReturnType<typeof createDb>;

export function createDb() {
  const { env } = getCloudflareContext();
  if (!env.DB) {
    throw new Error(
      "Thiếu binding D1 `DB`. Ở production hãy kiểm tra wrangler.jsonc; ở local cần initOpenNextCloudflareForDev() trong next.config.ts."
    );
  }
  return drizzle(env.DB, { schema });
}