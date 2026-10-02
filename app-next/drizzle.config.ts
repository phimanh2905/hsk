import { defineConfig } from "drizzle-kit";

/* Chỉ dùng để `drizzle-kit generate` (sinh SQL) — không cần DB thật.
   Áp dụng migration bằng wrangler, không phải drizzle-kit migrate, vì
   `d1 migrations apply` hiểu đúng cơ chế của D1:

     wrangler d1 migrations apply hsk-dev --remote   # dev
     wrangler d1 migrations apply hsk     --remote   # production, chạy tay */

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
});