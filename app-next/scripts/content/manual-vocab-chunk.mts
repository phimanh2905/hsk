/* manual-vocab-chunk (W2 chạy bù): thay chatJson HTTP bằng raw response do
   subagent GLM viết ra file. Dùng nguyên validation chain của vocab-draft:
   parseVocabResponse (validate raw + derive pinyinPerChar/hanViet deterministic)
   -> rederiveWords -> saveState + append draft. KHÔNG chạy trong build/CI.

   Usage: pnpm dlx tsx scripts/content/manual-vocab-chunk.mts --level 4 --chunk 8 --raw out/vocab-batch/raw-4-8.json
   raw JSON shape: { "words": [{ "hanzi", "meaning", "pos", "exZh", "exVi" }] } — đúng thứ tự chunk. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseHsk30Csv, wordsForLevels } from "./src/hsk-list";
import { parseVocabResponse, CHUNK_SIZE, type ChunkItem } from "./src/vocab-draft";
import { loadState, saveState } from "./src/batch-state";
import type { VocabWord } from "../src/content/vocab";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const level = parseInt(argValue("--level") ?? "", 10);
const chunkIndex = parseInt(argValue("--chunk") ?? "", 10);
const rawPath = argValue("--raw");
if (!/^[1-5]$/.test(String(level)) || !Number.isInteger(chunkIndex) || !rawPath) {
  console.error("Usage: manual-vocab-chunk.mts --level 1-5 --chunk N --raw <file>");
  process.exit(1);
}
const outDir = path.join(scriptDir, "out/vocab-batch");
const stateDir = path.join(outDir, "state");

const csv = readFileSync(path.join(scriptDir, "vendor/hsk30.csv"), "utf8");
const cumulative = wordsForLevels(parseHsk30Csv(csv), level);
const levelEntries = cumulative.filter((e) => e.level === level);
const chunks: ChunkItem[][] = [];
for (let i = 0; i < levelEntries.length; i += CHUNK_SIZE) {
  chunks.push(levelEntries.slice(i, i + CHUNK_SIZE).map((e) => ({ hanzi: e.hanzi, pinyin: e.pinyin })));
}
const chunk = chunks[chunkIndex];
if (!chunk) {
  console.error(`chunk ${chunkIndex} không tồn tại (level ${level} có ${chunks.length} chunk)`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(rawPath, "utf8")) as { words: unknown[] };
const content = JSON.stringify(raw); // validateRawResponse mong { "words": [...] } — nguyên object
console.log(`raw: ${raw.words.length} words cho chunk ${level}-${chunkIndex}`);
const words = await parseVocabResponse(chunk, content); // derive pinyinPerChar + hanViet via pypinyin bridge

saveState(stateDir, { level, chunkIndex, status: "done", words }); // saveState tự join level-chunk.json
// merge vào draft-hskN.json (thay entry trùng hanzi, giữ thứ tự)
const draftPath = path.join(outDir, `draft-hsk${level}.json`);
const existing: VocabWord[] = existsSync(draftPath) ? JSON.parse(readFileSync(draftPath, "utf8")) : [];
const byHanzi = new Map(existing.map((w) => [w.hanzi, w]));
for (const w of words) byHanzi.set(w.hanzi, w);
writeFileSync(draftPath, JSON.stringify([...byHanzi.values()], null, 2));
console.log(`OK: ${words.length} từ -> ${draftPath} (tổng ${byHanzi.size})`);
console.log(`state: ${loadState(stateDir).size} chunks done`);
