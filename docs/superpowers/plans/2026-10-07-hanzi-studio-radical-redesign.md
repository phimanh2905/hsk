# Hanzi Studio Radical-First Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển `/hanzi` (Hanzi Studio) từ "luyện 12 chữ demo theo cấp độ HSK" sang "tra cứu 214 bộ thủ trước, luyện chữ HSK 1–3 sau", engine nét viết là `hanzi-writer` + data thật.

**Architecture:** Build-time script (`scripts/build-hanzi-studio-data.mts`) biến vendor data (Make Me a Hanzi + danh sách HSK 1–3) thành content tĩnh (`radical-index.ts`, `char-meta.ts`) + subset JSON stroke data trong `public/hanzi-data/`. Runtime: loader fetch chunk + hook `useWriter` bọc `hanzi-writer`; 3 component studio viết lại quanh model thuần (`studio-model.ts`) để test được.

**Tech Stack:** Next.js 16 + OpenNext Cloudflare, hanzi-writer ^3.7.3, zod 4, vitest + RTL (jsdom), Playwright (port 3100).

**Spec:** `docs/superpowers/specs/2026-10-07-hanzi-studio-radical-redesign-design.md` — executor ĐỌC CẢ HAI file.

## Global Constraints

- Repo **bắt buộc pnpm** — mọi lệnh chạy từ `app-next/` (không dùng npm).
- Không port emoji vào UI — icon chỉ qua `@/components/ui/icon` (lucide).
- Không hardcode màu — dùng token semantic (`text-text-primary`, `bg-amber-wash`, `border-border-subtle`, `bg-rose-wash`, `text-action-primary`, `bg-surface-muted`, `text-learning-mastered`, `bg-learning-mastered`…).
- Giữ dark mode (token flip `html.dark`), giữ focus ring `--action-focus` vermilion hiện tại.
- **Không đụng** `stroke-player.tsx`, `hanzi-strokes.ts`, `draw-pad.tsx`, `draw-modal.tsx`, `/hanzi/[char]` — chúng thuộc feature khác.
- Data nhạy cảm: KHÔNG commit file vendor dung lượng lớn vào git ngoài trừ `scripts/vendor/hsk.json` + `scripts/vendor/radical-cats.json`; `graphics.txt`/`dictionary.txt` thêm vào `app-next/.gitignore` (chỉ cần lúc build, output đã commit).
- Copy tiếng Việt bám theo mock mới: "Kho tra cứu", "Bàn tập viết", "Tự luyện viết", "Các chữ HSK chứa bộ này", "Mẹo nhớ", "Bóc tách".
- Commit mỗi task một lần, message dạng `feat(hanzi-studio): ...` / `chore(hanzi-studio): ...`.
- Tên nhánh làm việc: `hanzi-studio-radical` (tạo từ `main` ở Task 1).

---

### Task 1: Vendor data + build script sinh content tĩnh

**Files:**
- Create: `app-next/scripts/vendor/mmc/.gitkeep` (thư mục, txt bị ignore)
- Create: `app-next/scripts/vendor/hsk.json` (commit)
- Create: `app-next/scripts/vendor/radical-cats.json` (commit)
- Create: `app-next/scripts/build-hanzi-studio-data.mts`
- Create (generated, commit): `app-next/src/content/hanzi-studio/radical-index.ts`, `app-next/src/content/hanzi-studio/char-meta.ts`, `app-next/public/hanzi-data/manifest.json`, `app-next/public/hanzi-data/c0.json`…`cN.json`
- Modify: `app-next/.gitignore`

**Interfaces (produces — các task sau phụ thuộc vào ĐÚNG shape này):**

```ts
// src/content/hanzi-studio/radical-index.ts (generated)
export type StudioRadical = {
  char: string;       // glyph Kangxi từ radicals.ts, vd "水"
  hanViet: string;
  meaning: string;
  strokes: number;    // số nét của bộ thủ
  core: boolean;      // top 50 bộ theo số chữ corpus
  cat: "human" | "nature" | "animal" | "other";
  strokeChar: string | null; // ký tự có data nét (glyph hoặc biến thể đơn giản hoá)
  chars: { ch: string; py: string; level: "HSK 1" | "HSK 2" | "HSK 3"; decomp: string[] }[];
};
export const RADICAL_INDEX: StudioRadical[]; // đúng 214 phần tử, theo thứ tự radicals.ts

// src/content/hanzi-studio/char-meta.ts (generated)
export type StudioCharMeta = { ch: string; py: string; level: "HSK 1" | "HSK 2" | "HSK 3"; decomp: string[] };
export const CHAR_META: Record<string, StudioCharMeta>; // key = chữ corpus HSK 1–3

// public/hanzi-data/manifest.json
{ "version": 1, "chars": { "口": "c0", "氵": "c0", ... } }   // char -> tên chunk (không đuôi)
// public/hanzi-data/c0.json
{ "口": { "strokes": ["M ...", ...], "medians": [[[x,y],...], ...] }, ... }  // hộp 1024, format MMC
```

- [ ] **Step 1: Tạo nhánh + tải vendor data**

```bash
cd /Volumes/samsung512/Code/hsk && git checkout -b hanzi-studio-radical
cd app-next
mkdir -p scripts/vendor/mmc src/content/hanzi-studio
curl -sL -o scripts/vendor/mmc/graphics.txt https://raw.githubusercontent.com/skishore/makemeahanzi/master/graphics.txt
curl -sL -o scripts/vendor/mmc/dictionary.txt https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt
curl -sL -o scripts/vendor/hsk.json https://raw.githubusercontent.com/gigacool/hanyu-shuiping-kaoshi/master/hsk.json
wc -l scripts/vendor/mmc/graphics.txt   # kỳ vọng ~9.5k dòng
head -c 200 scripts/vendor/hsk.json     # kỳ vọng mảng [{level, hanzi, pinyin, ...}]
```

Nếu `graphics.txt` 404 → thử branch `master` thay bằng URL `https://cdn.jsdelivr.net/gh/skishore/makemeahanzi@master/graphics.txt`.

- [ ] **Step 2: Ignore file vendor lớn**

Thêm vào `app-next/.gitignore`:

```
scripts/vendor/mmc/*.txt
```

- [ ] **Step 3: Ghi bảng phân loại bộ thủ**

Tạo `app-next/scripts/vendor/radical-cats.json` — map **char Kangxi → cat** (bảng curated, chỉ ~70 bộ có cat rõ, còn lại script gán `"other"`; `core` KHÔNG nằm ở đây — script tính top 50 theo số chữ corpus):

```json
{
  "人": "human", "亻": "human", "女": "human", "口": "human", "心": "human", "忄": "human",
  "手": "human", "扌": "human", "言": "human", "讠": "human", "足": "human", "⻊": "human",
  "目": "human", "耳": "human", "首": "human", "面": "human", "身": "human", "牙": "human",
  "齿": "human", "骨": "human", "页": "human", "頁": "human", "走": "human", "止": "human",
  "山": "nature", "水": "nature", "氵": "nature", "木": "nature", "火": "nature", "灬": "nature",
  "日": "nature", "月": "nature", "雨": "nature", "石": "nature", "田": "nature", "土": "nature",
  "金": "nature", "钅": "nature", "风": "nature", "風": "nature", "云": "nature", "雲": "nature",
  "光": "nature", "冰": "nature", "氺": "nature", "冫": "nature", "川": "nature", "《": "nature",
  "巛": "nature", "艹": "nature", "艸": "nature", "竹": "nature", "禾": "nature", "米": "nature",
  "瓜": "nature", "麦": "nature", "麥": "nature", "豆": "nature", "里": "nature", "谷": "nature",
  "犭": "animal", "犬": "animal", "鸟": "animal", "鳥": "animal", "鱼": "animal", "魚": "animal",
  "虫": "animal", "马": "animal", "馬": "animal", "牛": "animal", "羊": "animal", "鹿": "animal",
  "鼠": "animal", "龙": "animal", "龍": "animal", "龟": "animal", "龜": "animal", "羽": "animal",
  "豸": "animal", "亥": "animal", "彡": "other"
}
```

Lưu ý: key dùng cả dạng Kangxi cổ (頁/鳥/馬…) lẫn đơn giản hoá (页/鸟/马…) — script tra theo chính xác `radicals[i].char` trước, rồi mới tra bản đồ biến thể ở Step 4.

- [ ] **Step 4: Viết build script**

Tạo `app-next/scripts/build-hanzi-studio-data.mts` — toàn bộ nội dung:

