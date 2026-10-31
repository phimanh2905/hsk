import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

/* Chạy từ app-next/ (root vitest) — mọi đường dẫn resolve từ cwd. */
const dataDir = path.resolve("scripts/content/data/reading");
const idxPath = path.join(dataDir, "audio-index.json");
const hasIndex = existsSync(idxPath);

/* audio-index.json là đầu ra của render-reading-audio.py (chạy khi máy có venv kokoro).
   Máy không render được → file chưa tồn tại → skip với lý do rõ ràng. */
describe.skipIf(!hasIndex)("audio-index.json (skip khi chưa render kokoro: file chưa tồn tại)", () => {
  type AudioIndex = Record<string, { sentences: { audio: string; durSec: number }[] }>;
  const loadIdx = (): AudioIndex => JSON.parse(readFileSync(idxPath, "utf8")) as AudioIndex;

  for (const level of [1, 2, 3, 4, 5]) {
    it(`passages-hsk${level}: mỗi passage có sentences khớp passages JSON, durSec > 0.2, mp3 tồn tại`, () => {
      const idx = loadIdx();
      const src = JSON.parse(
        readFileSync(path.join(dataDir, `passages-hsk${level}.json`), "utf8"),
      ) as { id: string; sentences: unknown[] }[];
      for (const p of src) {
        expect(idx[p.id], `${p.id} thiếu trong audio-index`).toBeDefined();
        expect(idx[p.id].sentences.length, p.id).toBe(p.sentences.length);
        for (const s of idx[p.id].sentences) {
          expect(s.audio).toMatch(/^sent-\d+\.mp3$/);
          expect(s.durSec, `${p.id}/${s.audio}`).toBeGreaterThan(0.2);
          expect(
            existsSync(path.resolve("public/audio/reading", p.id, s.audio)),
            `${p.id}/${s.audio} không tồn tại trên đĩa`,
          ).toBe(true);
        }
      }
    });
  }
});
