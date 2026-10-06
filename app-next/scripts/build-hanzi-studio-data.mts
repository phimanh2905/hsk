/* Sinh data tĩnh cho Hanzi Studio radical-first (spec 2026-10-07).
   Nguồn: scripts/vendor/mmc/{graphics,dictionary}.txt (Make Me a Hanzi, MIT,
   chỉ cần lúc build — đã gitignore), scripts/vendor/hsk.json, content/radicals.ts.
   Output commit vào repo: src/content/hanzi-studio/*.ts + public/hanzi-data/*.json.
   Chạy: pnpm dlx tsx scripts/build-hanzi-studio-data.mts (từ app-next/) */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { z } from "zod";
import { radicals } from "../src/content/radicals";

type MmcLine = { char: string; strokes: string[]; medians: number[][][]; decomposition: string; radical: string };

const VARIANT: Record<string, string> = {
  辵: "辶", 食: "饣", 金: "钅", 糸: "纟", 言: "讠", 馬: "马", 鳥: "鸟", 魚: "鱼",
  門: "门", 頁: "页", 車: "车", 長: "长", 韋: "韦", 齒: "齿", 龜: "龟", 龍: "龙",
  風: "风", 雲: "云", 艸: "艹", 犬: "犭", 水: "氵", 手: "扌", 心: "忄", 阜: "阝", 邑: "阝",
};

const charMetaSchema = z.object({
  ch: z.string().min(1), py: z.string(),
  level: z.enum(["HSK 1", "HSK 2", "HSK 3"]),
  decomp: z.array(z.string()),
});
const radicalOutSchema = z.object({
  char: z.string().min(1), hanViet: z.string().min(1), meaning: z.string().min(1),
  strokes: z.number().int(), core: z.boolean(),
  cat: z.enum(["human", "nature", "animal", "other"]),
  strokeChar: z.string().nullable(),
  chars: z.array(charMetaSchema),
});

/* MMC hiện tại (JSON Lines, field "character"): {"character":"一","strokes":[...],"medians":[[...]]} */
function loadMmc(): Map<string, MmcLine> {
  const map = new Map<string, MmcLine>();
  for (const line of readFileSync("scripts/vendor/mmc/graphics.txt", "utf8").split("\n")) {
    if (!line.trim()) continue;
    const j = JSON.parse(line) as { character: string; strokes: string[]; medians: number[][][] };
    map.set(j.character, {
      char: j.character, strokes: j.strokes, medians: j.medians,
      decomposition: "", radical: "",
    });
  }
  return map;
}
function loadDictPinyin(): Map<string, string> {
  const map = new Map<string, string>();
  const p = "scripts/vendor/mmc/dictionary.txt";
  if (!existsSync(p)) return map;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const j = JSON.parse(line) as { character: string; pinyin: string[] | string; radical?: string; decomposition?: string };
    const py = Array.isArray(j.pinyin) ? j.pinyin.join(" ") : (j.pinyin ?? "");
    if (Array.from(j.character).length === 1 && !map.has(j.character)) map.set(j.character, py);
    /* radical Kangxi + decomposition nằm ở dictionary.txt (graphics.txt mới không còn) */
    const m = mmc.get(j.character);
    if (m) {
      if (j.radical && !m.radical) m.radical = j.radical;
      if (j.decomposition && !m.decomposition) m.decomposition = j.decomposition;
    }
  }
  return map;
}
function loadHskChars(): Map<string, "HSK 1" | "HSK 2" | "HSK 3"> {
  const map = new Map<string, "HSK 1" | "HSK 2" | "HSK 3">();
  const words = JSON.parse(readFileSync("scripts/vendor/hsk.json", "utf8")) as
    { level: number; hanzi: string; pinyin: string }[];
  for (const w of words) {
    if (w.level > 3) continue;
    const lv = `HSK ${w.level}` as "HSK 1" | "HSK 2" | "HSK 3";
    for (const ch of Array.from(w.hanzi)) {
      if (/[\u4e00-\u9fff]/.test(ch)) map.set(ch, lv); // level thấp thắng (set lần đầu)
    }
  }
  return map;
}

const mmc = loadMmc();
const dictPy = loadDictPinyin();
const hskChars = loadHskChars();
const cats = JSON.parse(readFileSync("scripts/vendor/radical-cats.json", "utf8")) as Record<string, string>;

/* corpus: mọi chữ HSK 1–3 có trong MMC (bỏ chữ chưa có data nét) */
const corpus = [...hskChars.keys()].filter((ch) => mmc.has(ch)).sort();

/* group chữ theo bộ thủ Kangxi (field radical của MMC) */
const byRadical = new Map<string, string[]>();
for (const ch of corpus) {
  const rad = mmc.get(ch)!.radical;
  if (!byRadical.has(rad)) byRadical.set(rad, []);
  byRadical.get(rad)!.push(ch);
}
const radKeys = new Set(radicals.map((r) => r.char));

/* corpus chữ thuộc bộ thủ nào đó MÀ radicals.ts không có char đó → map về Kangxi chuẩn
   (MMC dùng dạng biến thể/đơn giản hoá: 亻氵忄扌讠钅…; radicals.ts dùng 214 Kangxi: 人水心手言金…).
   ALIAS chuẩn hoá key bộ thủ trước khi group; key còn sót lại không map được mới là orphan thật. */