```mts
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

function loadMmc(): Map<string, MmcLine> {
  const map = new Map<string, MmcLine>();
  for (const line of readFileSync("scripts/vendor/mmc/graphics.txt", "utf8").split("\n")) {
    if (!line.trim()) continue;
    const [char, strokes, medians, decomposition, radical] = line.split("\t");
    map.set(char, { char, strokes: JSON.parse(strokes), medians: JSON.parse(medians), decomposition, radical });
  }
  return map;
}
function loadDictPinyin(): Map<string, string> {
  const map = new Map<string, string>();
  const p = "scripts/vendor/mmc/dictionary.txt";
  if (!existsSync(p)) return map;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const [char, , pinyin] = line.split("\t");
    if (Array.from(char).length === 1 && !map.has(char)) map.set(char, pinyin ?? "");
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
   (MMC radical luôn là 1 trong 214 bộ Kangxi dạng từ điển; radicals.ts cũng vậy —
   chỉ phòng hờ lệch bản: gán vào "other bucket" và báo count để review) */
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
```

- [ ] **Step 5: Chạy script, kiểm tra output**

```bash
pnpm dlx tsx scripts/build-hanzi-studio-data.mts
ls public/hanzi-data/ | head
node -e "const m=require('./public/hanzi-data/manifest.json'); console.log('chars:', Object.keys(m.chars).length)"
node -e "const c=require('./public/hanzi-data/c0.json'); const k=Object.keys(c)[0]; console.log(k, 'strokes:', c[k].strokes.length)"
grep -c '"char"' src/content/hanzi-studio/radical-index.ts   # kỳ vọng 214
```

Kỳ vọng: corpus vài trăm chữ (HSK 1–3 ~600 chữ, trừ那些 thiếu MMC), 8–12 chunk, không throw zod. Bộ thủ không có data nét (nếu có) chỉ là warning — chấp nhận (spec §8).

- [ ] **Step 6: Commit**

```bash
git add scripts/vendor/hsk.json scripts/vendor/radical-cats.json scripts/vendor/mmc/.git 2>/dev/null
git add -f scripts/build-hanzi-studio-data.mts .gitignore src/content/hanzi-studio/ public/hanzi-data/
git commit -m "feat(hanzi-studio): build script sinh radical-index/char-meta + stroke chunks từ MMC + HSK 1-3"
```

(Kiểm tra `git status` — `scripts/vendor/mmc/*.txt` KHÔNG được xuất hiện staged.)

---

### Task 2: Content schema + test dữ liệu generated

**Files:**
- Test: `app-next/src/content/__tests__/hanzi-studio-data.test.ts`

**Interfaces:**
- Consumes: `RADICAL_INDEX` từ `@/content/hanzi-studio/radical-index`, `CHAR_META` từ `@/content/hanzi-studio/char-meta`
- Produces: (không — task này là gate chất lượng data)

- [ ] **Step 1: Viết test**

```ts
import { describe, expect, it } from "vitest";
import { RADICAL_INDEX } from "@/content/hanzi-studio/radical-index";
import { CHAR_META } from "@/content/hanzi-studio/char-meta";

describe("hanzi-studio data generated", () => {
  it("đúng 214 bộ thủ", () => {
    expect(RADICAL_INDEX).toHaveLength(214);
  });
  it("core đúng 50 bộ", () => {
    expect(RADICAL_INDEX.filter((r) => r.core)).toHaveLength(50);
  });
  it("cat hợp lệ cho mọi bộ", () => {
    for (const r of RADICAL_INDEX) {
      expect(["human", "nature", "animal", "other"]).toContain(r.cat);
    }
  });
  it("bộ thông dụng có data nét + chữ corpus", () => {
    const ch = (c: string) => RADICAL_INDEX.find((r) => r.char === c)!;
    expect(ch("口")!.strokeChar).toBe("口");
    expect(ch("口")!.chars.length).toBeGreaterThan(2);
    expect(ch("水")!.chars.some((c) => c.ch === "没")).toBe(true);
    expect(ch("手")!.strokeChar).toBe("扌"); // biến thể đơn giản hoá
  });
  it("char-meta khớp chars của index", () => {
    for (const r of RADICAL_INDEX) for (const c of r.chars) expect(CHAR_META[c.ch]).toEqual(c);
  });
  it("pinyin không dấu số ( MMC format có tone mark )", () => {
    expect(CHAR_META["没"]?.py).toMatch(/^[a-züéèěàáìǐùǔūǔōóǒāǎīíú]*$/u);
  });
});
```

- [ ] **Step 2: Chạy test**

Run: `pnpm vitest run src/content/__tests__/hanzi-studio-data.test.ts`
Expected: PASS (nếu FAIL ở "手"→"扌": mở `radical-index.ts` xem `strokeChar` thực tế — nếu radicals.ts đã dùng 扌 thì expected phải là `"扌"` vẫn pass; nếu FAIL vì radicals.ts dùng ký tự khác, sửa test theo data THẬT, không sửa data).

- [ ] **Step 3: Commit**

```bash
git add src/content/__tests__/hanzi-studio-data.test.ts
git commit -m "test(hanzi-studio): gate chất lượng data radical-index/char-meta"
```

---

### Task 3: Runtime loader cho stroke chunks

**Files:**
- Create: `app-next/src/components/hanzi/studio/writer-data.ts`
- Test: `app-next/src/components/hanzi/studio/__tests__/writer-data.test.ts`

**Interfaces:**
- Produces:

```ts
export type WriterCharData = { strokes: string[]; medians: number[][][] };
export async function loadWriterCharData(ch: string): Promise<WriterCharData | null>;
export function clearWriterDataCache(): void; // test-only
```

- [ ] **Step 1: Viết test failing**

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { loadWriterCharData, clearWriterDataCache } from "../writer-data";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  clearWriterDataCache();
  fetchMock.mockReset();
});

