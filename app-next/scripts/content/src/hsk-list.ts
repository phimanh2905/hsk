/* Parser cho dataset HSK 3.0 (ivankra/hsk30, MIT — vendor/hsk30-expanded.csv, gitignored).
   Thuần, không I/O — test đọc file rồi truyền string vào. */

export type HskEntry = { hanzi: string; pinyin: string; level: number };

export const EXPECTED_CUMULATIVE = { 1: 500, 2: 1272, 3: 2245, 4: 3245, 5: 4316 } as const;

/* Tách 1 dòng CSV hỗ trợ quote cơ bản ("a,b" là 1 field, "" là literal "). */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

export function parseHsk30Csv(csv: string): HskEntry[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const iSimplified = idx("simplified");
  const iPinyin = idx("pinyin");
  const iLevel = idx("level");
  if (iSimplified < 0 || iPinyin < 0 || iLevel < 0) {
    throw new Error("CSV thiếu cột simplified/pinyin/level");
  }

  const entries: HskEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const f = splitCsvLine(lines[i]);
    const hanzi = (f[iSimplified] ?? "").trim();
    const pinyin = (f[iPinyin] ?? "").trim();
    const rawLevel = (f[iLevel] ?? "").trim();
    if (!hanzi) continue;
    if (!/^\d+$/.test(rawLevel)) continue; // "7-9", rỗng, rác -> bỏ
    const level = parseInt(rawLevel, 10);
    if (level < 1 || level > 6) continue;
    entries.push({ hanzi, pinyin, level });
  }
  return entries;
}

/* Cumulative: level ≤ maxLevel, dedupe theo hanzi giữ lần xuất hiện level thấp nhất,
   giữ nguyên thứ tự file. */
export function wordsForLevels(entries: HskEntry[], maxLevel: number): HskEntry[] {
  const seen = new Map<string, number>(); // hanzi -> index trong output
  const out: HskEntry[] = [];
  for (const e of entries) {
    if (e.level > maxLevel) continue;
    const at = seen.get(e.hanzi);
    if (at === undefined) {
      seen.set(e.hanzi, out.length);
      out.push(e);
    } else if (e.level < out[at].level) {
      out[at] = e;
    }
  }
  return out;
}
