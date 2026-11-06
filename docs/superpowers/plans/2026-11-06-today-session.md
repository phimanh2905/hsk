# Buổi học hôm nay (Today Session) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một card trên Home trả lời "hôm nay tôi học gì" — ôn thẻ đến hạn trước, rồi đúng 1 bài học mới, xong là đủ ngày.

**Architecture:** Toàn bộ trạng thái derive lúc render từ progressStore + roadmap + SM-2; chỉ persist `nhai.today = {date, partId}` trong progressStore và sync qua domain mới `todaySession` (last-write-wins). Lib thuần `src/lib/today-session.ts` được test bằng Vitest không cần DOM; TodayCard là presentational, HomeHero swap hiện có được mở rộng.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, React 19, Tailwind v4 (semantic tokens Hanzi), Vitest + Testing Library (jsdom), Playwright (e2e).

**Spec:** `docs/superpowers/specs/2026-11-06-today-session-design.md`

## Global Constraints

- Hard gate: 1 phần mới/ngày; xong 1 phần → Done state, ôn thêm được nhưng không tạo buổi mới.
- "1 phần mới" = 1 bài học (`/lesson/{book}/{page}`); milestone chặng tính là 1 phần.
- Điểm vào là card trên Home (HomeHero swap), không thêm route `/today`.
- Ôn-trước-học-sau là **gợi ý thứ tự**, không khoá: nút Học luôn bấm được.
- Thuần client derive; duy nhất persist `nhai.today = { date: 'YYYY-MM-DD' (local VN), partId: string }`.
- Domain sync mới `todaySession`: last-write-wins theo `date`, không tombstone, payload ≤ vài chục bytes.
- Không sửa 4 mode cũ (lesson/review/shadowing/reading) ngoài việc gọi `markPageDone` như hiện có.
- UI chỉ dùng semantic token Hanzi (`bg-surface`, `text-fg`, `border-line`, …) — không hard-code màu/px ngoài grid 4px; touch target ≥ 44px.
- Ngày dùng `vnDayString` (đã có trong progress-store) — cùng một nguồn timezone với heat/streak.
- Mọi hàm nhận `now: number` qua tham số (không gọi `Date.now()` trong lib thuần) để test được.

---

### Task 1: Lib thuần `today-session`

**Files:**
- Create: `src/lib/today-session.ts`
- Test: `src/lib/today-session.test.ts`