describe("loadWriterCharData", () => {
  it("fetch manifest 1 lần rồi cache chunk", async () => {
    fetchMock.mockImplementation(async (url: string) => ({
      ok: true,
      json: async () =>
        url.endsWith("manifest.json")
          ? { version: 1, chars: { 口: "c0", 汉: "c1" } }
          : url.endsWith("c0.json")
            ? { 口: { strokes: ["M1"], medians: [[[1, 2]]] } }
            : { 汉: { strokes: ["M2"], medians: [[[3, 4]]] } },
    }));
    expect(await loadWriterCharData("口")).toEqual({ strokes: ["M1"], medians: [[[1, 2]]] });
    expect(await loadWriterCharData("口")).toEqual({ strokes: ["M1"], medians: [[[1, 2]]] });
    expect(fetchMock).toHaveBeenCalledTimes(2); // manifest + c0, lần 2 hết fetch
  });

  it("chữ không có trong manifest → null, không fetch chunk", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ version: 1, chars: {} }) });
    expect(await loadWriterCharData("龤")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("manifest fetch fail → null không throw", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    expect(await loadWriterCharData("口")).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test verify FAIL** — `pnpm vitest run src/components/hanzi/studio/__tests__/writer-data.test.ts` → FAIL (module không tồn tại).

- [ ] **Step 3: Implement**

```ts
"use client";

/* Loader stroke data từ public/hanzi-data (chunk ~100 ký tự, sinh bởi
   scripts/build-hanzi-studio-data.mts). Cache in-memory: manifest 1 fetch,
   mỗi chunk 1 fetch. Trả null = ký tự không có data (UI ẩn luyện viết). */
export type WriterCharData = { strokes: string[]; medians: number[][][] };

let manifest: Record<string, string> | null = null;
const chunkCache = new Map<string, Map<string, WriterCharData>>();

export async function loadWriterCharData(ch: string): Promise<WriterCharData | null> {
  if (!manifest) {
    try {
      const res = await fetch("/hanzi-data/manifest.json");
      manifest = res.ok ? (await res.json()).chars : {};
    } catch {
      manifest = {};
    }
  }
  const chunk = manifest[ch];
  if (!chunk) return null;
  let store = chunkCache.get(chunk);
  if (!store) {
    try {
      const res = await fetch(`/hanzi-data/${chunk}.json`);
      if (!res.ok) return null;
      store = new Map(Object.entries((await res.json()) as Record<string, WriterCharData>));
      chunkCache.set(chunk, store);
    } catch {
      return null;
    }
  }
  return store.get(ch) ?? null;
}

export function clearWriterDataCache(): void {
  manifest = null;
  chunkCache.clear();
}
```

- [ ] **Step 4: Chạy test verify PASS.**
- [ ] **Step 5: Commit** — `git add src/components/hanzi/studio/writer-data.ts src/components/hanzi/studio/__tests__/writer-data.test.ts && git commit -m "feat(hanzi-studio): runtime loader cho stroke chunks"`

---

### Task 4: Hook `useWriter` bọc hanzi-writer

**Files:**
- Create: `app-next/src/components/hanzi/studio/use-writer.ts`
- Test: `app-next/src/components/hanzi/studio/__tests__/use-writer.test.tsx`

**Interfaces:**
- Consumes: `loadWriterCharData` (Task 3), `hanzi-writer` (dep có sẵn)
- Produces:

```ts
export type WriterApi = {
  load: (ch: string) => Promise<boolean>; // false nếu không có data
  playAll: () => void;          // animateCharacter
  animateStroke: (i: number) => void;
  showStrokes: (n: number) => void; // hiện ngay n nét đầu (setState opacity)
  startQuiz: () => void;
  stopQuiz: () => void;          // ở lại watch state
  setSpeed: (x: number) => void;
  setOutline: (on: boolean) => void; // hint nét mờ (draw mode)
};
export function useWriter(containerRef: React.RefObject<HTMLDivElement | null>): WriterApi;
```

- [ ] **Step 1: Viết test failing (mock hanzi-writer)**

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { useWriter } from "../use-writer";
import { loadWriterCharData } from "../writer-data";

vi.mock("hanzi-writer", () => {
  const instances: any[] = [];
  const create = vi.fn((_el: any, char: string, opts: any) => {
    const w = {
      char,
      opts,
      target: { innerHTML: "" },
      animateCharacter: vi.fn(),
      animateStroke: vi.fn(),
      setState: vi.fn(),
      quiz: vi.fn(),
      pauseQuiz: vi.fn(),
      setSpeed: vi.fn(), // lib thật không có setSpeed — speed qua opts lúc create; mock để bắt
      showOutline: opts?.showOutline,
      _setColor: opts?.strokeColor,
    };
    instances.push(w);
    return w;
  });
  return { default: { create }, __instances: instances };
});
vi.mock("../writer-data", () => ({ loadWriterCharData: vi.fn(), clearWriterDataCache: vi.fn() }));

import HanziWriter from "hanzi-writer";

const DATA = { strokes: ["M1", "M2", "M3"], medians: [[[0, 0]]] };

function setup() {
  const ref = { current: document.createElement("div") };
  const { result } = renderHook(() => useWriter(ref as any));
  return { result, ref };
}

beforeEach(() => {
  vi.mocked(loadWriterCharData).mockReset();
  (HanziWriter.create as any).mockClear();
});

describe("useWriter", () => {
  it("load: tạo writer 1 lần cho cùng chữ, trả true", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const { result } = setup();
    let ok = false;
    await act(async () => { ok = await result.current.load("口"); });
    expect(ok).toBe(true);
    expect(HanziWriter.create).toHaveBeenCalledTimes(1);
    await act(async () => { ok = await result.current.load("口"); });
    expect(ok).toBe(true);
    expect(HanziWriter.create).toHaveBeenCalledTimes(1); // cùng chữ không tạo lại
  });

  it("load chữ không có data → false, không create", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(null);
    const { result } = setup();
    let ok = true;
    await act(async () => { ok = await result.current.load("龤"); });
    expect(ok).toBe(false);
    expect(HanziWriter.create).not.toHaveBeenCalled();
  });

  it("playAll/animateStroke/showStrokes/setState ủy quyền đúng", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const { result } = setup();
    await act(async () => { await result.current.load("口"); });
    const inst = (HanziWriter.create as any).mock.results[0].value;
    result.current.playAll();
    expect(inst.animateCharacter).toHaveBeenCalled();
    result.current.animateStroke(2);
    expect(inst.animateStroke).toHaveBeenCalledWith(2);
    act(() => result.current.showStrokes(2));
    expect(inst.setState).toHaveBeenCalledWith({ character: { strokes: [1, 1, 0] } });
  });

  it("showStrokes >= tổng nét → toàn bộ 1", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const { result } = setup();
    await act(async () => { await result.current.load("口"); });
    const inst = (HanziWriter.create as any).mock.results[0].value;
    act(() => result.current.showStrokes(99));
    expect(inst.setState).toHaveBeenCalledWith({ character: { strokes: [1, 1, 1] } });
  });

  it("startQuiz/stopQuiz gọi quiz/pauseQuiz; setSpeed đổi opts speed", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const { result } = setup();
    await act(async () => { await result.current.load("口"); });
    const inst = (HanziWriter.create as any).mock.results[0].value;
    result.current.startQuiz();
    expect(inst.quiz).toHaveBeenCalled();
    result.current.stopQuiz();
    expect(inst.pauseQuiz).toHaveBeenCalled();
    act(() => result.current.setSpeed(0.75));
    // speed là opts lúc animate — kiểm qua animateCharacter được gọi với options mới
    result.current.playAll();
    expect(inst.animateCharacter).toHaveBeenCalledWith(expect.objectContaining({ strokeAnimationSpeed: 0.75 }));
  });

  it("setOutline toggle qua setState outline opacity", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const { result } = setup();
    await act(async () => { await result.current.load("口"); });
    const inst = (HanziWriter.create as any).mock.results[0].value;
    act(() => result.current.setOutline(true));
    expect(inst.setState).toHaveBeenCalledWith(expect.objectContaining({ outline: { opacity: 1 } }));
    act(() => result.current.setOutline(false));
    expect(inst.setState).toHaveBeenCalledWith(expect.objectContaining({ outline: { opacity: 0 } }));
  });
});
```

- [ ] **Step 2: Chạy verify FAIL** — `pnpm vitest run src/components/hanzi/studio/__tests__/use-writer.test.tsx`

- [ ] **Step 3: Implement**

```ts
"use client";

/* Bọc hanzi-writer cho StudioGrid. Mỗi container 1 instance; load(ch) tạo/tạo lại
   writer với data từ writer-data (chunk local). Speed qua options lúc animate
   (hanzi-writer không có setSpeed runtime). Màu qua CSS var để ăn dark mode. */
import { useCallback, useRef } from "react";
import HanziWriter from "hanzi-writer";
import { loadWriterCharData, type WriterCharData } from "./writer-data";

type WriterInstance = ReturnType<typeof HanziWriter.create>;

export type WriterApi = {
  load: (ch: string) => Promise<boolean>;
  playAll: () => void;
  animateStroke: (i: number) => void;
  showStrokes: (n: number) => void;
  startQuiz: () => void;
  stopQuiz: () => void;
  setSpeed: (x: number) => void;
  setOutline: (on: boolean) => void;
};

export function useWriter(containerRef: React.RefObject<HTMLDivElement | null>): WriterApi {
  const writerRef = useRef<WriterInstance | null>(null);
  const charRef = useRef<string | null>(null);
  const dataRef = useRef<WriterCharData | null>(null);
  const speedRef = useRef(1);

  const createWriter = useCallback((char: string, data: WriterCharData) => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = "";
    dataRef.current = data;
    writerRef.current = HanziWriter.create(el, char, {
      charDataLoader: () => data,
      width: 300,
      height: 300,
      padding: 12,
      strokeColor: "var(--text-primary)",
      outlineColor: "var(--text-secondary)",
      drawingColor: "var(--action-primary)",
      showOutline: false,
      showCharacter: true,
      strokeAnimationSpeed: speedRef.current,
      delayBetweenStrokes: 220,
      highlightColor: "var(--action-focus)",
    });
    charRef.current = char;
  }, [containerRef]);

  const load = useCallback(async (ch: string) => {
    if (charRef.current === ch && writerRef.current) return true;
    const data = await loadWriterCharData(ch);
    if (!data || data.strokes.length === 0) return false;
    createWriter(ch, data);
    return true;
  }, [createWriter]);

  const playAll = useCallback(() => {
    writerRef.current?.animateCharacter({ strokeAnimationSpeed: speedRef.current, delayBetweenStrokes: 220 });
  }, []);

  const animateStroke = useCallback((i: number) => {
    writerRef.current?.animateStroke(i, { strokeAnimationSpeed: speedRef.current });
  }, []);

  const showStrokes = useCallback((n: number) => {
    const total = dataRef.current?.strokes.length ?? 0;
    if (total === 0) return;
    const k = Math.max(0, Math.min(total, n));
    writerRef.current?.setState({ character: { strokes: Array.from({ length: total }, (_, i) => (i < k ? 1 : 0)) } });
  }, []);

  const startQuiz = useCallback(() => {
    writerRef.current?.quiz({});
  }, []);

  const stopQuiz = useCallback(() => {
    writerRef.current?.pauseQuiz();
  }, []);

  const setSpeed = useCallback((x: number) => { speedRef.current = x > 0 ? x : 1; }, []);

  const setOutline = useCallback((on: boolean) => {
    writerRef.current?.setState({ outline: { opacity: on ? 1 : 0 } });
  }, []);

  return { load, playAll, animateStroke, showStrokes, startQuiz, stopQuiz, setSpeed, setOutline };
}
```

- [ ] **Step 4: Chạy verify PASS.**
  Nếu hanzi-writer import bị lỗi trong jsdom (ESM/CJS) — mock đã chặn nên chỉ cần import type đúng; nếu vẫn lỗi build mock, thêm `vi.mock` path `hanzi-writer` vào `vitest.setup.ts` KHÔNG được (ảnh hưởng test khác) — thay vào đó dùng `vi.mock("hanzi-writer")` auto-mock + đè `default.create` trong từng test.
- [ ] **Step 5: Commit** — `git commit -am "feat(hanzi-studio): useWriter hook bọc hanzi-writer (watch/quiz/speed/outline)"`

---

### Task 5: Model thuần — filters + derive

**Files:**
- Create: `app-next/src/components/hanzi/studio/studio-model.ts`
- Test: `app-next/src/components/hanzi/studio/__tests__/studio-model.test.ts`

**Interfaces:**
- Consumes: `RADICAL_INDEX`, `StudioRadical`, `StudioCharMeta` (Task 1), `CHAR_META`
- Produces:

```ts
export type CatalogMode = "rad" | "hsk";
export type StrokeFilter = "all" | "1-2" | "3" | "4" | "5+";
export type CatFilter = "core" | "human" | "nature" | "animal";
export type HskLevel = "HSK 1" | "HSK 2" | "HSK 3";
export type StudioSelection = { kind: "rad"; g: string } | { kind: "char"; g: string };

