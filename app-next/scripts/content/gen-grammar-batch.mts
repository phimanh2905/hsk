/* CLI gen-grammar-batch (W2.5): sinh draft ngữ pháp HSK theo level, chunk 10 điểm/chunk,
   resume qua state dir (chunk done bỏ qua). KHÔNG chạy trong build/CI — tool thủ công.

   Usage: pnpm dlx tsx scripts/content/gen-grammar-batch.mts --level 1..5 [--only N] [--out <dir>]
   Env: .env.local (app-next) + process.env -> CONTENT_LLM_BASE_URL/KEY/MODEL.
   Output: scripts/content/data/grammar/grammar-hskN.json (60 điểm/level). */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { llmConfigFromEnv, chatJson } from "./src/llm";
import { buildGrammarPrompt, parseGrammarResponse, CHUNK_SIZE, type GrammarDraft } from "./src/grammar-draft";
import { loadState } from "./src/batch-state";
import { readEnvFile } from "./src/read-env";
import { GRAMMAR_POINTS } from "../../src/content/grammar-points";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "../..");
const TARGET = 60;

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const levelStr = argValue("--level");
if (!levelStr || !/^[1-5]$/.test(levelStr)) {
  console.error("Usage: pnpm dlx tsx scripts/content/gen-grammar-batch.mts --level 1..5 [--only N] [--out <dir>]");
  process.exit(1);
}
const level = parseInt(levelStr, 10);
const only = argValue("--only");
const onlyIndex = only !== undefined ? parseInt(only, 10) : undefined;
if (only !== undefined && !Number.isInteger(onlyIndex)) {
  console.error("--only cần một số nguyên (chunk index)");
  process.exit(1);
}
const outDir = argValue("--out") ?? path.join(scriptDir, "out/grammar-batch");
const stateDir = path.join(outDir, "state");
const dataDir = path.join(scriptDir, "data/grammar");

// Env: process.env ưu tiên; .env.local bổ sung phần còn thiếu
const env = { ...readEnvFile(path.join(appRoot, ".env.local")), ...process.env } as Record<string, string>;
const cfg = llmConfigFromEnv(env);

// Existing: 6 điểm demo trong code + các level đã gen trước đó (tránh trùng giữa level)
const existing = GRAMMAR_POINTS.map((g) => g.hz);
for (let lv = 1; lv < level; lv++) {
  const f = path.join(dataDir, `grammar-hsk${lv}.json`);
  try {
    for (const d of JSON.parse(readFileSync(f, "utf8")) as GrammarDraft[]) existing.push(d.hz);
  } catch {
    console.warn(`cảnh báo: không đọc được ${f} — check trùng giữa level ${lv} và ${level} sẽ thiếu`);
  }
}

const chunkCount = Math.ceil(TARGET / CHUNK_SIZE);
console.log(`HSK ${level}: target ${TARGET} điểm -> ${chunkCount} chunk x ${CHUNK_SIZE}`);

// Chạy các chunk chưa done; state file "level-index.json" chứa points của chunk
const done = loadState(stateDir);
for (let i = 0; i < chunkCount; i++) {
  if (onlyIndex !== undefined && i !== onlyIndex) continue;
  if (done.has(`${level}:${i}`)) {
    console.log(`skip chunk ${i} (đã done)`);
    continue;
  }
  // existing thêm các điểm đã có ở chunk trước (cùng level) để LLM không lặp
  const prior: string[] = [];
  for (let j = 0; j < i; j++) {
    try {
      const s = JSON.parse(readFileSync(path.join(stateDir, `${level}-${j}.json`), "utf8")) as {
        points: GrammarDraft[];
      };
      prior.push(...s.points.map((p) => p.hz));
    } catch {
      /* chunk trước chưa có — bỏ qua */
    }
  }
  process.stdout.write(`chunk ${i} (${CHUNK_SIZE} điểm) -> LLM... `);
  const data = await chatJson<unknown>(cfg, buildGrammarPrompt(level, CHUNK_SIZE, [...existing, ...prior]));
  const points = await parseGrammarResponse(level, JSON.stringify(data), [...existing, ...prior]);
  // atomic save (tmp + rename, y hệt batch-state.saveState)
  mkdirSync(stateDir, { recursive: true });
  const finalPath = path.join(stateDir, `${level}-${i}.json`);
  const tmpPath = `${finalPath}.tmp`;
  writeFileSync(tmpPath, JSON.stringify({ level, chunkIndex: i, status: "done", points }, null, 2));
  renameSync(tmpPath, finalPath);
  console.log(`ok (${points.length} điểm, saved ${level}-${i}.json)`);
}

// Gộp các chunk done của level -> data/grammar/grammar-hskN.json
const allDone = loadState(stateDir);
const draft: GrammarDraft[] = [];
for (const key of [...allDone]
  .filter((k) => k.startsWith(`${level}:`))
  .sort((a, b) => {
    const [, ca] = a.split(":");
    const [, cb] = b.split(":");
    return parseInt(ca!, 10) - parseInt(cb!, 10);
  })) {
  const [, ci] = key.split(":");
  const s = JSON.parse(readFileSync(path.join(stateDir, `${level}-${ci}.json`), "utf8")) as {
    points: GrammarDraft[];
  };
  draft.push(...s.points);
}
mkdirSync(dataDir, { recursive: true });
const draftPath = path.join(dataDir, `grammar-hsk${level}.json`);
writeFileSync(draftPath, JSON.stringify(draft, null, 2));
console.log(`draft: ${draftPath} (${draft.length}/${TARGET} điểm)`);
if (draft.length < TARGET) console.warn(`cảnh báo: thiếu ${TARGET - draft.length} điểm — chạy lại để bổ sung hoặc regenerate chunk lỗi`);
