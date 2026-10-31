# Reading Phase 1 — Library theo level + Player mp3 + Quiz evidence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thư viện bài đọc theo level HSK1–5 (D1), trình đọc mp3 pre-render highlight theo từ (timing ước lượng), loop câu, seek, pinyin/dịch toggle, quiz MCQ + evidence highlight, progress + sync.

**Architecture:** Content lên D1 (`content_readings`) seed từ passages JSON mở rộng; audio mp3 per-câu render bằng Python Kokoro (public/, CDN); client đọc qua `/api/v1/content/readings`; player hook thống nhất 2 nguồn (mp3 + fallback TTS karaoke); progress `readingProgress` là domain sync thứ 5.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4 (Hanzi tokens), Drizzle + D1, Vitest jsdom, Playwright, Python Kokoro (.venv-kokoro).

**Spec:** `docs/superpowers/specs/2026-10-30-reading-library-design.md`

## Global Constraints

- Chạy mọi lệnh từ `app-next/`, dùng pnpm (npm phá node_modules).
- Migration: `pnpm drizzle-kit generate` → apply bằng `pnpm wrangler d1 migrations apply hsk-dev --local -c wrangler.dev.jsonc`; KHÔNG `drizzle-kit migrate`. Prod `hsk --remote` apply lúc deploy (owner).
- Seed SQL: escape `'` và encode `;` trong JSON column thành `\u003b` (wrangler cắt statement theo `;`). Idempotent INSERT OR REPLACE. Không sửa seed tay.
- Design: Hanzi tokens (`src/components/ui/*`), không hard-code màu, icon qua `ui/icon.tsx` (lucide), touch target 44px.
- Test: `pnpm test` (vitest jsdom) phải xanh trước khi commit mỗi task; cuối plan chạy `pnpm typecheck && pnpm lint && pnpm test`.
- Không import dataset từ `src/content/` ở client — chỉ qua content client.
- Path alias `@` → `src/`.

---

### Task 1: Type `ReadingDoc` + schema D1 `content_readings` + migration

**Files:**
- Create: `src/lib/content/readings.ts`
- Modify: `src/lib/db/schema.ts` (cuối section content_*)
- Test: `src/lib/content/__tests__/readings.test.ts`

**Interfaces:**
- Produces: `type ReadingDoc = { id, level, ord, title, titleVi, sentences: ReadingDocSentence[], vocab: ReadingVocabRow[], questions: ReadingQuestionRow[], audioDir: string, chars: number, durationSec: number }`; `ReadingDocSentence = { zh: string; py: string; vi: string; audio: string | null; durSec: number }`; `ReadingVocabRow = { word: string; py: string; vi: string }`; `ReadingQuestionRow = { q: string; qVi: string; options: string[]; answer: number; evidence?: { si: number; s: number; e: number }[] }`; `getReadings(): Promise<ReadingDoc[]>` (server-only, Task 2 dùng).

- [ ] **Step 1: Viết test shape đầu tiên (fail)**

```ts
// src/lib/content/__tests__/readings.test.ts
import { describe, it, expect } from "vitest";
import type { ReadingDoc } from "@/lib/content/readings";

describe("ReadingDoc contract", () => {
  it("sentence + question shapes", () => {
    const doc: ReadingDoc = {
      id: "hsk1-reading-1", level: "hsk1", ord: 1,
      title: "我的家", titleVi: "Gia đình của tôi",
      sentences: [{ zh: "我家在北京。", py: "Wǒ jiā zài Běijīng.", vi: "Nhà tôi ở Bắc Kinh.", audio: "sent-1.mp3", durSec: 2.4 }],
      vocab: [{ word: "家", py: "jiā", vi: "nhà" }],
      questions: [{ q: "我家有几口人？", qVi: "Nhà tôi có mấy người?", options: ["三口", "四口"], answer: 0, evidence: [{ si: 2, s: 0, e: 6 }] }],
      audioDir: "audio/reading/hsk1-reading-1", chars: 120, durationSec: 45,
    };
    expect(doc.sentences[0].durSec).toBeGreaterThan(0);
    expect(doc.questions[0].evidence?.[0].si).toBe(2);
  });
});
```

- [ ] **Step 2: `pnpm vitest run src/lib/content/__tests__/readings.test.ts` → FAIL (không có module/type)**
- [ ] **Step 3: Tạo `src/lib/content/readings.ts`**

