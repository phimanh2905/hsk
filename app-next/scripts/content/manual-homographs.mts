/* manual-homographs (W2 chạy bù): assemble 17 entry đồng âm (hanzi có 2 pinyin)
   từ raw subagent GLM -> merge vào draft-hskN.json key theo (hanzi,pinyin). */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseVocabResponse, type ChunkItem } from "./src/vocab-draft";
import type { VocabWord } from "../src/content/vocab";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(path.join(scriptDir, "out/vocab-batch/raw-homographs.json"), "utf8"));
const missing = JSON.parse(readFileSync(path.join(scriptDir, "out/missing-pairs.json"), "utf8")) as
  { level: number; hanzi: string; pinyin: string }[];

const byLevel = new Map<number, VocabWord[]>();
for (const lv of [1, 2, 3, 4, 5]) {
  // gom chunk items + raws cùng cấp, parse 1 lần để derive đúng
  const idxs = missing.map((m, i) => ({ m, i })).filter((x) => x.m.level === lv);
  if (!idxs.length) continue;
  const chunk: ChunkItem[] = idxs.map((x) => ({ hanzi: x.m.hanzi, pinyin: x.m.pinyin }));
  const raws = idxs.map((x) => raw.words[x.i]);
  const words = await parseVocabResponse(chunk, JSON.stringify({ words: raws }));
  byLevel.set(lv, words);
}
for (const [lv, words] of byLevel) {
  const p = path.join(scriptDir, `out/vocab-batch/draft-hsk${lv}.json`);
  const existing: VocabWord[] = JSON.parse(readFileSync(p, "utf8"));
  const key = (w: VocabWord) => `${w.hanzi}\u0000${w.pinyin}`;
  const map = new Map(existing.map((w) => [key(w), w]));
  for (const w of words) map.set(key(w), w);
  writeFileSync(p, JSON.stringify([...map.values()], null, 2));
  console.log(`hsk${lv}: +${words.length} -> ${map.size}`);
}