**Interfaces:**
- Consumes: `RoadmapLevel`/`Station` từ `@/content/roadmap-stations`, `StationView`/`deriveStationStates` từ `@/lib/roadmap-progress`, `sessionStatus` từ `@/lib/roadmap-status`.
- Produces:
  ```ts
  export type TodayPart =
    | { kind: "pinyin"; sessionNo: number; title: string }
    | { kind: "lesson"; book: string; page: string; title: string }
    | { kind: "milestone"; stationId: string; title: string };
  export type TodayState = {
    todayKey: string;
    partDoneToday: boolean;
    dueCount: number;
    nextPart: TodayPart | null;
  };
  export function todayKeyOf(now: number): string;
  export function computeTodaySession(input: {
    now: number;
    today: { date: string; partId: string } | null;
    dueCount: number;
    pinyinDone: number[];
    levels: RoadmapLevel[];
    stationRecord: Record<string, Record<string, { pct: number; stars: number }>>;
    lessonDone: (book: string, page: string) => boolean;
    skippedPartIds?: string[];
  }): TodayState;
  export function partIdOf(p: TodayPart): string;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/today-session.test.ts
import { describe, expect, it } from "vitest";
import { computeTodaySession, partIdOf, todayKeyOf } from "./today-session";
import type { RoadmapLevel } from "@/content/roadmap-stations";

const lessons = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({ book: prefix, page: `lesson-${i + 1}` }));

const levels = (): RoadmapLevel[] => [
  {
    id: "hsk-1", label: "HSK 1", kicker: "", title: "Chặng 1", status: "available",
    stations: [
      { id: "s1", no: "Trạm 1", title: "Trạm 1", kind: "lesson", lessons: lessons("hsk1", 2) },
      { id: "m1", no: "Tổng ôn", title: "Tổng ôn chặng", kind: "milestone" },
    ],
  } as RoadmapLevel,
];

const base = {
  now: new Date("2026-11-06T10:00:00+07:00").getTime(),
  today: null,
  dueCount: 0,
  pinyinDone: [1, 2, 3, 4, 5, 6, 7, 8],
  levels: levels(),
  stationRecord: {},
  lessonDone: () => false,
};

describe("todayKeyOf", () => {
  it("dùng ngày local VN, đổi ngày đúng ranh giới 00:00", () => {
    expect(todayKeyOf(new Date("2026-11-06T23:59:00+07:00").getTime())).toBe("2026-11-06");
    expect(todayKeyOf(new Date("2026-11-07T00:01:00+07:00").getTime())).toBe("2026-11-07");
  });
});

describe("computeTodaySession", () => {
  it("trước gate pinyin → nextPart là buổi pinyin kế tiếp", () => {
    const r = computeTodaySession({ ...base, pinyinDone: [1, 2] });
    expect(r.nextPart).toEqual({ kind: "pinyin", sessionNo: 3, title: expect.stringContaining("Buổi 3") });
    expect(partIdOf(r.nextPart!)).toBe("pinyin:3");
  });

  it("xong pinyin + bài đầu chưa done → bài đầu của trạm active", () => {
    const r = computeTodaySession(base);
    expect(r.nextPart).toEqual({ kind: "lesson", book: "hsk1", page: "lesson-1", title: expect.any(String) });
  });

  it("bỏ qua bài → nhảy bài kế", () => {
    const r = computeTodaySession({ ...base, skippedPartIds: ["lesson:hsk1:lesson-1"] });
    expect(r.nextPart).toEqual({ kind: "lesson", book: "hsk1", page: "lesson-2", title: expect.any(String) });
  });

  it("hết bài trạm, milestone chưa pass → nextPart là milestone", () => {
    const r = computeTodaySession({
      ...base,
      lessonDone: (b, p) => b === "hsk1" && (p === "lesson-1" || p === "lesson-2"),
    });
    expect(r.nextPart).toEqual({ kind: "milestone", stationId: "m1", title: expect.any(String) });
  });

  it("milestone pass → sang level kế; hết level available → null", () => {
    const r = computeTodaySession({
      ...base,
      lessonDone: () => true,
      stationRecord: { "hsk-1": { m1: { pct: 90, stars: 3 } } },
    });
    expect(r.nextPart).toBeNull();
  });

  it("đã xong phần hôm nay → partDoneToday true và nextPart vẫn trả (cho nút học thêm)", () => {
    const key = todayKeyOf(base.now);
    const r = computeTodaySession({ ...base, today: { date: key, partId: "lesson:hsk1:lesson-1" } });
    expect(r.partDoneToday).toBe(true);
    expect(r.nextPart).not.toBeNull();
  });

  it("today của ngày khác → partDoneToday false", () => {
    const r = computeTodaySession({ ...base, today: { date: "2026-11-05", partId: "lesson:hsk1:lesson-1" } });
    expect(r.partDoneToday).toBe(false);
  });

  it("dueCount được truyền thẳng ra state", () => {
    expect(computeTodaySession({ ...base, dueCount: 12 }).dueCount).toBe(12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && pnpm vitest run src/lib/today-session.test.ts`
Expected: FAIL — `Failed to resolve import "./today-session"`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/today-session.ts
/* Buổi học hôm nay — derive thuần (spec 2026-11-06 §4). Không đọc localStorage,
   không gọi Date.now(); caller truyền mọi thứ vào. */

import type { RoadmapLevel } from "@/content/roadmap-stations";
import { deriveStationStates, gateStatus, PINYIN_SESSIONS, type StationView } from "@/lib/roadmap-progress";
import { sessionStatus } from "@/lib/roadmap-status";

export type TodayPart =
  | { kind: "pinyin"; sessionNo: number; title: string }
  | { kind: "lesson"; book: string; page: string; title: string }
  | { kind: "milestone"; stationId: string; title: string };

export type TodayState = {
  todayKey: string;
  partDoneToday: boolean;
  dueCount: number;
  nextPart: TodayPart | null;
};