```ts
/* Content layer — readings (spec 2026-10-30 reading-library). Nguồn D1 content_readings.
   Type dùng chung client/server; getReadings() chỉ chạy server (D1 binding). */
export type ReadingDocSentence = { zh: string; py: string; vi: string; audio: string | null; durSec: number };
export type ReadingVocabRow = { word: string; py: string; vi: string };
export type ReadingEvidence = { si: number; s: number; e: number };
export type ReadingQuestionRow = { q: string; qVi: string; options: string[]; answer: number; evidence?: ReadingEvidence[] };
export type ReadingDoc = {
  id: string; level: string; ord: number;
  title: string; titleVi: string;
  sentences: ReadingDocSentence[];
  vocab: ReadingVocabRow[];
  questions: ReadingQuestionRow[];
  audioDir: string; chars: number; durationSec: number;
};

export async function getReadings(): Promise<ReadingDoc[]> {
  const { createDb } = await import("@/lib/db");
  const { contentReadings } = await import("@/lib/db/schema");
  const { asc } = await import("drizzle-orm");
  const db = createDb();
  const rows = await db.select().from(contentReadings).orderBy(asc(contentReadings.level), asc(contentReadings.ord));
  return rows.map((r) => ({
    id: r.id, level: r.level, ord: r.ord, title: r.title, titleVi: r.titleVi,
    sentences: r.sentences as ReadingDocSentence[],
    vocab: r.vocab as ReadingVocabRow[],
    questions: r.questions as ReadingQuestionRow[],
    audioDir: r.audioDir, chars: r.chars, durationSec: r.durationSec,
  }));
}
```

- [ ] **Step 4: Thêm vào `src/lib/db/schema.ts` (pattern contentGrammars)**

```ts
type ReadingSentenceRow = { zh: string; py: string; vi: string; audio: string | null; durSec: number };
type ReadingVocabRow = { word: string; py: string; vi: string };
type ReadingQuestionRow = { q: string; qVi: string; options: string[]; answer: number; evidence?: { si: number; s: number; e: number }[] };

export const contentReadings = sqliteTable(
  "content_readings",
  {
    id: text("id").primaryKey(),
    level: text("level").notNull(),
    ord: integer("ord").notNull(),
    title: text("title").notNull(),
    titleVi: text("title_vi").notNull(),
    sentences: text("sentences", { mode: "json" }).$type<ReadingSentenceRow[]>().notNull(),
    vocab: text("vocab", { mode: "json" }).$type<ReadingVocabRow[]>().notNull(),
    questions: text("questions", { mode: "json" }).$type<ReadingQuestionRow[]>().notNull(),
    audioDir: text("audio_dir").notNull(),
    chars: integer("chars").notNull(),
    durationSec: integer("duration_sec").notNull(),
  },
  (t) => [index("content_readings_level_idx").on(t.level)]
);
```

- [ ] **Step 5: `pnpm drizzle-kit generate` → kiểm file SQL mới trong `drizzle/` có `CREATE TABLE content_readings`; `pnpm wrangler d1 migrations apply hsk-dev --local -c wrangler.dev.jsonc`**
- [ ] **Step 6: `pnpm vitest run src/lib/content/__tests__/readings.test.ts` → PASS; `pnpm typecheck` xanh**
- [ ] **Step 7: Commit** `git add -A && git commit -m "feat(reading): content_readings schema + ReadingDoc contract"`

### Task 2: API route `/api/v1/content/readings` + client loader

**Files:**
- Create: `src/app/api/v1/content/readings/route.ts`
- Create: `src/lib/content/readings-client.ts`
- Test: `src/lib/content/__tests__/readings-client.test.ts`

**Interfaces:**
- Consumes: `getReadings()` (Task 1).
- Produces: `loadReadings(): Promise<ReadingDoc[]>` — promise cache, nhiều lần gọi = 1 fetch; `loadReadingsMock(docs)` setter test-only để inject.

- [ ] **Step 1: Test client cache (fail)**

```ts
// src/lib/content/__tests__/readings-client.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => vi.unstubAllGlobals());

describe("loadReadings", () => {
  it("fetch đúng endpoint và cache promise (1 fetch)", async () => {
    const docs = [{ id: "a" }];
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(docs), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { loadReadings, __resetReadingsCache } = await import("@/lib/content/readings-client");
    __resetReadingsCache();
    await loadReadings();
    await loadReadings();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/content/readings");
  });
});
```

- [ ] **Step 2: Chạy → FAIL. Step 3: implement route + client (route copy pattern `src/app/api/v1/content/vocab/route.ts` — force-dynamic + Cache-Control `public, s-maxage=3600, stale-while-revalidate=86400`, error 500 "Không đọc được bài đọc").** Client:

```ts
// src/lib/content/readings-client.ts
import type { ReadingDoc } from "@/lib/content/readings";
let cache: Promise<ReadingDoc[]> | null = null;
export function loadReadings(): Promise<ReadingDoc[]> {
  if (!cache) {
    cache = fetch("/api/v1/content/readings").then((r) => {
      if (!r.ok) throw new Error(`content/readings HTTP ${r.status}`);
      return r.json() as Promise<ReadingDoc[]>;
    });
  }
  return cache;
}
export function __resetReadingsCache() { cache = null; }
```

- [ ] **Step 4: Test PASS. Step 5: Commit** `feat(reading): /api/v1/content/readings + client loader`

### Task 3: Audio render script + index (Python, manual run)

**Files:**
- Create: `scripts/content/render-reading-audio.py`
- Create: `scripts/content/data/reading/audio-index.json` (output)
- Test: `scripts/__tests__/reading-audio-index.test.ts` (validate committed index khớp passages)

**Chi tiết:**
- Copy cấu trúc `render-dialogue-audio.py` (KPipeline, zf_001, 24kHz mono, libmp3lame 32k, ffprobe duration, `--force/--dry-run/--only <passageId>`). Đọc `data/reading/passages-hsk{1..5}.json`, render mỗi câu → `public/audio/reading/{id}/sent-{n}.mp3` (n từ 1).
- Output `audio-index.json`: `Record<passageId, { sentences: { audio: string; durSec: number }[] }>`; script cập nhật durSec.
- QA gate: duration mỗi câu 0.3–20s, RMS > -50dBFS (bỏ im lặng); fail → report stderr + exit 1.
- Mở rộng passages: chạy `pnpm dlx tsx scripts/content/gen-reading.mts --level N --count 3` cho N=1..5 (manual, cần CONTENT_LLM_* env) — mục tiêu ≥6/level; nếu LLM lỗi thì ship với số hiện có + evidence bổ sung bằng tay cho bài mới.

- [ ] **Step 1: Viết script + test validate index:**

```ts
// scripts/__tests__/reading-audio-index.test.ts
import { readFileSync, existsSync } from "node:fs";
import { describe, it, expect } from "vitest";
const idx = JSON.parse(readFileSync(new URL("../content/data/reading/audio-index.json", import.meta.url), "utf8"));
describe("audio-index.json", () => {
  it("mỗi passage có sentences khớp passages JSON và durSec hợp lệ", () => {
    const src = JSON.parse(readFileSync(new URL("../content/data/reading/passages-hsk1.json", import.meta.url), "utf8"));
    for (const p of src) {
      expect(idx[p.id], p.id).toBeDefined();
      expect(idx[p.id].sentences.length).toBe(p.sentences.length);
      for (const s of idx[p.id].sentences) {
        expect(s.durSec).toBeGreaterThan(0.2);
        expect(existsSync(new URL(`../../../public/audio/reading/${p.id}/${s.audio}`, import.meta.url))).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Render (manual): `source .venv-kokoro/bin/activate && python scripts/content/render-reading-audio.py` — script tự ghi index. Step 3: test PASS. Step 4: Commit** `feat(reading): render sentence mp3 + audio-index`

### Task 4: Seed generator `content-readings.sql`

**Files:**
- Create: `scripts/seed/gen-reading-seed.mts`
- Create: `drizzle/seeds/content-readings.sql` (output)
- Test: `scripts/seed/__tests__/gen-reading-seed.test.ts`

**Chi tiết:** pattern `gen-grammar-seed.mts` — đọc passages JSON + audio-index.json, gộp thành ReadingDoc rows, `INSERT OR REPLACE INTO content_readings ...`; hàm `jsonCol()` escape `'` → `''` và `;` → `\u003b`; chars = tổng ký tự Hán normalize; durationSec = round tổng durSec. Test: sinh SQL string cho fixture 1 passage → assert không chứa `;` đứng ngoài, chứa `\u003b` khi JSON có `;`, idempotent (INSERT OR REPLACE).

- [ ] **Steps: test fail → generator → test pass → chạy `pnpm dlx tsx scripts/seed/gen-reading-seed.mts` → `pnpm wrangler d1 execute hsk-dev --local -c wrangler.dev.jsonc --file drizzle/seeds/content-readings.sql` → verify `/api/v1/content/readings` trả data trên `pnpm dev`. Commit** `feat(reading): seed content-readings`

### Task 5: ProgressStore `readingProgress` + XP

