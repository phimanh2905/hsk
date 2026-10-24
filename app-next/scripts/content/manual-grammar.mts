/* manual-grammar (W2 chạy bù): validate raw subagent GLM qua parseGrammarResponse
   (gán id slug + zod) -> state chunks -> data/grammar/grammar-hskN.json. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseGrammarResponse, CHUNK_SIZE, type GrammarDraft } from "./src/grammar-draft";
import { GRAMMAR_POINTS } from "../../src/content/grammar-points";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const stateDir = path.join(scriptDir, "out/grammar-batch/state");
const dataDir = path.join(scriptDir, "data/grammar");
mkdirSync(stateDir, { recursive: true });
mkdirSync(dataDir, { recursive: true });

for (const level of [1, 2, 3, 4, 5]) {
  const rawPath = path.join(scriptDir, `out/grammar-raw-hsk${level}.json`);
  if (!existsSync(rawPath)) { console.log(`hsk${level}: thiếu raw — bỏ qua`); continue; }
  const raw = JSON.parse(readFileSync(rawPath, "utf8"));
  const existing = GRAMMAR_POINTS.map((p) => p.hz);
  const all: GrammarDraft[] = [];
  for (let i = 0; i < raw.points.length; i += CHUNK_SIZE) {
    const chunk = raw.points.slice(i, i + CHUNK_SIZE);
    const prior = [...existing, ...all.map((p) => p.hz)];
    const points = await parseGrammarResponse(level, JSON.stringify({ points: chunk }), prior);
    writeFileSync(path.join(stateDir, `${level}-${i / CHUNK_SIZE}.json`),
      JSON.stringify({ level, chunkIndex: i / CHUNK_SIZE, status: "done", points }, null, 2));
    all.push(...points);
  }
  // id uniqueness: slug pinyin trùng (了1/了2) -> suffix -2, -3…
  const seenIds = new Map<string, number>();
  for (const p of all) {
    const n = seenIds.get(p.id) ?? 0;
    seenIds.set(p.id, n + 1);
    if (n > 0) p.id = `${p.id}-${n + 1}`;
  }
  writeFileSync(path.join(dataDir, `grammar-hsk${level}.json`), JSON.stringify(all, null, 2));
  console.log(`hsk${level}: ${all.length} điểm OK`);
}
