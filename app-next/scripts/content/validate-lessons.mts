/* validate-lessons: chạy validateSplit repo trên các file lessons-hskN (dedupe allHanzi theo ruling). */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateSplit } from "./src/lessons";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
for (const lv of [1, 2, 3, 4, 5]) {
  const lessons = JSON.parse(readFileSync(path.join(scriptDir, `data/vocab/lessons-hsk${lv}.json`), "utf8"));
  const allHanzi = [...new Set((JSON.parse(readFileSync(path.join(scriptDir, `data/vocab/hsk${lv}.json`), "utf8")) as { hanzi: string }[]).map((w) => w.hanzi))];
  validateSplit(lv, allHanzi, lessons); // throw nếu sai
  console.log(`hsk${lv}: ${lessons.length} bài — validateSplit PASS`);
}
