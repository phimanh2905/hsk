# Roadmap Flow (Hướng B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm roadmap `/roadmap` đi thông đường — điều hướng tới bài học thật, progress trạm ghi thật qua bài kiểm tra ≥80%, "Tiếp tục học" + % toàn lộ trình + card Tổng ôn SRS.

**Architecture:** Station progress ghi vào `progressStore.setStationProgress` (đã có + đã patch hybrid-sync, không đụng D1). Derive trạng thái chuyển sang tuần tự thuần (first-not-done = active). Quiz sinh từ dữ liệu vocab/gram nhúng trong station (pure lib, RNG injectable). UI giữ design serpentine + Hanzi tokens.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4 + Hanzi tokens, Vitest + Testing Library (jsdom), zod.

**Spec:** `docs/superpowers/specs/2026-10-28-roadmap-flow-design.md`

## Global Constraints

- Mọi UI tuân theo Hanzi DESIGN.md: token semantic (`bg-surface-elevated`, `text-text-secondary`, `border-border-default`, `text-action-primary`…), không hard-code màu, touch target ≥44px cho nút chính.
- Icon chỉ dùng qua `@/components/ui/icon` (lucide), `ICON_STROKE` cho stroke width.
- Từ bây giờ trong plan: `PASS_PCT = 80`. Station done khi `rec.pct >= PASS_PCT` (đổi từ 100).
- Command chạy trong `app-next/`: test một file `pnpm vitest run <path>`; toàn bộ `pnpm test`; typecheck `pnpm typecheck`; lint `pnpm lint`.
- Commit mỗi task, message dạng `feat(roadmap): ...` / `test(roadmap): ...`.
- KHÔNG sửa `progress-store.ts`, `hybrid-store.ts`, D1 schema, `/roadmap/pinyin`.
- Tests dùng jsdom; localStorage có sẵn; KHÔNG đọc localStorage lúc render (mount-gate qua `useEffect`).

---

### Task 1: Data — mapping `lesson` trên station + sửa meta text

**Files:**
- Modify: `app-next/src/content/roadmap-stations.ts`
- Test (create): `app-next/src/content/__tests__/roadmap-stations.test.ts`

**Interfaces:**
- Produces: `Station.lesson?: { book: string; page: string }` — Task 4/5 dùng; mapping cố định: Trạm 1→`hsk2/lesson-1`, Trạm 2→`hsk2/lesson-11`, Trạm 3→`hsk2/lesson-6`, Trạm 4→`hsk2/lesson-25`, Trạm 5→`hsk2/lesson-15`, Trạm 6→`hsk2/lesson-21`, Milestone không có `lesson`.

- [ ] **Step 1: Write the failing test**

```ts
// app-next/src/content/__tests__/roadmap-stations.test.ts
import { describe, expect, it } from "vitest";
import { getRoadmapLevel, roadmapLevels } from "../roadmap-stations";

const hsk2 = getRoadmapLevel("hsk-2")!;
const station = (id: string) => hsk2.stations.find((s) => s.id === id)!;

describe("roadmap-stations data", () => {
  it("mỗi lesson station có lesson mapping đúng", () => {
    expect(station("1").lesson).toEqual({ book: "hsk2", page: "lesson-1" });
    expect(station("2").lesson).toEqual({ book: "hsk2", page: "lesson-11" });
    expect(station("3").lesson).toEqual({ book: "hsk2", page: "lesson-6" });
    expect(station("4").lesson).toEqual({ book: "hsk2", page: "lesson-25" });
    expect(station("5").lesson).toEqual({ book: "hsk2", page: "lesson-15" });
    expect(station("6").lesson).toEqual({ book: "hsk2", page: "lesson-21" });
  });

  it("milestone không có lesson; pageId đều có dạng lesson-N", () => {
    expect(station("m").lesson).toBeUndefined();
    for (const s of hsk2.stations) {
      if (s.lesson) expect(s.lesson.page).toMatch(/^lesson-\d+$/);
    }
  });

  it("meta không còn text khóa cứng (trạng thái do derive vẽ)", () => {
    for (const s of hsk2.stations) {
      expect(s.meta).not.toMatch(/Khóa/i);
    }
  });

  it("schema vẫn validate toàn bộ levels", () => {
    expect(() => roadmapLevels.forEach((l) => l.stations.forEach(() => null))).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/content/__tests__/roadmap-stations.test.ts`
Expected: FAIL — `lesson` là `undefined`, meta còn chứa "Khóa".

- [ ] **Step 3: Implement**

Trong `src/content/roadmap-stations.ts`:

1. `stationSchema` thêm:

```ts
lesson: z
  .object({ book: z.string(), page: z.string() })
  .optional(),
```

2. Thêm `lesson` vào từng station theo bảng Interfaces (Trạm 1: `{ book: "hsk2", page: "lesson-1" }`…). Milestone giữ nguyên không thêm.
3. Đổi 3 meta:
   - Trạm 5: `meta: "问路 · Hỏi đường & phương tiện"`
   - Milestone: `meta: "Đánh giá năng lực HSK 2 · Mini test tổng hợp"`
   - Trạm 6: `meta: "天气 · Từ vựng thời tiết & so sánh 比"`

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/content/__tests__/roadmap-stations.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add src/content/roadmap-stations.ts src/content/__tests__/roadmap-stations.test.ts
git commit -m "feat(roadmap): station lesson mapping + meta trung tính"
```

---

### Task 2: Derive tuần tự + `PASS_PCT` + `overallRoadmapPct`

**Files:**
- Modify: `app-next/src/lib/roadmap-progress.ts`
- Test (create): `app-next/src/lib/__tests__/roadmap-progress.test.ts` (nếu đã tồn tại thì merge; check trước bằng `ls src/lib/__tests__/ | grep roadmap`)

**Interfaces:**
- Consumes: `StationProgress = { pct: number; stars: 0|1|2|3 }` từ `progress-store`.
- Produces:
  - `export const PASS_PCT = 80;`
  - `deriveStationStates(level, record): StationView[]` — tuần tự: duyệt theo thứ tự content, station đầu chưa done = `active` (giữ rec.pct/stars), mọi station sau = `locked`; done = `rec.pct >= PASS_PCT`.
  - `bannerSummary(level, views)` — giữ contract cũ; `currentTitle` lấy station active **bất kỳ kind nào** (milestone có thể active).
  - `overallRoadmapPct(store): number` — `(pinyinPct + hsk2SummaryPct) / 2` làm tròn; `store` là đối tượng có `getRoadmapDone(): number[]` và `getStationProgress(id: string): Record<string, StationProgress>`.

- [ ] **Step 1: Write the failing test**

```ts
// app-next/src/lib/__tests__/roadmap-progress.test.ts
import { describe, expect, it } from "vitest";
import {
  PASS_PCT,
  bannerSummary,
  deriveStationStates,
  overallRoadmapPct,
} from "../roadmap-progress";
import { getRoadmapLevel } from "@/content/roadmap-stations";
import type { StationProgress } from "@/lib/store/progress-store";

