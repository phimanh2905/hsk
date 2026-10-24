/* manual-reading (W3 chạy bù): validate raw subagent GLM qua validateReadingPassage
   -> data/reading/passages-hskN.json (input của gen-reading-src). */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateReadingPassage } from "./src/reading";
import { parseHsk30Csv, wordsForLevels } from "./src/hsk-list";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const entries = parseHsk30Csv(readFileSync(path.join(scriptDir, "vendor/hsk30.csv"), "utf8"));
mkdirSync(path.join(scriptDir, "data/reading"), { recursive: true });
for (const lv of [1, 2, 3, 4, 5]) {
  const rawPath = path.join(scriptDir, `out/reading-raw-hsk${lv}.json`);
  const raw = JSON.parse(readFileSync(rawPath, "utf8"));
  const out = [];
  const vocabSet = new Set(wordsForLevels(entries, lv).map((e) => e.hanzi));
  let stt = 0;
  for (const p of raw.passages) {
    stt += 1;
    const res = validateReadingPassage(p, vocabSet, stt);
    if (!res.ok) throw new Error(`${p.id}: ${res.errors.join(" | ")}`);
    out.push(p);
  }
  writeFileSync(path.join(scriptDir, `data/reading/passages-hsk${lv}.json`), JSON.stringify(out, null, 2));
  console.log(`hsk${lv}: ${out.length} passages OK`);
}