export function todayKeyOf(now: number): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function partIdOf(p: TodayPart): string {
  if (p.kind === "pinyin") return `pinyin:${p.sessionNo}`;
  if (p.kind === "lesson") return `lesson:${p.book}:${p.page}`;
  return `milestone:${p.stationId}`;
}

/* Pinyin còn buổi chưa xong và chưa được miễn qua placement → buổi kế. */
function nextPinyin(done: number[]): TodayPart | null {
  for (let n = 1; n <= PINYIN_SESSIONS; n++) {
    if (sessionStatus(done, n) !== "done") {
      return { kind: "pinyin", sessionNo: n, title: `Buổi ${n}: nền tảng pinyin` };
    }
  }
  return null;
}

function pickFromLevel(
  level: RoadmapLevel,
  record: Record<string, { pct: number; stars: number }>,
  lessonDone: (book: string, page: string) => boolean,
  skipped: Set<string>,
): TodayPart | null {
  const views: StationView[] = deriveStationStates(level, record, lessonDone);
  for (const v of views) {
    if (v.state === "done") continue;
    if (v.station.kind === "milestone") {
      const id = partIdOf({ kind: "milestone", stationId: v.station.id, title: "" });
      if (skipped.has(id)) continue;
      return { kind: "milestone", stationId: v.station.id, title: v.station.title };
    }
    const list = v.station.lessons ?? (v.station.lesson ? [v.station.lesson] : []);
    for (const l of list) {
      if (lessonDone(l.book, l.page)) continue;
      const id = `lesson:${l.book}:${l.page}`;
      if (skipped.has(id)) continue;
      return { kind: "lesson", book: l.book, page: l.page, title: `${v.station.title} · ${l.page}` };
    }
  }
  return null;
}

