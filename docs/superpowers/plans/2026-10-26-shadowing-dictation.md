# Shadowing Studio — Dictation 2 variant + Auto-pause + Karaoke + Pron mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Studio shadowing của app-next có đủ 3 mode (Shadow / Dictation / Pron), Dictation 2 variant (Typing per-char diff + Arrange ghép từ) với stats localStorage, karaoke highlight theo word timing + auto-pause cho 20 video YouTube đã có whisper timing.

**Architecture:** Word timing từ W1 (`scripts/content/out/<videoId>/whisper.json`) được merge vào `sentences` JSON của D1 (không đổi schema) qua script mới. Thuật toán thuần (diff per-char, seeded shuffle, auto-pause/karaoke selector) nằm ở `src/lib/shadowing/` với TDD; Studio UI tách panel Dictation và Pron thành component riêng, engine thêm state `time` + toggle auto-pause.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest, Playwright, Cloudflare D1 (drizzle), localStorage (ProgressStore).

**Spec:** `docs/superpowers/specs/2026-10-26-shadowing-dictation-design.md`

## Global Constraints

- Repo BẮT BUỘC pnpm (`npm install` phá node_modules). Mọi lệnh chạy trong `app-next/`.
- KHÔNG thêm dependency mới. Icons chỉ qua `@/components/ui/icon` (lucide-only); UI primitives `Button`/`Chip` từ `@/components/ui/*`, token màu từ design system Hanzi (không hardcode hex).
- KHÔNG copy data/word timing curated của nhaihsk — timing tự sinh từ whisper W1.
- TDD cho mọi lib thuần: viết test trước (RED), implement (GREEN), output test pristine.
- Lệnh verify: `pnpm test` (unit), `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e`.
- Storage keys prefix `bye.shadowing.*` (đồng bộ với `bye.shadow.font` hiện có).
- Seed D1: local DB là `hsk-dev` (`wrangler d1 execute hsk-dev --local`), remote là `hsk` (worker `byehsk`) — seed SQL trong JSON KHÔNG được chứa ký tự `'` chưa escape và `;` trong chuỗi JSON phải escape `\u003b` (gotcha grammar seed).
- Engine mode audio (dialogues Kokoro) KHÔNG có karaoke/auto-pause — `words` undefined là tín hiệu UI.

---

### Task 1: Lib diff-chars — per-char diff hai con trỏ

**Files:**
- Create: `app-next/src/lib/shadowing/diff-chars.ts`
- Create: `app-next/src/lib/shadowing/__tests__/diff-chars.test.ts`
- Modify: `app-next/src/lib/shadowing/dictation.ts` (xóa `diffNormalized`, giữ `normDict`)
- Modify: `app-next/src/lib/shadowing/__tests__/dictation.test.ts` (bỏ test `diffNormalized`)

**Interfaces:**
- Produces: `diffChars(src: string, want: string): DiffResult` với `DiffResult = { marks: CharMark[]; errors: number; missing: number; total: number }`, `CharMark = { ch: string; state: "ok" | "bad" | "skip" }`. Task 7 (typing) và Task 8 dùng.
- `normDict` giữ nguyên chữ ký (dictation.ts) — Task 8 Arrange so khớp chuỗi dùng lại.

- [ ] **Step 1: Viết test decision-table (RED)**

```ts
// app-next/src/lib/shadowing/__tests__/diff-chars.test.ts
import { describe, expect, it } from "vitest";
import { diffChars } from "../diff-chars";

const states = (r: ReturnType<typeof diffChars>) => r.marks.map((m) => m.state).join("");

describe("diffChars", () => {
  it("khớp hoàn toàn", () => {
    const r = diffChars("我没你们", "我没你们");
    expect(states(r)).toBe("okokok");
    expect(r).toMatchObject({ errors: 0, missing: 0, total: 4 });
  });
  it("sai 1 chữ giữa câu", () => {
    const r = diffChars("我妹你们", "我没你们");
    expect(states(r)).toBe("okbadokok");
    expect(r.errors).toBe(1);
    expect(r.missing).toBe(0);
  });
  it("thiếu chữ cuối", () => {
    const r = diffChars("我没你", "我没你们");
    expect(r.missing).toBe(1);
    expect(r.errors).toBe(0);
  });
  it("thừa chữ ở giữa đẩy lệch", () => {
    const r = diffChars("我们没你们", "我没你们");
    // two-pointer: 我 ok, 们 bad (src tiến, want không), 没 ok... — sai >=1, không crash
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });
  it("dấu câu và khoảng trắng của src → skip, không tính lỗi", () => {
    // 我=ok ，=skip 没=ok ' '=skip 你=ok 们=ok 。=skip
    const r = diffChars("我，没 你们。", "我没你们");
    expect(states(r)).toBe("okskipokskipokskip");
    expect(r.errors).toBe(0);
  });
  it("dấu câu trong want không tính vào total", () => {
    const r = diffChars("我没你们", "我，没你们。");
    expect(r.total).toBe(4);
    expect(r.errors).toBe(0);
  });
  it("NFKC + lowercase: số/chữ full-width và hoa vẫn khớp", () => {
    const r = diffChars("ＡＢ１", "ab1");
    expect(states(r)).toBe("okokok");
  });
  it("pinyin không so được với hán tự → toàn bad + missing = total", () => {
    const r = diffChars("wo mei", "我没你们");
    expect(r.errors).toBe(5); // 6 ký tự ASCII, khoảng trắng skip → 5 bad
    expect(r.missing).toBe(4);
  });
  it("src rỗng → missing = total, marks rỗng", () => {
    const r = diffChars("", "我没你们");
    expect(r.marks).toHaveLength(0);
    expect(r.missing).toBe(4);
  });
  it("want rỗng → mọi ký tự src là bad", () => {
    const r = diffChars("我没", "");
    expect(states(r)).toBe("badbad");
    expect(r.errors).toBe(2);
    expect(r.missing).toBe(0);
  });
  it("dấu thanh pinyin (diacritics) bỏ qua qua stripTones", () => {
    const r = diffChars("wǒ měi", "wo mei");
    expect(r.errors).toBe(0);
  });
});
```

Lưu ý test "want rỗng": kỳ vọng `"badbad"` — nếu viết assertion chuỗi thì dùng `"badbad"`.

- [ ] **Step 2: Chạy test xác nhận FAIL**

Run: `pnpm vitest run src/lib/shadowing/__tests__/diff-chars.test.ts`
Expected: FAIL — `Cannot find module '../diff-chars'`

- [ ] **Step 3: Implement diff-chars.ts**

```ts
// app-next/src/lib/shadowing/diff-chars.ts
/* Per-char diff 2 con trỏ cho chế độ Chép chính tả (port Ý TƯỞNG cơ chế diff
   của đối thủ, viết lại). Chuẩn hóa NFKC + lowercase + bỏ dấu thanh; dấu câu
   và khoảng trắng bị skip ở CẢ HAI phía. marks theo ký tự GỐC của src để UI
   tô màu giữ nguyên dấu câu người dùng gõ. */
import { stripTones } from "@/lib/pinyin-utils";

export type MarkState = "ok" | "bad" | "skip";
export type CharMark = { ch: string; state: MarkState };
export type DiffResult = { marks: CharMark[]; errors: number; missing: number; total: number };

const SKIP_RE = /[\s,.!?，。！？、：;；:'"“”’‘·()（）\-—…]/;

function normChar(ch: string): string {
  const n = stripTones(ch.normalize("NFKC").toLowerCase());
  return SKIP_RE.test(n) ? "" : n;
}

/** mảng ký tự đã chuẩn hóa + vị trí ký tự gốc tương ứng */
function normIndexed(s: string): { n: string; i: number }[] {
  const out: { n: string; i: number }[] = [];
  Array.from(s).forEach((ch, i) => {
    const n = normChar(ch);
    if (n !== "") out.push({ n, i });
  });
  return out;
}

export function diffChars(src: string, want: string): DiffResult {
  const marks: CharMark[] = Array.from(src).map((ch) => ({ ch, state: normChar(ch) === "" ? "skip" : "bad" }));
  const A = normIndexed(src);
  const B = normIndexed(want).map((x) => x.n);
  let errors = 0;
  let matched = 0;
  let j = 0;
  for (const a of A) {
    if (j < B.length && a.n === B[j]) {
      marks[a.i].state = "ok";
      matched++;
      j++;
    } else {
      marks[a.i].state = "bad";
      errors++;
    }
  }
  return { marks, errors, missing: B.length - matched, total: B.length };
}
```

