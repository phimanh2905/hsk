# Roadmap Journey v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến `/roadmap` thành journey đầy đủ Pinyin → HSK 5: trạm nhóm-5-bài sinh tự động, micro-session trong drawer (Ôn nhanh → Học → Bài kiểm tra), cổng đầu vào HSK 1 (quiz nghe pinyin, miễn khi xong Pinyin), % toàn lộ trình có trọng số.

**Architecture:** Generator build-time xuất metadata bài học nhẹ (`roadmap-generated.ts`); station quiz load vocab động qua API D1 mới `vocab-lesson`; câu nghe dùng `useTts` có sẵn với fallback câu đọc; gates lưu progressStore key mới; giữ nguyên derive tuần tự + best-of của Hướng B.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4 + token Hanzi, zod, Vitest + Testing Library (jsdom), pnpm.

**Spec:** `docs/superpowers/specs/2026-10-29-roadmap-journey-design.md` (đọc kèm — plan lập luận từ spec).

## Global Constraints

- Chạy mọi lệnh từ `app-next/`, chỉ dùng **pnpm** (npm phá node_modules).
- UI tuân thủ token Hanzi (`DESIGN.md`): không hard-code màu primitive — dùng `bg-action-primary`, `text-text-secondary`, `border-border-default`, `bg-surface-elevated`…
- Client component đọc localStorage chỉ sau mount (mount-gate SSR-safe), sync qua event `bye:progress`.
- `PASS_PCT = 80`; station quiz best-of; sao 100/90/80 (giữ nguyên Hướng B).
- Không migration D1; route mới chỉ đọc.
- Mỗi task: test đỏ → code → test xanh → `pnpm typecheck && pnpm lint` → commit.
- QA browser chạy dev server :3101 (`pnpm dev -- -p 3101` style — script QA tự ghi chú), headless Chromium cần kill-transition CSS (đã có trong script cũ).

**Rulings chốt (đã ghi trong spec §3, nhắc lại cho executor):**
1. hsk-2 **không migrate**: giữ 7 trạm curated (ids `1..6`, `m` — bảo toàn progress), thêm các nhóm generator cho bài còn lại với id `b1..bN` đặt sau Trạm 6.
2. LevelId mới: thêm `"pinyin"`, `"hsk-4"`, `"hsk-5"`, `"hsk-6"`, `"hsk-7-9"`; bỏ `"hsk-4-6"` (chưa có record nào). `pinyin` = banner-only available; `hsk-6`, `hsk-7-9` = upcoming.
3. Trạm sinh tự động: gram pool rỗng (chỉ vocab + nghe); milestone lấy mẫu 4 bài ngẫu nhiên của level (4 request API) → 12 câu.
4. Station pct = max(quiz pct, % bài học nhóm đã xong qua `markPageDone`).
5. Câu nghe: audioText = **hanzi** của từ (TTS đọc tiếng Trung tốt), options = 4 pinyin có dấu; fallback câu đọc khi TTS không sẵn sàng.

---

### Task 1: Build-time generator — `roadmap-generated.ts`

**Files:**
- Create: `app-next/scripts/seed/gen-roadmap-stations.mts`
- Create: `app-next/src/content/roadmap-generated.ts` (output, commit cả hai)
- Test: `app-next/src/content/__tests__/roadmap-generated.test.ts`

**Interfaces:**
- Produces: `generatedLessons: Array<{ book: string; page: string; title: string; wordCount: number }>` — sắp theo book (`hsk1`..`hsk5`) rồi page tăng dần. Task 2 import type này.

- [ ] **Step 1: Viết test thất bại** — `src/content/__tests__/roadmap-generated.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generatedLessons } from "../roadmap-generated";

describe("roadmap-generated", () => {
  it("đủ 27/40/41/41/45 bài cho hsk1..hsk5, không có vocab body", () => {
    const byBook = new Map<string, number>();
    for (const l of generatedLessons) byBook.set(l.book, (byBook.get(l.book) ?? 0) + 1);
    expect(byBook.get("hsk1")).toBe(27);
    expect(byBook.get("hsk2")).toBe(40);
    expect(byBook.get("hsk3")).toBe(41);
    expect(byBook.get("hsk4")).toBe(41);
    expect(byBook.get("hsk5")).toBe(45);
    expect(generatedLessons.every((l) => /^[a-z0-9-]+$/.test(l.page))).toBe(true);
    expect(generatedLessons[0]).toMatchObject({ book: "hsk1", page: "lesson-1" });
    expect(generatedLessons[0].title.length).toBeGreaterThan(0);
    expect(generatedLessons[0].wordCount).toBeGreaterThan(0);
    // metadata only — không nhúng từ vựng
    expect(JSON.stringify(generatedLessons).length).toBeLessThan(40_000);
  });
});
```

