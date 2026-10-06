/* Sinh drizzle/seeds/content-vocabs.sql từ src/content/vocab.ts (nguồn chuẩn,
   spec dehardcode §4.2). Idempotent: INSERT OR REPLACE theo PK (book, page_id).
   Chạy: pnpm dlx tsx scripts/seed/gen-vocab-seed.mts (từ app-next/) */
import { mkdirSync, writeFileSync } from "node:fs";
import { vocab } from "../../src/content/vocab";

const esc = (s: string) => s.replace(/'/g, "''");
const lines: string[] = [
  "-- Seed content_vocabs — sinh tự động, đừng sửa tay. Chạy lại gen-vocab-seed.mts để cập nhật.",
];

for (const [book, pages] of Object.entries(vocab)) {
  Object.entries(pages).forEach(([pageId, lesson], i) => {
    const words = esc(JSON.stringify(lesson.words));
    lines.push(
      `INSERT OR REPLACE INTO content_vocabs (book, page_id, ord, title, words) VALUES ('${esc(book)}', '${esc(pageId)}', ${i}, '${esc(lesson.title)}', '${words}');`
    );
  });
}

mkdirSync("drizzle/seeds", { recursive: true });
writeFileSync("drizzle/seeds/content-vocabs.sql", lines.join("\n") + "\n");
console.log(`Đã ghi ${lines.length - 1} rows -> drizzle/seeds/content-vocabs.sql`);
