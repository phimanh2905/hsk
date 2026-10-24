/* State resume cho gen-vocab-batch: mỗi chunk done ghi 1 file JSON trong outDir/state
   (atomic: tmp + renameSync). Thuần về ngữ nghĩa, I/O file giới hạn ở 2 hàm export. */
import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { VocabWord } from "../../../src/content/vocab";

export type ChunkState = { level: number; chunkIndex: number; status: "done"; words: VocabWord[] };

const TEMP_SUFFIX = ".tmp";

/* Key "level:chunkIndex" của các chunk đã done trong outDir (dir không có/không đọc được -> rỗng). */
export function loadState(outDir: string): Set<string> {
  const done = new Set<string>();
  if (!existsSync(outDir)) return done;
  for (const f of readdirSync(outDir)) {
    if (!f.endsWith(".json")) continue; // bỏ file tạm *.tmp
    const m = /^(\d+)-(\d+)\.json$/.exec(f);
    if (!m) continue;
    done.add(`${parseInt(m[1], 10)}:${parseInt(m[2], 10)}`);
  }
  return done;
}

/* Ghi state atomic: ghi file tạm rồi renameSync đè file cuối. */
export function saveState(outDir: string, s: ChunkState): void {
  mkdirSync(outDir, { recursive: true });
  const finalPath = path.join(outDir, `${s.level}-${s.chunkIndex}.json`);
  const tmpPath = finalPath + TEMP_SUFFIX;
  writeFileSync(tmpPath, JSON.stringify(s, null, 2));
  renameSync(tmpPath, finalPath);
}

export { TEMP_SUFFIX };
