/* Generator bảng ánh xạ (âm tiết pinyin, thanh điệu) → chữ Hán đại diện
   cho render audio tĩnh (Task 2). Chạy thủ công:
     pnpm dlx tsx scripts/content/gen-pinyin-hanzi-map.mts
   Đầu ra: scripts/content/data/pinyin/render-input.json — 405 ô theo thứ tự
   pinyinInitials, idempotent.

   Nguồn dữ liệu (ưu tiên thứ tự xuất hiện = HSK1 trước, phổ biến hơn):
     1. src/content/vocab.ts — parse SOURCE TEXT, 2 dạng (import sẽ chạy
        transform dataset, mất pinyin số):
        a) Object literal: {"c":"你","py":"nǐ"} trong pinyinPerChar — pinyin
           có dấu, 1 cặp/ký tự, quét theo thứ tự file.
        b) W("hanzi", "pinyin số", …) (HSK6 demo): hanzi align 1:1 từng ký
           tự CJK với token pinyin; lệch số lượng → bỏ entry.
     2. src/content/pinyin.ts pinyinExamples — [chữ, pinyin có dấu, nghĩa].
     3. CC-CEDICT (spec §3.2 nguồn chính; optional, file local gitignored
        scripts/content/data/pinyin/cedict_ts.u8, CLI --cedict <path>) —
        chỉ fill ô còn trống sau stages 1–2, ưu tiên traditional ===
        simplified, else entry đầu theo thứ tự dict.
   Bỏ qua token "." và ký tự không CJK. Ô vẫn null → null trong JSON. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseTone } from "../../src/lib/pinyin/tone-mark";
import {
  pinyinInitials,
  pinyinFinals,
  pinyinValid,
  pinyinExamples,
} from "../../src/content/pinyin";

export interface HanziEntry {
  char: string;
  syl: string;
  tone: number;
}

/** Ô (syl, tone) → chữ đầu tiên gặp trong entries (thứ tự = độ ưu tiên). */
export function selectHanzi(
  entries: HanziEntry[],
  syl: string,
  tone: number,
): string | null {
  const e = entries.find((x) => x.syl === syl && x.tone === tone);
  return e ? e.char : null;
}

const CJK = /\p{Script=Han}/u;

type Entry = { char: string; syl: string; tone: number };

/** Parse source text vocab.ts: pinyinPerChar {"c":"你","py":"nǐ"} theo thứ
    tự file + các call W("hanzi", "pinyin số", …). */
export function collectFromVocabSource(source: string): Entry[] {
  const out: Entry[] = [];
  const pairRe = /\{"c":"([^"]*)","py":"([^"]*)"\}/g;
  let p: RegExpExecArray | null;
  while ((p = pairRe.exec(source))) {
    const [char, py] = [p[1], p[2]];
    if (!CJK.test(char) || py === char) continue; // bỏ dấu câu "。"
    const parsed = parseTone(py);
    if (parsed) out.push({ char, syl: parsed.base, tone: parsed.tone });
  }
  out.push(...collectWCalls(source));
  return out;
}

/** Dạng W("hanzi", "chen2 mo4", …): align token — ký tự CJK. */
function collectWCalls(source: string): Entry[] {
  const out: Entry[] = [];
  const re = /W\("([^"]+)",\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const chars = Array.from(m[1]).filter((c) => CJK.test(c));
    const tokens = m[2].trim().split(/\s+/).filter((t) => t !== ".");
    if (chars.length !== tokens.length) continue; // không đoán alignment
    for (let i = 0; i < chars.length; i++) {
      const parsed = parseTone(tokens[i]);
      if (parsed) out.push({ char: chars[i], syl: parsed.base, tone: parsed.tone });
    }
  }
  return out;
}

/** pinyinExamples: [chữ, pinyin có dấu, nghĩa] → entries. */
function collectFromExamples(): Entry[] {
  const out: Entry[] = [];
  for (const triples of Object.values(pinyinExamples)) {
    for (const [hanzi, py] of triples) {
      const parsed = parseTone(py);
      if (parsed && CJK.test(hanzi) && Array.from(hanzi).length === 1) {
        out.push({ char: hanzi, syl: parsed.base, tone: parsed.tone });
      }
    }
  }
  return out;
}

/* ---- Stage 3: CC-CEDICT (nguồn chính theo spec §3.2, fallback cho ô trống) ---- */

export interface CedictEntry {
  simplified: string;
  traditional: string;
  tokens: string[];
}

/** Parse 1 dòng CC-CEDICT: `Traditional Simplified [pin1 yin1] /english/`.
    Bỏ comment (#); bỏ entry đa ký tự (chỉ lấy simplified = 1 ký tự CJK).
    pinyin cedict dùng `u:` cho ü → đổi thành `ü` trước khi parseTone. */