- [ ] **Step 2: Chạy test → FAIL** (module chưa tồn tại): `pnpm vitest run src/content/__tests__/roadmap-generated.test.ts`
- [ ] **Step 3: Viết script** `scripts/seed/gen-roadmap-stations.mts` (mẫu theo `scripts/seed/gen-vocab-seed.mts`):

```ts
/* Sinh src/content/roadmap-generated.ts — metadata bài học hsk1..hsk5 (title +
   wordCount), KHÔNG nhúng vocab. Chạy: pnpm dlx tsx scripts/seed/gen-roadmap-stations.mts */
import { writeFileSync } from "node:fs";
import { vocab } from "../../src/content/vocab.js";

const books = ["hsk1", "hsk2", "hsk3", "hsk4", "hsk5"];
const rows: string[] = [];
for (const book of books) {
  const pages = Object.keys(vocab[book] ?? {}).sort(
    (a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")),
  );
  for (const page of pages) {
    const lesson = vocab[book][page];
    const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    rows.push(
      `  { book: '${book}', page: '${esc(page)}', title: '${esc(lesson.title)}', wordCount: ${lesson.words.length} },`,
    );
  }
}
const out = `/* AUTO-GENERATED bởi scripts/seed/gen-roadmap-stations.mts — không sửa tay.
   Metadata bài học hsk1..hsk5 cho generator trạm roadmap (spec 2026-10-29 §2). */
export type GeneratedLesson = { book: string; page: string; title: string; wordCount: number };

export const generatedLessons: GeneratedLesson[] = [
${rows.join("\n")},
];
`;
writeFileSync(new URL("../../src/content/roadmap-generated.ts", import.meta.url), out);
console.log(`Đã ghi ${rows.length} bài học.`);
```

Chạy `pnpm dlx tsx scripts/seed/gen-roadmap-stations.mts`.
- [ ] **Step 4: Test xanh** + `pnpm typecheck`
- [ ] **Step 5: Commit** `git add scripts/seed/gen-roadmap-stations.mts src/content/roadmap-generated.ts src/content/__tests__/roadmap-generated.test.ts && git commit -m "feat(roadmap): build-time lesson metadata generator"`

---

### Task 2: Level restructure + `buildLevelStations`

**Files:**
- Modify: `app-next/src/content/roadmap-stations.ts`
- Test: `app-next/src/content/__tests__/roadmap-stations.test.ts` (mở rộng)

**Interfaces:**
- Consumes: `generatedLessons` (Task 1).
- Produces:
  - `LevelId = "pinyin" | "hsk-1" | "hsk-2" | "hsk-3" | "hsk-4" | "hsk-5" | "hsk-6" | "hsk-7-9"`
  - `Station.lessons: Array<{ book: string; page: string }>` (bổ sung vào schema; trạm curated cũ `lesson` giữ nguyên và `lessons = lesson ? [lesson] : []`)
  - `buildLevelStations(lessons: GeneratedLesson[], opts?: { groupSize?: number; idPrefix?: string; startNo?: number }): Station[]`

- [ ] **Step 1: Test thất bại** — thêm vào `roadmap-stations.test.ts`:

```ts
import { buildLevelStations, getRoadmapLevel, roadmapLevels } from "../roadmap-stations";

describe("buildLevelStations", () => {
  const mk = (i: number) => ({ book: "hsk1", page: `lesson-${i}`, title: `Bài ${i}`, wordCount: 15 });
  it("27 bài → 6 trạm lesson (5+5+5+5+5+2) + milestone cuối = 7 trạm", () => {
    const lessons = Array.from({ length: 27 }, (_, i) => mk(i + 1));
    const stations = buildLevelStations(lessons);
    expect(stations).toHaveLength(7);
    const lessonStations = stations.filter((s) => s.kind === "lesson");
    expect(lessonStations).toHaveLength(6);
    expect(lessonStations.map((s) => s.lessons!.length)).toEqual([5, 5, 5, 5, 5, 2]);
    expect(stations[6].kind).toBe("milestone");
    expect(lessonStations[0].id).toBe("g1");
    expect(stations[6].id).toBe("milestone");
    expect(lessonStations[0].lessons![0]).toEqual({ book: "hsk1", page: "lesson-1" });
    expect(lessonStations[0].title).toBe("Bài 1");
  });
});

describe("roadmapLevels v2", () => {
  it("8 level đúng thứ tự và trạng thái", () => {
    expect(roadmapLevels.map((l) => l.id)).toEqual(
      ["pinyin", "hsk-1", "hsk-2", "hsk-3", "hsk-4", "hsk-5", "hsk-6", "hsk-7-9"],
    );
    expect(getRoadmapLevel("pinyin")!.status).toBe("available");
    expect(getRoadmapLevel("hsk-1")!.stations.filter((s) => s.kind === "lesson")).toHaveLength(6);
    expect(getRoadmapLevel("hsk-3")!.status).toBe("available");
    expect(getRoadmapLevel("hsk-6")!.status).toBe("upcoming");
    expect(getRoadmapLevel("hsk-7-9")!.status).toBe("upcoming");
  });
  it("hsk-2: giữ 7 trạm curated (ids 1..6,m) + nhóm bổ sung sau Trạm 6, phủ đủ 40 bài, không trùng lesson curated", () => {
    const hsk2 = getRoadmapLevel("hsk-2")!;
    const curated = hsk2.stations.filter((s) => !s.id.startsWith("b"));
    expect(curated.map((s) => s.id)).toEqual(["1", "2", "3", "4", "5", "m", "6"]);
    const allLessons = hsk2.stations.flatMap((s) => s.lessons ?? []);
    expect(new Set(allLessons.map((l) => l.page)).size).toBe(40);
    // trạm bổ sung nằm sau Trạm 6 trong mảng
    const idx6 = hsk2.stations.findIndex((s) => s.id === "6");
    expect(hsk2.stations.slice(idx6 + 1).every((s) => s.id.startsWith("b"))).toBe(true);
  });
});
```

