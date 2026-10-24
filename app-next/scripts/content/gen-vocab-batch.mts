/* CLI gen-vocab-batch (W2.2): sinh draft từ vựng HSK theo level, chunk 20 từ/chunk,
   resume qua state dir (chunk done bỏ qua). KHÔNG chạy trong build/CI — tool thủ công.

   Usage: pnpm dlx tsx scripts/content/gen-vocab-batch.mts --level 1..5 [--only N] [--out <dir>]
   Env: .env.local (app-next) + process.env -> CONTENT_LLM_BASE_URL/KEY/MODEL. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseHsk30Csv, wordsForLevels } from "./src/hsk-list";
import { llmConfigFromEnv, chatJson } from "./src/llm";
import { buildVocabPrompt, parseVocabResponse, CHUNK_SIZE, type ChunkItem } from "./src/vocab-draft";
import { loadState, saveState, type ChunkState } from "./src/batch-state";
import { readEnvFile } from "./src/read-env";
import type { VocabWord } from "../src/content/vocab";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "../..");

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const levelStr = argValue("--level");
if (!levelStr || !/^[1-5]$/.test(levelStr)) {
  console.error("Usage: pnpm dlx tsx scripts/content/gen-vocab-batch.mts --level 1..5 [--only N] [--out <dir>]");
  process.exit(1);
}
const level = parseInt(levelStr, 10);
const only = argValue("--only");
const onlyIndex = only !== undefined ? parseInt(only, 10) : undefined;
if (only !== undefined && !Number.isInteger(onlyIndex)) {
  console.error("--only cần một số nguyên (chunk index)");
  process.exit(1);
}
const outDir = argValue("--out") ?? path.join(scriptDir, "out/vocab-batch");
const stateDir = path.join(outDir, "state");

// Env: process.env ưu tiên; .env.local bổ sung phần còn thiếu (content_llm_* v.v.)
const env = { ...readEnvFile(path.join(appRoot, ".env.local")), ...process.env } as Record<string, string>;
const cfg = llmConfigFromEnv(env);

// CSV vendor -> entries "từ mới của level" (level === n), chunk theo CHUNK_SIZE
const csv = readFileSync(path.join(scriptDir, "vendor/hsk30.csv"), "utf8");
const cumulative = wordsForLevels(parseHsk30Csv(csv), level);
const levelEntries = cumulative.filter((e) => e.level === level);
const chunks: ChunkItem[][] = [];
for (let i = 0; i < levelEntries.length; i += CHUNK_SIZE) {
  chunks.push(levelEntries.slice(i, i + CHUNK_SIZE).map((e) => ({ hanzi: e.hanzi, pinyin: e.pinyin })));
}
console.log(`HSK ${level}: ${levelEntries.length} từ mới -> ${chunks.length} chunk x ${CHUNK_SIZE}`);

const done = loadState(stateDir);
for (let i = 0; i < chunks.length; i++) {
  if (onlyIndex !== undefined && i !== onlyIndex) continue;
  if (done.has(`${level}:${i}`)) {
    console.log(`skip chunk ${i} (đã done)`);
    continue;
  }
  const chunk = chunks[i];
  process.stdout.write(`chunk ${i} (${chunk.length} từ) -> LLM... `);
  // chatJson đã parse JSON + retry; parseVocabResponse nhận content string ->
  // round-trip qua JSON.stringify (lossless) để tái sử dụng validation của T3.
  const data = await chatJson<unknown>(cfg, buildVocabPrompt(level, chunk));
  const words = parseVocabResponse(level, chunk, JSON.stringify(data));
  const state: ChunkState = { level, chunkIndex: i, status: "done", words };
  saveState(stateDir, state);
  console.log(`ok (${words.length} từ, saved ${level}-${i}.json)`);
}

// Gộp các chunk done của level -> draft-hsk<level>.json
const allDone = loadState(stateDir);
const draft: VocabWord[] = [];
for (const key of [...allDone].filter((k) => k.startsWith(`${level}:`)).sort((a, b) => {
  const [, ca] = a.split(":"); const [, cb] = b.split(":");
  return parseInt(ca!, 10) - parseInt(cb!, 10);
})) {
  const [, ci] = key.split(":");
  const state = JSON.parse(readFileSync(path.join(stateDir, `${level}-${ci}.json`), "utf8")) as ChunkState;
  draft.push(...state.words);
}
mkdirSync(outDir, { recursive: true });
const draftPath = path.join(outDir, `draft-hsk${level}.json`);
writeFileSync(draftPath, JSON.stringify(draft, null, 2));
console.log(`draft: ${draftPath} (${draft.length}/${levelEntries.length} từ)`);
