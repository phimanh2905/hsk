/* rederive-all (W2 chạy bù): chuẩn hóa toàn bộ draft-hskN.json theo convention mới
   (pinyin từ dataset, pinyinPerChar + hanViet derive offline), dedupe theo hanzi+pinyin.
   Một lần chạy — KHÔNG chạy trong build/CI. */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseHsk30Csv, wordsForLevels } from "./src/hsk-list";
import { rederiveWords } from "./src/vocab-draft";
import type { VocabWord } from "../../src/content/vocab";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const csv = readFileSync(path.join(scriptDir, "vendor/hsk30.csv"), "utf8");
const entries = parseHsk30Csv(csv);

for (const level of [1, 2, 3, 4, 5]) {
  const draftPath = path.join(scriptDir, `out/vocab-batch/draft-hsk${level}.json`);
  const raw: VocabWord[] = JSON.parse(readFileSync(draftPath, "utf8"));
  const pinyinByHanzi = new Map(
    wordsForLevels(entries, level).map((e) => [e.hanzi, e.pinyin])
  );
  // dedupe trước (hanzi+pinyin) — giữ bản đầu
  const seen = new Set<string>();
  const unique = raw.filter((w) => {
    const k = `${w.hanzi}\u0000${w.pinyin}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const out = await rederiveWords(unique, pinyinByHanzi);
  writeFileSync(draftPath, JSON.stringify(out, null, 2));
  console.log(`hsk${level}: ${raw.length} -> ${out.length} (dedupe ${raw.length - unique.length})`);
}