- [ ] **Step 2: FAIL** — `pnpm vitest run src/content/__tests__/roadmap-stations.test.ts`
- [ ] **Step 3: Implement** trong `roadmap-stations.ts`:

```ts
import { generatedLessons, type GeneratedLesson } from "./roadmap-generated";

export const stationSchema = z.object({
  /* ...giữ nguyên các field cũ..., */
  lessons: z.array(z.object({ book: z.string(), page: z.string() })).optional(),
});

export const levelIdSchema = z.enum([
  "pinyin", "hsk-1", "hsk-2", "hsk-3", "hsk-4", "hsk-5", "hsk-6", "hsk-7-9",
]);

export function buildLevelStations(
  lessons: GeneratedLesson[],
  opts: { groupSize?: number; idPrefix?: string; startNo?: number } = {},
): Station[] {
  const { groupSize = 5, idPrefix = "g", startNo = 1 } = opts;
  const stations: Station[] = [];
  for (let i = 0; i < lessons.length; i += groupSize) {
    const group = lessons.slice(i, i + groupSize);
    const no = startNo + stations.length;
    stations.push({
      id: `${idPrefix}${stations.length + 1}`,
      no: `Trạm ${no}`,
      kind: "lesson",
      title: group[0].title,
      zh: "",
      meta: `${group.reduce((s, l) => s + l.wordCount, 0)} từ · ${group.length} bài`,
      lesson: { book: group[0].book, page: group[0].page },
      lessons: group.map((l) => ({ book: l.book, page: l.page })),
      vocab: [],
      gram: [],
    });
  }
  stations.push({
    id: "milestone", no: `Trạm ${startNo + stations.length}`, kind: "milestone",
    title: "Tổng ôn chặng", zh: "复习",
    meta: "Đề mix tổng hợp từ vựng & nghe của chặng",
    lessons: lessons.map((l) => ({ book: l.book, page: l.page })),
    vocab: [], gram: [],
  });
  return stations;
}

const byBook = (book: string) => generatedLessons.filter((l) => l.book === book);
/* hsk-2 bổ sung: bỏ lesson đã thuộc trạm curated */
const curatedHsk2Pages = new Set(["lesson-1", "lesson-11", "lesson-6", "lesson-25", "lesson-15", "lesson-21"]);
const hsk2Extra = buildLevelStations(
  byBook("hsk2").filter((l) => !curatedHsk2Pages.has(l.page)),
  { idPrefix: "b", startNo: 7 },
);
const curated = /* mảng 7 trạm curated hiện có, mỗi trạm thêm lessons: lesson ? [lesson] : [] */;
```

`roadmapLevels` mới: `pinyin` (banner-only, stations [], kicker "NỀN TẢNG · PHÁT ÂM", title "Nền tảng: Pinyin & nét cơ bản"), `hsk-1` (available, stations = `buildLevelStations(byBook("hsk1"))`), `hsk-2` (available, stations = `[...curated.slice(0,5), curated[m], curated[5(=Trạm 6)], ...hsk2Extra]` — **giữ đúng thứ tự hiện tại của 7 curated rồi nối bổ sung sau Trạm 6**), `hsk-3`/`hsk-4`/`hsk-5` available generator, `hsk-6`/`hsk-7-9` upcoming stations []. Cập nhật các test cũ của file này cho khớp (label hsk-4-6 biến mất).
- [ ] **Step 4: Xanh** + typecheck + **chạy toàn bộ test roadmap cũ** `pnpm vitest run src/content src/lib/__tests__/roadmap-progress.test.ts` — sửa các test cũ phụ thuộc levelId cũ (đổi "hsk-4-6" → "hsk-6").
- [ ] **Step 5: Commit** `feat(roadmap): 8 chặng + buildLevelStations nhóm-5-bài`

---