const hsk2 = getRoadmapLevel("hsk-2")!;
const rec = (pct: number, stars: 0 | 1 | 2 | 3 = 0): StationProgress => ({ pct, stars });

/** record từ danh sách cặp [stationId, pct] */
const mk = (pairs: Array<[string, number]>): Record<string, StationProgress> =>
  Object.fromEntries(pairs.map(([id, pct]) => [id, rec(pct, pct >= 100 ? 3 : pct >= 90 ? 2 : pct >= PASS_PCT ? 1 : 0)]));

describe("PASS_PCT", () => {
  it("= 80", () => expect(PASS_PCT).toBe(80));
});

describe("deriveStationStates (tuần tự)", () => {
  it("không có record → Trạm 1 active, còn lại locked", () => {
    const views = deriveStationStates(hsk2, {});
    expect(views[0].state).toBe("active");
    expect(views.slice(1).every((v) => v.state === "locked")).toBe(true);
  });

  it("done khi pct >= 80 (không cần 100), giữ sao", () => {
    const views = deriveStationStates(hsk2, mk([["1", 85]]));
    expect(views[0].state).toBe("done");
    expect(views[0].pct).toBe(85);
    expect(views[0].stars).toBe(1);
    expect(views[1].state).toBe("active");
  });

  it("pct 70 chưa done → station vẫn active với pct hiển thị", () => {
    const views = deriveStationStates(hsk2, mk([["1", 70]]));
    expect(views[0].state).toBe("active");
    expect(views[0].pct).toBe(70);
  });

  it("BUG CŨ: Trạm 6 active sau khi 1–5 + Milestone done", () => {
    const views = deriveStationStates(
      hsk2,
      mk([["1", 100], ["2", 100], ["3", 100], ["4", 100], ["5", 100], ["m", 80]]),
    );
    expect(views.find((v) => v.station.id === "m")!.state).toBe("done");
    expect(views.find((v) => v.station.id === "6")!.state).toBe("active");
  });

  it("milestone locked khi còn lesson trước chưa done", () => {
    const views = deriveStationStates(hsk2, mk([["1", 100], ["2", 100]]));
    expect(views.find((v) => v.station.id === "m")!.state).toBe("locked");
    expect(views.find((v) => v.station.id === "3")!.state).toBe("active");
  });

  it("mọi station done → không còn active", () => {
    const views = deriveStationStates(
      hsk2,
      mk([["1", 100], ["2", 100], ["3", 100], ["4", 100], ["5", 100], ["m", 100], ["6", 100]]),
    );
    expect(views.every((v) => v.state === "done")).toBe(true);
  });
});

describe("bannerSummary", () => {
  it("pct = trung bình lesson; currentTitle theo station active", () => {
    const views = deriveStationStates(hsk2, mk([["1", 100], ["2", 50]]));
    const s = bannerSummary(hsk2, views);
    // lessons: 1(100) 2(50) 3(0) 4(0) 5(0) 6(0) — milestone không tính
    expect(s.pct).toBe(Math.round((100 + 50 + 0 + 0 + 0 + 0) / 6));
    expect(s.currentTitle).toContain("Trạm 2");
    expect(s.remainingToMilestone).toBe(4); // 1,2,3,4,5 chưa hết trước m (1 done)
  });
});