**Files:**
- Modify: `src/lib/store/progress-store.ts`
- Test: `src/lib/store/__tests__/progress-store-reading-progress.test.ts`

**Interfaces:**
- Produces: `getReadingProgress(): Record<string, ReadingProgressRec>`; `saveReadingProgress(id: string, correct: number, total: number): ReadingProgressRec` — attempts++, correct = max(cũ, mới), completedAt = ISO; key `nhai.reading.progress`. `ReadingProgressRec = { correct: number; total: number; attempts: number; completedAt: string }`.

- [ ] **Step 1: Test (fail):** save 2 lần → attempts 2, correct giữ max, completedAt cập nhật; độc lập với store khác; shape khớp spec.
- [ ] **Step 2: Implement theo pattern `getReadingDrafts` (readJSON/writeJSON).** XP chỉ ở UI (Task 9) gọi `addXp` — không nhúng vào store.
- [ ] **Step 3: PASS → Commit** `feat(reading): progress store readingProgress`

### Task 6: Sync domain `readingProgress` (HybridStore + sync-merge + D1 + route)

**Files:**
- Modify: `src/lib/db/schema.ts` (thêm `reading_progress`), `drizzle/` (generate+apply), `src/lib/store/sync-merge.ts`, `src/lib/store/hybrid-store.ts`, `src/app/api/v1/sync/route.ts`
- Test: `src/lib/store/__tests__/sync-merge.test.ts` (thêm case), test hybrid dirty qua test hiện có

**Chi tiết:**
- Bảng: `reading_progress { userId, readingId PK, correct, total, attempts, completedAt (text ISO), updatedAt epoch ms }` — không tombstone (không xóa).
- `SyncReadingRecord = { readingId, correct, total, attempts, completedAt, updatedAt }`; `SyncPayload` thêm `readingProgress: SyncReadingRecord[]`; `mergeReadingProgress(a,b)` = updatedAt lớn thắng; bỏ qua record có updatedAt < server (giữ pattern mergeLesson).
- `SyncDomain` thêm `"readingProgress"`; PATCHES thêm `["saveReadingProgress", ["readingProgress"]]` (XP do `addXp` tự sync studyDay — không nhúng vào đây).
- Route sync: nhận/merge/ghi vào `reading_progress` (pattern lessonProgress trong route).

- [ ] **Steps: test merge fail → implement → PASS → `drizzle-kit generate` + apply hsk-dev → Commit** `feat(reading): sync domain readingProgress`

### Task 7: Hook `useReadingPlayer`

**Files:**
- Create: `src/components/reading/use-reading-player.ts`
- Test: `src/components/reading/__tests__/use-reading-player.test.tsx`

**Interfaces:**
- Consumes: `PlayerSentence = { zh: string; py: string | null; vi: string; audio: string | null; durSec: number }`.
- Produces: `useReadingPlayer(sentences)` → `{ playing, curIdx, charPos: { row, char } | null, rate, loopSentence, curTime, duration, toggle, next, prev, seekSentence(i), seekGlobal(t), setRate, setLoopSentence }`. Audio qua class stub được inject (DI cho test): `useReadingPlayer(sentences, makeAudio = (src) => new Audio(src))`.

**Logic chính (implement đúng):**
- `charWeights(zh)`: ký tự `/\p{Script=Han}/u` = 1, số/latin = 1.5, khác (dấu câu) = 0.2; cumulative → `charPos(t)`.
- Playback mp3: `makeAudio(path)`; `onended` → nếu loopSentence replay câu, ngược lại next (hết list stop). `setRate` áp `audio.playbackRate` của câu đang active. `curTime` tick bằng rAF từ `audio.currentTime + offset(các câu trước)`; `duration = Σ durSec`.
- Fallback TTS khi `audio == null`: delegate `useKaraoke` (đã có) — `playing/curIdx/charPos` map ra interface chung; seek slider ẩn khi `!hasAudio` (`hasAudio = sentences.every(s => s.audio)`).

- [ ] **Step 1: Test fail — cases:** charWeights (dấu câu weight thấp), seekGlobal map đúng câu+offset, loop replay (fake audio onended không next), rate truyền vào audio.playbackRate, fallback TTS khi audio null.
- [ ] **Step 2–4: implement → PASS.** [ ] **Step 5: Commit** `feat(reading): useReadingPlayer hook`

### Task 8: Component `ReadingPlayer` (toolbar + evidence + pinyin/vi toggle)