export function parseCedictLine(line: string): CedictEntry | null {
  if (line.startsWith("#")) return null;
  const m = /^(\S+) (\S+) \[([^\]]+)\] \//.exec(line);
  if (!m) return null;
  const [, traditional, simplified, pinyin] = m;
  if (Array.from(simplified).length !== 1 || !CJK.test(simplified)) return null;
  const tokens = pinyin.trim().split(/\s+/).map((t) => t.replaceAll("u:", "ü"));
  return { simplified, traditional, tokens };
}

export interface CedictCandidate {
  char: string;
  sameForm: boolean; // traditional === simplified (thường là dạng phổ biến)
}

/** Quét dict: với mỗi ô (syl, tone), giữ ứng viên đầu tiên và ứng viên
    đầu tiên có traditional === simplified. */
export function collectCedictCandidates(
  text: string,
): Map<string, { first: CedictCandidate; firstSame: CedictCandidate | null }> {
  const map = new Map<
    string,
    { first: CedictCandidate; firstSame: CedictCandidate | null }
  >();
  const consider = (syl: string, tone: number, cand: CedictCandidate) => {
    const key = `${syl}|${tone}`;
    const cur = map.get(key);
    if (!cur) {
      map.set(key, { first: cand, firstSame: cand.sameForm ? cand : null });
    } else if (!cur.firstSame && cand.sameForm) {
      cur.firstSame = cand;
    }
  };
  for (const line of text.split("\n")) {
    const e = parseCedictLine(line);
    if (!e) continue;
    const cand: CedictCandidate = {
      char: e.simplified,
      sameForm: e.traditional === e.simplified,
    };
    for (const token of e.tokens) {
      const parsed = parseTone(token);
      if (parsed) consider(parsed.base, parsed.tone, cand);
    }
  }
  return map;
}

function main(): void {
  const root = resolve(import.meta.dirname!, "../..");
  const source = readFileSync(resolve(root, "src/content/vocab.ts"), "utf-8");
  const entries = [...collectFromVocabSource(source), ...collectFromExamples()];

  // Stage 3 (optional): CC-CEDICT — `--cedict <path>` hoặc mặc định
  // scripts/content/data/pinyin/cedict_ts.u8; thiếu file → bỏ qua (stderr).
  const cedictArgIdx = process.argv.indexOf("--cedict");
  const cedictPath = resolve(
    cedictArgIdx >= 0 ? process.argv[cedictArgIdx + 1] : resolve(root, "scripts/content/data/pinyin/cedict_ts.u8"),
  );
  let cedict = new Map<string, { first: CedictCandidate; firstSame: CedictCandidate | null }>();
  let cedictLoaded = false;
  try {
    cedict = collectCedictCandidates(readFileSync(cedictPath, "utf-8"));
    cedictLoaded = true;
  } catch {
    process.stderr.write(
      `NOTE: CC-CEDICT not found at ${cedictPath} — skipping stage 3 (pass --cedict <path> to enable).\n`,
    );
  }

  const cells: {
    initial: string;
    final: string;
    base: string;
    hanzi: [string | null, string | null, string | null, string | null, string | null];
  }[] = [];
  const nullPerTone: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let cedictFilled = 0;

  for (const initial of pinyinInitials) {
    for (const final of pinyinFinals) {
      const base = pinyinValid[initial]?.[final];
      if (!base) continue;
      const hanzi = ([1, 2, 3, 4, 5] as const).map((t) => {
        const fromVocab = selectHanzi(entries, base, t);
        if (fromVocab !== null) return fromVocab;
        if (!cedictLoaded) return null;
        const cand = cedict.get(`${base}|${t}`);
        if (!cand) return null;
        cedictFilled++;
        return (cand.firstSame ?? cand.first).char;
      }) as [string | null, string | null, string | null, string | null, string | null];
      for (let t = 1; t <= 5; t++) if (hanzi[t - 1] === null) nullPerTone[t]++;
      cells.push({ initial, final, base, hanzi });
    }
  }

  const json = {
    generatedAt: new Date().toISOString(),
    cells,
  };
  const outPath = resolve(root, "scripts/content/data/pinyin/render-input.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(json, null, 2) + "\n");

  console.log(`Pinyin hanzi map: ${cells.length} cells, ${entries.length} entries`);
  console.log(`CC-CEDICT stage: ${cedictLoaded ? "loaded" : "skipped"} (${cedictFilled} cells filled)`);
  console.log(`Null count per tone (of ${cells.length} cells):`);
  for (let t = 1; t <= 5; t++) console.log(`  tone ${t}: ${nullPerTone[t]}`);
  console.log(`Written: ${outPath}`);
}

/* Chỉ chạy main khi file này là entry point — import (test) không được
   re-run generator và ghi đè render-input.json. */
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