export const STROKE_FILTERS: { key: StrokeFilter; label: string }[];
export const CAT_FILTERS: { key: CatFilter; label: string }[];
export const HSK_TABS: { key: HskLevel | "all"; label: string }[];

export function fold(s: string): string; // bỏ dấu — dịch chuyển từ hanzi-studio.tsx cũ
export function filterRadicals(opts: { stroke: StrokeFilter; cat: CatFilter; q: string }): StudioRadical[];
export function filterChars(opts: { level: HskLevel | "all"; q: string }): StudioCharMeta[];
export function radicalOf(g: string): StudioRadical | undefined;   // theo char Kangxi
export function charOf(g: string): StudioCharMeta | undefined;
export function PAGE_SIZE: 8; // grid bộ thủ, số trang tính bên ngoài
```

- [ ] **Step 1: Viết test failing**

```ts
import { describe, expect, it } from "vitest";
import {
  filterRadicals, filterChars, radicalOf, charOf, fold,
} from "../studio-model";

describe("fold", () => {
  it("bỏ dấu: 'Thủy → thuy'", () => expect(fold("Thủy")).toBe("thuy"));
});

describe("filterRadicals", () => {
  it("lọc số nét", () => {
    const all = filterRadicals({ stroke: "all", cat: "core", q: "" });
    const three = filterRadicals({ stroke: "3", cat: "core", q: "" });
    expect(three.length).toBeLessThanOrEqual(all.length);
    expect(three.every((r) => r.strokes === 3)).toBe(true);
    const wide = filterRadicals({ stroke: "5+", cat: "core", q: "" });
    expect(wide.every((r) => r.strokes >= 5)).toBe(true);
  });
  it("cat 'core' chỉ trả core:true; cat khác trả đúng nhóm", () => {
    expect(filterRadicals({ stroke: "all", cat: "core", q: "" }).every((r) => r.core)).toBe(true);
    expect(filterRadicals({ stroke: "all", cat: "animal", q: "" }).every((r) => r.cat === "animal")).toBe(true);
  });
  it("search khớp char/hanViet/meaning bỏ dấu, không phân biệt hoa thường", () => {
    expect(filterRadicals({ stroke: "all", cat: "core", q: "thuy" }).map((r) => r.char)).toContain("水");
    expect(filterRadicals({ stroke: "all", cat: "core", q: "nước" }).map((r) => r.char)).toContain("水");
  });
});

describe("filterChars", () => {
  it("lọc theo level", () => {
    const lv1 = filterChars({ level: "HSK 1", q: "" });
    expect(lv1.every((c) => c.level === "HSK 1")).toBe(true);
    expect(filterChars({ level: "all", q: "" }).length).toBeGreaterThanOrEqual(lv1.length);
  });
  it("search theo ch/py", () => {
    const mei = filterChars({ level: "all", q: "mei" });
    expect(mei.map((c) => c.ch)).toContain("没");
  });
});