- [ ] **Step 4: Chạy test PASS + sửa file cũ**

Run: `pnpm vitest run src/lib/shadowing/__tests__/diff-chars.test.ts src/lib/shadowing/__tests__/dictation.test.ts`
Expected: PASS (dictation.test.ts đã bỏ block diffNormalized).

Trong `dictation.ts`: xóa hàm `diffNormalized` (giữ `normDict` + `STRIP_RE`). Trong `dictation.test.ts`: xóa import và các test `diffNormalized`.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/lib/shadowing/diff-chars.ts app-next/src/lib/shadowing/__tests__/diff-chars.test.ts app-next/src/lib/shadowing/dictation.ts app-next/src/lib/shadowing/__tests__/dictation.test.ts
git commit -m "feat(shadowing): lib diff-chars per-char hai con trỏ thay diffNormalized"
```

---

### Task 2: Prefs variant/auto-pause + dictation-stats qua ProgressStore

**Files:**
- Modify: `app-next/src/lib/shadowing/prefs.ts`
- Modify: `app-next/src/lib/store/progress-store.ts` (interface `ProgressStoreApi` + class `ProgressStore`)
- Create: `app-next/src/lib/shadowing/dictation-stats.ts`
- Test: `app-next/src/lib/shadowing/__tests__/prefs.test.ts` (mở rộng), `app-next/src/lib/shadowing/__tests__/dictation-stats.test.ts` (mới)

**Interfaces:**
- Produces (prefs.ts): `type DictVariant = "typing" | "arrange"`; `getDictVariant(): DictVariant` / `setDictVariant(v)` — key `bye.shadowing.dictVariant`; `getAutoPause(): boolean` (mặc định false) / `setAutoPause(on)` — key `bye.shadowing.autoPause`.
- Produces (ProgressStore): `getDictStats(videoId: string): DictStats`; `recordDictCheck(videoId: string, lineN: number, score: number, errors: number): void`; `recordReplay(videoId: string, lineN: number): void` với `DictStats = Record<string, DictLineStat>`, `DictLineStat = { lastScore: number; errors: number; replays: number }`. Storage key `bye.shadowing.dictStats.<videoId>`, JSON `{ "<lineN>": {...} }`.
- Produces (dictation-stats.ts): wrapper trên singleton `progressStore` — export `getDictStats`, `recordDictCheck`, `recordReplay` cùng chữ ký. Task 7 dùng.

- [ ] **Step 1: Viết test RED**

```ts
// app-next/src/lib/shadowing/__tests__/dictation-stats.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { getDictStats, recordDictCheck, recordReplay } from "../dictation-stats";

describe("dictation-stats (localStorage)", () => {
  beforeEach(() => localStorage.clear());
  it("video chưa luyện → object rỗng", () => {
    expect(getDictStats("vid1")).toEqual({});
  });
  it("recordDictCheck ghi lastScore + errors theo lineN", () => {
    recordDictCheck("vid1", 2, 80, 1);
    expect(getDictStats("vid1")["2"]).toEqual({ lastScore: 80, errors: 1, replays: 0 });
  });
  it("check lần sau ghi đè lastScore, cộng dồn errors", () => {
    recordDictCheck("vid1", 2, 80, 1);
    recordDictCheck("vid1", 2, 100, 0);
    expect(getDictStats("vid1")["2"]).toEqual({ lastScore: 100, errors: 1, replays: 0 });
  });
  it("recordReplay tăng replays, không đụng score", () => {
    recordDictCheck("vid1", 3, 60, 2);
    recordReplay("vid1", 3);
    recordReplay("vid1", 3);
    expect(getDictStats("vid1")["3"]).toEqual({ lastScore: 60, errors: 2, replays: 2 });
  });
  it("hai video độc lập", () => {
    recordDictCheck("vid1", 1, 50, 1);
    expect(getDictStats("vid2")).toEqual({});
  });
});
```

Mở rộng `prefs.test.ts` thêm:

```ts
import { getDictVariant, setDictVariant, getAutoPause, setAutoPause } from "../prefs";
// ...
it("dictVariant mặc định typing, set arrange nhớ lại", () => {
  localStorage.clear();
  expect(getDictVariant()).toBe("typing");
  setDictVariant("arrange");
  expect(getDictVariant()).toBe("arrange");
});
it("autoPause mặc định false, set true nhớ lại", () => {
  localStorage.clear();
  expect(getAutoPause()).toBe(false);
  setAutoPause(true);
  expect(getAutoPause()).toBe(true);
});
```

- [ ] **Step 2: Chạy test FAIL** — `pnpm vitest run src/lib/shadowing/__tests__/dictation-stats.test.ts src/lib/shadowing/__tests__/prefs.test.ts`

- [ ] **Step 3: Implement**

prefs.ts — thêm (dùng lại `lsGet`/`lsSet` có sẵn):

```ts
export type DictVariant = "typing" | "arrange";
export function getDictVariant(): DictVariant { return lsGet("bye.shadowing.dictVariant") === "arrange" ? "arrange" : "typing"; }
export function setDictVariant(v: DictVariant): void { lsSet("bye.shadowing.dictVariant", v); }
export function getAutoPause(): boolean { return lsGet("bye.shadowing.autoPause") === "1"; }
export function setAutoPause(on: boolean): void { lsSet("bye.shadowing.autoPause", on ? "1" : "0"); }
```

progress-store.ts — thêm vào `ProgressStoreApi`:

```ts
getDictStats(videoId: string): DictStats;
recordDictCheck(videoId: string, lineN: number, score: number, errors: number): void;
recordReplay(videoId: string, lineN: number): void;
```

types + class methods (dùng helpers `readJSON`/`writeJSON` có sẵn trong file):

```ts
export type DictLineStat = { lastScore: number; errors: number; replays: number };
export type DictStats = Record<string, DictLineStat>;
```

Trong class `ProgressStore` (đặt gần các method notebook/deck):

```ts
getDictStats(videoId: string): DictStats {
  return readJSON<DictStats>(`bye.shadowing.dictStats.${videoId}`, {});
}
recordDictCheck(videoId: string, lineN: number, score: number, errors: number): void {
  const key = String(lineN);
  const all = this.getDictStats(videoId);
  const prev = all[key] ?? { lastScore: 0, errors: 0, replays: 0 };
  all[key] = { lastScore: score, errors: prev.errors + errors, replays: prev.replays };
  writeJSON(`bye.shadowing.dictStats.${videoId}`, all);
}
recordReplay(videoId: string, lineN: number): void {
  const key = String(lineN);
  const all = this.getDictStats(videoId);
  const prev = all[key] ?? { lastScore: 0, errors: 0, replays: 0 };
  all[key] = { ...prev, replays: prev.replays + 1 };
  writeJSON(`bye.shadowing.dictStats.${videoId}`, all);
}
```

dictation-stats.ts:

```ts
// app-next/src/lib/shadowing/dictation-stats.ts
/* Stats chép chính tả per video/line — lưu qua ProgressStore (localStorage).
   Panel Dictation đọc để hiện "Điểm lần trước / Lượt phát lại". */
import { progressStore } from "@/lib/store/progress-store";
export type { DictStats, DictLineStat } from "@/lib/store/progress-store";
export const getDictStats = (videoId: string) => progressStore.getDictStats(videoId);
export const recordDictCheck = (videoId: string, lineN: number, score: number, errors: number) =>
  progressStore.recordDictCheck(videoId, lineN, score, errors);
export const recordReplay = (videoId: string, lineN: number) => progressStore.recordReplay(videoId, lineN);
```

- [ ] **Step 4: PASS + commit**

Run: `pnpm vitest run src/lib/shadowing/__tests__/dictation-stats.test.ts src/lib/shadowing/__tests__/prefs.test.ts src/lib/store` — Expected: PASS, output pristine.

```bash
git add app-next/src/lib/shadowing/prefs.ts app-next/src/lib/shadowing/dictation-stats.ts app-next/src/lib/shadowing/__tests__/dictation-stats.test.ts app-next/src/lib/shadowing/__tests__/prefs.test.ts app-next/src/lib/store/progress-store.ts
git commit -m "feat(shadowing): dictation-stats qua ProgressStore + prefs variant/auto-pause"
```

---

### Task 3: Lib arrange (shuffle deterministic) + auto-pause selector

**Files:**
- Create: `app-next/src/lib/shadowing/arrange.ts`
- Create: `app-next/src/lib/shadowing/auto-pause.ts`
- Test: `app-next/src/lib/shadowing/__tests__/arrange.test.ts`, `app-next/src/lib/shadowing/__tests__/auto-pause.test.ts`

**Interfaces:**
- Produces (arrange.ts): `seedFor(videoId: string, lineN: number): number`; `shuffleSeeded<T>(arr: T[], seed: number): T[]` (không mutate input; cùng seed → cùng thứ tự). Task 8 dùng.
- Consumes: type `ShadowWord` từ Task 4 — vì test auto-pause cần kiểu, Task 3 chạy SAU Task 4 hoặc định nghĩa import type tạm. **Thứ tự thực thi: Task 4 trước Task 3** (swap khi dispatch — Task 4 chỉ đụng scripts + type, không đụng lib).

- [ ] **Step 1: Test RED**

```ts
// app-next/src/lib/shadowing/__tests__/arrange.test.ts
import { describe, expect, it } from "vitest";
import { seedFor, shuffleSeeded } from "../arrange";