const ALIAS: Record<string, string> = {
  乚: "乙", 亻: "人", 丷: "八", "⺀": "冫", 刂: "刀", 户: "戶", "⺌": "小",
  忄: "心", 扌: "手", 攵: "攴", 母: "毋", 氵: "水", 氺: "水", 灬: "火", 爫: "爪",
  犭: "犬", 王: "玉", 礻: "示", "⺮": "竹", 纟: "糸", 耂: "老", "⺼": "肉",
  艹: "艸", 衤: "衣", 西: "襾", 覀: "襾", 见: "見", 讠: "言", 贝: "貝", 车: "車",
  辶: "辵", 阝: "邑", 钅: "金", 长: "長", 门: "門", 青: "靑", 页: "頁", 飞: "飛",
  饣: "食", 马: "馬", 鱼: "魚", 鸟: "鳥", 黄: "黃",
};
for (const [k, v] of [...byRadical.entries()]) {
  const target = ALIAS[k];
  if (target && radKeys.has(target) && !radKeys.has(k)) {
    byRadical.delete(k);
    if (!byRadical.has(target)) byRadical.set(target, []);
    byRadical.set(target, [...byRadical.get(target)!, ...v]);
  }
}
const orphans = [...byRadical.keys()].filter((k) => !radKeys.has(k));
if (orphans.length) console.warn("⚠️ Bộ thủ ngoài radicals.ts:", orphans.join(" "));

function pinyinOf(ch: string): string {
  if (dictPy.has(ch)) return dictPy.get(ch)!;
  return "";
}

const OUT: z.infer<typeof radicalOutSchema>[] = radicals.map((r) => {
  const strokeChar = mmc.has(r.char) ? r.char : (VARIANT[r.char] && mmc.has(VARIANT[r.char]) ? VARIANT[r.char] : null);
  const members = (radKeys.has(r.char) ? byRadical.get(r.char) : []) ?? [];
  return {
    char: r.char, hanViet: r.hanViet, meaning: r.meaning, strokes: r.strokes,
    core: false, // gán sau khi đếm
    cat: (cats[r.char] as string) ?? "other",
    strokeChar,
    chars: members.map((ch) => {
      const m = mmc.get(ch)!;
      return charMetaSchema.parse({
        ch, py: pinyinOf(ch), level: hskChars.get(ch)!,
        decomp: Array.from(m.decomposition).filter((c) => /[\u4e00-\u9fff]/.test(c) || c === ch),
      });
    }),
  };
});

/* core = 50 bộ có nhiều chữ corpus nhất (spec §3: "50 bộ cốt lõi" = phổ biến nhất) */
const byCount = [...OUT].sort((a, b) => b.chars.length - a.chars.length);
for (const r of byCount.slice(0, 50)) r.core = true;

/* validate toàn bộ trước khi ghi */
const parsed = z.array(radicalOutSchema).parse(OUT);
if (parsed.length !== 214) throw new Error(`Radicals phải 214, nhận ${parsed.length}`);
const noStroke = parsed.filter((r) => !r.strokeChar).map((r) => r.char);
console.log(`Bộ thủ không có data nét (${noStroke.length}):`, noStroke.join(" "));
const totalChars = parsed.reduce((n, r) => n + r.chars.length, 0);
console.log(`Corpus: ${corpus.length} chữ · ${totalChars} lượt gán bộ`);

/* ghi content TS */
mkdirSync("src/content/hanzi-studio", { recursive: true });
writeFileSync("src/content/hanzi-studio/radical-index.ts", `\
/* GENERATED bởi scripts/build-hanzi-studio-data.mts — đừng sửa tay, chạy lại script. */
export type StudioCharMeta = { ch: string; py: string; level: "HSK 1" | "HSK 2" | "HSK 3"; decomp: string[] };
export type StudioRadical = {
  char: string; hanViet: string; meaning: string; strokes: number;
  core: boolean; cat: "human" | "nature" | "animal" | "other";
  strokeChar: string | null; chars: StudioCharMeta[];
};

export const RADICAL_INDEX: StudioRadical[] = ${JSON.stringify(parsed, null, 1)};
`);
const charMeta = Object.fromEntries(parsed.flatMap((r) => r.chars.map((c) => [c.ch, c])));
writeFileSync("src/content/hanzi-studio/char-meta.ts", `\
/* GENERATED bởi scripts/build-hanzi-studio-data.mts — đừng sửa tay, chạy lại script. */
import type { StudioCharMeta } from "./radical-index";

export const CHAR_META: Record<string, StudioCharMeta> = ${JSON.stringify(charMeta, null, 1)};
`);

/* ghi stroke chunks public/hanzi-data: mỗi chunk ~100 ký tự (bộ thủ có data + corpus) */
const need = new Set<string>();
for (const r of parsed) { if (r.strokeChar) need.add(r.strokeChar); for (const c of r.chars) need.add(c.ch); }
const keys = [...need].filter((k) => mmc.has(k));
mkdirSync("public/hanzi-data", { recursive: true });
const manifest: { version: number; chars: Record<string, string> } = { version: 1, chars: {} };
const CH = 100;
for (let i = 0; i < keys.length; i += CH) {
  const name = `c${i / CH}`;
  const chunk: Record<string, { strokes: string[]; medians: number[][][] }> = {};
  for (const k of keys.slice(i, i + CH)) {
    const m = mmc.get(k)!;
    chunk[k] = { strokes: m.strokes, medians: m.medians };
    manifest.chars[k] = name;
  }
  writeFileSync(`public/hanzi-data/${name}.json`, JSON.stringify(chunk));
}
writeFileSync("public/hanzi-data/manifest.json", JSON.stringify(manifest));
console.log(`Đã ghi ${keys.length} ký tự vào ${Math.ceil(keys.length / CH)} chunk + manifest`);
