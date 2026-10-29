/* Sinh src/content/roadmap-generated.ts — metadata bài học hsk1..hsk5 (title +
   wordCount), KHÔNG nhúng vocab. Chạy: pnpm dlx tsx scripts/seed/gen-roadmap-stations.mts */
import { writeFileSync } from "node:fs";
import { vocab } from "../../src/content/vocab.js";

const books = ["hsk1", "hsk2", "hsk3", "hsk4", "hsk5"];
const rows: string[] = [];
for (const book of books) {
  const pages = Object.keys(vocab[book] ?? {}).sort(
    (a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")),
  );
  for (const page of pages) {
    const lesson = vocab[book][page];
    const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    rows.push(
      `  { book: '${book}', page: '${esc(page)}', title: '${esc(lesson.title)}', wordCount: ${lesson.words.length} },`,
    );
  }
}
const out = `/* AUTO-GENERATED bởi scripts/seed/gen-roadmap-stations.mts — không sửa tay.
   Metadata bài học hsk1..hsk5 cho generator trạm roadmap (spec 2026-10-29 §2). */
export type GeneratedLesson = { book: string; page: string; title: string; wordCount: number };

export const generatedLessons: GeneratedLesson[] = [
${rows.join("\n")}
];
`;
writeFileSync(new URL("../../src/content/roadmap-generated.ts", import.meta.url), out);
console.log(`Đã ghi ${rows.length} bài học.`);