### Task 3: station-quiz v2 — câu nghe, warm-up, milestone động

**Files:**
- Modify: `app-next/src/lib/station-quiz.ts`
- Test: `app-next/src/lib/__tests__/station-quiz.test.ts` (mở rộng)

**Interfaces:**
- Consumes: `Station` mới (Task 2).
- Produces:
  - `QuizQuestion = { prompt: string; options: string[]; answerIndex: number; listen?: { audioText: string; readPrompt: string; readOptions: string[]; readAnswerIndex: number } }`
  - `buildStationQuestions(station, pool?, rng?, opts?: { listenEvery?: number })` — `listenEvery = 4`: mỗi câu thứ 4 trở thành câu nghe
  - `sampleWarmupQuestions(pool: StationPool, rng?): QuizQuestion[]` — đúng 4 câu (vocab chỉ)
  - `sampleMilestoneQuestions(pool: StationPool, rng?): QuizQuestion[]` — 12 câu (9 vocab + 3 gram khi gram đủ; gram rỗng → 12 vocab), mỗi câu vocab thứ 4 là câu nghe. **Signature đổi: nhận `pool` thay vì `level`.**

- [ ] **Step 1: Test thất bại** — thêm:

```ts
describe("station-quiz v2", () => {
  const pool: StationPool = {
    vocab: [["你好", "nǐ hǎo", "xin chào"], ["谢谢", "xièxie", "cảm ơn"], ["再见", "zàijiàn", "tạm biệt"],
      ["请", "qǐng", "xin mời"], ["对不起", "duìbuqǐ", "xin lỗi"], ["老师", "lǎoshī", "giáo viên"],
      ["学生", "xuésheng", "học sinh"], ["同学", "tóngxué", "bạn cùng lớp"]],
    gram: [],
  };
  it("listenEvery=4: câu 4 có listen {audioText=hanzi, options=pinyin, readVariant đầy đủ}", () => {
    const qs = buildStationQuestions(
      { id: "g1", no: "Trạm 1", kind: "lesson", title: "T", zh: "", meta: "", vocab: pool.vocab, gram: [] },
      pool,
      () => 0.42,
      { listenEvery: 4 },
    );
    const listenQs = qs.filter((q) => q.listen);
    expect(listenQs).toHaveLength(2); // 8 vocab câu → 2 câu nghe
    const q = listenQs[0];
    expect(q.listen!.audioText.length).toBeGreaterThan(0); // hanzi
    expect(q.options.every((o) => /[\u0300-\u036fāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(o))).toBe(true);
    expect(q.listen!.readOptions).toHaveLength(4);
    expect(q.listen!.readOptions[q.listen!.readAnswerIndex]).toBeTruthy();
  });
  it("sampleWarmupQuestions trả đúng 4 câu vocab-only", () => {
    const qs = sampleWarmupQuestions(pool, () => 0.3);
    expect(qs).toHaveLength(4);
    expect(qs.every((q) => !q.listen)).toBe(true);
  });
  it("sampleMilestoneQuestions(pool) trả 12 câu, gram rỗng → toàn vocab, mỗi câu thứ 4 là nghe", () => {
    const qs = sampleMilestoneQuestions(pool, () => 0.6);
    expect(qs).toHaveLength(12);
    expect(qs.filter((q) => q.listen).length).toBe(3);
  });
});
```

- [ ] **Step 2: FAIL**
- [ ] **Step 3: Implement** — thêm type `listen` (cấu trúc trên); helper `listenQuestion(w: [string,string,string], pool, rng)` sinh options 4 pinyin từ pool + readVariant (prompt "Từ nào đọc là “pinyin”?", options 4 hanzi); `buildStationQuestions` thêm opts, mỗi `i % listenEvery === listenEvery - 1` → câu nghe thay câu nghĩa↔từ; `sampleWarmupQuestions`; `sampleMilestoneQuestions(pool, rng)` (thay signature cũ — sửa caller test cũ tương ứng). Giữ `submitStationResult` nguyên.
- [ ] **Step 4: Xanh** + typecheck; sửa test cũ gọi `sampleMilestoneQuestions(level, ...)` → truyền `levelPool(level)`.
- [ ] **Step 5: Commit** `feat(roadmap): quiz v2 — câu nghe TTS + warm-up + milestone theo pool động`

---

### Task 4: Gates trong progress-store

**Files:**
- Modify: `app-next/src/lib/store/progress-store.ts`
- Test: `app-next/src/lib/store/__tests__/progress-store.test.ts` (mở rộng)

**Interfaces:**
- Produces: `getRoadmapGate(id: string): { pct: number; at: number } | null`, `setRoadmapGate(id: string, pct: number): void` (best-of theo pct). Key lưu: `nhai.roadmap.gates.v1` (fallback legacy `bye.roadmap.gates.v1` khi đọc — cùng pattern key khác của store).

- [ ] **Step 1: Test thất bại** — thêm vào progress-store.test.ts:

```ts
describe("roadmap gates", () => {
  it("set/get best-of", () => {
    progressStore.setRoadmapGate("hsk1", 50);
    expect(progressStore.getRoadmapGate("hsk1")?.pct).toBe(50);
    progressStore.setRoadmapGate("hsk1", 90);
    expect(progressStore.getRoadmapGate("hsk1")?.pct).toBe(90);
    progressStore.setRoadmapGate("hsk1", 40); // best-of — không hạ
    expect(progressStore.getRoadmapGate("hsk1")?.pct).toBe(90);
    expect(progressStore.getRoadmapGate("hsk2")).toBeNull();
  });
});
```

- [ ] **Step 2: FAIL** — `pnpm vitest run src/lib/store/__tests__/progress-store.test.ts -t "roadmap gates"`
- [ ] **Step 3: Implement** — interface + private map + key `nhai.roadmap.gates.v1` (theo đúng pattern get/set StationProgress; legacy prefix `bye.` nếu store đang dùng bye làm prefix chính — **đọc file trước, dùng cùng prefix hệ đang có**).
- [ ] **Step 4: Xanh** + **Step 5: Commit** `feat(store): roadmap gates best-of (cổng đầu vào HSK1)`

---

### Task 5: Gate logic + overallRoadmapPct trọng số

**Files:**
- Modify: `app-next/src/lib/roadmap-progress.ts`
- Test: `app-next/src/lib/__tests__/roadmap-progress.test.ts` (mở rộng)

**Interfaces:**
- Consumes: `getRoadmapGate` (T4), `roadmapLevels` mới (T2).
- Produces:
  - `export type GateStatus = "locked" | "open" | "exempt";`
  - `export function gateStatus(levelId: string, store: GateStore, pinyinDoneCount: number): GateStatus` — level ≠ hsk-1 → `"open"`; hsk-1: pinyinDoneCount ≥ PINYIN_SESSIONS → `"exempt"`; gate pct ≥ PASS_PCT → `"open"`; else `"locked"`. `GateStore = { getRoadmapDone(): number[]; getStationProgress(id): Record<string, StationProgress>; getRoadmapGate(id): { pct: number; at: number } | null }`.
  - `overallRoadmapPct(store)` mới: duyệt `roadmapLevels` available; `pinyin` → weight 8, pct = done/8; level có trạm lesson → weight = số trạm lesson, pct = `bannerSummary(level, deriveStationStates(level, record, doneCheck)).pct`; bỏ level không trạm.
  - `deriveStationStates(level, record, lessonDone?: (book: string, page: string) => boolean)` — tham số 3 optional: khi có, `pct = max(rec.pct, round(doneLessons/totalLessons*100))` và done theo pct mới.
  - `useRoadmapProgress(level)` truyền `lessonDone = (b, p) => progressStore.getPageDone(b, p)`.

- [ ] **Step 1: Test thất bại** — thêm:

```ts
import { gateStatus, overallRoadmapPct, PASS_PCT, PINYIN_SESSIONS } from "../roadmap-progress";

describe("gateStatus", () => {
  const store = (gatePct: number | null, pinyinDone = 0) => ({
    getRoadmapDone: () => Array.from({ length: pinyinDone }, (_, i) => i + 1),
    getStationProgress: () => ({}),
    getRoadmapGate: (id: string) => (id === "hsk1" && gatePct != null ? { pct: gatePct, at: 0 } : null),
  });
  it("hsk-1: locked → open khi gate ≥80 → exempt khi pinyin 8/8", () => {
    expect(gateStatus("hsk-1", store(null), 0)).toBe("locked");
    expect(gateStatus("hsk-1", store(90), 0)).toBe("open");
    expect(gateStatus("hsk-1", store(50), PINYIN_SESSIONS)).toBe("exempt");
    expect(gateStatus("hsk-2", store(null), 0)).toBe("open");
  });
  it("overallRoadmapPct trọng số: chỉ pinyin xong 4/8 → 25% (chưa có trạm nào khác)", () => {
    expect(overallRoadmapPct(store(null, 4))).toBe(25);
  });
});
```

- [ ] **Step 2: FAIL**
- [ ] **Step 3: Implement** theo Interfaces (xóa TODO hard-code hsk-2).
- [ ] **Step 4: Xanh** — chạy cả test cũ roadmap-progress (các case hsk-2 giữ nguyên hành vi) + typecheck.
- [ ] **Step 5: Commit** `feat(roadmap): gateStatus + overallRoadmapPct có trọng số toàn chặng`

---

### Task 6: API route `vocab-lesson`

**Files:**
- Create: `app-next/src/app/api/v1/content/vocab-lesson/route.ts`
- Test: `app-next/src/app/api/v1/content/vocab/__tests__/vocab-lesson.test.ts`