**Files:**
- Create: `src/components/reading/reading-player.tsx`
- Modify: xóa dần nội dung cũ của `reading-client.tsx` (Task 9 thay)
- Test: `src/components/reading/__tests__/reading-player.test.tsx`

**UI:**
- Toolbar sticky: nút prev/play(pause)/next, Loop câu (variant default khi bật), tốc độ "1x" xoay vòng mảng, toggle 拼 (pinyin, localStorage `nhai.reading.pinyin`), toggle Dịch; seek slider (ẩn khi !hasAudio) + thời gian `m:ss / m:ss`.
- Bài: mỗi câu `<span data-sentence>` highlight khi `curIdx === i`; pinyin toggle → hàng ruby nhỏ trên câu (`<ruby>` per từ, py có sẵn); dịch toggle → `<p>` italic dưới câu. Click câu → `seekSentence(i)`.
- Quiz section dưới bài: mỗi question là card, options render 4 nút; sau chọn: đúng → `bg-success-soft`, sai → `bg-danger-soft` + reveal đáp án; **evidence highlight**: range trong câu `si` được bọc `<mark data-evidence>` (bg-main-hi/60, underline) và scroll tới câu đầu tiên; nút "Làm lại" reset.
- Khi hết câu đúng ≥60% lần đầu → gọi `onComplete(correct, total)` (cha lo XP + progress).

- [ ] **Step 1: Test fail — cases:** render câu + toggle pinyin hiện ruby; chọn đúng/sai tô màu + evidence mark xuất hiện trong câu đúng + scroll called (mock scrollIntoView); "Làm lại" clear; onComplete fire 1 lần duy nhất dù bấm lại quiz.
- [ ] **Step 2–4: implement → PASS. Step 5: Commit** `feat(reading): ReadingPlayer UI + evidence quiz`

### Task 9: Library UI viết lại `/reading`

**Files:**
- Modify: `src/app/(app)/reading/reading-client.tsx` (viết lại, giữ ToastProvider/LoginModal shell + Callout 6 bước), `src/app/(app)/reading/page.tsx` (nếu cần prop)
- Test: `src/app/(app)/reading/__tests__/reading-client.test.tsx` (viết lại), `reading-ai.test.tsx` — chuyển phần tạo-bài-AI sang Phase 2 (xóa test đó trong task này, không xóa file karaoke)

**UI:**
- View list: header mascot + **tab level** (`Tất cả | HSK 1..HSK 5`) — tab là button (`aria-current="page"` khi active); URL `?level=hskN` deep-link (read on mount + replaceState khi đổi).
- Mỗi level = section: tiêu đề `HSK N (n bài)` + hàng card `overflow-x-auto snap-x` + 2 nút mũi tên hiện theo scroll (scrollBy 0.8 clientWidth). Card: button aspect-video cover speckle (title zh to) + titleVi + meta `m:ss · n chữ` + badge "Done ✓" khi `progress[id]` tồn tại.
- Nút "Xem tất cả →" mỗi section → grid view 1 level + nút Back.
- Mở bài: đổi state `openId` → render `ReadingPlayer` + nút "← Danh sách". `onComplete` → `saveReadingProgress` + nếu lần đầu đạt ≥60% → `addXp(total * 10)`.
- Guest vẫn dùng được đầy đủ (progress local); LoginModal chỉ phục vụ Phase 2 Mine.

- [ ] **Step 1: Test fail — cases:** render tab + card từ mock `loadReadings` (vi.mock), click card → player render câu đầu, quiz xong → progress store ghi + addXp 1 lần, `?level=hskN` mở đúng grid.
- [ ] **Step 2–4: implement → PASS. Step 5: `pnpm test` toàn bộ xanh. Commit** `feat(reading): library theo level + integrate player`

### Task 10: e2e + verification cuối

**Files:**
- Create: `e2e/reading-library.spec.ts`

**Cases:** mở /reading thấy tab + card; mở bài → câu render; toggle pinyin/dịch; trả quiz đúng → evidence highlight + toast/badge Done; reload → badge còn. Chạy: `pnpm test:e2e` (tự start :3100 — cần `hsk-dev` đã migrate+seed).

- [ ] **Step 1: viết spec; Step 2: chạy PASS (retry 1 lần nếu flake compile lạnh — quy tắc đã biết); Step 3: `pnpm typecheck && pnpm lint && pnpm test` xanh; Commit** `test(reading): e2e library`
- [ ] **Step 4: LƯU Ý deploy:** migrate + seed remote `hsk --remote` là việc owner lúc deploy (ghi vào commit message).
