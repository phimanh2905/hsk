import { getEnv } from "@/lib/env";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/* Drizzle client trên D1 của Worker.
   Binding `DB` không có sẵn ở `next dev` — chỉ tồn tại sau khi bật
   `initOpenNextCloudflareForDev()` trong next.config.ts (xem file đó). */

export type Db = ReturnType<typeof createDb>;

/* Cache instance theo globalThis: trong `next dev`, Turbopack worker mới compile
   route lần đầu có thể gọi getEnv() TRƯỚC khi plugin kịp cài global
   (lỗi "called without having called initOpenNextCloudflareForDev" — dev-only,
   tự khỏi, không xảy ra trên Workers). Cache khiến mỗi worker miss tối đa 1 request
   đầu thay vì race mỗi request; giữ createDb() sync cho 26 call sites + getAuth(). */
const g = globalThis as typeof globalThis & { __byeHskDb?: ReturnType<typeof drizzle> };

export function createDb() {
  if (g.__byeHskDb) return g.__byeHskDb;
  const env = getEnv();
  if (!env.DB) {
    throw new Error(
      "Thiếu binding D1 `DB`. Ở production hãy kiểm tra wrangler.jsonc; ở local cần initOpenNextCloudflareForDev() trong next.config.ts."
    );
  }
  const db = drizzle(env.DB, { schema });
  g.__byeHskDb = db;
  return db;
}