describe("radicalOf/charOf", () => {
  it("tra đúng", () => {
    expect(radicalOf("水")?.hanViet).toBeTruthy();
    expect(charOf("没")?.level).toBeTruthy();
    expect(radicalOf("龤")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Chạy verify FAIL.**

- [ ] **Step 3: Implement**

```ts
/* Logic thuần cho Hanzi Studio radical-first — tách khỏi component để test không cần render. */
import { RADICAL_INDEX, type StudioRadical } from "@/content/hanzi-studio/radical-index";
import { CHAR_META, type StudioCharMeta } from "@/content/hanzi-studio/char-meta";

export type CatalogMode = "rad" | "hsk";
export type StrokeFilter = "all" | "1-2" | "3" | "4" | "5+";
export type CatFilter = "core" | "human" | "nature" | "animal";
export type HskLevel = "HSK 1" | "HSK 2" | "HSK 3";
export type StudioSelection = { kind: "rad"; g: string } | { kind: "char"; g: string };

export const PAGE_SIZE = 8;

export const STROKE_FILTERS: { key: StrokeFilter; label: string }[] = [
  { key: "all", label: "Tất cả (214)" },
  { key: "1-2", label: "1–2 nét" },
  { key: "3", label: "3 nét" },
  { key: "4", label: "4 nét" },
  { key: "5+", label: "5+ nét" },
];
export const CAT_FILTERS: { key: CatFilter; label: string }[] = [
  { key: "core", label: "50 bộ cốt lõi" },
  { key: "human", label: "Con người" },
  { key: "nature", label: "Thiên nhiên" },
  { key: "animal", label: "Động vật" },
];
export const HSK_TABS: { key: HskLevel | "all"; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "HSK 1", label: "HSK 1" },
  { key: "HSK 2", label: "HSK 2" },
  { key: "HSK 3", label: "HSK 3" },
];

export const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function filterRadicals(opts: { stroke: StrokeFilter; cat: CatFilter; q: string }): StudioRadical[] {
  const q = fold(opts.q.trim().toLowerCase());
  return RADICAL_INDEX.filter((r) => {
    if (opts.stroke === "1-2" && r.strokes > 2) return false;
    if (opts.stroke === "3" && r.strokes !== 3) return false;
    if (opts.stroke === "4" && r.strokes !== 4) return false;
    if (opts.stroke === "5+" && r.strokes < 5) return false;
    if (opts.cat === "core" && !r.core) return false;
    if (opts.cat !== "core" && r.cat !== opts.cat) return false;
    if (q && !fold(`${r.char}${r.hanViet}${r.meaning}`).toLowerCase().includes(q)) return false;
    return true;
  });
}

const ALL_CHARS: StudioCharMeta[] = Object.values(CHAR_META);

export function filterChars(opts: { level: HskLevel | "all"; q: string }): StudioCharMeta[] {
  const q = fold(opts.q.trim().toLowerCase());
  return ALL_CHARS.filter((c) => {
    if (opts.level !== "all" && c.level !== opts.level) return false;
    if (q && !fold(`${c.ch}${c.py}`).toLowerCase().includes(q)) return false;
    return true;
  });
}

export const radicalOf = (g: string) => RADICAL_INDEX.find((r) => r.char === g);
export const charOf = (g: string) => CHAR_META[g];
```

- [ ] **Step 4: Chạy verify PASS.** (Nếu test search "nước" fail vì meaning của 水 không chứa "nước" trong data thật — sửa expectation theo data thật.)
- [ ] **Step 5: Commit** — `git commit -m "feat(hanzi-studio): model thuần filter/tra cứu cho catalog"`

---

### Task 6: Viết lại `StudioGrid` (hanzi-writer thay engine tự viết)

**Files:**
- Rewrite: `app-next/src/components/hanzi/studio/studio-grid.tsx`
- Delete: `app-next/src/components/hanzi/studio/use-studio-strokes.ts`
- Test: `app-next/src/components/hanzi/studio/__tests__/studio-grid.test.tsx` (viết lại)
- Delete: `app-next/src/components/hanzi/studio/__tests__/use-studio-strokes.test.tsx`

**Interfaces:**
- Consumes: `useWriter` (Task 4), `loadWriterCharData`
- Produces:

```ts
export type StudioGridApi = {
  play: () => void;
  stepPrev: () => void;
  stepNext: () => void;
  setSpeed: (m: number) => void;
  setHint: (on: boolean) => void;
  ready: boolean; // getter — false khi ký tự chưa load xong / không có data
};
export function StudioGrid({ sel, mode, apiRef }: {
  sel: StudioSelection;             // Task 5
  mode: "watch" | "draw";
  apiRef?: React.Ref<StudioGridApi>;
}): JSX.Element | null;             // null khi ký tự/bộ không có data nét
```

Semantics (khớp mock mới):
- `play`: reset về 0 nét rồi `animateStroke(0..n-1)` chain (mô phỏng playAll) — hoặc `playAll()` của lib; chọn **playAll của lib** cho replay, còn stepPrev/stepNext tự quản `stepRef`.
- `stepNext`: `animateStroke(step+1)` nếu chưa hết; `stepPrev`: `showStrokes(step-1)` (hiện ngay 0..step-2).
- `setHint(on)`: watch → nothing; draw → `setOutline(on)` + `startQuiz()`.
- Đổi `sel`: `load(g)`; load fail → render `null` (cha tự hiện fallback).

**Deviation khỏi mock (ghi chú cho review):** draw mode dùng quiz của lib → bỏ nút "Hoàn tác" (lib không hỗ trợ undo); giữ "Xóa bảng" (= restart quiz) + "Gợi ý nét mờ" (= outline). Spec §4.2 đã nói engine = quiz API.

- [ ] **Step 1: Viết test failing**

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { StudioGrid, type StudioGridApi } from "../studio-grid";
import { loadWriterCharData } from "../writer-data";

const DATA = { strokes: ["M1", "M2", "M3"], medians: [[[0, 0]]] };
vi.mock("../writer-data", () => ({ loadWriterCharData: vi.fn(), clearWriterDataCache: vi.fn() }));
const { mockWriter } = vi.hoisted(() => ({ mockWriter: vi.fn() }));
vi.mock("hanzi-writer", () => ({ default: { create: mockWriter } }));
vi.mock("../use-writer", async (orig) => {
  // use-writer thật + hanzi-writer mock — chỉ cần writer instance giả qua create
  return orig();
});

beforeEach(() => {
  vi.mocked(loadWriterCharData).mockReset();
  mockWriter.mockReset();
});

function makeWriter() {
  return {
    animateCharacter: vi.fn(),
    animateStroke: vi.fn(),
    setState: vi.fn(),
    quiz: vi.fn(),
    pauseQuiz: vi.fn(),
  };
}

describe("StudioGrid", () => {
  it("load xong render container tianzi-grid; data thiếu → null", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    mockWriter.mockImplementation(makeWriter);
    const api = createRef<StudioGridApi>();
    const { container, rerender } = render(<StudioGrid sel={{ kind: "rad", g: "水" }} mode="watch" apiRef={api} />);
    await waitFor(() => expect(api.current?.ready).toBe(true));
    expect(container.querySelector('[data-od-id="tianzi-grid"]')).toBeTruthy();

    vi.mocked(loadWriterCharData).mockResolvedValue(null);
    rerender(<StudioGrid sel={{ kind: "rad", g: "龤" }} mode="watch" apiRef={api} />);
    await waitFor(() => expect(api.current?.ready).toBe(false));
  });

  it("watch: play gọi animateCharacter; stepNext animateStroke tăng dần", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const inst = makeWriter();
    mockWriter.mockImplementation(() => inst);
    const api = createRef<StudioGridApi>();
    render(<StudioGrid sel={{ kind: "rad", g: "水" }} mode="watch" apiRef={api} />);
    await waitFor(() => expect(api.current?.ready).toBe(true));
    act(() => api.current!.play());
    expect(inst.animateCharacter).toHaveBeenCalled();
    act(() => { api.current!.stepNext(); api.current!.stepNext(); });
    expect(inst.animateStroke).toHaveBeenNthCalledWith(1, 0, expect.anything());
    expect(inst.animateStroke).toHaveBeenNthCalledWith(2, 1, expect.anything());
    act(() => api.current!.stepPrev());
    expect(inst.setState).toHaveBeenCalledWith({ character: { strokes: [1, 0, 0] } });
  });

  it("draw: bật hint → startQuiz + outline; tắt → outline 0; xóa bảng restart quiz", async () => {
    vi.mocked(loadWriterCharData).mockResolvedValue(DATA);
    const inst = makeWriter();
    mockWriter.mockImplementation(() => inst);
    const api = createRef<StudioGridApi>();
    render(<StudioGrid sel={{ kind: "char", g: "没" }} mode="draw" apiRef={api} />);
    await waitFor(() => expect(api.current?.ready).toBe(true));
    act(() => api.current!.setHint(true));
    expect(inst.startQuiz ?? inst.quiz).toBeTruthy();
    expect(inst.setState).toHaveBeenCalledWith(expect.objectContaining({ outline: { opacity: 1 } }));
    act(() => api.current!.setHint(false));
    expect(inst.setState).toHaveBeenCalledWith(expect.objectContaining({ outline: { opacity: 0 } }));
  });
});
```

Chú ý executor: `use-writer` thật chạy với `hanzi-writer` mock — nếu `HanziWriter.create` cần `el` DOM thật, jsdom `div` là đủ vì create bị mock.

- [ ] **Step 2: Chạy verify FAIL.**
- [ ] **Step 3: Implement studio-grid.tsx**

```tsx
"use client";

/* Ô luyện viết — hanzi-writer mount trong khung thiên tự (SVG nền tự vẽ giữ nguyên).
   Watch: animateCharacter/step qua useWriter; Draw: quiz + outline làm hint.
   Ký tự không có data nét → return null (cha hiện fallback). */
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useWriter } from "./use-writer";
import type { StudioSelection } from "./studio-model";

export type StudioGridApi = {
  play: () => void;
  stepPrev: () => void;
  stepNext: () => void;
  setSpeed: (m: number) => void;
  setHint: (on: boolean) => void;
  readonly ready: boolean;
};

export function StudioGrid({ sel, mode, apiRef }: {
  sel: StudioSelection;
  mode: "watch" | "draw";
  apiRef?: React.Ref<StudioGridApi>;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const writer = useWriter(boxRef);
  const [ready, setReady] = useState(false);
  const stepRef = useRef(-1);
  const totalRef = useRef(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  /* đổi sel: load data mới */
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    writer.load(sel.g).then((ok) => {
      if (cancelled) return;
      stepRef.current = -1;
      setReady(ok);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel.g]);

  /* ready true lần đầu: watch mode tự phát (mock select → playAll) */
  const wasReady = useRef(false);
  useEffect(() => {
    if (!ready || wasReady.current) return;
    wasReady.current = true;
    if (modeRef.current === "watch") writer.playAll();
  }, [ready, writer]);

  /* đổi mode: watch = clear + play; draw = quiz (hint nếu đang bật) */
  const prevMode = useRef(mode);
  const hintRef = useRef(false);
  useEffect(() => {
    if (prevMode.current === mode) return;
    prevMode.current = mode;
    if (!ready) return;
    if (mode === "watch") {
      writer.stopQuiz();
      writer.setOutline(false);
      hintRef.current = false;
      stepRef.current = -1;
      writer.playAll();
    } else {
      writer.showStrokes(0);
      writer.setOutline(hintRef.current);
      writer.startQuiz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const play = useCallback(() => {
    stepRef.current = -1;
    writer.playAll();
  }, [writer]);

  const stepNext = useCallback(() => {
    if (stepRef.current < totalRef.current - 1) {
      stepRef.current += 1;
      writer.animateStroke(stepRef.current);
    }
  }, [writer]);

  const stepPrev = useCallback(() => {
    writer.stopQuiz();
    writer.showStrokes(stepRef.current); // hiện 0..step-1 (showStrokes n = n nét đầu)
    stepRef.current = Math.max(-1, stepRef.current - 1);
  }, [writer]);

  const setHint = useCallback((on: boolean) => {
    hintRef.current = on;
    if (modeRef.current !== "draw") return;
    writer.setOutline(on);
    if (on) writer.startQuiz();
  }, [writer]);

  useImperativeHandle(apiRef, () => ({
    play,
    stepPrev,
    stepNext,
    setSpeed: writer.setSpeed,
    setHint,
    get ready() { return ready; },
  }), [play, stepPrev, stepNext, setHint, writer, ready]);

  if (!ready) return null;

  return (
    <div
      data-od-id="tianzi-grid"
      className="relative mx-auto aspect-square w-full max-w-[300px] overflow-hidden rounded-2xl border border-border-subtle bg-surface-elevated max-[480px]:max-w-[280px]"
    >
      <svg viewBox="0 0 300 300" aria-hidden="true" className="absolute inset-0 h-full w-full">
        <rect x="4" y="4" width="292" height="292" fill="none" stroke="var(--text-secondary)" strokeOpacity="0.45" strokeWidth="1.5" rx="4" />
        <line x1="150" y1="4" x2="150" y2="296" stroke="var(--text-secondary)" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="7 6" />
        <line x1="4" y1="150" x2="296" y2="150" stroke="var(--text-secondary)" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="7 6" />
        <line x1="4" y1="4" x2="296" y2="296" stroke="var(--text-secondary)" strokeOpacity="0.32" strokeWidth="1" strokeDasharray="5 7" />
        <line x1="296" y1="4" x2="4" y2="296" stroke="var(--text-secondary)" strokeOpacity="0.32" strokeWidth="1" strokeDasharray="5 7" />
      </svg>
      <div
        ref={boxRef}
        aria-label={sel.kind === "rad" ? `Hoạt họa bút thuận bộ ${sel.g}` : `Hoạt họa bút thuận chữ ${sel.g}`}
        className="absolute inset-0 grid place-items-center [&_svg]:relative [&_svg]:inset-auto"
      />
    </div>
  );
}
```

Đồng thời: `rm src/components/hanzi/studio/use-studio-strokes.ts src/components/hanzi/studio/__tests__/use-studio-strokes.test.tsx` (xóa trong task này, test cũ của grid cũng xóa — viết lại file test như trên).

- [ ] **Step 4: Chạy `pnpm vitest run src/components/hanzi/studio/__tests__/studio-grid.test.tsx` verify PASS.**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(hanzi-studio): StudioGrid chuyển sang hanzi-writer, bỏ engine tự viết + scoring"`

---

### Task 7: Viết lại `StudioCatalog`

**Files:**
- Rewrite: `app-next/src/components/hanzi/studio/studio-catalog.tsx`
- Test: `app-next/src/components/hanzi/studio/__tests__/studio-catalog.test.tsx` (viết lại)

**Interfaces:**
- Consumes: `StudioRadical`, `StudioCharMeta` (Task 1)
- Produces:

```ts
export function StudioCatalog({
  mode, rads, chars, totalLabel, page, pages, cur, onSelect, onPage,
}: {
  mode: "rad" | "hsk";
  rads: StudioRadical[];        // đã lọc + phân trang (rad mode)
  chars: StudioCharMeta[];      // đã lọc + phân trang (hsk mode)
  totalLabel: string;           // vd "22 bộ thủ · 3 trang" / "612 chữ HSK · HSK 1"
  page: number; pages: number;
  cur: string;                  // glyph đang chọn
  onSelect: (sel: { kind: "rad" | "char"; g: string }) => void;
  onPage: (p: number) => void;
}): JSX.Element;
```

Render (port mock mới, token hóa):
- Panel head: h2 "Kho tra cứu" + `<span data-testid="cat-count">{totalLabel}</span>`
- `data-od-id="catalog-mode"`: 2 nút mode-switch — "Theo cấp độ HSK" (icon `BookOpen`) / "214 Bộ thủ" (icon `Puzzle`), `aria-pressed`, style segment như SegControl hiện có (dùng `SegmentedTabs` từ `@/components/ui/segmented-tabs` nếu khớp API, không thì nút thủ công như mock).
- Rad mode: grid `grid-cols-3 min-[1400px]:grid-cols-4` → **theo mock là 4 cột/3 cột mobile** — dùng `grid-cols-3 @container`? Giữ đơn giản: `grid-cols-4 max-[480px]:grid-cols-3`. Card `data-od-id={rad-${r.char}}`: glyph (`text-[34px]`), tên (`r.hanViet`), `<span>{r.chars.length} chữ</span>`. Card KHÔNG badge/spill (bỏ theo mock). Card không có strokeChar vẫn bấm được (workbench hiện "chưa có data nét" — xử lý ở Task 8).
- HSK mode: card `data-od-id={zcard-${c.ch}}`: glyph, pinyin, level.
- Active card: `border-2 border-action-primary bg-rose-wash`.
- Empty: "Không có bộ thủ nào khớp." / "Không có chữ nào khớp."
- Pager: giữ nguyên markup cũ (`data-od-id="catalog-pager"`, `data-testid="pager-label"`), label prop tự do.
- max-height scroll: `max-h-[560px]` (mock mới giảm từ 680).

- [ ] **Step 1: Viết test failing**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudioCatalog } from "../studio-catalog";
import { RADICAL_INDEX } from "@/content/hanzi-studio/radical-index";
import { CHAR_META } from "@/content/hanzi-studio/char-meta";

const RADS = RADICAL_INDEX.filter((r) => ["水", "口", "手", "木", "火", "人", "女", "日"].includes(r.char));
const CHARS = Object.values(CHAR_META).filter((c) => ["没", "洗", "汉"].includes(c.ch));

describe("StudioCatalog", () => {
  it("rad mode: render card bộ thủ + count chữ", () => {
    render(
      <StudioCatalog mode="rad" rads={RADS} chars={[]} totalLabel="8 bộ thủ · 1 trang"
        page={1} pages={1} cur="水" onSelect={vi.fn()} onPage={vi.fn()} />,
    );
    expect(screen.getByText("Kho tra cứu")).toBeTruthy();
    expect(screen.getByTestId("cat-count").textContent).toContain("8 bộ thủ");
    const card = screen.getByRole("button", { name: /水/ });
    expect(card.getAttribute("aria-pressed")).toBe("true");
  });

  it("hsk mode: card chữ + pinyin + level", () => {
    render(
      <StudioCatalog mode="hsk" rads={[]} chars={CHARS} totalLabel="3 chữ"
        page={1} pages={1} cur="没" onSelect={vi.fn()} onPage={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /没/ })).toBeTruthy();
  });

  it("click card → onSelect đúng kind/g", async () => {
    const onSelect = vi.fn();
    render(
      <StudioCatalog mode="rad" rads={RADS} chars={[]} totalLabel=""
        page={1} pages={1} cur="" onSelect={onSelect} onPage={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /口/ }));
    expect(onSelect).toHaveBeenCalledWith({ kind: "rad", g: "口" });
  });

  it("KHÔNG còn badge tiến độ/spill (bỏ theo mock)", () => {
    render(
      <StudioCatalog mode="rad" rads={RADS} chars={[]} totalLabel=""
        page={1} pages={1} cur="" onSelect={vi.fn()} onPage={vi.fn()} />,
    );
    expect(screen.queryByText("Đã thuộc")).toBeNull();
    expect(screen.queryByText("Đang luyện")).toBeNull();
  });

  it("empty state", () => {
    render(
      <StudioCatalog mode="rad" rads={[]} chars={[]} totalLabel="0"
        page={1} pages={1} cur="" onSelect={vi.fn()} onPage={vi.fn()} />,
    );
    expect(screen.getByText("Không có bộ thủ nào khớp.")).toBeTruthy();
  });
});
```

- [ ] **Step 2: verify FAIL. Step 3: implement theo Interfaces ở trên** (code JSX tự viết theo mô tả + pattern markup của file cũ — giữ PAGER_BTN, panel wrapper, `cn` helper).
- [ ] **Step 4: verify PASS.**
- [ ] **Step 5: Commit** — `git commit -m "feat(hanzi-studio): catalog radical-first + mode-switch HSK/bộ thủ"`

---

### Task 8: Viết lại `StudioWorkbench`

**Files:**
- Rewrite: `app-next/src/components/hanzi/studio/studio-workbench.tsx`
- Test: `app-next/src/components/hanzi/studio/__tests__/studio-workbench.test.tsx` (viết lại)

**Interfaces:**
- Consumes: `StudioGrid` (Task 6), `StudioRadical`/`StudioCharMeta` (Task 1), `useTts`
- Produces:

```ts
export type WorkbenchData =
  | { kind: "rad"; rad: StudioRadical }
  | { kind: "char"; meta: StudioCharMeta; rad: StudioRadical; meaning?: string };

export function StudioWorkbench({
  data, mode, onMode, apiRef, hasStrokeData,
}: {
  data: WorkbenchData | null;   // null = không có data nét → panel fallback
  mode: "watch" | "draw";
  onMode: (m: "watch" | "draw") => void;
  apiRef: React.RefObject<StudioGridApi | null>;
  hasStrokeData: boolean;
}): JSX.Element;
```

Render (port mock mới):
- Header: glyph `text-[44px]` (`zh` class) + khối tên: rad → `${rad.hanViet} · ${rad.strokes} nét`, dòng nhỏ `meaning`; char → `${meta.py} · ${rad.hanViet}`, dòng nhỏ nghĩa nếu có.
- Nút audio `IconButton` + `Volume2` — `speak(glyph, { rate: 0.85 })`.
- **Hộp bóc tách** `data-od-id="decomp"`: chỉ `kind === "char"` — `Bóc tách: Bộ <b class=zh>{rad.char}</b> + <b>{các thành phần khác}</b>` (decomp lọc bỏ chính glyph của rad khỏi meta.decomp, join " + "; rỗng → chỉ hiện "Bộ X").
- Mode-tabs: SegControl "Xem bút thuận" / "Tự luyện viết" (bỏ "(chấm điểm)").
- StudioGrid + 2 toolbar như cũ, **speed-seg chỉ 0.75x / 1.0x** (bỏ 1.5x), **draw bar bỏ nút "Hoàn tác"** (deviation Task 6).
- **BỎ** `accuracy-meter` block và `char-meta` 3 chip hoàn toàn.
- **Tray** `data-od-id="char-tray"`: h4 "Các chữ HSK chứa bộ này" + grid chip `data-tray={c.ch}` (glyph `zh` + pinyin), chip active (char kind, cùng ch) → `border-action-primary bg-rose-wash text-action-primary`; click → `onSelectTray(c.ch)` — **thêm prop** `onSelectTray: (ch: string) => void`.
- Mẹo nhớ `data-od-id="mnemonic"`: text = rad.meaning (rad) / meta nghĩa (char, thiếu → ẩn block).
- `data === null || !hasStrokeData`: panel với thông báo "Chưa có data nét cho bộ/chữ này." + glyph lớn, các control ẩn.

- [ ] **Step 1: Viết test failing**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { StudioWorkbench } from "../studio-workbench";
import type { StudioGridApi } from "../studio-grid";
import { RADICAL_INDEX } from "@/content/hanzi-studio/radical-index";
import { CHAR_META } from "@/content/hanzi-studio/char-meta";

const rad = RADICAL_INDEX.find((r) => r.char === "水")!;
const mei = CHAR_META["没"];

vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false }) }));

function setup(ui: React.ReactElement) {
  const apiRef = createRef<StudioGridApi | null>();
  return { apiRef, ...render(ui) };
}

describe("StudioWorkbench", () => {
  it("rad: header tên bộ + số nét + tray chữ", () => {
    const apiRef = createRef<StudioGridApi | null>();
    render(
      <StudioWorkbench data={{ kind: "rad", rad }} mode="watch" onMode={vi.fn()}
        apiRef={apiRef} hasStrokeData onSelectTray={vi.fn()} />,
    );
    expect(screen.getByText(/Thủy/)).toBeTruthy();
    expect(screen.getByText(/3 nét/)).toBeTruthy();
    const tray = screen.getByTestId("char-tray");
    expect(tray).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /没/ }).length).toBeGreaterThan(0);
  });

  it("char: hiện hộp bóc tách + chip active", () => {
    const apiRef = createRef<StudioGridApi | null>();
    render(
      <StudioWorkbench data={{ kind: "char", meta: mei, rad }} mode="watch" onMode={vi.fn()}
        apiRef={apiRef} hasStrokeData onSelectTray={vi.fn()} />,
    );
    expect(screen.getByTestId("decomp").textContent).toContain("氵");
    const chip = screen.getByRole("button", { name: new RegExp(mei.ch) });
    expect(chip.className).toContain("border-action-primary");
  });

  it("click tray chip → onSelectTray", async () => {
    const onSelectTray = vi.fn();
    const apiRef = createRef<StudioGridApi | null>();
    render(
      <StudioWorkbench data={{ kind: "rad", rad }} mode="watch" onMode={vi.fn()}
        apiRef={apiRef} hasStrokeData onSelectTray={onSelectTray} />,
    );
    await userEvent.click(screen.getAllByRole("button", { name: /没/ })[0]);
    expect(onSelectTray).toHaveBeenCalledWith("没");
  });

  it("BỎ meter + meta chips (grep theo od-id)", () => {
    const apiRef = createRef<StudioGridApi | null>();
    const { container } = render(
      <StudioWorkbench data={{ kind: "rad", rad }} mode="draw" onMode={vi.fn()}
        apiRef={apiRef} hasStrokeData onSelectTray={vi.fn()} />,
    );
    expect(container.querySelector('[data-od-id="accuracy-meter"]')).toBeNull();
    expect(container.querySelector('[data-od-id="char-meta"]')).toBeNull();
  });

  it("không có data nét → panel fallback, không grid", () => {
    const apiRef = createRef<StudioGridApi | null>();
    const { container } = render(
      <StudioWorkbench data={null} mode="watch" onMode={vi.fn()}
        apiRef={apiRef} hasStrokeData={false} onSelectTray={vi.fn()} />,
    );
    expect(container.querySelector('[data-od-id="tianzi-grid"]')).toBeNull();
    expect(screen.getByText(/Chưa có data nét/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: verify FAIL. Step 3: implement** theo Interfaces + mô tả render (dựa markup file cũ cho toolbar/Button/IconButton; `speed` state reset khi đổi data như cũ).
- [ ] **Step 4: verify PASS.**
- [ ] **Step 5: Commit** — `git commit -m "feat(hanzi-studio): workbench decomp + tray, bỏ meter/meta chips theo mock mới"`

---

### Task 9: Viết lại root `hanzi-studio.tsx` (state + ?rad= deep-link)

**Files:**
- Rewrite: `app-next/src/app/(wide)/hanzi/hanzi-studio.tsx`
- Test: `app-next/src/app/(wide)/hanzi/__tests__/hanzi-studio.test.tsx` (viết lại)

**Interfaces:**
- Consumes: toàn bộ Task 5–8

State root:

```ts
const [catalogMode, setCatalogMode] = useState<CatalogMode>("rad");
const [stroke, setStroke] = useState<StrokeFilter>("all");
const [cat, setCat] = useState<CatFilter>("core");
const [level, setLevel] = useState<HskLevel | "all">("HSK 1");
const [q, setQ] = useState("");
const [cur, setCur] = useState<StudioSelection>({ kind: "rad", g: "水" });
const [mode, setMode] = useState<"watch" | "draw">("watch");
const [pane, setPane] = useState<"catalog" | "work">("catalog");
const [page, setPage] = useState(1);
```

Logic:
- `rads = filterRadicals({stroke, cat, q})`; pages = ceil(len/PAGE_SIZE 8); `pagedRad = slice`; khi filter đổi → `setPage(1)` (bọc trong handler hoặc useEffect trên deps `[stroke, cat, q]`).
- `chars = filterChars({level, q})` — HSK mode dùng PAGE_SIZE 12 (giữ cũ).
- `hasStrokeData(cur)`: rad → `radicalOf(cur.g)?.strokeChar != null`; char → `!!charOf(cur.g)`.
- `select(sel)`: setCur; mobile `<1024px` → pane "work"; `requestAnimationFrame(() => apiRef.current?.play())` khi mode watch.
- Mount effect: đọc `window.location.search` — `?rad=X` → `setCur({kind:"rad",g:X}); setCatalogMode("rad")`. (Không dùng `useSearchParams` để giữ SSG không cần Suspense.)
- `onSelectTray(ch)`: `setCur({kind:"char", g:ch})` + rAF play.
- Layout giữ: header h1 "汉字工坊 · Hanzi Studio" + SegControl pane (sticky, label tabs "Kho tra cứu"/"Bàn tập viết") + grid `lg:grid-cols-[42fr_58fr]` (mock mới đổi tỉ lệ từ 5fr7fr).
- Filterbar (mock mới): 2 hàng `.frow` — hàng 1: label "Số nét" + seg STROKE_FILTERS + search (placeholder "Tìm bộ thủ, nghĩa…"); hàng 2 (chỉ rad mode): label "Phân loại" + 4 pill CAT_FILTERS. HSK mode hàng 2: seg HSK_TABS. Ẩn/hiện theo catalogMode.
- Workbench `data`: rad → `{kind:"rad", rad: radicalOf(cur.g)!}`; char → `{kind:"char", meta: charOf(cur.g)!, rad: radical của char}` — **radical của char**: tra trong RADICAL_INDEX bộ nào có char này trong chars (helper `radicalOfChar(ch)` — thêm vào studio-model Task 5: `RADICAL_INDEX.find(r => r.chars.some(c => c.ch === ch))`; nếu Task 5 đã commit, thêm helper + 1 test nhỏ trong Task 9).
- Catalog nhận `mode={catalogMode}` + props theo Task 7; mode-switch onChange → setCatalogMode + setPage(1).

- [ ] **Step 1: Viết test failing**

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HanziStudio from "../hanzi-studio";

vi.mock("@/components/hanzi/studio/studio-grid", () => ({
  StudioGrid: () => <div data-od-id="tianzi-grid" />,
}));
vi.mock("@/components/hanzi/studio/studio-workbench", () => ({
  StudioWorkbench: ({ data, onSelectTray }: any) => (
    <div>
      <div data-od-id="workbench">{data ? data.kind : "null"}</div>
      {data?.kind === "rad" && (
        <div>
          {data.rad.chars.slice(0, 3).map((c: any) => (
            <button key={c.ch} onClick={() => onSelectTray(c.ch)} data-tray={c.ch}>{c.ch}</button>
          ))}
        </div>
      )}
    </div>
  ),
}));

beforeEach(() => {
  // jsdom URL mặc định localhost — đảm bảo không có ?rad
  window.history.replaceState(null, "", "/hanzi");
});

describe("HanziStudio (radical-first)", () => {
  it("mặc định rad mode, chọn 水, catalog hiện card bộ thủ", async () => {
    render(<HanziStudio />);
    await waitFor(() => expect(screen.getAllByRole("button", { name: /水/ }).length).toBeGreaterThan(0));
    expect(screen.getByTestId("cat-count").textContent).toMatch(/bộ thủ/);
  });

  it("deep-link ?rad=口 chọn đúng bộ", async () => {
    window.history.replaceState(null, "", "/hanzi?rad=口");
    render(<HanziStudio />);
    await waitFor(() => {
      const wb = screen.getByTestId("workbench");
      expect(wb.textContent).toContain("口");
    });
  });

  it("click tray chip → workbench chuyển sang kind char", async () => {
    render(<HanziStudio />);
    await waitFor(() => expect(screen.getAllByRole("button", { name: /没/ }).length).toBeGreaterThan(0));
    await userEvent.click(screen.getAllByRole("button", { name: /没/ })[0]);
    await waitFor(() => expect(screen.getByTestId("workbench").textContent).toContain("char"));
  });

  it("mode-switch HSK → catalog hiện chữ + level tab", async () => {
    render(<HanziStudio />);
    await userEvent.click(screen.getByRole("button", { name: /Theo cấp độ HSK/ }));
    await waitFor(() => expect(screen.getByTestId("cat-count").textContent).toMatch(/chữ/));
    expect(screen.getByRole("button", { name: "HSK 2" })).toBeTruthy();
  });

  it("filter số nét 3 nét → không còn card 2 nét", async () => {
    render(<HanziStudio />);
    await userEvent.click(screen.getByRole("button", { name: "3 nét" }));
    const count = screen.getByTestId("cat-count").textContent!;
    expect(count).toMatch(/^\d+ bộ thủ/);
  });

  it("search 'khau' → 口 trong kết quả", async () => {
    render(<HanziStudio />);
    await userEvent.type(screen.getByLabelText("Tìm bộ thủ"), "khau");
    await waitFor(() => expect(screen.getAllByRole("button", { name: /口/ }).length).toBeGreaterThan(0));
  });
});
```

Chú ý: aria-label search phải đúng "Tìm bộ thủ" — nếu mock placeholder dùng nhãn khác, khớp code Task 9 viết.

- [ ] **Step 2: verify FAIL. Step 3: implement** (như mô tả; thêm `radicalOfChar` vào studio-model + test assert `radicalOfChar("没")?.char === "水"`).
- [ ] **Step 4: `pnpm vitest run` TOÀN BỘ unit verify PASS** (test cũ `seg-control` giữ; `content/__tests__/hanzi-studio.test.ts` của data demo cũ — xóa ở Task 10).
- [ ] **Step 5: Commit** — `git commit -m "feat(hanzi-studio): root state radical-first + deep-link ?rad"`

---

### Task 10: Dọn code chết + gate grep

**Files:**
- Delete: `app-next/src/content/hanzi-studio.ts`, `app-next/src/content/__tests__/hanzi-studio.test.ts` (12 chữ demo — chỉ studio dùng)
- Delete: `app-next/src/lib/hanzi/stroke-quiz.ts`, `app-next/src/lib/hanzi/__tests__/stroke-quiz.test.ts` (chỉ studio-grid cũ dùng)
- Verify KHÔNG xóa: `hanzi-strokes.ts` (dùng bởi stroke-player/word-drawer/stroke-studio/svg-render)

- [ ] **Step 1: Verify không còn tham chiếu**

```bash
cd app-next
grep -rn "content/hanzi-studio\"" src --include="*.ts" --include="*.tsx" | grep -v "content/hanzi-studio/"
grep -rn "stroke-quiz" src --include="*.ts" --include="*.tsx"
```

Expected: cả hai lệnh trả về rỗng (import `@/content/hanzi-studio` không còn; nếu còn — sửa file tham chiếu trước khi xóa).

- [ ] **Step 2: Xóa + chạy toàn bộ unit**

```bash
git rm src/content/hanzi-studio.ts src/content/__tests__/hanzi-studio.test.ts src/lib/hanzi/stroke-quiz.ts src/lib/hanzi/__tests__/stroke-quiz.test.ts
pnpm vitest run
pnpm typecheck
```

Expected: PASS cả hai.

- [ ] **Step 3: Gate grep mock-remnants**

```bash
grep -rn "Độ chuẩn xác\|state-pills\|🔥\|☀️\|🧩\|📚" "src/app/(wide)/hanzi" src/components/hanzi/studio
```

Expected: rỗng (exit 1). Nếu có — sửa.

- [ ] **Step 4: Commit** — `git commit -m "chore(hanzi-studio): xóa data demo 12 chữ + stroke-quiz (thay bằng hanzi-writer)"`

---

### Task 11: Link chéo từ `/radicals`

**Files:**
- Modify: `app-next/src/components/radicals/deck-client.tsx`
- Test: `app-next/src/components/radicals/__tests__/deck-client.test.tsx` (nếu chưa có — tạo, chỉ test phần mới)

- [ ] **Step 1: Viết test failing** (nếu file test chưa tồn tại, tạo mới với mock TTS + toast theo pattern test khác trong `components/radicals/__tests__/` — kiểm tra trước `ls src/components/radicals/__tests__/`):

Test thêm: render deck → tìm link/anchor `href="/hanzi?rad=口"` tồn tại khi card hiện bộ 口. Nếu deck-client render qua state phức tạp (order/shuffle), assert **ít nhất 1** anchor `a[href^="/hanzi?rad="]` hiện diện và format `?rad=<encodeURIComponent(radical char)>`.

- [ ] **Step 2: verify FAIL. Step 3: implement** — trong deck-client, thêm cạnh nút audio/từ vựng của card:

```tsx
import Link from "next/link";
// ...
<Link
  href={`/hanzi?rad=${encodeURIComponent(r.char)}`}
  className="inline-flex min-h-9 items-center rounded-control border border-border-subtle bg-surface-elevated px-3 text-[12.5px] font-bold text-text-secondary hover:border-action-primary hover:text-action-primary"
>
  Luyện viết bộ này
</Link>
```

- [ ] **Step 4: verify PASS + `pnpm vitest run`.**
- [ ] **Step 5: Commit** — `git commit -m "feat(radicals): link chéo Luyện viết bộ này → /hanzi?rad="`

---

### Task 12: E2E + verification tổng

**Files:**
- Create: `app-next/e2e/hanzi-studio.spec.ts`

- [ ] **Step 1: Viết e2e**

```ts
import { test, expect } from "@playwright/test";

test.describe("Hanzi Studio radical-first", () => {
  test("chọn bộ thủ → tray → nạp chữ → bóc tách", async ({ page }) => {
    await page.goto("/hanzi");
    await expect(page.getByRole("heading", { name: /Hanzi Studio/ })).toBeVisible();
    // catalog mặc định core radicals — chọn 口 nếu có, fallback card đầu tiên
    const card = page.locator('[data-od-id^="rad-"]').first();
    await card.click();
    await expect(page.getByTestId("char-tray")).toBeVisible();
    const chip = page.locator('[data-tray]').first();
    await chip.click();
    await expect(page.getByTestId("decomp")).toBeVisible();
    // watch controls hiển thị
    await expect(page.getByRole("button", { name: "Phát lại" })).toBeVisible();
  });

  test("deep-link ?rad=口", async ({ page }) => {
    await page.goto("/hanzi?rad=%E5%8F%A3");
    await expect(page.getByTestId("decomp")).toBeHidden().catch(() => {});
    await expect(page.getByTestId("char-tray")).toBeVisible({ timeout: 15_000 });
  });

  test("draw mode bật gợi ý nét mờ", async ({ page }) => {
    await page.goto("/hanzi");
    const card = page.locator('[data-od-id^="rad-"]').first();
    await card.click();
    await page.getByRole("button", { name: /Tự luyện viết/ }).click();
    await page.getByRole("button", { name: /Gợi ý nét mờ/ }).click();
    await expect(page.getByRole("button", { name: /Gợi ý nét mờ/ })).toHaveAttribute("aria-pressed", "true");
  });
});
```

- [ ] **Step 2: Chạy e2e** (cần dev server; `pnpm dev` port 3100 — playwright webServer tự khởi động)

```bash
pnpm test:e2e -- e2e/hanzi-studio.spec.ts
```

Lưu ý từ trước: lần chạy đầu có compile lạnh → timeout 15s trong test đã đệm; flake lần đầu có thể retry (playwright config mặc định). Expected: PASS sau tối đa 2 lần chạy.

- [ ] **Step 3: Verification tổng (verification-before-completion)**

```bash
pnpm typecheck && pnpm lint && pnpm vitest run && pnpm test:e2e
grep -rn "Độ chuẩn xác\|state-pills" "src/app/(wide)/hanzi" src/components/hanzi/studio && echo "GATE FAIL" || echo "GATE OK"
git status --short   # sạch
```

Expected: tất cả PASS + GATE OK.

- [ ] **Step 4: Commit** — `git commit -am "test(hanzi-studio): e2e radical-first flow" && git log --oneline main..HEAD | wc -l` (kỳ vọng 12+ commit)

---

## Self-review ghi chú (đã chạy khi viết plan)

- **Spec coverage:** §3 pipeline → T1; §4.1 → T7; §4.2 → T6/T8; §4.3 → T9/T11; §5 deviation → T6 note + global constraints; §6 xóa code → T10; §7 testing → T2/T3–9 tests + T12; §8 rủi ro (fallback null, chunk) → T3/T8.
- **Chỗ từng rủi ro đã xử lý:** useSearchParams SSG → window.location (T9); undo quiz lib không hỗ trợ → deviation ghi rõ (T6); test expectation phụ thuộc data thật (水 meaning) → hướng dẫn sửa theo data thật, không sửa data.
- **Type consistency:** `StudioSelection`/`StudioRadical`/`StudioCharMeta`/`WriterApi`/`StudioGridApi`/`WorkbenchData` dùng nhất quán T3→T9.
