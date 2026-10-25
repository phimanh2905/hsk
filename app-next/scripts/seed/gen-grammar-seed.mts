/* Sinh drizzle/seeds/content-grammars.sql từ data/grammar/grammar-hsk{1..5}.json
   (draft của gen-grammar-batch, W2.5). Idempotent: INSERT OR REPLACE theo PK (id).
   ord tăng dần per level. Chạy: pnpm dlx tsx scripts/seed/gen-grammar-seed.mts (từ app-next/) */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

const esc = (s: string) => s.replace(/'/g, "''");

/* JSON column: escape ' như SQL, đồng thời mã hoá ';' thành \u003b — wrangler/executor
   chia statement theo ';' nên ';' trong chuỗi JSON làm đứt statement (bug seed 243/300). */
const jsonCol = (v: unknown) =>
  JSON.stringify(v).replace(/'/g, "\\u0027").replace(/;/g, "\\u003b");
const lines: string[] = [
  "-- Seed content_grammars — sinh tự động, đừng sửa tay. Chạy lại gen-grammar-seed.mts để cập nhật.",
];

let total = 0;
for (let level = 1; level <= 5; level++) {
  const f = path.join("scripts/content/data/grammar", `grammar-hsk${level}.json`);
  if (!existsSync(f)) {
    console.error(`Thiếu ${f} — chạy gen-grammar-batch.mts --level ${level} trước`);
    process.exit(1);
  }
  const points = JSON.parse(readFileSync(f, "utf8")) as {
    id: string; level: string; title: string; hz: string; topic: string; def: string;
    formula: unknown; pitfall: unknown; ex: unknown;
  }[];
  points.forEach((p, i) => {
    lines.push(
      `INSERT OR REPLACE INTO content_grammars (id, level, ord, title, hz, topic, def, formula, pitfall, ex) VALUES ('${esc(p.id)}', '${esc(p.level)}', ${i}, '${esc(p.title)}', '${esc(p.hz)}', '${esc(p.topic)}', '${esc(p.def)}', '${esc(jsonCol(p.formula))}', '${esc(jsonCol(p.pitfall))}', '${esc(jsonCol(p.ex))}');`
    );
  });
  total += points.length;
  console.log(`HSK ${level}: ${points.length} điểm`);
}

mkdirSync("drizzle/seeds", { recursive: true });
writeFileSync("drizzle/seeds/content-grammars.sql", lines.join("\n") + "\n");
console.log(`Đã ghi ${total} rows -> drizzle/seeds/content-grammars.sql`);
