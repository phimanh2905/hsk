/* gen-reading-src (W3 T9): gộp data/reading/passages-hskN.json (N = 1..5, output của
   gen-reading) thành static content src/content/reading-passages.ts cho trang /reading.
   Nếu chưa có file data nào → ghi danh sách rỗng (reading-client fallback về demo).
   Types khai báo tại đây để src không phụ thuộc scripts/ (pattern src/content/dialogues.ts).
   KHÔNG chạy trong build/CI — tool thủ công, KHÔNG chạy trong test.

   Usage: pnpm dlx tsx scripts/content/gen-reading-src.mts [--data-dir <path>] [--out <path>] */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "../../..");

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const dataDir = argValue("--data-dir") ?? path.join(scriptDir, "data/reading");
const outPath = argValue("--out") ?? path.join(appRoot, "src/content/reading-passages.ts");

type Passage = Record<string, unknown>;

const all: Passage[] = [];
for (let level = 1; level <= 5; level++) {
  const p = path.join(dataDir, `passages-hsk${level}.json`);
  if (!existsSync(p)) continue;
  const list = JSON.parse(readFileSync(p, "utf8")) as Passage[];
  if (!Array.isArray(list)) {
    console.error(`${p} không phải JSON array`);
    process.exit(1);
  }
  all.push(...list);
}

const header = `/* AUTO-GENERATED bởi scripts/content/gen-reading-src.mts (W3 T9) — KHÔNG sửa tay.
   Nguồn: scripts/content/data/reading/passages-hskN.json (gen-reading, validate W3 T8).
   ${all.length > 0 ? `${all.length} passage (hsk1..hsk5).` : "HIỆN TRẠNG: chưa chạy gen-reading trên data thật nên danh sách rỗng — reading-client fallback về demo doc."}
   Chạy lại generator sẽ thay thế toàn bộ file này. */

export type ReadingSentence = { zh: string; py: string; vi: string };
export type ReadingVocab = { word: string; py: string; vi: string };
export type ReadingQuestion = { q: string; qVi: string; options: string[]; answer: number };

export type ReadingPassage = {
  id: string;
  book: string;
  lesson: string;
  title: string;
  titleVi: string;
  sentences: ReadingSentence[];
  vocab: ReadingVocab[];
  questions: ReadingQuestion[];
};

export const readingPassages: ReadingPassage[] = ${JSON.stringify(all, null, 2)};
`;

writeFileSync(outPath, header);
console.log(`Ghi ${outPath}: ${all.length} passage`);
