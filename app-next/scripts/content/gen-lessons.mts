/* CLI gen-lessons (W2.3): gọi LLM chia vocab hskN.json thành bài 15–25 từ/bài
   theo chủ đề, validate + retry tối đa 5 lần, ghi data/vocab/lessons-hskN.json.
   KHÔNG chạy trong build/CI — tool thủ công.

   Usage: pnpm dlx tsx scripts/content/gen-lessons.mts --level 1..5 [--retry] [--vocab <path>] [--out <path>]
     --retry: bỏ qua file output đã tồn tại và chạy lại
     --vocab: đường dẫn input thay thế (mặc định data/vocab/hskN.json) — dùng cho smoke fixture
   Env: .env.local (app-next) + process.env -> CONTENT_LLM_BASE_URL/KEY/MODEL. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { llmConfigFromEnv } from "./src/llm";
import { generateSplit, type LessonSplit } from "./src/lessons";
import { EXPECTED_PER_LEVEL_UNIQUE } from "./src/hsk-list";
import { readEnvFile } from "./src/read-env";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "../..");

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const levelStr = argValue("--level");
if (!levelStr || !/^[1-5]$/.test(levelStr)) {
  console.error("Usage: pnpm dlx tsx scripts/content/gen-lessons.mts --level 1..5 [--retry] [--vocab <path>] [--out <path>]");
  process.exit(1);
}
const level = parseInt(levelStr, 10);
const forceRetry = process.argv.includes("--retry");

const vocabPath = argValue("--vocab") ?? path.join(scriptDir, `data/vocab/hsk${level}.json`);
if (!existsSync(vocabPath)) {
  console.error(`Không tìm thấy vocab input: ${vocabPath}`);
  process.exit(1);
}
const allHanzi = [...new Set((JSON.parse(readFileSync(vocabPath, "utf8")) as { hanzi: string }[]).map((w) => w.hanzi))];
const expected = EXPECTED_PER_LEVEL_UNIQUE[level];
if (allHanzi.length !== expected) {
  console.error(`Vocab input ${vocabPath} có ${allHanzi.length} từ unique != EXPECTED_PER_LEVEL_UNIQUE[${level}] = ${expected}`);
  process.exit(1);
}

const outPath = argValue("--out") ?? path.join(scriptDir, `data/vocab/lessons-hsk${level}.json`);
if (!forceRetry && existsSync(outPath)) {
  console.log(`Đã tồn tại ${outPath} — bỏ qua (dùng --retry để chạy lại)`);
  process.exit(0);
}

const env = { ...readEnvFile(path.join(appRoot, ".env.local")), ...process.env } as Record<string, string>;
const cfg = llmConfigFromEnv(env);

console.log(`HSK ${level}: ${allHanzi.length} từ -> chia bài (LLM ${cfg.model})...`);
const split: LessonSplit = await generateSplit(cfg, level, allHanzi, { expectedTotal: expected });

console.log(`Hợp lệ: ${split.length} bài:`);
for (let i = 0; i < split.length; i++) {
  console.log(`  ${i + 1}. ${split[i]!.title} (${split[i]!.hanziList.length} từ)`);
}

writeFileSync(outPath, JSON.stringify(split, null, 2));
console.log(`Ghi: ${outPath}`);