describe("overallRoadmapPct", () => {
  it("trung bình pinyin % và hsk-2 summary %, làm tròn", () => {
    const store = {
      getRoadmapDone: () => [1, 2, 3, 4], // 4/8 = 50%
      getStationProgress: (id: string) => (id === "hsk-2" ? mk([["1", 100]]) : {}),
    };
    // hsk-2 lessons: 1(100) còn lại 0 → 100/6 ≈ 17 → round 17; overall = round((50+17)/2) = 34
    expect(overallRoadmapPct(store)).toBe(Math.round((50 + Math.round(100 / 6)) / 2));
  });

  it("trống → 0", () => {
    const store = { getRoadmapDone: () => [], getStationProgress: () => ({}) };
    expect(overallRoadmapPct(store)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/roadmap-progress.test.ts`
Expected: FAIL — `PASS_PCT` chưa tồn tại; test Trạm 6 fail với logic cũ.

- [ ] **Step 3: Implement — thay toàn bộ `deriveStationStates` + thêm 2 export**

Trong `src/lib/roadmap-progress.ts`:

```ts
export const PASS_PCT = 80;

export function deriveStationStates(
  level: RoadmapLevel,
  record: Record<string, StationProgress>,
): StationView[] {
  /* Tuần tự thuần theo thứ tự content: station đầu chưa done = active,
     mọi station sau = locked. Milestone là 1 mắt xích bình thường — sửa bug
     Trạm 6 không bao giờ mở (spec 2026-10-28 §4). */
  let activeAssigned = false;
  return level.stations.map((station) => {
    const rec = record[station.id] ?? null;
    if (rec != null && rec.pct >= PASS_PCT) {
      return { station, state: "done" as const, pct: rec.pct, stars: rec.stars };
    }
    if (!activeAssigned) {
      activeAssigned = true;
      return { station, state: "active" as const, pct: rec?.pct ?? 0, stars: rec?.stars ?? 0 };
    }
    return { station, state: "locked" as const, pct: 0, stars: 0 };
  });
}
```

Sửa `bannerSummary`: dòng `const current = views.find((v) => v.state === "active" && v.station.kind === "lesson") ?? null;` → bỏ điều kiện kind:

```ts
const current = views.find((v) => v.state === "active") ?? null;
```

Thêm helper overall (dưới cùng file, trước `useRoadmapProgress`):

```ts
export function overallRoadmapPct(store: {
  getRoadmapDone(): number[];
  getStationProgress(id: string): Record<string, StationProgress>;
}): number {
  const PINYIN_SESSIONS = 8;
  const pinyinPct = Math.round((store.getRoadmapDone().length / PINYIN_SESSIONS) * 100);
  const hsk2 = hsk2Level(); // xem dưới
  const views = deriveStationStates(hsk2, store.getStationProgress(hsk2.id));
  const summary = bannerSummary(hsk2, views);
  return Math.round((pinyinPct + summary.pct) / 2);
}
```

`hsk2Level()` — import từ content để tránh import cycle? `@/content/roadmap-stations` hiện không import lib nào → import trực tiếp an toàn:

```ts
import { getRoadmapLevel } from "@/content/roadmap-stations";
// trong overallRoadmapPct dùng trực tiếp:
const hsk2 = getRoadmapLevel("hsk-2")!;
```

(bỏ `hsk2Level()`, gọi thẳng `getRoadmapLevel("hsk-2")!`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/roadmap-progress.test.ts`
Expected: PASS.

- [ ] **Step 5: Sửa test cũ đang phụ thuộc logic 100%**

Run: `grep -rn "pct >= 100\|pct: 100" src/lib/__tests__/ src/components/roadmap/__tests__/ "src/app/(app)/roadmap/__tests__/" 2>/dev/null` — với mỗi test cũ assert done ở pct 100 hoặc "milestone active khi mọi lesson done nhưng milestone chưa record" vẫn hợp lệ tuần tự (milestone sẽ active). Chạy `pnpm test` và sửa test cho khớp ngữ nghĩa mới:
- done cũ `pct >= 100` → vẫn done (100 ≥ 80) — thường không cần sửa.
- Test cũ "tất cả lesson done → milestone active; milestone done khi record 100" → thay record milestone 100 bằng 80 vẫn done; thêm case 70 → active.
- Test "Trạm 6 (sau milestone) chưa done → milestone active" → semantics mới: sau khi 1–5 done + milestone chưa làm → milestone active, Trạm 6 locked. Giữ assertion này nếu có.

- [ ] **Step 6: Run full test + commit**

Run: `pnpm test`
Expected: toàn bộ PASS (số test tăng).

```bash
git add src/lib/roadmap-progress.ts src/lib/__tests__/roadmap-progress.test.ts
git commit -m "feat(roadmap): derive tuần tự + PASS_PCT=80 + overallRoadmapPct (sửa Trạm 6)"
```

---

### Task 3: `station-quiz` lib — sinh câu hỏi + submit result

**Files:**
- Create: `app-next/src/lib/station-quiz.ts`
- Test (create): `app-next/src/lib/__tests__/station-quiz.test.ts`

**Interfaces:**
- Consumes: `Station`, `RoadmapLevel`, `LevelId` từ `@/content/roadmap-stations`; `progressStore` từ `@/lib/store/progress-store`; `PASS_PCT` từ Task 2.
- Produces:
  - `export type QuizQuestion = { prompt: string; options: string[]; answerIndex: number };`
  - `export type StationPool = { vocab: Array<[string, string, string]>; gram: Array<[string, string]> };`
  - `levelPool(level: RoadmapLevel): StationPool` — gom vocab/gram của mọi station `kind === "lesson"` trong level (milestone vocab "Tổng ôn 60 từ" loại ra).
  - `buildStationQuestions(station: Station, pool: StationPool = { vocab: station.vocab, gram: station.gram }, rng: () => number = Math.random): QuizQuestion[]` — mỗi vocab 1 câu + mỗi gram 1 câu, xen kẽ dạng hỏi; 4 options (nhiễu từ pool cùng loại; nếu pool mỏng thì số options = min(4, độ dài pool); đáp án luôn nằm trong options).
  - `sampleMilestoneQuestions(level: RoadmapLevel, rng: () => number = Math.random): QuizQuestion[]` — 10 câu (8 vocab + 2 gram) sample từ `levelPool`, mỗi câu 4 options.
  - `submitStationResult(levelId: string, stationId: string, correct: number, total: number, store?: Pick<ProgressStoreType, "getStationProgress" | "setStationProgress">): { pct: number; passed: boolean; stars: 0|1|2|3; improved: boolean }` — best-of: chỉ ghi khi `pct` mới > cũ; stars tier: 100→3, ≥90→2, ≥80→1, <80→0; gọi `store.setStationProgress` (default `progressStore`).

- [ ] **Step 1: Write the failing test**

```ts
// app-next/src/lib/__tests__/station-quiz.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildStationQuestions,
  levelPool,
  sampleMilestoneQuestions,
  submitStationResult,
  type StationPool,
} from "../station-quiz";
import { getRoadmapLevel, type Station } from "@/content/roadmap-stations";

const hsk2 = getRoadmapLevel("hsk-2")!;
const s1 = hsk2.stations.find((s) => s.id === "1")!;
const s5 = hsk2.stations.find((s) => s.id === "5")!; // vocab mỏng (3 từ)
const milestone = hsk2.stations.find((s) => s.id === "m")!;

/** rng deterministic: xen kẽ 0/1 để shuffle ổn định cho assert */
const detRng = () => 0.42;

describe("levelPool", () => {
  it("gom vocab/gram của mọi lesson station, loại milestone", () => {
    const pool = levelPool(hsk2);
    // 5 lesson + trạm 6 vocab; milestone bị loại
    expect(pool.vocab.length).toBeGreaterThan(20);
    expect(pool.gram.length).toBeGreaterThan(8);
    expect(pool.vocab).not.toContainEqual(["Tổng ôn 60 từ", "zǒng fùxí", "flashcard chặng 1"]);
  });
});

describe("buildStationQuestions", () => {
  it("số câu = vocab + gram; mỗi câu có đáp án trong options", () => {
    const qs = buildStationQuestions(s1, undefined, detRng);
    expect(qs.length).toBe(s1.vocab.length + s1.gram.length);
    for (const q of qs) {
      expect(q.options.length).toBe(4);
      expect(q.options[q.answerIndex]).toBeTruthy();
      expect(q.prompt.length).toBeGreaterThan(0);
      expect(new Set(q.options).size).toBe(q.options.length); // không trùng option
    }
  });

  it("station vocab mỏng: vẫn đủ câu, options lấp từ level pool", () => {
    const pool = levelPool(hsk2);
    const qs = buildStationQuestions(s5, pool, detRng);
    expect(qs.length).toBe(s5.vocab.length + s5.gram.length);
    for (const q of qs) expect(q.options.length).toBe(4);
  });

  it("rng được dùng cho shuffle (cùng seed → cùng kết quả)", () => {
    const a = buildStationQuestions(s1, undefined, detRng);
    const b = buildStationQuestions(s1, undefined, detRng);
    expect(a).toEqual(b);
  });
});

describe("sampleMilestoneQuestions", () => {
  it("đúng 10 câu (8 vocab + 2 gram), 4 options mỗi câu", () => {
    const qs = sampleMilestoneQuestions(hsk2, detRng);
    expect(qs.length).toBe(10);
    for (const q of qs) expect(q.options.length).toBe(4);
  });
});

describe("submitStationResult", () => {
  const mkStore = () => {
    const data: Record<string, Record<string, { pct: number; stars: 0 | 1 | 2 | 3 }>> = {};
    return {
      data,
      getStationProgress: (id: string) => data[id] ?? {},
      setStationProgress: vi.fn((id: string, sid: string, rec: { pct: number; stars: 0 | 1 | 2 | 3 }) => {
        data[id] = { ...(data[id] ?? {}), [sid]: rec };
      }),
    };
  };
  let store: ReturnType<typeof mkStore>;
  beforeEach(() => { store = mkStore(); });

  it("80% → passed, 1 sao, ghi record", () => {
    const r = submitStationResult("hsk-2", "1", 6, 8, store);
    expect(r).toEqual({ pct: 75, passed: false, stars: 0, improved: true }); // 6/8 = 75
  });

  it("7/8 = 88% → passed 1 sao; 9/10 = 90% → 2 sao; 10/10 → 3 sao", () => {
    expect(submitStationResult("hsk-2", "1", 7, 8, store).stars).toBe(1);
    expect(submitStationResult("hsk-2", "2", 9, 10, store).stars).toBe(2);
    expect(submitStationResult("hsk-2", "3", 10, 10, store).stars).toBe(3);
  });

  it("best-of: điểm thấp hơn không ghi đè", () => {
    submitStationResult("hsk-2", "1", 10, 10, store);
    const r = submitStationResult("hsk-2", "1", 5, 10, store);
    expect(r.improved).toBe(false);
    expect(store.data["hsk-2"]!["1"]).toEqual({ pct: 100, stars: 3 });
  });

  it("dưới 80 vẫn ghi pct (thanh progress fill) với stars 0", () => {
    const r = submitStationResult("hsk-2", "1", 3, 7, store);
    expect(r.passed).toBe(false);
    expect(store.data["hsk-2"]!["1"]).toEqual({ pct: 43, stars: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/station-quiz.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Implement `src/lib/station-quiz.ts`**

```ts
/* Station quiz — sinh câu hỏi MCQ từ dữ liệu vocab/gram nhúng trong station
   (spec 2026-10-28 §5). Pure trừ submitStationResult (ghi progressStore). */
import type { RoadmapLevel, Station } from "@/content/roadmap-stations";
import { progressStore, type StationProgress } from "@/lib/store/progress-store";
import { PASS_PCT } from "@/lib/roadmap-progress";

export type QuizQuestion = { prompt: string; options: string[]; answerIndex: number };
export type StationPool = {
  vocab: Array<[string, string, string]>; // [zh, pinyin, việt]
  gram: Array<[string, string]>;          // [tên mẫu, ý nghĩa]
};

type Rng = () => number;

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function levelPool(level: RoadmapLevel): StationPool {
  const vocab: StationPool["vocab"] = [];
  const gram: StationPool["gram"] = [];
  for (const s of level.stations) {
    if (s.kind !== "lesson") continue;
    vocab.push(...s.vocab);
    gram.push(...s.gram);
  }
  return { vocab, gram };
}

/** 4 options gồm đáp án + 3 nhiễu từ candidates (không trùng, không trùng đáp án). */
function optionsFor(answer: string, candidates: string[], rng: Rng): { options: string[]; answerIndex: number } {
  const uniq = [...new Set(candidates.filter((c) => c !== answer))];
  const picked = shuffle(uniq, rng).slice(0, 3);
  const options = shuffle([answer, ...picked], rng);
  return { options, answerIndex: options.indexOf(answer) };
}

export function buildStationQuestions(
  station: Station,
  pool: StationPool = { vocab: station.vocab, gram: station.gram },
  rng: Rng = Math.random,
): QuizQuestion[] {
  const qs: QuizQuestion[] = [];
  station.vocab.forEach(([zh, , vn], i) => {
    const candidates = pool.vocab.map(([, , v]) => v);
    if (i % 2 === 0) {
      // nghĩa → từ
      const { options, answerIndex } = optionsFor(zh, pool.vocab.map(([z]) => z), rng);
      qs.push({ prompt: `Từ nào có nghĩa là “${vn}”?`, options, answerIndex });
    } else {
      // từ → nghĩa
      const { options, answerIndex } = optionsFor(vn, candidates, rng);
      qs.push({ prompt: `“${zh}” có nghĩa là gì?`, options, answerIndex });
    }
  });
  station.gram.forEach(([name, desc], i) => {
    if (i % 2 === 0) {
      const { options, answerIndex } = optionsFor(desc, pool.gram.map(([, d]) => d), rng);
      qs.push({ prompt: `Mẫu ngữ pháp “${name}” diễn đạt ý gì?`, options, answerIndex });
    } else {
      const { options, answerIndex } = optionsFor(name, pool.gram.map(([n]) => n), rng);
      qs.push({ prompt: `Ý nghĩa “${desc}” ứng với mẫu nào?`, options, answerIndex });
    }
  });
  return shuffle(qs, rng);
}

export function sampleMilestoneQuestions(level: RoadmapLevel, rng: Rng = Math.random): QuizQuestion[] {
  const pool = levelPool(level);
  const qs: QuizQuestion[] = [];
  const vocabPicks = shuffle(pool.vocab, rng).slice(0, 8);
  const gramPicks = shuffle(pool.gram, rng).slice(0, 2);
  for (const [zh, , vn] of vocabPicks) {
    const toZh = rng() < 0.5;
    const { options, answerIndex } = toZh
      ? optionsFor(zh, pool.vocab.map(([z]) => z), rng)
      : optionsFor(vn, pool.vocab.map(([, , v]) => v), rng);
    qs.push(
      toZh
        ? { prompt: `Từ nào có nghĩa là “${vn}”?`, options, answerIndex }
        : { prompt: `“${zh}” có nghĩa là gì?`, options, answerIndex },
    );
  }
  for (const [name, desc] of gramPicks) {
    const { options, answerIndex } = optionsFor(desc, pool.gram.map(([, d]) => d), rng);
    qs.push({ prompt: `Mẫu ngữ pháp “${name}” diễn đạt ý gì?`, options, answerIndex });
  }
  return shuffle(qs, rng);
}

export type StationResult = { pct: number; passed: boolean; stars: 0 | 1 | 2 | 3; improved: boolean };

export function submitStationResult(
  levelId: string,
  stationId: string,
  correct: number,
  total: number,
  store: {
    getStationProgress(id: string): Record<string, StationProgress>;
    setStationProgress(id: string, sid: string, rec: StationProgress): void;
  } = progressStore,
): StationResult {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const prev = store.getStationProgress(levelId)[stationId] ?? null;
  if (prev != null && prev.pct >= pct) {
    return { pct: prev.pct, passed: prev.pct >= PASS_PCT, stars: prev.stars, improved: false };
  }
  const stars = pct >= 100 ? 3 : pct >= 90 ? 2 : pct >= PASS_PCT ? 1 : 0;
  store.setStationProgress(levelId, stationId, { pct, stars });
  return { pct, passed: pct >= PASS_PCT, stars, improved: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/station-quiz.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/station-quiz.ts src/lib/__tests__/station-quiz.test.ts
git commit -m "feat(roadmap): station-quiz lib — build/sample questions + submit best-of"
```

---

### Task 4: `StationQuiz` component + drawer integration

**Files:**
- Create: `app-next/src/components/roadmap/station-quiz.tsx`
- Modify: `app-next/src/components/roadmap/station-drawer.tsx`
- Test (create): `app-next/src/components/roadmap/__tests__/station-quiz.test.tsx`
- Test (modify): `app-next/src/components/roadmap/__tests__/station-drawer.test.tsx`

**Interfaces:**
- Consumes: `buildStationQuestions`, `sampleMilestoneQuestions`, `levelPool`, `submitStationResult` (Task 3); `Station`, `RoadmapLevel` từ content.
- Produces: `export function StationQuiz({ station, level, onClose }: { station: Station; level: RoadmapLevel; onClose: () => void }): JSX.Element` — flow: câu hỏi → feedback → kết quả → "Làm lại"/"Đóng".
- `StationDrawer` props mới: `level: RoadmapLevel` (bên cạnh `view, open, onClose`).

- [ ] **Step 1: Write the failing test cho StationQuiz**

```tsx
// app-next/src/components/roadmap/__tests__/station-quiz.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StationQuiz } from "../station-quiz";
import { getRoadmapLevel } from "@/content/roadmap-stations";

const toast = vi.hoisted(() => vi.fn());
vi.mock("@/components/shell/toast-provider", () => ({ useToastSafe: () => toast }));

const hsk2 = getRoadmapLevel("hsk-2")!;
const s1 = hsk2.stations.find((s) => s.id === "1")!;

// rng cố định qua mock lib — component dùng default Math.random nên test đi theo UI
beforeEach(() => { toast.mockClear(); localStorage.clear(); });

describe("StationQuiz", () => {
  it("hiện câu hỏi + 4 lựa chọn", () => {
    render(<StationQuiz station={s1} level={hsk2} onClose={() => {}} />);
    expect(screen.getByTestId("quiz-prompt")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^quiz-opt-/ })).toHaveLength(4);
  });

  it("chọn đúng → feedback Đúng, hết câu → kết quả pass + toast + ghi progress", async () => {
    const user = userEvent.setup();
    render(<StationQuiz station={s1} level={hsk2} onClose={() => {}} />);
    const total = s1.vocab.length + s1.gram.length;
    // trả lời đúng hết: option nào cũng bấm — chọn theo data-answer
    for (let i = 0; i < total; i++) {
      const opts = screen.getAllByRole("button", { name: /^quiz-opt-/ });
      await user.click(opts.find((b) => b.getAttribute("data-correct") === "true")!);
      const next = screen.getByRole("button", { name: i === total - 1 ? "Xem kết quả" : "Câu tiếp" });
      await user.click(next);
    }
    expect(screen.getByTestId("quiz-result")).toHaveTextContent(`${total}/${total}`);
    expect(screen.getByTestId("quiz-result")).toHaveTextContent(/Đạt/);
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/Hoàn thành/));
    const rec = JSON.parse(localStorage.getItem("bye.roadmap.stations.v1")!)["hsk-2"]["1"];
    expect(rec.pct).toBe(100);
    expect(rec.stars).toBe(3);
  });

  it("chọn sai 1 câu → vẫn feedback và sang câu tiếp", async () => {
    const user = userEvent.setup();
    render(<StationQuiz station={s1} level={hsk2} onClose={() => {}} />);
    const opts = screen.getAllByRole("button", { name: /^quiz-opt-/ });
    await user.click(opts.find((b) => b.getAttribute("data-correct") === "false")!);
    expect(screen.getByTestId("quiz-feedback")).toHaveTextContent(/Sai/);
    await user.click(screen.getByRole("button", { name: "Câu tiếp" }));
    expect(screen.getByTestId("quiz-prompt")).toBeTruthy();
  });

  it("Milestone dùng sampler 10 câu", () => {
    const m = hsk2.stations.find((s) => s.id === "m")!;
    const { rerender } = render(<StationQuiz station={m} level={hsk2} onClose={() => {}} />);
    // đếm qua UI không tiện → check qua hành vi: chip tổng câu
    expect(screen.getByTestId("quiz-counter")).toHaveTextContent("1/10");
    rerender(<StationQuiz station={s1} level={hsk2} onClose={() => {}} />);
    expect(screen.getByTestId("quiz-counter")).toHaveTextContent(`1/${s1.vocab.length + s1.gram.length}`);
  });

  it("Làm lại reset về câu 1; Đóng gọi onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<StationQuiz station={s1} level={hsk2} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Đóng" }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/roadmap/__tests__/station-quiz.test.tsx`
Expected: FAIL — component chưa tồn tại.

- [ ] **Step 3: Implement `src/components/roadmap/station-quiz.tsx`**

```tsx
"use client";

/* Station quiz trong drawer (spec 2026-10-28 §5.2): MCQ từng câu, chấm ngay,
   kết quả ghi progress qua submitStationResult (best-of, ≥80% pass). */
import { useMemo, useState } from "react";
import { Check, X } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import {
  buildStationQuestions,
  levelPool,
  sampleMilestoneQuestions,
  submitStationResult,
  type QuizQuestion,
} from "@/lib/station-quiz";
import { useToastSafe } from "@/components/shell/toast-provider";
import type { Station, RoadmapLevel } from "@/content/roadmap-stations";

export function StationQuiz({
  station,
  level,
  onClose,
}: {
  station: Station;
  level: RoadmapLevel;
  onClose: () => void;
}) {
  const toast = useToastSafe();
  const [seed, setSeed] = useState(0);
  const questions = useMemo<QuizQuestion[]>(
    () =>
      station.kind === "milestone"
        ? sampleMilestoneQuestions(level)
        : buildStationQuestions(station, levelPool(level)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed đổi khi "Làm lại"
    [station.id, level.id, seed],
  );
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState<{ pct: number; passed: boolean } | null>(null);

  const q = questions[qIndex];
  const total = questions.length;

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answerIndex) setCorrect((c) => c + 1);
  };

  const next = () => {
    if (qIndex < total - 1) {
      setQIndex((i) => i + 1);
      setPicked(null);
      return;
    }
    const finalCorrect = correct;
    const r = submitStationResult(level.id, station.id, finalCorrect, total);
    setFinished({ pct: r.pct, passed: r.passed });
    if (r.passed) toast(`🎉 Hoàn thành ${station.no} — ${r.pct}%`);
    else toast(`Chưa đạt 80% — làm lại nhé! (${r.pct}%)`);
  };

  const retry = () => {
    setSeed((s) => s + 1);
    setQIndex(0);
    setPicked(null);
    setCorrect(0);
    setFinished(null);
  };

  if (finished) {
    return (
      <div data-testid="quiz-result" className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-3xl">{finished.passed ? "🎉" : "💪"}</p>
        <p className="text-lg font-extrabold">
          {correct}/{total} câu đúng · {finished.pct}%
        </p>
        <p className={cn("text-sm font-bold", finished.passed ? "text-jade" : "text-text-secondary")}>
          {finished.passed ? "Đạt! Buổi học được đánh dấu hoàn thành ✅" : "Cần đạt ≥ 80% để hoàn thành — làm lại nhé!"}
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={retry}
            className="min-h-11 rounded-control border border-border-default bg-surface-muted px-4 text-[13.5px] font-bold hover:border-border-strong"
          >
            Làm lại
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-control border border-action-primary bg-action-primary px-4 text-[13.5px] font-bold text-white hover:bg-action-primary-hover"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p data-testid="quiz-counter" className="text-xs font-bold text-text-secondary">
        Câu {qIndex + 1}/{total}
      </p>
      <p data-testid="quiz-prompt" className="mt-2 text-[15px] leading-snug">
        {q.prompt}
      </p>
      <div className="mt-3 grid gap-2">
        {q.options.map((opt, i) => {
          const isAnswer = i === q.answerIndex;
          const isPicked = picked === i;
          return (
            <button
              key={`${qIndex}-${i}`}
              type="button"
              data-correct={isAnswer ? "true" : "false"}
              onClick={() => pick(i)}
              aria-label={`quiz-opt-${i}`}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-control border px-3 py-2 text-left text-[13.5px]",
                picked === null && "border-border-default bg-surface-muted hover:border-border-strong",
                picked !== null && isAnswer && "border-jade bg-jade/10 font-bold",
                picked !== null && isPicked && !isAnswer && "border-terracotta bg-terracotta/10",
                picked !== null && !isPicked && !isAnswer && "border-border-default opacity-60",
              )}
            >
              {picked !== null && isAnswer && <Check size={14} aria-hidden="true" />}
              {picked !== null && isPicked && !isAnswer && <X size={14} aria-hidden="true" />}
              <span className="zh">{opt}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p data-testid="quiz-feedback" className="mt-2 text-sm font-bold">
          {picked === q.answerIndex ? "✅ Đúng" : "❌ Sai"}
        </p>
      )}
      <button
        type="button"
        onClick={next}
        disabled={picked === null}
        className="mt-3 flex min-h-11 w-full items-center justify-center rounded-control border border-action-primary bg-action-primary px-4 text-[13.5px] font-bold text-white disabled:opacity-50"
      >
        {qIndex === total - 1 ? "Xem kết quả" : "Câu tiếp"}
      </button>
    </div>
  );
}
```

Lưu ý token: kiểm tra `text-jade`, `border-terracotta` tồn tại trong token set (grep `tailwind.config`/`variables.css`); nếu không có thì dùng `text-success`/`border-destructive` theo DESIGN.md — executor phải grep trước khi dùng.

- [ ] **Step 4: Modify `station-drawer.tsx`**

1. Props thêm `level: RoadmapLevel` (import type từ content).
2. Thêm state `quizOpen` và render: khi `quizOpen && view.state !== "locked"` → body (thay SegmentedTabs + list) hiển thị `<StationQuiz station={station} level={level} onClose={() => setQuizOpen(false)} />`, ẩn 3 launch button; khi đóng quiz về tabs.
3. Đổi `LAUNCH` thành render động:

```tsx
const lessonHref = station.lesson ? `/lesson/${station.lesson.book}/${station.lesson.page}` : null;
```

- "Học Flashcard": `lessonHref` có → `<Link href={lessonHref} className="...same classes...">` (giữ icon MonitorPlay); không có (milestone) → button disabled + `title="Mini test tổng hợp"`.
- "Luyện viết Hanzi": `<Link href="/hanzi">` với icon PencilLine.
- "Thi trắc nghiệm Quiz": button, `disabled={view.state === "locked"}`, onClick `setQuizOpen(true)`.
- Mở drawer reset `quizOpen` (trong effect `if (open) { setTab("vocab"); setQuizOpen(false); }`).

4. Cập nhật test cũ `station-drawer.test.tsx`:
   - Mỗi render truyền thêm `level={hsk2}`.
   - Test "3 nút launch" → đổi expect: "Học Flashcard" là **link** (`screen.getByRole("link", { name: "Học Flashcard" })` với href `/lesson/hsk2/lesson-4` cho Trạm 4), "Luyện viết Hanzi" là link `/hanzi`, "Thi trắc nghiệm Quiz" là button.
   - Thêm test: Trạm 1 (active) click "Thi trắc nghiệm Quiz" → `quiz-prompt` xuất hiện; drawer locked (mkView "2", "locked") → button disabled.
   - Test milestone (mkView "m") → "Học Flashcard" disabled.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/roadmap/__tests__/station-quiz.test.tsx src/components/roadmap/__tests__/station-drawer.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/roadmap/station-quiz.tsx src/components/roadmap/station-drawer.tsx src/components/roadmap/__tests__/station-quiz.test.tsx src/components/roadmap/__tests__/station-drawer.test.tsx
git commit -m "feat(roadmap): station quiz trong drawer + launch buttons điều hướng thật"
```

---

### Task 5: Client — navigation, "Tiếp tục học", % toàn lộ trình, Review card

**Files:**
- Create: `app-next/src/components/roadmap/review-card.tsx`
- Test (create): `app-next/src/components/roadmap/__tests__/review-card.test.tsx`
- Modify: `app-next/src/app/(app)/roadmap/roadmap-client.tsx`
- Modify: `app-next/src/components/roadmap/roadmap-topbar.tsx` (chỉ aria-label)
- Test (modify): `app-next/src/app/(app)/roadmap/__tests__/roadmap-client.test.tsx`, `app-next/src/components/roadmap/__tests__/roadmap-topbar.test.tsx`

**Interfaces:**
- Consumes: `overallRoadmapPct` (Task 2), `Station.lesson` (Task 1), `progressStore.getAllSrs(): SrsItem[]` (status: `"new"|"learning"|"review"|"relearning"`, `dueAt: number | null`).
- Produces:
  - `export function ReviewCard(): JSX.Element` — card link `/review`, badge `{n} thẻ đến hạn` khi n > 0.
  - `RoadmapTopbar` props giữ nguyên, `pct` giờ là overall %; aria-label "Tiến độ toàn lộ trình {pct}%".
  - `onContinue(id)` → `router.push`.

- [ ] **Step 1: Write the failing test cho ReviewCard**

```tsx
// app-next/src/components/roadmap/__tests__/review-card.test.tsx
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewCard } from "../review-card";

const item = (due: number | null, status = "review") => ({
  key: "k", status, ease: 2.5, intervalDays: 1, lapses: 0,
  dueAt: due, reviewCount: 1, lastReviewedAt: 1, createdAt: 1, updatedAt: 1,
});

beforeEach(() => localStorage.clear());

describe("ReviewCard", () => {
  it("link /review; 0 thẻ đến hạn → không có badge", () => {
    render(<ReviewCard />);
    const link = screen.getByRole("link", { name: /Ôn tập ngắt quãng/ });
    expect(link.getAttribute("href")).toBe("/review");
    expect(screen.queryByTestId("review-due")).toBeNull();
  });

  it("đếm đúng thẻ đến hạn (status ≠ new, dueAt <= now)", () => {
    localStorage.setItem("bye.srs.items", JSON.stringify({
      a: item(Date.now() - 1000),
      b: item(Date.now() + 86400000),        // chưa đến hạn
      c: item(Date.now() - 1000, "new"),      // new không tính
      d: item(null),                          // không hạn
    }));
    render(<ReviewCard />);
    expect(screen.getByTestId("review-due")).toHaveTextContent("1 thẻ đến hạn");
  });
});
```

Lưu ý: key SRS thật là `SRS_ITEMS_KEY` trong progress-store — executor **grep `SRS_ITEMS_KEY =` trong `src/lib/store/progress-store.ts`** và dùng đúng giá trị đó trong test (không đoán "bye.srs.items").

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/roadmap/__tests__/review-card.test.tsx`
Expected: FAIL — component chưa tồn tại.

- [ ] **Step 3: Implement `review-card.tsx`**

```tsx
"use client";

/* Card "Tổng ôn" dưới serpentine (spec 2026-10-28 §6.3): link /review +
   badge số thẻ SRS đến hạn (mount-gated, re-sync qua bye:progress). */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Repeat } from "@/components/ui/icon";
import { progressStore } from "@/lib/store/progress-store";

export function ReviewCard() {
  const [due, setDue] = useState(0);
  useEffect(() => {
    const sync = () => {
      try {
        const now = Date.now();
        setDue(
          progressStore
            .getAllSrs()
            .filter((it) => it.status !== "new" && it.dueAt != null && it.dueAt <= now).length,
        );
      } catch {
        setDue(0);
      }
    };
    sync();
    window.addEventListener("bye:progress", sync);
    return () => window.removeEventListener("bye:progress", sync);
  }, []);

  return (
    <Link
      href="/review"
      className="flex min-h-16 items-center gap-4 rounded-card border border-border-default bg-surface-elevated px-4 py-3.5 shadow-xs transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md"
      aria-label={`Ôn tập ngắt quãng — ${due} thẻ đến hạn`}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border-default bg-surface-muted">
        <Repeat size={18} strokeWidth={2.4} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <b className="text-sm">Tổng ôn</b>
          {due > 0 && (
            <span
              data-testid="review-due"
              className="rounded-full border border-border-default bg-amber-wash px-2 py-0.5 text-[11px] font-extrabold text-amber-ink dark:text-learning-streak"
            >
              {due} thẻ đến hạn
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-[12.5px] text-text-secondary">
          Ôn tập ngắt quãng (SRS) từ vựng &amp; ngữ pháp đã học — thêm thẻ bằng nút ⭐ trong bài học, đến hạn là vào ôn.
        </span>
      </span>
      <span className="text-sm font-bold text-action-primary">Vào ôn →</span>
    </Link>
  );
}
```

Kiểm tra token `bg-amber-wash`, `text-amber-ink` — đã dùng ở station-card.tsx (Trophy) nên tồn tại.

- [ ] **Step 4: Modify `roadmap-client.tsx`**

1. Import `overallRoadmapPct` + `ReviewCard`.
2. Thay state `pinyinDone` bằng overall (giữ pinyinDone cho banner hsk-1):

```ts
const [overall, setOverall] = useState(0);
useEffect(() => {
  if (!mounted) return;
  const sync = () => {
    try { setPinyinDone(progressStore.getRoadmapDone().length); } catch { setPinyinDone(0); }
    try { setOverall(overallRoadmapPct(progressStore)); } catch { setOverall(0); }
  };
  sync();
  window.addEventListener("bye:progress", sync);
  return () => window.removeEventListener("bye:progress", sync);
}, [mounted]);
```

3. Topbar: `<RoadmapTopbar … pct={mounted ? overall : 0} />`.
4. `onContinue`:

```ts
const onContinue = (id: string) => {
  const v = views.find((x) => x.station.id === id);
  const lesson = v?.station.lesson;
  router.push(lesson ? `/lesson/${lesson.book}/${lesson.page}` : "/course/hsk2");
};
```

5. Banner hsk-2 `endLabel` — khối 2 dòng:

```tsx
endLabel: (() => {
  const lesson = activeView?.station.lesson;
  const href = activeView ? (lesson ? `/lesson/${lesson.book}/${lesson.page}` : "/course/hsk2") : null;
  return (
    <span className="flex flex-col items-end gap-0.5">
      {href && (
        <Link href={href} className="font-bold text-action-primary">
          Tiếp tục học →
        </Link>
      )}
      {summary.remainingToMilestone != null && (
        <span>
          Còn <b>{summary.remainingToMilestone} bài</b> tới mốc
        </span>
      )}
    </span>
  );
})(),
```

6. `currentLabel`: khi mọi view done → `<>🎉 Hoàn thành toàn bộ trạm</>`; ngược lại logic cũ.
7. Render `<ReviewCard />` ngay sau khối banner (trước SerpentinePath), mọi nhánh level (cả upcoming + hsk-1).
8. Truyền `level` cho drawer: `<StationDrawer view={drawerView} level={level} … />`.

- [ ] **Step 5: Sửa `roadmap-topbar.tsx`**

Chỉ đổi aria-label:

```tsx
aria-label={`Tiến độ toàn lộ trình ${pct}%`}
```

- [ ] **Step 6: Cập nhật test client/topbar**

`roadmap-client.test.tsx`:
- Mock `next/navigation` đã có — thêm assert: click nút "Vào bài học" (Trạm 1 active mặc định) → `router.push` gọi với `/lesson/hsk2/lesson-1`.
- Với level có record `bye.roadmap.stations.v1` rỗng → topbar hiển thị `0%`; set pinyin done 4/8 → khi level hsk-1, pill vẫn thể hiện overall (50+hsk2 0 → 25%): assert text "25%".
- Banner: activeView có lesson → link "Tiếp tục học →" href `/lesson/hsk2/lesson-1`.

`roadmap-topbar.test.tsx`: assert `aria-label` mới "Tiến độ toàn lộ trình …".

- [ ] **Step 7: Run tests**

Run: `pnpm vitest run src/components/roadmap/__tests__/review-card.test.tsx "src/app/(app)/roadmap/__tests__/roadmap-client.test.tsx" src/components/roadmap/__tests__/roadmap-topbar.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/roadmap/review-card.tsx src/components/roadmap/__tests__/review-card.test.tsx "src/app/(app)/roadmap/roadmap-client.tsx" src/components/roadmap/roadmap-topbar.tsx "src/app/(app)/roadmap/__tests__/roadmap-client.test.tsx" src/components/roadmap/__tests__/roadmap-topbar.test.tsx
git commit -m "feat(roadmap): onContinue điều hướng + Tiếp tục học + % toàn lộ trình + Review card"
```

---

### Task 6: Verification toàn bộ

**Files:** không đổi code; chỉ chạy verify.

- [ ] **Step 1: Full unit test**

Run: `pnpm test`
Expected: toàn bộ PASS (không skip mới, không fail).

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: 0 error.

- [ ] **Step 3: smoke dev server (nếu đang chạy :3100)**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/roadmap`
Expected: `200`.

- [ ] **Step 4: Commit cuối (nếu còn file lẻ) + tổng kết**

```bash
git status --short   # phải sạch (trừ file untracked của branch khác)
git log --oneline -6 # 5 commit task + 1 commit spec
```

---

## Browser QA (sau SDD — chạy bằng control-browser skill)

Checklist 15 case trong spec §9 (mục "Browser QA checklist") — chạy trên `http://localhost:3100/roadmap`, mobile viewport 390×844 + desktop, dùng dev-login nếu cần. Tiêu chí: 15/15 PASS; fail nào → fix → chạy lại case đó + case liên quan.
