/* Parser cho dataset HSK 3.0 (ivankra/hsk30, MIT — vendor/hsk30.csv, gitignored).
   Thuần, không I/O — test đọc file rồi truyền string vào. */

/* Row identity của dataset: ID duy nhất per row (kiểm chứng 11092/11092 unique).
   Các entry trùng hanzi+pinyin cùng level là từ KHÁC của chuẩn (khác POS/nghĩa,
   vd "省 shěng" L2 có 2 nghĩa) — không được gộp. */
export type HskEntry = { id?: string; hanzi: string; pinyin: string; level: number };

/* Số cặp (hanzi,pinyin) unique per level — chuẩn có vài row trùng đúng cặp (2 nghĩa),
   data vocab per-level phải khớp các số này (xem ruling W2 chạy bù). */
export const EXPECTED_PER_LEVEL_UNIQUE: Record<number, number> = { 1: 500, 2: 771, 3: 970, 4: 999, 5: 1071 };

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
  const iId = idx("id");
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
    const id = iId >= 0 ? (f[iId] ?? "").trim() : undefined;
    entries.push(id ? { id, hanzi, pinyin, level } : { hanzi, pinyin, level });
  }
  return entries;
}

/* Cumulative: level ≤ maxLevel; dedupe CHỈ row trùng hoàn toàn (row identity =
   ID của dataset, fallback hanzi+pinyin+level khi entry không có ID). Các entry
   trùng hanzi+pinyin ở level khác hoặc khác POS/nghĩa là từ khác của chuẩn
   HSK 3.0 — giữ nguyên để cumulative khớp EXPECTED_CUMULATIVE. Giữ thứ tự file. */
export function wordsForLevels(entries: HskEntry[], maxLevel: number): HskEntry[] {
  const seen = new Map<string, number>(); // row identity -> index trong output
  const out: HskEntry[] = [];
  for (const e of entries) {
    if (e.level > maxLevel) continue;
    const key = e.id ?? `${e.hanzi}\u0000${e.pinyin}\u0000${e.level}`;
    const at = seen.get(key);
    if (at === undefined) {
      seen.set(key, out.length);
      out.push(e);
    }
  }
  return out;
}
