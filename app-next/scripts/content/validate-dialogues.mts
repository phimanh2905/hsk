/* validate-dialogues: chạy validateDialogue repo trên raw subagent GLM, ghi data/dialogues/. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateDialogue } from "./src/dialogues";
import { parseHsk30Csv, wordsForLevels } from "./src/hsk-list";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const entries = parseHsk30Csv(readFileSync(path.join(scriptDir, "vendor/hsk30.csv"), "utf8"));
mkdirSync(path.join(scriptDir, "data/dialogues"), { recursive: true });
for (const lv of [1, 2, 3]) {
  const rawPath = path.join(scriptDir, `out/dialogues-raw-hsk${lv}.json`);
  const raw = JSON.parse(readFileSync(rawPath, "utf8"));
  const vocab = new Set(wordsForLevels(entries, lv).map((e) => e.hanzi));
  const out = [];
  let oovTotal = 0;
  for (const d of raw.dialogues) {
    const res = validateDialogue(d, vocab);
    if (!res.ok) throw new Error(`${d.id}: ${res.errors.join(" | ")}`);
    oovTotal += res.oov.length;
    out.push(d); // validateDialogue chỉ trả ok/errors/oov — raw đã đúng shape
  }
  writeFileSync(path.join(scriptDir, `data/dialogues/dialogues-hsk${lv}.json`), JSON.stringify(out, null, 2));
  console.log(`hsk${lv}: ${out.length} dialogues OK (OOV warning: ${oovTotal})`);
}