describe("arrange", () => {
  it("cùng seed → cùng thứ tự, không mất phần tử", () => {
    const a = shuffleSeeded([1, 2, 3, 4, 5], 42);
    const b = shuffleSeeded([1, 2, 3, 4, 5], 42);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it("không mutate mảng gốc", () => {
    const orig = [1, 2, 3];
    shuffleSeeded(orig, 7);
    expect(orig).toEqual([1, 2, 3]);
  });
  it("seed khác → thứ tự khác (xác suất trùng 1/120 chấp nhận được với seed cố định này)", () => {
    expect(shuffleSeeded([1, 2, 3, 4, 5], 1)).not.toEqual(shuffleSeeded([1, 2, 3, 4, 5], 2));
  });
  it("mảng rỗng/1 phần tử ổn", () => {
    expect(shuffleSeeded([], 9)).toEqual([]);
    expect(shuffleSeeded(["只"], 9)).toEqual(["只"]);
  });
  it("seedFor cùng (videoId, lineN) → cùng số", () => {
    expect(seedFor("EA3rwvr99Q0", 3)).toBe(seedFor("EA3rwvr99Q0", 3));
    expect(seedFor("EA3rwvr99Q0", 3)).not.toBe(seedFor("EA3rwvr99Q0", 4));
  });
});
```

```ts
// app-next/src/lib/shadowing/__tests__/auto-pause.test.ts
import { describe, expect, it } from "vitest";
import { activeWordIndex, sentencePauseMs } from "../auto-pause";
import type { ShadowWord } from "@/content/shadowing";

const w = (zh: string, s: number, e: number): ShadowWord => ({ zh, py: "", startMs: s * 1000, endMs: e * 1000 });
const WORDS = [w("我", 0, 0.5), w("没", 0.5, 1.2), w("你们", 1.2, 2.0)];

describe("auto-pause", () => {
  it("sentencePauseMs: có words → endMs từ cuối", () => {
    expect(sentencePauseMs(WORDS, 3000)).toBe(2000);
  });
  it("sentencePauseMs: endMs từ cuối vượt cuối câu → kẹp về cuối câu", () => {
    expect(sentencePauseMs(WORDS, 1500)).toBe(1500);
  });
  it("sentencePauseMs: words rỗng/undefined → null (fallback cuối câu ở engine)", () => {
    expect(sentencePauseMs(undefined, 3000)).toBeNull();
    expect(sentencePauseMs([], 3000)).toBeNull();
  });
  it("activeWordIndex: tMs trong [start, end) → index", () => {
    expect(activeWordIndex(WORDS, 700)).toBe(1);
    expect(activeWordIndex(WORDS, 0)).toBe(0);
  });
  it("activeWordIndex: ngoài mọi khoảng → -1", () => {
    expect(activeWordIndex(WORDS, 2500)).toBe(-1);
  });
});
```

- [ ] **Step 2: FAIL** — `pnpm vitest run src/lib/shadowing/__tests__/arrange.test.ts src/lib/shadowing/__tests__/auto-pause.test.ts`

- [ ] **Step 3: Implement**

```ts
// app-next/src/lib/shadowing/arrange.ts
/* Shuffle deterministic cho chế độ Ghép từ — cùng (videoId, lineN) luôn ra
   cùng thứ tự mảnh (spec WSD.4: shuffle theo seed, tránh flaky test/UI). */

export function seedFor(videoId: string, lineN: number): number {
  let h = 0x811c9dc5; // FNV-1a 32-bit
  for (const ch of `${videoId}:${lineN}`) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) | 0; // mulberry32
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
```

```ts
// app-next/src/lib/shadowing/auto-pause.ts
/* Logic thuần auto-pause + karaoke (spec WSD.2). Engine poll 100ms rồi gọi
   các hàm này — không setTimeout ở đây. Thời gian words theo ms, engine theo
   giây: engine tự nhân 1000. */
import type { ShadowWord } from "@/content/shadowing";

/** ms điểm dừng khi auto-pause bật: endMs của từ cuối, kẹp trong [.., sentenceEndMs] */
export function sentencePauseMs(words: ShadowWord[] | undefined, sentenceEndMs: number): number | null {
  if (!words || words.length === 0) return null;
  const last = words[words.length - 1];
  if (!(last.endMs > 0)) return null;
  return Math.min(last.endMs, sentenceEndMs);
}

/** index từ đang phát tại tMs cho karaoke — -1 nếu ngoài mọi khoảng */
export function activeWordIndex(words: ShadowWord[], tMs: number): number {
  for (let i = 0; i < words.length; i++) {
    if (tMs >= words[i].startMs && tMs < words[i].endMs) return i;
  }
  return -1;
}
```

- [ ] **Step 4: PASS + commit**

```bash
git add app-next/src/lib/shadowing/arrange.ts app-next/src/lib/shadowing/auto-pause.ts app-next/src/lib/shadowing/__tests__/arrange.test.ts app-next/src/lib/shadowing/__tests__/auto-pause.test.ts
git commit -m "feat(shadowing): lib arrange seeded-shuffle + auto-pause/karaoke selector"
```

---

### Task 4: Word timing — type `words?` + script merge + seed WSD

**Files:**
- Modify: `app-next/src/content/shadowing.ts` (type)
- Create: `app-next/scripts/content/merge-word-timing.mts`
- Test: `app-next/scripts/content/__tests__/merge-word-timing.test.ts`
- Create (sinh ra khi chạy CLI, commit file): `app-next/drizzle/seeds/content-shadowing-wsd.sql`

**Interfaces:**
- Produces: `export type ShadowWord = { zh: string; py: string; startMs: number; endMs: number }`; `SubtitleSentence` thêm `words?: ShadowWord[]`. Tất cả task UI + Task 3 phụ thuộc.
- Produces (script): pure `wordsForSentence(draft: SentenceDraft, py: string[]): ShadowWord[]` — test được không I/O; CLI `pnpm tsx scripts/content/merge-word-timing.mts` sinh `drizzle/seeds/content-shadowing-wsd.sql` cho 20 video curated.
- Consumes: `flattenWhisperJson` + `splitSentences` + `SentenceDraft` (scripts/content/split-sentences.ts, tokens giây), `readCuratedVideos` (scripts/content/video-config.ts), pinyin.json shape `Array<{ zh: string; py: string[] }>` (per-sentence).

- [ ] **Step 1: Sửa type trong `src/content/shadowing.ts`** — thêm cạnh `SubtitleSentence`:

```ts
export type ShadowWord = { zh: string; py: string; startMs: number; endMs: number };
export type SubtitleSentence = {
  n: number;
  start: number;
  end: number;
  parts: { zh: string }[];
  pinyin: string;
  vi: string;
  words?: ShadowWord[]; // word timing whisper (chỉ video YouTube W1) — undefined → không karaoke/auto-pause
};
```

- [ ] **Step 2: Test RED cho `wordsForSentence`**

```ts
// app-next/scripts/content/__tests__/merge-word-timing.test.ts
import { describe, expect, it } from "vitest";
import { wordsForSentence } from "../merge-word-timing";
import type { SentenceDraft, WhisperToken } from "../../split-sentences";

const tok = (text: string, start: number, end: number): WhisperToken => ({ text, start, end });

describe("wordsForSentence", () => {
  it("gán py theo số chữ CJK của từng token, ms làm tròn", () => {
    const draft: SentenceDraft = {
      zh: "我没你们",
      start: 0.1, end: 2.0,
      tokens: [tok("我", 0.1, 0.5), tok("没", 0.5, 1.2), tok("你们", 1.2, 2.0)],
    };
    expect(wordsForSentence(draft, ["wǒ", "méi", "nǐ", "men"])).toEqual([
      { zh: "我", py: "wǒ", startMs: 100, endMs: 500 },
      { zh: "没", py: "méi", startMs: 500, endMs: 1200 },
      { zh: "你们", py: "nǐ men", startMs: 1200, endMs: 2000 },
    ]);
  });
  it("token chỉ dấu câu/khoảng trắng → bỏ, không tiêu thụ âm tiết", () => {
    const draft: SentenceDraft = {
      zh: "我，你们",
      start: 0, end: 2,
      tokens: [tok("我", 0, 0.5), tok("，", 0.5, 0.6), tok("你们", 0.6, 2)],
    };
    const words = wordsForSentence(draft, ["wǒ", "nǐ", "men"]);
    expect(words.map((w) => w.zh)).toEqual(["我", "你们"]);
  });
  it("py cạn (ASR lệch) → py rỗng, vẫn giữ timing", () => {
    const draft: SentenceDraft = { zh: "我们", start: 0, end: 1, tokens: [tok("我们", 0, 1)] };
    expect(wordsForSentence(draft, [])).toEqual([{ zh: "我们", py: "", startMs: 0, endMs: 1000 }]);
  });
  it("word ngoài khoảng [start, end] của câu → bỏ (spec: verify khi merge)", () => {
    const draft: SentenceDraft = { zh: "我们", start: 1, end: 2, tokens: [tok("我", 0, 0.5), tok("们", 1, 2)] };
    expect(wordsForSentence(draft, ["wǒ", "men"]).map((w) => w.zh)).toEqual(["们"]);
  });
  it("py nhiều hơn chữ (dư âm tiết) → cắt đúng số chữ", () => {
    const draft: SentenceDraft = { zh: "我", start: 0, end: 1, tokens: [tok("我", 0, 1)] };
    expect(wordsForSentence(draft, ["wǒ", "men"])[0].py).toBe("wǒ");
  });
});
```

- [ ] **Step 3: FAIL** — `pnpm vitest run scripts/content/__tests__/merge-word-timing.test.ts`

- [ ] **Step 4: Implement `merge-word-timing.mts`**

```ts
// app-next/scripts/content/merge-word-timing.mts
/* CLI: pnpm tsx scripts/content/merge-word-timing.mts
   Đọc out/<videoId>/whisper.json + pinyin.json của 20 video curated (W1) →
   gắn words: [{zh, py, startMs, endMs}] vào từng sentence → sinh
   drizzle/seeds/content-shadowing-wsd.sql (INSERT OR REPLACE vào
   content_shadowing_subtitles — JSON mode, không migration).
   KHÔNG chứa dữ liệu curated của đối thủ; timing tự sinh whisper. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { readCuratedVideos } from "./video-config.ts";
import { flattenWhisperJson, splitSentences, type SentenceDraft } from "./split-sentences.ts";
import type { ShadowWord } from "../../src/content/shadowing.ts";

const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const countCJK = (s: string) => Array.from(s).filter((c) => CJK_RE.test(c)).length;

/** Ghép word-token vào 1 câu: mỗi token tiêu thụ countCJK(zh) âm tiết từ py. */
export function wordsForSentence(draft: SentenceDraft, py: string[]): ShadowWord[] {
  let k = 0; // con trỏ âm tiết
  const out: ShadowWord[] = [];
  for (const t of draft.tokens) {
    const zh = t.text.replace(/[。？！?!;.,，、：:—…\s]/g, "");
    if (zh === "") continue;
    if (t.start < draft.start - 0.01 || t.end > draft.end + 0.01) continue; // word ngoài câu → bỏ
    const need = countCJK(zh);
    const syll = py.slice(k, k + need);
    k += need;
    out.push({ zh, py: syll.join(" "), startMs: Math.round(t.start * 1000), endMs: Math.round(t.end * 1000) });
  }
  return out;
}

function buildSeedSql(): string {
  const esc = (s: string) => s.replace(/'/g, "''").replace(/;/g, "\\u003b"); // wrangler tách statement theo ';'
  const rows: string[] = [];
  for (const v of readCuratedVideos()) {
    const dir = new URL(`./out/${v.videoId}/`, import.meta.url).pathname;
    if (!existsSync(`${dir}whisper.json`) || !existsSync(`${dir}pinyin.json`)) {
      console.warn(`${v.videoId}: thiếu whisper/pinyin — bỏ qua`);
      continue;
    }
    const tokens = flattenWhisperJson(readFileSync(`${dir}whisper.json`, "utf8"));
    const drafts = splitSentences(tokens);
    const pinyinBySentence = JSON.parse(readFileSync(`${dir}pinyin.json`, "utf8")) as { zh: string; py: string[] }[];
    const sentences = drafts.map((d, i) => {
      const prev = pinyinBySentence[i] ?? { zh: d.zh, py: [] };
      return { n: i + 1, start: d.start, end: d.end, parts: d.zh.split("").map((zh) => ({ zh })), pinyin: (prev.py ?? []).join(" "), vi: "", words: wordsForSentence(d, prev.py ?? []) };
    });
    // parts: giữ nguyên phần tách từ gen trước nếu có — đọc từ seed W1 cũ không khả thi, tái tạo từ zh là chấp nhận được vì parts chỉ là span hiển thị.
    rows.push(`INSERT OR REPLACE INTO content_shadowing_subtitles (video_id, sentences) VALUES ('${esc(v.videoId)}', '${esc(JSON.stringify(sentences))}');`);
    console.log(`${v.videoId}: ${sentences.length} câu, words đầu: ${JSON.stringify(sentences[0]?.words?.[0] ?? null)}`);
  }
  return rows.join("\n") + "\n";
}

const outPath = new URL("../../drizzle/seeds/content-shadowing-wsd.sql", import.meta.url).pathname;
writeFileSync(outPath, "-- Seed word timing WSD (whisper W1) — sinh tự động, đừng sửa tay.\n" + buildSeedSql());
console.log("đã ghi " + outPath);
```

**QUAN TRỌNG — parts:** Trước khi ghi `parts: d.zh.split("").map(...)` (tách từng chữ), kiểm tra seed W1 cũ `drizzle/seeds/content-shadowing-w1.sql`: nếu parts cũ là cụm từ (buildSentenceParts), tái tạo `buildSentenceParts(draft.zh, { zh: draft.zh, py })` từ `./pinyin-parts.ts` thay vì split từng ký tự — giữ nguyên shape UI cũ. Implementer PHẢI đối chiếu 1 video với seed W1 hiện có và ghi vào report phần quyết định này.

- [ ] **Step 5: PASS + chạy CLI sinh seed**

```bash
pnpm vitest run scripts/content/__tests__/merge-word-timing.test.ts
pnpm tsx scripts/content/merge-word-timing.mts
```

Expected: test PASS; CLI in 20 dòng (hoặc ít hơn nếu video thiếu — chấp nhận, báo cáo); seed file mới có ≤20 INSERT.

- [ ] **Step 6: Re-seed local D1 + kiểm chứng API**

```bash
pnpm wrangler d1 execute hsk-dev --local --file=drizzle/seeds/content-shadowing-wsd.sql
# dev server đang chạy thì kiểm tra: curl -s localhost:3100/api/v1/content/shadowing | head -c 300
```

Kiểm chứng SQL đọc được: `pnpm wrangler d1 execute hsk-dev --local --command "SELECT length(sentences) FROM content_shadowing_subtitles WHERE video_id='EA3rwvr99Q0'"`.

- [ ] **Step 7: Commit** — `git commit -m "feat(shadowing): word timing whisper vào D1 sentences JSON (seed WSD)"`

---

### Task 5: Engine — state `time`, toggle auto-pause, dừng theo word timing

**Files:**
- Modify: `app-next/src/components/shadowing/studio/use-player-engine.ts`
- Test: `app-next/src/components/shadowing/studio/__tests__/use-player-engine.test.ts` (mở rộng)

**Interfaces:**
- Consumes: `sentencePauseMs` (Task 3), `getAutoPause`/`setAutoPause` (Task 2), `SubtitleSentence.words` (Task 4).
- Produces (return của `usePlayerEngine` thêm): `time: number` (giây, cập nhật mỗi nhịp poll); `autoPause: boolean`; `setAutoPause(on: boolean): void`. Task 6/10 dùng.
- Poll interval đổi 500ms → 100ms (YouTube getCurrentTime mỗi 100ms — karaoke mượt hơn; handshake "listening" mỗi nhịp giữ nguyên).

- [ ] **Step 1: Mở rộng test RED** — thêm vào use-player-engine.test.ts (theo pattern renderHook sẵn có trong file):

```ts
// tại mock subs thêm words cho 1 câu: { n: 1, start: 0, end: 2, parts: [{ zh: "我们" }], pinyin: "", vi: "", words: [{ zh: "我", py: "", startMs: 0, endMs: 1200 }, { zh: "们", py: "", startMs: 1200, endMs: 1800 }] }
it("tick cập nhật time", async () => { /* advance timer qua nhịp poll → result.current.time > 0 */ });
it("setAutoPause flip state + localStorage", () => {
  act(() => result.current.setAutoPause(true));
  expect(result.current.autoPause).toBe(true);
  expect(localStorage.getItem("bye.shadowing.autoPause")).toBe("1");
});
```

(Test engine hiện tại là tích hợp qua fake timers — implementer giữ pattern, thêm 2 assertion trên; chi tiết wiring theo test file đang có.)

- [ ] **Step 2: FAIL** — `pnpm vitest run src/components/shadowing/studio/__tests__/use-player-engine.test.ts`

- [ ] **Step 3: Implement trong use-player-engine.ts**

1. Import: `import { getAutoPause, setAutoPause } from "@/lib/shadowing/prefs";` và `import { sentencePauseMs } from "@/lib/shadowing/auto-pause";`
2. `st.current` thêm `autoPause: getAutoPause()`.
3. State: `const [time, setTime] = useState(0);` `const [autoPause, setAutoPauseState] = useState(getAutoPause());`
4. Poll interval 500 → 100: `const id = setInterval(() => { ... }, 100);`
5. `tick(t)` — đầu hàm thêm `setTime(t);`, và BEFORE nhánh autoSplit hiện có thêm:

```ts
// auto-pause theo word timing (spec WSD.3): dừng tại endMs từ cuối câu
if (st.current.playing && st.current.autoPause) {
  const s = subs[st.current.cur];
  const pauseMs = sentencePauseMs(s.words, s.end * 1000);
  if (pauseMs != null && t * 1000 >= pauseMs - 60) { pause(); return; }
}
```

6. Public setter:

```ts
const setAutoPausePublic = (on: boolean) => {
  st.current.autoPause = on;
  setAutoPauseState(on);
  setAutoPause(on);
};
```

7. Return thêm `time, autoPause, setAutoPause: setAutoPausePublic`.

Lưu ý: mode audio (`st.current.audio`) tick return sớm như cũ — audio không auto-pause (words undefined). TTS mode: tick return sớm khi `st.current.tts` — giữ nguyên.

- [ ] **Step 4: PASS full lib + engine** — `pnpm vitest run src/components/shadowing src/lib/shadowing` — Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(shadowing): engine time state + auto-pause theo word timing (poll 100ms)"`

---

### Task 6: Studio — mode switch 3 tab + phím Digit1/2/3

**Files:**
- Modify: `app-next/src/app/(app)/shadowing/[...videoId]/shadowing-studio.tsx`
- Test: `app-next/src/app/(app)/shadowing/[...videoId]/__tests__/` (mở rộng test studio sẵn có)

**Interfaces:**
- State đổi `tab: "script" | "dict"` → `mode: "shadow" | "dict" | "pron"` (không đổi URL). Mapping cũ: script→shadow, dict→dict.
- `dimmed = mode === "dict"` (record dock chỉ mờ ở dict; pron dùng mic nên không mờ).
- Produces: placeholder render `{mode === "pron" && <PronPanel ... />}` — PronPanel là Task 9; ở Task 6 render `<div data-testid="pron-panel" hidden>placeholder</div>`? KHÔNG — Task 6 chưa render pron gì ngoài tab; Task 9 thay. Tab pron ở Task 6 chỉ flip state + aria-pressed.

- [ ] **Step 1: Sửa state + tabs UI** — trong `shadowing-studio.tsx`:

```tsx
const [mode, setMode] = useState<"shadow" | "dict" | "pron">("shadow");
const dimmed = mode === "dict";
```

Tabs (thay block `script-tabs`): 3 nút `data-testid="mode-shadow" | "mode-dict" | "mode-pron"`, label "Shadow" / "Chép chính tả" / "Phát âm", `aria-pressed={mode === x}`, style active giống hiện tại.

Transcript: `hidden={mode !== "shadow"}`; autoscroll effect guard đổi `tab !== "script"` → `mode !== "shadow"`. Dict box: `hidden={mode !== "dict"}`.

- [ ] **Step 2: Phím tắt** — effect mới trong studio (giống pattern Space hiện có, cùng guard `isTyping`):

```tsx
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && ((t.matches?.("input, textarea, select") ?? false) || t.isContentEditable)) return;
    if (e.code === "Digit1") setMode("shadow");
    else if (e.code === "Digit2") setMode("dict");
    else if (e.code === "Digit3") setMode("pron");
  };
  document.addEventListener("keydown", onKey);
  return () => document.removeEventListener("keydown", onKey);
}, []);
```

- [ ] **Step 3: Test** — mở rộng test studio: click mode-dict → dict-box hiện; `page.keyboard`-tương đương (`fireEvent.keyDown(document, { code: "Digit3" })`) → tab pron aria-pressed. Transcript ẩn khi mode dict. Chạy `pnpm vitest run "src/app/(app)/shadowing"`.

- [ ] **Step 4: Commit** — `git commit -m "feat(shadowing): mode switch 3 tab Shadow/Dictation/Pron + phím Digit1/2/3"`

---

### Task 7: Dictation variant Typing — per-char highlight + stats badges

**Files:**
- Create: `app-next/src/app/(app)/shadowing/[...videoId]/dictation-panel.tsx`
- Modify: `app-next/src/app/(app)/shadowing/[...videoId]/shadowing-studio.tsx` (thay dict-box inline bằng `<DictationPanel/>`)
- Test: `app-next/src/app/(app)/shadowing/[...videoId]/__tests__/dictation-panel.test.tsx`

**Interfaces:**
- Consumes: `diffChars` (Task 1), `getDictVariant/setDictVariant` + `getDictStats/recordDictCheck/recordReplay` (Task 2), `eng` subset từ studio: `{ cur, listenCurrent, prev, next }`, `subs: SubtitleSentence[]`, `videoId: string`, `recordPractice` từ `useShadowingProgress`, `speak` từ `useTts`, `toast`.
- Produces: component `<DictationPanel subs={subs} cur={eng.cur} videoId={video.id} eng={pickEng} recordPractice={recordPractice} />` — Task 8 thêm variant Arrange trong CHÍNH component này (variant switch nằm trong panel).

- [ ] **Step 1: Viết test RED** (render với jsdom, follow pattern test studio hiện có; subs fixture 2 câu, câu 1 `parts:[{zh:"我没你们"}] pinyin:"wǒ méi nǐ men"`):

Kiểm tra phải cover:
1. Mặc định variant = giá trị localStorage (typing) → `dict-variant-typing` aria-pressed=true.
2. Gõ "我妹你们" → click `dict-check` → `dict-diff` render 4 span với class `dict-ok|dict-bad`, `dict-badge-errors` text chứa "1", `dict-reason` chứa "lỗi".
3. Gõ đúng nguyên văn → `dict-reason` "Hoàn toàn chính xác", `recordPractice` được gọi với `{ score: 100, linesDoneDelta: 1 }` (mock hook).
4. Check lần 2 trên cùng câu → `dict-badge-last` hiện "Điểm lần trước" = lần check trước (localStorage).
5. Click `dict-listen` → `recordReplay` được gọi (mock progressStore) + `eng.listenCurrent` gọi.
6. Nút 👁 `dict-hint` click 1 lần → 1 ô hiện chữ đầu, còn lại "?".
7. `dict-next` gọi `eng.next`.
8. Đổi variant bằng click `dict-variant-arrange` → localStorage `bye.shadowing.dictVariant` = "arrange" (Task 8 render body arrange).

- [ ] **Step 2: FAIL** — `pnpm vitest run "src/app/(app)/shadowing/[...videoId]/__tests__/dictation-panel.test.tsx"`

- [ ] **Step 3: Implement dictation-panel.tsx**

Cấu trúc chính (giữ testid cũ đang có ở studio để không vỡ e2e cũ: `dict-box`, `dict-input`, `dict-check`, `dict-listen`, `dict-slow`, `dict-hint`, `dict-prev`, `dict-skip`→`dict-next` giữ cả hai testid trên cùng nút):

```tsx
"use client";
import { useEffect, useState } from "react";
import { diffChars, type DiffResult } from "@/lib/shadowing/diff-chars";
import { getDictStats, recordDictCheck, recordReplay } from "@/lib/shadowing/dictation-stats";
import { getDictVariant, setDictVariant } from "@/lib/shadowing/prefs";
import { normDict } from "@/lib/shadowing/dictation";
import { Button } from "@/components/ui/button";
import { Volume2, Eye, ICON_STROKE } from "@/components/ui/icon";
import type { SubtitleSentence } from "@/content/shadowing";

export type DictEng = { cur: number; listenCurrent: () => void; prev: () => void; next: () => void };

export default function DictationPanel({
  subs, cur, videoId, eng, recordPractice,
}: {
  subs: SubtitleSentence[]; cur: number; videoId: string;
  eng: DictEng; recordPractice: (id: string, patch: { score?: number; linesDoneDelta?: number }) => void;
}) {
  const curSub = subs[Math.min(cur, subs.length - 1)] ?? subs[0];
  const full = curSub ? curSub.parts.map((p) => p.zh).join(" ") : "";
  const [variant, setVariant] = useState<"typing" | "arrange">("typing");
  useEffect(() => setVariant(getDictVariant()), []);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<null | { kind: "empty" | "correct" | "wrong"; diff?: DiffResult }>(null);
  const [dictShown, setDictShown] = useState(0);
  const [stats, setStats] = useState(() => getDictStats(videoId));
  useEffect(() => { setValue(""); setResult(null); setDictShown(0); setStats(getDictStats(videoId)); }, [curSub, videoId]);

  const lineStat = curSub ? stats[String(curSub.n)] : undefined;

  function check() {
    if (!curSub) return;
    if (!normDict(value)) { setResult({ kind: "empty" }); return; }
    const d = diffChars(value, full);
    const ok = d.errors === 0 && d.missing === 0;
    const score = ok ? 100 : Math.max(0, Math.round(((d.total - d.errors - d.missing) / Math.max(1, d.total)) * 100));
    setResult({ kind: ok ? "correct" : "wrong", diff: d });
    recordDictCheck(videoId, curSub.n, score, d.errors + d.missing);
    setStats(getDictStats(videoId));
    if (ok) recordPractice(videoId, { score, linesDoneDelta: 1 });
  }

  const pickReplay = () => { if (curSub) recordReplay(videoId, curSub.n); eng.listenCurrent(); };
  // ... render: variant switch 2 nút (dict-variant-typing / dict-variant-arrange),
  // variant === "typing" → phần typing; else → phần Arrange (Task 8).
}
```

Phần typing render (giữ "CÂU n/N", mốc thời gian, dict-listen, dict-slow, textarea `dict-input`, Enter=check, hint block 👁, `dict-diff`, badges, reason, `dict-prev`/`dict-next`):

```tsx
<div className="mt-2 flex flex-wrap gap-1.5" data-testid="dict-diff" hidden={!result?.diff}>
  {result?.diff?.marks.map((m, i) => (
    <span key={i} className={"hanzi grid h-9 w-9 place-items-center rounded-lg border text-lg " + (
      m.state === "ok" ? "border-feedback-success bg-jade-wash text-feedback-success" :
      m.state === "bad" ? "border-feedback-error bg-rose-wash text-feedback-error" :
      "border-border-subtle bg-surface-muted text-text-secondary")}>
      {m.ch}
    </span>
  ))}
</div>
{result?.diff && (
  <div className="flex flex-wrap gap-2 text-xs font-bold">
    <Chip tone="neutral" data-testid="dict-badge-errors">Lỗi sai: {result.diff.errors}</Chip>
    <Chip tone="neutral" data-testid="dict-badge-missing">Thiếu: {result.diff.missing}</Chip>
    <Chip tone="neutral" data-testid="dict-badge-last">Điểm lần trước: {lineStat?.lastScore ?? "—"}</Chip>
    <Chip tone="neutral" data-testid="dict-badge-replays">Lượt phát lại: {lineStat?.replays ?? 0}</Chip>
  </div>
)}
<p data-testid="dict-reason">{result?.kind === "correct" ? "Hoàn toàn chính xác" : result?.kind === "wrong" ? `Bạn mắc ${(result.diff?.errors ?? 0) + (result.diff?.missing ?? 0)} lỗi — nghe lại và sửa nhé` : ""}</p>
```

Lưu ý token màu: dùng token có sẵn trong design system (`feedback-error`, `bg-rose-wash`…). Nếu `rose-wash` không tồn tại trong `globals.css` tokens, dùng token đang có cho trạng thái lỗi (tra `grep "feedback-error\|wash" app-next/src/app/globals.css | head` và dùng đúng tên; ghi vào report).

Nút variant switch (trên cùng panel):

```tsx
<div role="group" aria-label="Kiểu chép chính tả" className="flex gap-1 rounded-control border border-border-subtle bg-surface-muted p-0.5">
  <button type="button" data-testid="dict-variant-typing" aria-pressed={variant === "typing"}
    onClick={() => { setVariant("typing"); setDictVariant("typing"); }}
    className="min-h-9 flex-1 rounded-[9px] px-2 text-xs font-bold ...">Gõ chữ</button>
  <button type="button" data-testid="dict-variant-arrange" aria-pressed={variant === "arrange"}
    onClick={() => { setVariant("arrange"); setDictVariant("arrange"); }}
    className="min-h-9 flex-1 rounded-[9px] px-2 text-xs font-bold ...">Ghép từ</button>
</div>
```

- [ ] **Step 4: PASS + commit**

`pnpm vitest run "src/app/(app)/shadowing"` — PASS. Commit: `feat(shadowing): dictation typing variant — per-char diff + stats badges`

---

### Task 8: Dictation variant Arrange — ghép từ có shuffle deterministic

**Files:**
- Modify: `app-next/src/app/(app)/shadowing/[...videoId]/dictation-panel.tsx`
- Test: mở rộng `dictation-panel.test.tsx`

**Interfaces:**
- Consumes: `seedFor`/`shuffleSeeded` (Task 3), `curSub.words?: ShadowWord[]` (Task 4; fallback tiles từ `parts`), `normDict` (dictation.ts), `recordDictCheck`.
- Produces: testids `dict-arrange-bank` (hàng mảnh còn lại), `dict-arrange-built` (hàng đã ghép), `dict-arrange-tile` (mảnh), `dict-arrange-check`, `dict-arrange-wrong`.

- [ ] **Step 1: Test RED** (variant = arrange, mock localStorage trước render):

1. Render: `dict-arrange-bank` có N nút `dict-arrange-tile` (N = words?.length ?? parts.length của fixture).
2. SHUFFLE DETERMINISTIC: thứ tự tile KHÔNG đổi giữa 2 render (rerender same seed) — assert thứ tự text lần 1 == lần 2.
3. Tap tile 1 → tile chuyển vào `dict-arrange-built`; tap lại trong built → về bank.
4. Tap đủ N mảnh theo thứ tự ĐÚNG (fixture biết đáp án — tap theo index mảnh có text khớp từng từ đáp án) → `dict-arrange-check` → `dict-reason` "Hoàn toàn chính xác", `recordPractice` `{ score: 100 }`.
5. Ghép thiếu/thưa sai → check → `dict-arrange-wrong` hiện (tile built viền đỏ), `dict-badge-errors` >= 1.
6. Reset khi `cur` đổi → built rỗng.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement** — trong dictation-panel.tsx thêm state (chỉ khi variant arrange):

```tsx
import { seedFor, shuffleSeeded } from "@/lib/shadowing/arrange";

// tiles nguồn: ưu tiên words, fallback parts
const tiles = (curSub?.words?.length ? curSub.words.map((w) => w.zh) : (curSub?.parts.map((p) => p.zh) ?? []));
const [built, setBuilt] = useState<number[]>([]); // index vào shuffled
const [wrong, setWrong] = useState(false);
const shuffled = useMemo(
  () => shuffleSeeded(tiles.map((zh, i) => ({ zh, i })), seedFor(videoId, curSub?.n ?? 0)),
  [curSub, videoId] // tiles bắt nguồn từ curSub — eslint-disable nếu cần
);
useEffect(() => { setBuilt([]); setWrong(false); }, [curSub, videoId]);

function checkArrange() {
  if (!curSub) return;
  const guess = built.map((si) => shuffled[si].zh).join("");
  const d = diffChars(guess, full);
  const ok = d.errors === 0 && d.missing === 0;
  setWrong(!ok);
  recordDictCheck(videoId, curSub.n, ok ? 100 : 0, d.errors + d.missing);
  if (ok) { recordPractice(videoId, { score: 100, linesDoneDelta: 1 }); eng.next(); }
}
```

Render: hàng `dict-arrange-built` (tap mảnh trong built → bỏ khỏi built), hàng `dict-arrange-bank` (tap → thêm index), nút `dict-arrange-check` "KIỂM TRA". Tile class: `hanzi` + khi `wrong &&` mảnh thuộc built → viền `border-feedback-error bg-rose-wash` + testid `dict-arrange-wrong` trên container built.

- [ ] **Step 4: PASS + commit** — `feat(shadowing): dictation arrange variant — ghép từ shuffle deterministic`

---

### Task 9: Pron mode panel

**Files:**
- Create: `app-next/src/app/(app)/shadowing/[...videoId]/pron-panel.tsx`
- Modify: `shadowing-studio.tsx` (render `<PronPanel/>` khi mode pron; record dock giữ nguyên ở shadow)
- Test: `app-next/src/app/(app)/shadowing/[...videoId]/__tests__/pron-panel.test.tsx`

**Interfaces:**
- Consumes: `useRecorder` (`rec.start/stop/recording/simMode/lastUrl` — chữ ký như studio đang dùng), `scoreFor`, `subs`, `cur`, `rate` (engine), `videoId`, `recordPractice`, `toast`.
- Produces: `<PronPanel subs={subs} cur={eng.cur} rate={eng.rate} videoId={video.id} recordPractice={recordPractice} />`.

- [ ] **Step 1: Test RED** — jsdom (mock `useRecorder` qua `vi.mock("@/lib/shadowing/use-recorder")`, mock `scoreFor` trả 82):
1. Hiện câu active: `pron-zh` text = parts câu cur, `pron-py` hiện pinyin.
2. Click `pron-record` khi chưa thu → `rec.start` gọi; khi `recording` true → label đổi "DỪNG" và click → `rec.stop` gọi, `pron-score` hiện "82%".
3. Tip hiện "nói rõ từng âm tiết".
4. `recordPractice` được gọi với `{ score: 82, secondsDelta, linesDoneDelta: 1 }`.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement pron-panel.tsx**

```tsx
"use client";
/* Mode Pron — transcript thu gọn + ghi âm chấm điểm heuristic (spec WSD.5).
   Dùng lại useRecorder + scoreFor như record dock; KHÔNG SpeechRecognition. */
import { useState } from "react";
import { useRecorder } from "@/lib/shadowing/use-recorder";
import { scoreFor } from "@/lib/shadowing/scoring";
import { Button } from "@/components/ui/button";
import { Mic, Square, ICON_STROKE } from "@/components/ui/icon";
import type { SubtitleSentence } from "@/content/shadowing";

export default function PronPanel({ subs, cur, rate, videoId, recordPractice }: {
  subs: SubtitleSentence[]; cur: number; rate: number; videoId: string;
  recordPractice: (id: string, patch: { score?: number; secondsDelta?: number; linesDoneDelta?: number }) => void;
}) {
  const [level, setLevel] = useState(0);
  const rec = useRecorder(setLevel);
  const [score, setScore] = useState<number | null>(null);
  const curSub = subs[Math.min(cur, subs.length - 1)] ?? subs[0];
  const zh = curSub ? curSub.parts.map((p) => p.zh).join(" ") : "";

  function toggle() {
    if (rec.recording) {
      const r = rec.stop();
      if (!r) return;
      const s = scoreFor(r.secs, zh.length, rate, rec.simMode);
      setScore(s);
      recordPractice(videoId, { score: s, secondsDelta: Math.round(r.secs), linesDoneDelta: 1 });
    } else {
      setScore(null);
      rec.start();
    }
  }
  // render: Câu n · pinyin · vi, hanzi to (pron-zh), nút pron-record (Mic/Square),
  // pron-score chip, tip "Nói rõ từng âm tiết — nghe mẫu rồi nhại theo nhịp."
}
```

Icon `Square`/`Mic`: kiểm tra export có trong `@/components/ui/icon` — nếu thiếu `Square` dùng `CircleStop` hoặc icon lucide tương đương đã export; ghi report.

- [ ] **Step 4: PASS + commit** — `feat(shadowing): pron mode — transcript thu gọn + ghi âm chấm điểm`

---

### Task 10: Karaoke + toggle "Tự ngắt câu" + wire panel vào studio

**Files:**
- Modify: `shadowing-studio.tsx`
- Test: mở rộng test studio

**Interfaces:**
- Consumes: `eng.time`, `eng.autoPause`, `eng.setAutoPause` (Task 5), `activeWordIndex` (Task 3), `s.words` (Task 4).
- Produces: testids `auto-pause` (toolbar toggle), `kw` (span từ karaoke), `kw-active` (từ đang phát).

- [ ] **Step 1: Karaoke trong transcript** — thay render `s.parts.map(...)` của câu active bằng word spans khi có words:

```tsx
// helper trong studio (top-level function, pure):
function activeIdx(s: SubtitleSentence, tSec: number): number {
  if (!s.words || s.words.length === 0) return -1;
  return activeWordIndex(s.words, tSec * 1000);
}
// render câu i (mode shadow):
const ai = i === eng.cur ? activeIdx(s, eng.time) : -1;
<div className={"zh font-semibold " + ...} data-zh>
  {s.words && s.words.length > 0 && i === eng.cur
    ? s.words.map((w, wi) => (
        <span key={wi} data-testid="kw" data-word={wi}
          className={wi === ai ? "kw-active" : ""}>{w.zh}</span>
      ))
    : s.parts.map((p, pi) => <span key={pi} data-part={pi}>{p.zh}</span>)}
</div>
```

`kw-active` — thêm vào `globals.css` (block shadowing hiện có) hoặc style inline token: `text-action-primary` + underline. Dùng class utility thay vì CSS mới nếu đủ: `className={wi === ai ? "rounded bg-jade-wash text-action-primary" : ""}` — giữ token, không CSS tay.

- [ ] **Step 2: Toggle auto-pause** — trong player toolbar, CHỈ khi `subs.some((s) => s.words)` (video YouTube W1):

```tsx
<Button size="sm" variant={eng.autoPause ? "primary" : "secondary"} onClick={() => eng.setAutoPause(!eng.autoPause)}
  aria-pressed={eng.autoPause} data-testid="auto-pause" title="Tự ngắt cuối câu theo word timing">
  Tự ngắt
</Button>
```

- [ ] **Step 3: Wire panels** — dict-box inline hiện tại của studio THAY BẰNG:

```tsx
<DictationPanel subs={subs} cur={eng.cur} videoId={video.id}
  eng={{ cur: eng.cur, listenCurrent: eng.listenCurrent, prev: eng.prev, next: eng.next }}
  recordPractice={recordPractice} />
```

và thêm `{mode === "pron" && <PronPanel ... />}`. Xóa code dictation cũ trong studio (state `value/result/dictShown`, hàm `check`, `dictChars`, imports `normDict`, block JSX dict-box) — panel mới đã thay thế.

- [ ] **Step 4: Test studio** — assert: video fixture có words → toggle `auto-pause` aria-pressed flip; câu active render `kw` spans; mode dict → `dict-box` vẫn testid (từ panel); mode pron → `pron-panel`. `pnpm vitest run src/app src/lib src/components`

- [ ] **Step 5: Commit** — `feat(shadowing): karaoke word highlight + toggle tự ngắt câu + wire dict/pron panels`

---

### Task 11: E2E spec + suite xanh toàn repo

**Files:**
- Create: `app-next/e2e/shadowing-dictation.spec.ts`
- Verify-only: toàn bộ unit + e2e + typecheck + lint

**Interfaces:**
- Consumes: tất cả task trước. Dev server e2e port 3100 (`pnpm test:e2e` — Playwright config hiện có tự bật server theo config repo).
- Dữ liệu: DB `hsk-dev` đã seed WSD (Task 6). Video `EA3rwvr99Q0` có words.

- [ ] **Step 1: Viết e2e** (theo pattern `media-documents-smoke.spec.ts` — import test/expect từ config repo):

```ts
// app-next/e2e/shadowing-dictation.spec.ts
import { expect, test } from "@playwright/test";

test.describe("WSD shadowing dictation", () => {
  test("mode switch 3 tab + phím tắt", async ({ page }) => {
    await page.goto("/shadowing/EA3rwvr99Q0");
    await expect(page.getByTestId("mode-shadow")).toBeVisible();
    await page.getByTestId("mode-dict").click();
    await expect(page.getByTestId("dict-box")).toBeVisible();
    await page.keyboard.press("3"); // Digit3
    await expect(page.getByTestId("pron-panel")).toBeVisible();
    await page.keyboard.press("1");
    await expect(page.getByTestId("transcript-stream")).toBeVisible();
  });

  test("dictation typing sai → per-char highlight + badges; đúng → reason + score", async ({ page }) => {
    await page.goto("/shadowing/EA3rwvr99Q0");
    // lấy nguyên văn câu 1 từ transcript (data-zh span đầu tiên)
    const answer = (await page.locator("[data-zh]").first().innerText()).replace(/\s+/g, "");
    await page.keyboard.press("2");
    await page.getByTestId("dict-input").fill("这是完全错误的答案啊");
    await page.getByTestId("dict-check").click();
    await expect(page.getByTestId("dict-diff")).toBeVisible();
    await expect(page.getByTestId("dict-badge-errors")).toContainText(/\d/);
    await page.getByTestId("dict-input").fill(answer);
    await page.getByTestId("dict-check").click();
    await expect(page.getByTestId("dict-reason")).toContainText("Hoàn toàn chính xác");
  });

  test("arrange: tap mảnh → ghép; thiếu mảnh check → đỏ", async ({ page }) => {
    await page.goto("/shadowing/EA3rwvr99Q0");
    await page.keyboard.press("2");
    await page.getByTestId("dict-variant-arrange").click();
    const bank = page.getByTestId("dict-arrange-bank");
    await expect(bank.getByTestId("dict-arrange-tile").first()).toBeVisible();
    await bank.getByTestId("dict-arrange-tile").first().click();
    await expect(page.getByTestId("dict-arrange-built").getByTestId("dict-arrange-tile")).toHaveCount(1);
    // ghép chưa đủ mà check → sai (giả định câu > 2 từ; EA3rwvr99Q0 câu 1 ≥ 3 từ)
    await page.getByTestId("dict-arrange-check").click();
    await expect(page.getByTestId("dict-arrange-wrong")).toBeVisible();
  });

  test("variant và auto-pause nhớ localStorage", async ({ page }) => {
    await page.goto("/shadowing/EA3rwvr99Q0");
    await page.keyboard.press("2");
    await page.getByTestId("dict-variant-arrange").click();
    await page.reload();
    await page.keyboard.press("2");
    await expect(page.getByTestId("dict-variant-arrange")).toHaveAttribute("aria-pressed", "true");
    // auto-pause chỉ hiện trên video có words
    const ap = page.getByTestId("auto-pause");
    await ap.click();
    await expect(ap).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(ap).toHaveAttribute("aria-pressed", "true");
  });

  test("pron panel render + nút ghi (không cần mic thật)", async ({ page }) => {
    await page.goto("/shadowing/EA3rwvr99Q0");
    await page.keyboard.press("3");
    await expect(page.getByTestId("pron-zh")).toBeVisible();
    await expect(page.getByTestId("pron-record")).toBeVisible();
  });
});
```

Lưu ý: trang `/shadowing/EA3rwvr99Q0` không cần login (guest progress local). Nếu Playwright config dùng webServer `pnpm dev` port 3100 — giữ nguyên. Mic không tap thật (jsdom e2e không cấp quyền) — chỉ assert render; hành vi ghi thật để browser QA (phía dưới).

- [ ] **Step 2: Chạy e2e mới + e2e cũ không vỡ**

```bash
pnpm test:e2e -- e2e/shadowing-dictation.spec.ts
pnpm test:e2e   # full — e2e cũ (hydration, content-d1, media-documents-smoke…) phải xanh
```

Expected: PASS toàn bộ. E2E flake do compile lạnh đã biết — chạy lại 1 lần trước khi kết luận.

- [ ] **Step 3: Suite xanh toàn repo**

```bash
pnpm test && pnpm typecheck && pnpm lint
```

Expected: unit (228+ files) xanh, typecheck 0 lỗi, lint 0 lỗi mới.

- [ ] **Step 4: Commit + kịch bản browser QA**

Viết `docs/superpowers/testcases/2026-10-26-shadowing-dictation.md` — danh sách test case control-browser (xem mục "Kịch bản automation test" cuối plan) và commit:

```bash
git add app-next/e2e/shadowing-dictation.spec.ts docs/superpowers/testcases/2026-10-26-shadowing-dictation.md
git commit -m "test(shadowing): e2e dictation 2 variant + pron + mode switch; kịch bản browser QA"
```

---

## Kịch bản automation test (control-browser — chạy sau khi Task 11 xanh)

Lưu vào `docs/superpowers/testcases/2026-10-26-shadowing-dictation.md` khi làm Task 11. Dev server :3100 (`pnpm dev`), Chrome thật qua control-browser (IAB), login guest không cần:

| # | Kịch bản | Bước | Kỳ vọng |
|---|----------|------|---------|
| T1 | Mode switch phím | Mở `/shadowing/EA3rwvr99Q0`, bấm phím 2 → 3 → 1 | Panel dict → pron → transcript tương ứng, aria-pressed đúng |
| T2 | Typing sai | Mode 2, gõ "这是完全错误的答案啊", Kiểm tra | dict-diff hiển thị per-char (đỏ/xanh/skip), badge Lỗi sai > 0, reason "Bạn mắc n lỗi" |
| T3 | Typing đúng | Gõ nguyên văn câu 1 (copy từ transcript), Kiểm tra | "Hoàn toàn chính xác", score 100 ghi progress |
| T4 | Stats nhớ | Sau T2, check đúng câu đó; phát lại 2 lần (Nghe câu mẫu); check lại | Badge Điểm lần trước = % trước; Lượt phát lại = 2 |
| T5 | Hint 👁 | Mode 2, bấm 👁 3 lần | 3 ô đầu hiện chữ, còn lại "?" |
| T6 | Arrange đúng | Variant Ghép từ, tap đủ mảnh theo thứ tự đúng, KIỂM TRA | "Hoàn toàn chính xác", tự sang câu sau |
| T7 | Arrange sai | Tap thiếu 1 mảnh, KIỂM TRA | Mảnh built viền đỏ, badge lỗi ≥ 1 |
| T8 | Variant nhớ | Đổi Ghép từ, reload, vào mode 2 | Variant vẫn Ghép từ |
| T9 | Karaoke | Mode 1, bấm Phát, xem câu active | Từ đang phát highlight chạy theo (kw-active chuyển) |
| T10 | Auto-pause | Bật "Tự ngắt", Phát | Video dừng tại cuối câu (word cuối), aria-pressed true |
| T11 | Auto-pause nhớ | Reload sau T10 | Toggle vẫn bật |
| T12 | Pron record | Mode 3, giữ/click BẮT ĐẦU GHI ÂM nói 2s, DỪNG | Score % hiện, toast/progress cập nhật |
| T13 | Audio mode không vỡ | Mở `/shadowing/hsk1/lesson-1`, bấm 2 → 3 | Dict panel chạy theo parts (không words), không crash; không có nút Tự ngắt |
| T14 | Phím cũ giữ nguyên | K (play), L (loop), ←/→ (chuyển câu), Space giữ thu | Hành vi như trước |

---

## Self-Review (đã chạy)

1. **Spec coverage:** WSD.1 → Task 4; WSD.2 (diff-chars/stats/auto-pause) → Task 1,2,3; WSD.3 mode switch → Task 6; WSD.4 typing+arrange → Task 7,8; WSD.5 karaoke/auto-pause/pron → Task 5,9,10; Acceptance unit/e2e/browser → Task 11 + kịch bản. Không còn gap.
2. **Placeholder scan:** mọi step có code/mệnh lệnh cụ thể; 2 điểm mở có chỉ dẫn tra cứu tường minh (token `rose-wash` Task 7, icon `Square` Task 9, parts Task 4) — đều có phương án fallback và yêu cầu ghi report.
3. **Type consistency:** `ShadowWord` định nghĩa Task 4, dùng Task 3/8/10; `DictStats` Task 2 dùng Task 7; `DiffResult` Task 1 dùng Task 7/8; `eng` return mới (time/autoPause/setAutoPause) Task 5 dùng Task 10. ✅