export function computeTodaySession(input: {
  now: number;
  today: { date: string; partId: string } | null;
  dueCount: number;
  pinyinDone: number[];
  levels: RoadmapLevel[];
  stationRecord: Record<string, Record<string, { pct: number; stars: number }>>;
  lessonDone: (book: string, page: string) => boolean;
  suggestedStage?: "pinyin" | "hsk1" | "hsk2" | "hsk3" | "hsk4" | "hsk5" | null;
  skippedPartIds?: string[];
}): TodayState {
  const todayKey = todayKeyOf(input.now);
  const skipped = new Set(input.skippedPartIds ?? []);

  const available = input.levels.filter((l) => l.status === "available");

  // Stage 1: pinyin (nếu chưa exempt và chưa xong 8 buổi)
  const pinyinDoneCount = input.pinyinDone.length;
  const hsk1 = available.find((l) => l.id === "hsk-1") ?? null;
  const gate =
    hsk1 != null
      ? gateStatus("hsk-1", {
          getRoadmapDone: () => input.pinyinDone,
          getStationProgress: (id) => input.stationRecord[id] ?? {},
          getRoadmapGate: () => null,
        }, pinyinDoneCount, input.suggestedStage ?? null)
      : "open";

  if (gate === "locked") {
    return {
      todayKey,
      partDoneToday: input.today?.date === todayKey,
      dueCount: input.dueCount,
      nextPart: nextPinyin(input.pinyinDone),
    };
  }

  // Stage 2: level có gate đã mở, đi tuần tự trạm
  let nextPart: TodayPart | null = null;
  for (const level of available) {
    if (level.stations.length === 0) continue;
    nextPart = pickFromLevel(level, input.stationRecord[level.id] ?? {}, input.lessonDone, skipped);
    if (nextPart != null) break;
  }

  return {
    todayKey,
    partDoneToday: input.today?.date === todayKey,
    dueCount: input.dueCount,
    nextPart,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && pnpm vitest run src/lib/today-session.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
cd app-next && git add src/lib/today-session.ts src/lib/today-session.test.ts
git commit -m "feat(today): lib derive buổi học hôm nay (pinyin/lesson/milestone)"
```

---

### Task 2: ProgressStore key `nhai.today` + action

**Files:**
- Modify: `app-next/src/lib/store/progress-store.ts` (interface ~dòng 105-135, implementation cuối class ~dòng 660-690)
- Test: `app-next/src/lib/store/__tests__/today-key.test.ts` (mới)

**Interfaces:**
- Consumes: `vnDayString()` (private, đã có ~dòng 307), `readJSON`/`writeJSON`.
- Produces:
  ```ts
  // ProgressStoreApi thêm:
  getTodaySession(): { date: string; partId: string } | null;
  setTodayPart(partId: string, date?: string): void; // first-write-wins trong ngày
  getSkippedTodayParts(): string[];
  skipTodayPart(partId: string): void; // reset theo ngày như today
  ```

- [ ] **Step 1: Write the failing test**

```ts
// app-next/src/lib/store/__tests__/today-key.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { progressStore } from "../progress-store";

describe("today session key", () => {
  beforeEach(() => localStorage.clear());

  it("chưa có gì → null", () => {
    expect(progressStore.getTodaySession()).toBeNull();
  });

  it("setTodayPart ghi date + partId", () => {
    progressStore.setTodayPart("lesson:hsk1:lesson-1", "2026-11-06");
    expect(progressStore.getTodaySession()).toEqual({ date: "2026-11-06", partId: "lesson:hsk1:lesson-1" });
  });

  it("first-write-wins trong cùng ngày (học thêm không ghi đè)", () => {
    progressStore.setTodayPart("lesson:hsk1:lesson-1", "2026-11-06");
    progressStore.setTodayPart("lesson:hsk1:lesson-2", "2026-11-06");
    expect(progressStore.getTodaySession()?.partId).toBe("lesson:hsk1:lesson-1");
  });

  it("skipTodayPart reset khi sang ngày mới", () => {
    progressStore.skipTodayPart("lesson:hsk1:lesson-1", "2026-11-06");
    expect(progressStore.getSkippedTodayParts()).toEqual(["lesson:hsk1:lesson-1"]);
    progressStore.skipTodayPart("lesson:hsk1:lesson-2", "2026-11-07");
    expect(progressStore.getSkippedTodayParts()).toEqual(["lesson:hsk1:lesson-2"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && pnpm vitest run src/lib/store/__tests__/today-key.test.ts`
Expected: FAIL — `progressStore.setTodayPart is not a function`.

- [ ] **Step 3: Write minimal implementation**

Trong `ProgressStoreApi` (sau `listPageDone`):

```ts
  getTodaySession(): { date: string; partId: string } | null;
  setTodayPart(partId: string, date?: string): void;
  getSkippedTodayParts(date?: string): string[];
  skipTodayPart(partId: string, date?: string): void;
```

Trong class (sau `listPageDone`):

```ts
  /* ---------- today session (spec 2026-11-06 Wave 1) ---------- */

  getTodaySession(): { date: string; partId: string } | null {
    return readJSON<{ date: string; partId: string } | null>("bye.todaySession", null);
  }

  setTodayPart(partId: string, date = vnDayString()): void {
    const cur = this.getTodaySession();
    if (cur != null && cur.date === date) return; // first-write-wins trong ngày
    writeJSON("bye.todaySession", { date, partId });
  }

  getSkippedTodayParts(date = vnDayString()): string[] {
    const rec = readJSON<{ date: string; parts: string[] } | null>("bye.todaySkipped", null);
    return rec != null && rec.date === date ? rec.parts : [];
  }

  skipTodayPart(partId: string, date = vnDayString()): void {
    const parts = this.getSkippedTodayParts(date);
    if (parts.includes(partId)) return;
    writeJSON("bye.todaySkipped", { date, parts: [...parts, partId] });
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && pnpm vitest run src/lib/store/__tests__/today-key.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
cd app-next && git add src/lib/store/progress-store.ts src/lib/store/__tests__/today-key.test.ts
git commit -m "feat(today): progressStore key nhai.today + skip list reset theo ngày"
```

---

### Task 3: Sync domain `todaySession`

**Files:**
- Modify: `app-next/src/lib/store/sync-merge.ts` (thêm merge function cuối file)
- Modify: `app-next/src/server/api/sync.ts` (schema body + xử lý domain)
- Modify: `app-next/src/lib/db/schema.ts` (bảng `todaySession` 1 row/user)
- Create: `app-next/drizzle/<next>_today_session.sql` (qua `pnpm drizzle-kit generate`)
- Test: `app-next/src/lib/store/__tests__/sync-merge.today.test.ts`

**Interfaces:**
- Consumes: pattern merge hiện có (`mergeSrs`, `mergeStudyDay`, `mergeLesson`), `progressStore` API từ Task 2.
- Produces:
  ```ts
  export type SyncTodayRecord = { date: string; partId: string };
  export function mergeTodaySession(a: SyncTodayRecord | null, b: SyncTodayRecord | null): SyncTodayRecord | null;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// app-next/src/lib/store/__tests__/sync-merge.today.test.ts
import { describe, expect, it } from "vitest";
import { mergeTodaySession } from "../sync-merge";

describe("mergeTodaySession", () => {
  it("null + value → value", () => {
    expect(mergeTodaySession(null, { date: "2026-11-06", partId: "a" })).toEqual({ date: "2026-11-06", partId: "a" });
  });
  it("hai bên null → null", () => {
    expect(mergeTodaySession(null, null)).toBeNull();
  });
  it("ngày mới hơn thắng", () => {
    expect(
      mergeTodaySession({ date: "2026-11-05", partId: "a" }, { date: "2026-11-06", partId: "b" }),
    ).toEqual({ date: "2026-11-06", partId: "b" });
  });
  it("cùng ngày → giữ bản có partId (deterministic, không phụ thuộc thứ tự)", () => {
    const a = { date: "2026-11-06", partId: "aaa" };
    const b = { date: "2026-11-06", partId: "bbb" };
    expect(mergeTodaySession(a, b)).toEqual(mergeTodaySession(b, a));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && pnpm vitest run src/lib/store/__tests__/sync-merge.today.test.ts`
Expected: FAIL — `mergeTodaySession is not a function`.

- [ ] **Step 3: Write minimal implementation**

`sync-merge.ts` cuối file:

```ts
/* ---------- todaySession (spec 2026-11-06 Wave 1 §6) ---------- */
export type SyncTodayRecord = { date: string; partId: string };

/** Last-write-wins theo date; cùng ngày chọn partId nhỏ hơn → xác định 2 chiều. */
export function mergeTodaySession(
  a: SyncTodayRecord | null,
  b: SyncTodayRecord | null,
): SyncTodayRecord | null {
  if (a == null) return b;
  if (b == null) return a;
  if (a.date !== b.date) return a.date > b.date ? a : b;
  return a.partId <= b.partId ? a : b;
}
```

`src/lib/db/schema.ts` thêm (theo pattern `studyDay`):

```ts
export const todaySession = sqliteTable("today_session", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  partId: text("part_id").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
```

`src/server/api/sync.ts`: thêm vào schema body

```ts
    todaySession: z.object({ date: z.string(), partId: z.string() }).nullable().optional(),
```

và trong handler sau đoạn robot roadmapGates: upsert 1 row theo `(userId)` với merge luật trên (đọc row cũ → merge → upsert). Nếu `todaySession == null` bỏ qua.

Sinh migration:

```bash
cd app-next && pnpm drizzle-kit generate
# rồi apply local:
pnpm wrangler d1 migrations apply hsk-dev --local -c wrangler.dev.jsonc
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && pnpm vitest run src/lib/store/__tests__/sync-merge.today.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
cd app-next && git add src/lib/store/sync-merge.ts src/server/api/sync.ts src/lib/db/schema.ts drizzle/
git commit -m "feat(sync): domain todaySession — merge last-write-wins, D1 today_session"
```

---

### Task 4: Component `TodayCard`

**Files:**
- Create: `app-next/src/components/home/today-card.tsx`
- Test: `app-next/src/components/home/__tests__/today-card.test.tsx`

**Interfaces:**
- Consumes: `TodayState`, `TodayPart` từ Task 1.
- Produces:
  ```ts
  export type TodayCardProps = {
    state: TodayState;
    onStartReview: () => void;
    onStartPart: (part: TodayPart) => void;
    onSkipPart: (part: TodayPart) => void;
  };
  export function TodayCard(props: TodayCardProps): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// app-next/src/components/home/__tests__/today-card.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodayCard } from "../today-card";

const lessonPart = { kind: "lesson" as const, book: "hsk1", page: "lesson-1", title: "Trạm 1 · lesson-1" };

describe("TodayCard", () => {
  it("Idle: hiện 2 bước và gọi onStartPart", async () => {
    const onStartPart = vi.fn();
    render(
      <TodayCard
        state={{ todayKey: "2026-11-06", partDoneToday: false, dueCount: 5, nextPart: lessonPart }}
        onStartReview={vi.fn()} onStartPart={onStartPart} onSkipPart={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: /buổi học hôm nay/i })).toBeInTheDocument();
    expect(screen.getByText(/ôn 5 thẻ/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /học tiếp/i }));
    expect(onStartPart).toHaveBeenCalledWith(lessonPart);
  });

  it("Idle: dueCount=0 ẩn bước ôn", () => {
    render(
      <TodayCard
        state={{ todayKey: "2026-11-06", partDoneToday: false, dueCount: 0, nextPart: lessonPart }}
        onStartReview={vi.fn()} onStartPart={vi.fn()} onSkipPart={vi.fn()}
      />,
    );
    expect(screen.queryByText(/thẻ đến hạn/i)).not.toBeInTheDocument();
  });

  it("Done: hiện thông điệp hẹn mai + tuỳ chọn", () => {
    render(
      <TodayCard
        state={{ todayKey: "2026-11-06", partDoneToday: true, dueCount: 3, nextPart: lessonPart }}
        onStartReview={vi.fn()} onStartPart={vi.fn()} onSkipPart={vi.fn()}
      />,
    );
    expect(screen.getByText(/đã xong 1 phần/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ôn thêm/i })).toBeInTheDocument();
  });

  it("nextPart=null → banner hết lộ trình khả dụng", () => {
    render(
      <TodayCard
        state={{ todayKey: "2026-11-06", partDoneToday: false, dueCount: 0, nextPart: null }}
        onStartReview={vi.fn()} onStartPart={vi.fn()} onSkipPart={vi.fn()}
      />,
    );
    expect(screen.getByText(/hết lộ trình/i)).toBeInTheDocument();
  });

  it("Bỏ qua phần này gọi onSkipPart", async () => {
    const onSkipPart = vi.fn();
    render(
      <TodayCard
        state={{ todayKey: "2026-11-06", partDoneToday: false, dueCount: 0, nextPart: lessonPart }}
        onStartReview={vi.fn()} onStartPart={vi.fn()} onSkipPart={onSkipPart}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /bỏ qua phần này/i }));
    expect(onSkipPart).toHaveBeenCalledWith(lessonPart);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && pnpm vitest run src/components/home/__tests__/today-card.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// app-next/src/components/home/today-card.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TodayPart, TodayState } from "@/lib/today-session";

export type TodayCardProps = {
  state: TodayState;
  onStartReview: () => void;
  onStartPart: (part: TodayPart) => void;
  onSkipPart: (part: TodayPart) => void;
};

const partLabel = (p: TodayPart): string => {
  if (p.kind === "pinyin") return p.title;
  if (p.kind === "milestone") return `${p.title} · bài kiểm tra chặng`;
  return p.title;
};

export function TodayCard({ state, onStartReview, onStartPart, onSkipPart }: TodayCardProps) {
  if (state.partDoneToday) {
    return (
      <Card className="p-5">
        <h2 className="text-h3 text-fg">Đã xong 1 phần — hẹn ngày mai</h2>
        <p className="mt-1 text-body-sm text-fg-muted">
          Mỗi ngày một phần mới vừa sức, để từ mới kịp ôn những ngày sau.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onStartReview}>Ôn thêm</Button>
          <Button variant="ghost" onClick={() => onStartPart(state.nextPart!)} disabled={state.nextPart == null}>
            Học thêm
          </Button>
        </div>
      </Card>
    );
  }

  if (state.nextPart == null) {
    return (
      <Card className="p-5">
        <h2 className="text-h3 text-fg">Hết lộ trình khả dụng</h2>
        <p className="mt-1 text-body-sm text-fg-muted">
          HSK 6 và HSK 7–9 chưa mở. Ôn tập, shadowing và đọc hiểu vẫn dùng được.
        </p>
        <div className="mt-4">
          <Button variant="secondary" onClick={onStartReview}>Ôn tập</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h2 className="text-h3 text-fg">Buổi học hôm nay</h2>
      <ol className="mt-3 flex flex-col gap-2">
        {state.dueCount > 0 && (
          <li>
            <button
              type="button"
              onClick={onStartReview}
              className="flex min-h-11 w-full items-center justify-between rounded-lg border border-line px-3 py-2 text-left"
            >
              <span className="text-body text-fg">Ôn {state.dueCount} thẻ đến hạn</span>
              <span className="text-body-sm text-fg-muted">Ôn ngay</span>
            </button>
          </li>
        )}
        <li>
          <button
            type="button"
            onClick={() => onStartPart(state.nextPart!)}
            className="flex min-h-11 w-full items-center justify-between rounded-lg border border-line px-3 py-2 text-left"
          >
            <span className="text-body text-fg">{partLabel(state.nextPart)}</span>
            <span className="text-body-sm text-fg-muted">Học tiếp</span>
          </button>
        </li>
      </ol>
      <div className="mt-3 flex gap-2">
        <Button onClick={() => onStartPart(state.nextPart!)}>Học tiếp</Button>
        <Button variant="ghost" onClick={() => onSkipPart(state.nextPart!)}>Bỏ qua phần này</Button>
      </div>
    </Card>
  );
}
```

Nếu `Button`/`Card` chưa có đúng variant: đọc `src/components/ui/` trước và map sang primitive hiện có (không tạo mới tuỳ tiện).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && pnpm vitest run src/components/home/__tests__/today-card.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
cd app-next && git add src/components/home/today-card.tsx src/components/home/__tests__/today-card.test.tsx
git commit -m "feat(today): TodayCard 4 state (idle/done/hết lộ trình/skip)"
```

---

### Task 5: Wire vào HomeHero + ghi `markPageDone` → `setTodayPart`

**Files:**
- Modify: `app-next/src/components/home/home-hero.tsx`
- Modify: `app-next/src/lib/home-summary.ts` (thêm `today` vào HomeSummary)
- Modify: `app-next/src/app/(app)/lesson/[book]/[page]/page.tsx` hoặc nơi gọi `markPageDone` (đọc để tìm; hook setTodayPart sau markPageDone)
- Test: `app-next/src/components/home/__tests__/home-hero-today.test.tsx`

**Interfaces:**
- Consumes: `computeTodaySession` (Task 1), `progressStore.getTodaySession/setTodayPart/skipTodayPart/getSkippedTodayParts` (Task 2), `TodayCard` (Task 4).
- Produces: `HomeSummary` thêm `today: TodayState`.

- [ ] **Step 1: Write the failing test**

```tsx
// app-next/src/components/home/__tests__/home-hero-today.test.tsx
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomeHero } from "../home-hero";
import { progressStore } from "@/lib/store/progress-store";

describe("HomeHero → TodayCard", () => {
  beforeEach(() => {
    localStorage.clear();
    progressStore.setOnboarding({ goal: "hsk1", minutes: 15, skipped: 1, at: Date.now() });
  });

  it("đã onboarding → hiện Buổi học hôm nay", async () => {
    render(<HomeHero />);
    expect(await screen.findByRole("heading", { name: /buổi học hôm nay/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && pnpm vitest run src/components/home/__tests__/home-hero-today.test.tsx`
Expected: FAIL — heading không tồn tại (HomeHero còn render HeroAction).

- [ ] **Step 3: Write minimal implementation**

`home-summary.ts`:

```ts
import { computeTodaySession, type TodayState } from "@/lib/today-session";
import { roadmapLevels } from "@/content/roadmap-stations";

// trong HomeSummary type:
//   today: TodayState;

// trong readHomeSummary(), sau khi tính srs:
const todayRec = progressStore.getTodaySession();
const today = computeTodaySession({
  now: Date.now(),
  today: todayRec,
  dueCount: srs.filter(isDue).length,
  pinyinDone: progressStore.getRoadmapDone(),
  levels: roadmapLevels,
  stationRecord: Object.fromEntries(
    roadmapLevels.map((l) => [l.id, progressStore.getStationProgress(l.id)]),
  ),
  lessonDone: (b, p) => progressStore.getPageDone(b, p),
  suggestedStage: progressStore.getOnboarding()?.placement?.suggestedStage ?? null,
  skippedPartIds: progressStore.getSkippedTodayParts(),
});
// return { ... , today }
```

`home-hero.tsx`: nhánh đã onboarding → `<TodayCard state={summary.today} onStartReview={() => router.push("/review?return=today")} onStartPart={(p) => { if (p.kind === "pinyin") router.push(`/roadmap/pinyin`); else if (p.kind === "milestone") router.push(`/roadmap`); else router.push(`/lesson/${p.book}/${p.page}`); }} onSkipPart={(p) => { progressStore.skipTodayPart(partIdOf(p)); forceReload(); }} />`.

Hook ghi today: tìm nơi gọi `progressStore.markPageDone(...)` (grep) và thêm ngay sau:

```ts
progressStore.setTodayPart(`lesson:${book}:${page}`);
```

Cho milestone/station quiz tương tự với `milestone:${stationId}` tại nơi `setStationProgress` đạt pass.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && pnpm vitest run src/components/home/__tests__/home-hero-today.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd app-next && git add src/components/home/home-hero.tsx src/lib/home-summary.ts src/app/\(app\)/lesson
git commit -m "feat(today): wire TodayCard vào HomeHero + ghi part khi xong bài"
```

---

### Task 6: E2E guest flow

**Files:**
- Create: `app-next/e2e/today-session.spec.ts`
- (Đọc `e2e/` trước để copy pattern setup/teardown + selector conventions.)

**Interfaces:**
- Consumes: app chạy `pnpm dev` :3100 (playwright config tự start).
- Produces: spec e2e độc lập.

- [ ] **Step 1: Write the failing test**

```ts
// app-next/e2e/today-session.spec.ts
import { expect, test } from "@playwright/test";

test("guest: onboarding → TodayCard → học xong → Done", async ({ page }) => {
  await page.goto("/");
  // Onboarding hiện với guest mới
  await page.getByRole("button", { name: /bỏ qua/i }).first().click(); // hoặc flow wizard: chọn goal rồi tới kết quả
  await expect(page.getByRole("heading", { name: /buổi học hôm nay/i })).toBeVisible();
  await page.getByRole("button", { name: /học tiếp/i }).first().click();
  await expect(page).toHaveURL(/\/lesson\//);
  // hoàn thành bài bằng nút cuối bài (selector theo lesson player hiện có)
  // rồi quay về Home
  await page.goto("/");
  await expect(page.getByText(/đã xong 1 phần/i)).toBeVisible();
});
```

(Điều chỉnh selector theo DOM thật — nếu OnboardingHero skip khác, dùng đúng nhãn quan sát được trong `onboarding-hero.tsx`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && pnpm test:e2e e2e/today-session.spec.ts`
Expected: FAIL — TodayCard chưa render/selector chưa đúng.

- [ ] **Step 3: Adjust selectors until behaviour correct** (không đổi production code ở bước này; nếu lỗi thật ở production code → sửa task 4/5 và commit riêng).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && pnpm test:e2e e2e/today-session.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd app-next && git add e2e/today-session.spec.ts
git commit -m "test(e2e): guest flow buổi học hôm nay → Done"
```

---

### Task 7: Gate cuối — typecheck + full test + grep

**Files:** không sửa file (chỉ verify).

- [ ] **Step 1: Typecheck**

Run: `cd app-next && pnpm typecheck`
Expected: exit 0, no errors.

- [ ] **Step 2: Full unit suite**

Run: `cd app-next && pnpm test`
Expected: PASS toàn bộ (1400+ test hiện có + test mới), không regression.

- [ ] **Step 3: Lint**

Run: `cd app-next && pnpm lint`
Expected: 0 errors (warning React Compiler là cố ý, không chặn).

- [ ] **Step 4: Placeholder scan**

Run: `cd /Volumes/samsung512/Code/hsk && grep -rn "TODO\|TBD\|FIXME" app-next/src/lib/today-session.ts app-next/src/components/home/today-card.tsx`
Expected: không có output.

- [ ] **Step 5: Commit nếu có fix lẻ**

```bash
cd /Volumes/samsung512/Code/hsk && git add -A app-next/src && git commit -m "chore(today): fix lint/typecheck cuối"
```