**Interfaces:**
- Produces: `GET /api/v1/content/vocab-lesson?book=hsk1&page=lesson-1` → `200 { lesson: VocabLesson }`; thiếu param hoặc không thấy → `400`/`404 { error }`.

- [ ] **Step 1: Test thất bại** — mock `@/lib/content/vocab` rồi gọi handler:

```ts
import { describe, expect, it, vi } from "vitest";
const getVocabLesson = vi.fn();
vi.mock("@/lib/content/vocab", () => ({ getVocabLesson: (...a: unknown[]) => getVocabLesson(...a) }));
import { GET } from "@/app/api/v1/content/vocab-lesson/route";

describe("GET /api/v1/content/vocab-lesson", () => {
  it("trả lesson khi đủ book+page", async () => {
    getVocabLesson.mockResolvedValue({ title: "Bài 1", words: [] });
    const res = await GET(new Request("http://x/api?book=hsk1&page=lesson-1"));
    expect(res.status).toBe(200);
    expect((await res.json()).lesson.title).toBe("Bài 1");
  });
  it("thiếu param → 400; không thấy → 404", async () => {
    expect((await GET(new Request("http://x/api"))).status).toBe(400);
    getVocabLesson.mockResolvedValue(null);
    expect((await GET(new Request("http://x/api?book=hsk1&page=lesson-999"))).status).toBe(404);
  });
});
```

- [ ] **Step 2: FAIL** — `pnpm vitest run src/app/api/v1/content/vocab/__tests__/vocab-lesson.test.ts`
- [ ] **Step 3: Implement** — copy pattern cache header từ `route.ts` của vocab:

```ts
import { NextResponse } from "next/server";
import { getVocabLesson } from "@/lib/content/vocab";

const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const book = searchParams.get("book");
  const page = searchParams.get("page");
  if (!book || !page) return NextResponse.json({ error: "Thiếu book hoặc page" }, { status: 400 });
  try {
    const lesson = await getVocabLesson(book, page);
    if (!lesson) return NextResponse.json({ error: "Không tìm thấy bài học" }, { status: 404 });
    return NextResponse.json({ lesson }, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error("[api/v1/content/vocab-lesson]", err);
    return NextResponse.json({ error: "Không đọc được bài học" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Xanh** + **Step 5: Commit** `feat(api): vocab-lesson route cho quiz trạm`

---

### Task 7: EntryGate component — cổng đầu vào HSK 1

**Files:**
- Create: `app-next/src/components/roadmap/entry-gate.tsx`
- Test: `app-next/src/components/roadmap/__tests__/entry-gate.test.tsx`

**Interfaces:**
- Consumes: `pinyinExamples` (`src/content/pinyin.ts`), `useTts` (`src/lib/tts/use-tts.ts` — trả `{ speak, cancel, speaking }`), `submitGateResult` (cục bộ, ghi `progressStore.setRoadmapGate("hsk1", pct)`).
- Produces: `export function EntryGate({ status, onPass }: { status: GateStatus; onPass?: () => void })` —
  - `status === "exempt"` → card "Đã miễn kiểm tra đầu vào" (icon ✅, text "Bạn đã hoàn thành chặng Pinyin").
  - `status === "open"` → card gọn "Đã qua cổng đầu vào (N%)".
  - `status === "locked"` → card "Kiểm tra đầu vào Pinyin" + nút "Bắt đầu (12 câu)". Quiz: 12 câu; mỗi câu = 1 entry từ `pinyinExamples` (sample `rng`), phát **hanzi** qua `speak`, 4 options pinyin có dấu (kể cả câu readVariant fallback: khi `speaking === false` và `ttsReady === false` sau 1.5s → render câu đọc "Từ nào đọc là …" với options hanzi). Kết quả ≥80% → `onPass()`; <80% → thông báo "Chưa đạt 80% — làm lại nhé".

- [ ] **Step 1: Test thất bại** — mock `useTts` (`vi.mock("@/lib/tts/use-tts", ...)` trả `{ speak: vi.fn(), cancel: vi.fn(), speaking: false }`), mock progressStore:

```tsx
describe("EntryGate", () => {
  it("exempt: hiển thị đã miễn, không có nút bắt đầu", () => {
    render(<EntryGate status="exempt" />);
    expect(screen.getByText(/Đã miễn/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Bắt đầu/i })).toBeNull();
  });
  it("locked: 12 câu, chọn đúng ≥80% → gọi onPass", async () => {
    const onPass = vi.fn();
    render(<EntryGate status="locked" onPass={onPass} />);
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu/i }));
    // trả lời đúng 10/12 bằng data-correct
    for (let i = 0; i < 12; i++) {
      fireEvent.click(screen.getAllByTestId("gate-option")[i % 12 === 11 || i === 10 ? 1 : 0]); // giả định data-correct
    }
    // dùng data-correct như station-quiz: click option có data-correct="true" cho 10 câu đầu, sai 2 câu cuối
    expect(onPass).toHaveBeenCalledTimes(1);
  });
  it("dưới 80% → không gọi onPass, hiện thông báo làm lại", () => { /* tương tự, trả lời sai ≥3 */ });
});
```

(Executor viết đầy đủ theo pattern `data-correct="true|false"` của `station-quiz.tsx` — đọc file đó trước khi viết test.)
- [ ] **Step 2: FAIL** — `pnpm vitest run src/components/roadmap/__tests__/entry-gate.test.tsx`
- [ ] **Step 3: Implement** — cấu trúc tham khảo `station-quiz.tsx` (counter, options, feedback, kết quả); token Hanzi; `useTts().speak(word[1-đúng là hanzi của entry])` khi vào câu; timer 1.5s set `ttsReady` false → fallback readVariant; lưu kết quả `setRoadmapGate("hsk1", pct)` trong `onPass` wrapper nội bộ.
- [ ] **Step 4: Xanh** + typecheck + **Step 5: Commit** `feat(roadmap): EntryGate — cổng nghe pinyin 12 câu cho HSK1`

---

### Task 8: StationDrawer micro-session (3 bước)

**Files:**
- Modify: `app-next/src/components/roadmap/station-drawer.tsx`
- Create: `app-next/src/components/roadmap/use-station-vocab.ts`
- Test: `app-next/src/components/roadmap/__tests__/station-drawer.test.tsx` (mở rộng)

**Interfaces:**
- Consumes: `Station.lessons` (T2), `vocab-lesson` API (T6), `buildStationQuestions`/`sampleWarmupQuestions` (T3), `gateStatus` (T5), `EntryGate` (T7), `useTts`.
- Produces:
  - `useStationVocab(lessons: Array<{book, page}>): { pool: StationPool; loading: boolean }` — fetch tuần tự các bài **chưa có trong cache module-level** (Map key `book.page`), concat `{vocab: [hanzi,pinyin,meaning][], gram: []}`.
  - Drawer tabs mới: `["review", "study", "quiz"]` — labels "Ôn nhanh", "Học", "Bài kiểm tra". Ước lượng phút: `study ≈ lessons.length × 8 phút`, `quiz ≈ 5 phút` (render cạnh label).
  - Tab "Học": mỗi lesson 1 hàng — tick ✅ nếu `progressStore.getPageDone(book, page)`, link `/lesson/{book}/{page}`, mục tiêu "markPageDone".
  - Tab "Ôn nhanh": chỉ hiện khi `prevView` (trạm trước có record) — `sampleWarmupQuestions(prevPool)`; nếu không có trạm trước → text "Bắt đầu chặng — không cần ôn". Không tính điểm.
  - Tab "Bài kiểm tra": nếu `gateStatus(level.id, progressStore, pinyinDoneCount) === "locked"` → render `<EntryGate status="locked" onPass={refreshGate} />`; ngược lại quiz như cũ (trạm curated dùng vocab nhúng; trạm generator dùng `useStationVocab(station.lessons)`; milestone: sample 4 lesson refs từ `station.lessons` → `sampleMilestoneQuestions(poolGhép)`).

- [ ] **Step 1: Test thất bại** — thêm case (mock fetch global trả vocab giả):

```tsx
it("trạm generator: tab Học liệt kê đủ lessons với link /lesson", () => { /* render drawer cho trạm lessons 5 bài; assert 5 link + ước lượng "≈ 40 phút" */ });
it("Ôn nhanh: 4 câu từ pool trạm trước, không ghi station progress", () => { /* trả lời hết; assert getStationProgress không đổi */ });
it("gate locked: tab quiz hiển thị EntryGate thay vì quiz trạm", () => { /* mock gateStatus → locked qua store thật có gates rỗng + pinyin 0; assert text 'Kiểm tra đầu vào Pinyin' */ });
it("câu nghe: có nút aria-label 'Nghe lại'; TTS unavailable → hiện câu đọc fallback", () => { /* mock useTts speaking:false; assert prompt fallback 'Từ nào đọc là' sau timer */ });
```

- [ ] **Step 2: FAIL**
- [ ] **Step 3: Implement** — giữ nguyên drawer shell/scrim/animation cũ; chỉ đổi nội dung body; `key={station.id}` giữ nguyên (F4 cũ); toast "Trạm đang khóa" giữ nguyên.
- [ ] **Step 4: Xanh** + typecheck + **Step 5: Commit** `feat(roadmap): drawer micro-session — Ôn nhanh / Học / Bài kiểm tra + cổng đầu vào`

---

### Task 9: roadmap-client — mốc bắt đầu, banner gate, Đích đến

**Files:**
- Modify: `app-next/src/app/(app)/roadmap/roadmap-client.tsx`
- Modify: `app-next/src/components/roadmap/station-card.tsx` (ẩn `zh` khi rỗng)
- Modify: `app-next/src/components/roadmap/roadmap-topbar.tsx` (nếu switcher cần scroll-x cho 8 level)
- Test: `app-next/src/app/(app)/roadmap/__tests__/roadmap-client.test.tsx` + `station-card.test.tsx` (mở rộng)

**Interfaces:**
- Consumes: `gateStatus`, `overallRoadmapPct` (T5), `progressStore`.
- Produces: UI hành vi —
  1. Banner chặng `pinyin` (US1): khi `overall === 0` → thêm dòng "🚩 Bắt đầu ở đây" (badge `data-testid="journey-start"`).
  2. Banner `hsk-1`: dòng trạng thái cổng — locked: "Cổng đầu vào: Kiểm tra nghe pinyin (trong trạm 1)"; open: "Cổng đầu vào: Đã qua ✅"; exempt: "Cổng đầu vào: Đã miễn (Pinyin xong) ✅".
  3. `hsk-7-9` upcoming (US8): banner với sub "Đích đến: HSK 7–9 — đọc hiểu văn bản học thuật, báo chí chuyên sâu và giao tiếp thành thạo như người bản ngữ." + endLabel "Theo dõi cập nhật".
  4. Topbar: switcher 8 level, `overflow-x-auto` dưới 640px.

- [ ] **Step 1: Test thất bại** — thêm 4 case cho 4 hành vi trên (pattern mock store như test hiện có).
- [ ] **Step 2: FAIL**
- [ ] **Step 3: Implement**; sửa `station-card.tsx`: `{station.zh && <span>{station.zh}</span>}` (đọc file, giữ style).
- [ ] **Step 4: Xanh** + typecheck + **Step 5: Commit** `feat(roadmap): mốc Bắt đầu ở đây + banner cổng đầu vào + Đích đến HSK7-9`

---

### Task 10: QA browser script v2 (~20 case)

**Files:**
- Modify: `app-next/scripts/qa/roadmap-flow-qa.mjs`

**Interfaces:**
- Consumes: dev server :3101 (worktree), data-testid mới: `journey-start`, gate options (`data-testid="gate-option"`), drawer tabs.
- Produces: script chạy `node scripts/qa/roadmap-flow-qa.mjs` → exit 0 khi 100% PASS.

- [ ] **Step 1: Mở rộng script** — giữ helpers cũ (`gotoApp`, `openDrawer`, `runQuiz`, `eclick`, `KILL_ANIM`); thêm case:
  1. 0 progress → `journey-start` hiện trên chặng Pinyin, topbar 0%.
  2. Mở trạm 1 HSK1 → tab quiz hiện EntryGate (text "Kiểm tra đầu vào Pinyin").
  3. Gate: trả lời sai >20% → không pass, thông báo làm lại.
  4. Gate: trả lời đúng 10/12 → pass, vào được quiz trạm.
  5. Seed `bye.roadmap.pinyin` đủ 8 buổi → gate "Đã miễn" (exempt).
  6. Warm-up: mở trạm 2 (sau khi trạm 1 done qua seed) → tab "Ôn nhanh" có 4 câu, trả lời xong không đổi station progress.
  7. Tab "Học" đủ 5 link `/lesson/hsk1/lesson-N`, ước lượng "≈ 40 phút".
  8. Quiz trạm HSK1 pass ≥80% → best-of, sao, toast.
  9. Học bài thật (goto `/lesson/hsk1/lesson-1`, xong flashcard quiz, markPageDone) → quay lại roadmap, pct trạm tăng (max với pageDone).
  10. Topbar % tăng sau khi seed pageDone nhiều bài.
  11. Đích đến HSK7-9: text "Đích đến: HSK 7–9".
  12. Milestone: sample đề mix 12 câu, pass → mở trạm sau.
  (giữ 8 case hồi quy của script cũ: derive tuần tự, khóa trạm, retake best-of, toast, review-card, đích hsk-2, đổi level, drawer đóng mở).
- [ ] **Step 2: Chạy** `pnpm dev` :3101 + `node scripts/qa/roadmap-flow-qa.mjs` → **100% PASS**; chạy lần 2 để khử flake.
- [ ] **Step 3: Commit** `test(roadmap): QA journey v2 ~20 case`

---

## Self-review

- **Spec coverage:** US1→T9.1; US2→có sẵn switcher (T2/T9.4); US3→T4/T5/T7/T8; US4→T8; US5→T3/T8; US6→T3/T8; US7→T5; US8→T9.3. QA map §5 — T10.
- **Type consistency:** `GateStatus`/`gateStatus`/`sampleWarmupQuestions`/`listen` dùng nhất quán xuyên task; `sampleMilestoneQuestions` đổi signature được nêu ở T3 và T8 consumes pool.
- **Placeholder:** không có "TBD"; các block "(đọc file trước khi viết)" là chỉ dẫn đọc nguồn có thật, kèm code mẫu đủ chạy.
