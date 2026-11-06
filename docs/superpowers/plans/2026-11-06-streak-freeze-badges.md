# Streak Freeze + Huy hiệu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Streak có lượt đóng băng (7 ngày liền = +1 lượt, max 2, tự dùng khi lỡ đúng 1 ngày) + 5 huy hiệu chỉ trao khi có tiến bộ thật, gallery trên /progress.

**Architecture:** Lib thuần `src/lib/gamification.ts` chứa luật freeze (earn/consume/clamp) và `src/lib/badges.ts` chứa rule engine idempotent; state nằm ở progressStore (`bye.streakFreeze`, `bye.badges`); sync qua domain mới `gamification` (last-write-wins theo updatedAt); heat map ngày freeze tô class riêng.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4 (token Hanzi), Vitest + Testing Library (jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-06-streak-freeze-badges-design.md`

## Global Constraints

- Freeze: học đủ **7 ngày liền → +1 lượt**; giữ tối đa **2 lượt** (clamp); lỡ **đúng 1 ngày** + available > 0 → tự consume 1, chuỗi tiếp tục; gap **≥2 ngày** không consume, chuỗi đứt.
- Earn check chạy khi ghi studyDay (kể cả ngày chỉ ôn) — ngày freeze-use vẫn tính vào chuỗi earn.
- Phase 2 (hồi sinh chuỗi đứt ≥7 ngày) OUT OF SCOPE.
- Huy hiệu — chỉ output thật, điều kiện exact:
  1. `mastered-vocab-50` — 50 vocab mature (SM-2 interval ≥21 ngày, `isMature`)
  2. `hanzi-write-25` — 25 chữ pass quiz viết Hanzi Studio
  3. `shadowing-30` — 30 câu/đoạn shadowing đạt
  4. `streak-7` — streak ≥7
  5. `hsk1-done` — trạm cuối + milestone hsk-1 pass (stationProgress hsk-1 pct ≥80 các station)
- Không huy hiệu "vào app n lần". `evaluateBadges` idempotent — đã trao không trao lại, `awardedAt` giữ nguyên lần đầu.
- Toast huy hiệu mới hiện đúng 1 lần (flag `seen` per badge).
- Domain sync `gamification`: `{ streakFreeze, badges }` last-write-wins theo `updatedAt`.
- Ngày/test: mọi hàm thuần nhận `today: string` / `now: number` qua tham số.
- UI token Hanzi; heat freeze ngày dùng class riêng có tooltip, không chỉ màu.

---

### Task 1: Lib freeze thuần

**Files:**
- Create: `src/lib/gamification.ts`
- Test: `src/lib/gamification.test.ts`

**Interfaces:**
- Consumes: không (pure).
- Produces:
  ```ts
  export type FreezeState = { earned: number; used: number; lastEarnDate?: string };
  export const FREEZE_MAX = 2;
  export const FREEZE_EVERY_DAYS = 7;
  export function freezeAvailable(s: FreezeState | null): number;              // clamp(earned-used, 0, 2)
  export function onStudyDayStreak(s: FreezeState | null, streakBefore: number, today: string): FreezeState;
  export function consumeForGap(s: FreezeState | null, gapDays: number): { next: FreezeState | null; consumed: boolean };
  ```

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/gamification.test.ts
import { describe, expect, it } from "vitest";
import { consumeForGap, FREEZE_MAX, freezeAvailable, onStudyDayStreak } from "./gamification";

describe("freezeAvailable", () => {
  it("null → 0; clamp 0..2", () => {
    expect(freezeAvailable(null)).toBe(0);
    expect(freezeAvailable({ earned: 3, used: 0 })).toBe(FREEZE_MAX);
    expect(freezeAvailable({ earned: 1, used: 2 })).toBe(0);
  });
});

describe("onStudyDayStreak — earn", () => {
  it("streak chạm mốc 7 → +1 lượt", () => {
    const s = onStudyDayStreak({ earned: 0, used: 0 }, 7, "2026-11-06");
    expect(s.earned).toBe(1);
    expect(s.lastEarnDate).toBe("2026-11-06");
  });
  it("streak 14 → thêm 1 (tổng 2)", () => {
    const s = onStudyDayStreak({ earned: 1, used: 0, lastEarnDate: "2026-10-30" }, 14, "2026-11-06");
    expect(s.earned).toBe(2);
  });
  it("chưa chạm mốc → giữ nguyên", () => {
    expect(onStudyDayStreak({ earned: 0, used: 0 }, 5, "2026-11-06").earned).toBe(0);
  });
  it("mốc đã earn (7,8,9...13) → không earn lặp", () => {
    const s = onStudyDayStreak({ earned: 1, used: 0, lastEarnDate: "2026-11-04" }, 8, "2026-11-06");
    expect(s.earned).toBe(1);
  });
});

describe("consumeForGap", () => {
  it("gap 1 + available → consume 1", () => {
    const r = consumeForGap({ earned: 1, used: 0 }, 1);
    expect(r.consumed).toBe(true);
    expect(r.next!.used).toBe(1);
  });
  it("gap 1 + hết lượt → không consume", () => {
    const r = consumeForGap({ earned: 1, used: 1 }, 1);
    expect(r.consumed).toBe(false);
  });
  it("gap ≥2 → không consume dù còn lượt", () => {
    const r = consumeForGap({ earned: 2, used: 0 }, 2);
    expect(r.consumed).toBe(false);
    expect(r.next).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && pnpm vitest run src/lib/gamification.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/gamification.ts
/* Streak freeze (spec 2026-11-06 Wave phụ §1) — thuần, caller truyền today/streak. */

export type FreezeState = { earned: number; used: number; lastEarnDate?: string };
export const FREEZE_MAX = 2;
export const FREEZE_EVERY_DAYS = 7;

export function freezeAvailable(s: FreezeState | null): number {
  if (!s) return 0;
  return Math.max(0, Math.min(FREEZE_MAX, s.earned - s.used));
}

/** Gọi khi ghi studyDay với streak MỚI tính (sau khi cộng ngày hôm nay).
    Earn tại mỗi mốc bội số 7; chống earn lặp bằng lastEarnDate khác ngày hiện tại
    và mốc chưa từng earn (earned*7 < streak khi lastEarnDate trùng tuần mốc). */
export function onStudyDayStreak(s: FreezeState | null, streakBefore: number, today: string): FreezeState {
  const cur: FreezeState = s ?? { earned: 0, used: 0 };
  if (streakBefore > 0 && streakBefore % FREEZE_EVERY_DAYS === 0
      && cur.lastEarnDate !== today
      && cur.earned * FREEZE_EVERY_DAYS < streakBefore) {
    return { ...cur, earned: Math.min(FREEZE_MAX, cur.earned + 1), lastEarnDate: today };
  }
  return cur;
}

/** Gap = số ngày bị thiếu giữa lần học trước và hôm nay. Trả next=null nếu không đổi. */
export function consumeForGap(
  s: FreezeState | null,
  gapDays: number,
): { next: FreezeState | null; consumed: boolean } {
  if (gapDays === 1 && freezeAvailable(s) > 0) {
    return { next: { ...(s as FreezeState), used: (s as FreezeState).used + 1 }, consumed: true };
  }
  return { next: null, consumed: false };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && pnpm vitest run src/lib/gamification.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
cd app-next && git add src/lib/gamification.ts src/lib/gamification.test.ts
git commit -m "feat(gamify): lib freeze — earn 7 ngày/consume gap-1/clamp 2"
```

---

### Task 2: Nối freeze vào streak + heat map

**Files:**
- Modify: `app-next/src/lib/stats/heatmap.ts` (computeStreak nhận tuỳ chọn freeze)
- Modify: `app-next/src/lib/store/progress-store.ts` (state `bye.streakFreeze` + hook earn/consume tại ghi studyDay)
- Modify: `app-next/src/app/(app)/progress/progress-client.tsx` (ô freeze + tooltip)
- Test: `app-next/src/lib/stats/__tests__/heatmap-freeze.test.ts`

**Interfaces:**
- Consumes: `consumeForGap`, `freezeAvailable`, `onStudyDayStreak` (Task 1), `heatClass` hiện có.
- Produces:
  ```ts
  // heatmap.ts:
  export function computeStreakWithFreeze(
    days: Record<string, number>, today: string, freeze: { earned: number; used: number } | null,
  ): { streak: number; consumedFreeze: boolean };
  // heatmap.ts:
  export function heatFreezeClass(): string; // "bg-warning-subtle" hoặc token tương đương — 1 dòng
  // progressStore thêm:
  getFreeze(): FreezeState; onDayStudied(today: string, streakAfter: number): void;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// app-next/src/lib/stats/__tests__/heatmap-freeze.test.ts
import { describe, expect, it } from "vitest";
import { computeStreakWithFreeze, heatFreezeClass } from "../heatmap";

const days = (from: string, n: number) => {
  const out: Record<string, number> = {};
  const d = new Date(from + "T00:00:00+07:00");
  for (let i = 0; i < n; i++) {
    out[new Date(d.getTime() - i * 86_400_000).toISOString().slice(0, 10)] = 3;
  }
  return out;
};

describe("computeStreakWithFreeze", () => {
  it("học 5 ngày + gap 1 + có freeze → streak tiếp 6, consumed=true", () => {
    // học T2..T6, hôm nay T8 (gap 1 ngày T7)
    const d = days("2026-11-06", 5); // 2..6/11
    const r = computeStreakWithFreeze(d, "2026-11-08", { earned: 1, used: 0 });
    expect(r.streak).toBe(6);
    expect(r.consumedFreeze).toBe(true);
  });
  it("gap 1 + hết freeze → đứt", () => {
    const d = days("2026-11-06", 5);
    const r = computeStreakWithFreeze(d, "2026-11-08", { earned: 1, used: 1 });
    expect(r.streak).toBe(0);
    expect(r.consumedFreeze).toBe(false);
  });
  it("gap ≥2 → đứt, không consume", () => {
    const d = days("2026-11-06", 5);
    const r = computeStreakWithFreeze(d, "2026-11-10", { earned: 2, used: 0 });
    expect(r.streak).toBe(0);
    expect(r.consumedFreeze).toBe(false);
  });
  it("không gap → như computeStreak, consumed=false", () => {
    const d = days("2026-11-06", 5);
    expect(computeStreakWithFreeze(d, "2026-11-06", { earned: 0, used: 0 })).toEqual({ streak: 5, consumedFreeze: false });
  });
});

describe("heatFreezeClass", () => {
  it("trả class token có tooltip riêng", () => {
    expect(typeof heatFreezeClass()).toBe("string");
    expect(heatFreezeClass()).not.toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && pnpm vitest run src/lib/stats/__tests__/heatmap-freeze.test.ts`
Expected: FAIL — `computeStreakWithFreeze is not a function`.

- [ ] **Step 3: Write minimal implementation**

`heatmap.ts` — thêm (tái dùng logic computeStreak, chèn consume giữa gap):

```ts
import { consumeForGap, type FreezeState } from "@/lib/gamification";

export function computeStreakWithFreeze(
  days: Record<string, number>, today: string, freeze: FreezeState | null,
): { streak: number; consumedFreeze: boolean } {
  // B1: streak thuần từ hôm nay lùi về
  let plain = computeStreak(days, today);
  if (plain > 0) return { streak: plain, consumedFreeze: false };
  // B2: hôm nay chưa học — thử tính từ hôm qua; nếu đứt đúng gap-1-ngày → consume
  const DAY = 86_400_000;
  const ms = Date.parse(today + "T00:00:00+07:00");
  const yest = vnDay(new Date(ms - DAY));
  const gapDays = days[yest] > 0 ? 1 : (function last(){ // tìm ngày học gần nhất
    for (let i = 2; i <= 30; i++) {
      if (days[vnDay(new Date(ms - i * DAY))] > 0) return i;
    }
    return 99;
  })();
  if (gapDays === 1 && days[yest] > 0) {
    // chuỗi trước đó từ hôm qua lùi về + consume freeze cho ngày hôm nay
    const before = computeStreak(days, yest);
    const { next, consumed } = consumeForGap(freeze, 1);
    if (consumed && before > 0) return { streak: before + 1, consumedFreeze: true };
    return { streak: 0, consumedFreeze: false };
  }
  return { streak: 0, consumedFreeze: false };
}

export function heatFreezeClass(): string {
  return "bg-warning-subtle"; // token Hanzi; nếu chưa có token này dùng bg-caution-subtle theo DESIGN.md
}
```

(Executor: kiểm tra tên token warning/caution trong `opendesign_hsk/Hanzi/variables.css` — dùng token tồn tại, không invent.)

`progress-store.ts`:

```ts
  getFreeze(): FreezeState {
    return readJSON<FreezeState>("bye.streakFreeze", { earned: 0, used: 0 });
  }
  onDayStudied(today: string, streakAfter: number): void {
    const s = this.getFreeze();
    writeJSON("bye.streakFreeze", onStudyDayStreak(s, streakAfter, today));
  }
```

Nơi ghi studyDay (grep `markRoadmapSession` / streak update trong progress-store): sau khi cập nhật streak gọi `this.onDayStudied(vnDayString(), newStreak)`.

`progress-client.tsx`: heatmap cell — nếu ngày đó thuộc gap đã consume (so sánh `computeStreakWithFreeze` consumed) render class `heatFreezeClass()` + `title="Đóng băng đã giữ chuỗi"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && pnpm vitest run src/lib/stats/__tests__/heatmap-freeze.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
cd app-next && git add src/lib/stats/heatmap.ts src/lib/stats/__tests__/heatmap-freeze.test.ts src/lib/store/progress-store.ts src/app/\(app\)/progress/progress-client.tsx
git commit -m "feat(gamify): freeze giữ chuỗi khi lỡ 1 ngày + ô heat map riêng"
```

---

### Task 3: Sync domain `gamification`

**Files:**
- Modify: `app-next/src/lib/db/schema.ts` (bảng `gamification` 1 row/user: `state` JSON + `updatedAt`)
- Modify: `app-next/src/server/api/sync.ts` (schema + upsert last-write-wins theo updatedAt)
- Modify: `app-next/src/lib/store/sync-merge.ts` (mergeGamification)
- Create: `app-next/drizzle/<next>_gamification.sql` (drizzle-kit generate)
- Test: `app-next/src/lib/store/__tests__/sync-merge.gamification.test.ts`

**Interfaces:**
- Consumes: pattern `todaySession` (plan Wave 1 Task 3 — nếu Wave 1 chưa ship, copy pattern từ `mergeSrs`).
- Produces:
  ```ts
  export type SyncGamificationRecord = {
    streakFreeze: FreezeState; badges: Record<string, string>; updatedAt: number;
  };
  export function mergeGamification(a: SyncGamificationRecord | null, b: SyncGamificationRecord | null): SyncGamificationRecord | null;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// app-next/src/lib/store/__tests__/sync-merge.gamification.test.ts
import { describe, expect, it } from "vitest";
import { mergeGamification } from "../sync-merge";

const rec = (updatedAt: number, badges = {}): Parameters<typeof mergeGamification>[0] => ({
  streakFreeze: { earned: 1, used: 0 }, badges, updatedAt,
});

describe("mergeGamification", () => {
  it("null + value → value; cả null → null", () => {
    expect(mergeGamification(null, rec(1))).toEqual(rec(1));
    expect(mergeGamification(null, null)).toBeNull();
  });
  it("updatedAt mới thắng", () => {
    expect(mergeGamification(rec(1), rec(2)).updatedAt).toBe(2);
  });
  it("bằng updatedAt → badges union (awardedAt giữ min)", () => {
    const a = rec(5, { "streak-7": "2026-11-01" });
    const b = rec(5, { "mastered-vocab-50": "2026-11-02" });
    const m = mergeGamification(a, b);
    expect(m!.badges).toEqual({ "streak-7": "2026-11-01", "mastered-vocab-50": "2026-11-02" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && pnpm vitest run src/lib/store/__tests__/sync-merge.gamification.test.ts`
Expected: FAIL — not a function.

- [ ] **Step 3: Write minimal implementation**

```ts
// sync-merge.ts
import type { FreezeState } from "@/lib/gamification";

export type SyncGamificationRecord = {
  streakFreeze: FreezeState; badges: Record<string, string>; updatedAt: number;
};

export function mergeGamification(
  a: SyncGamificationRecord | null, b: SyncGamificationRecord | null,
): SyncGamificationRecord | null {
  if (a == null) return b;
  if (b == null) return a;
  if (a.updatedAt === b.updatedAt) {
    const badges: Record<string, string> = { ...a.badges };
    for (const [k, v] of Object.entries(b.badges)) {
      badges[k] = badges[k] != null && badges[k] < v ? badges[k] : v; // min awardedAt
    }
    return {
      streakFreeze: a.updatedAt >= b.updatedAt ? a.streakFreeze : b.streakFreeze,
      badges, updatedAt: a.updatedAt,
    };
  }
  return a.updatedAt > b.updatedAt ? a : b;
}
```

Schema + server: bảng `gamification` (`userId` PK, `state` JSON text, `updatedAt` int) — server upsert theo updatedAt; nếu local updatedAt lớn hơn → ghi đè; bằng nhau → badges union phía server (đọc pattern todaySession/readingProgress trong `src/server/api/sync.ts` và làm đúng 1 pattern hiện có). Apply migration: `pnpm wrangler d1 migrations apply hsk-dev --local -c wrangler.dev.jsonc`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && pnpm vitest run src/lib/store/__tests__/sync-merge.gamification.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
cd app-next && git add src/lib/db/schema.ts src/server/api/sync.ts src/lib/store/sync-merge.ts drizzle/ src/lib/store/__tests__/sync-merge.gamification.test.ts
git commit -m "feat(sync): domain gamification — freeze + badges last-write-wins"
```

---

### Task 4: Rule engine huy hiệu

**Files:**
- Create: `src/lib/badges.ts`
- Test: `src/lib/badges.test.ts`

**Interfaces:**
- Consumes: `isMature` từ `@/lib/stats/review`, `SrsItem` từ progress-store, station progress, shadowing/hanzi progress (đọc các getter tương ứng trong progress-store — grep `hanzi`, `shadowing`).
- Produces:
  ```ts
  export type BadgeId = "mastered-vocab-50" | "hanzi-write-25" | "shadowing-30" | "streak-7" | "hsk1-done";
  export type BadgeSnapshot = {
    masteredVocab: number; hanziWritten: number; shadowingDone: number;
    streak: number; hsk1Passed: boolean;
  };
  export const BADGE_DEFS: ReadonlyArray<{ id: BadgeId; label: string; target: number; kind: "count" | "flag" }>;
  export function evaluateBadges(
    snapshot: BadgeSnapshot,
    current: Record<string, string>, // badgeId → awardedAt hiện có
    today: string,
  ): { next: Record<string, string>; newly: BadgeId[] };
  ```

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/badges.test.ts
import { describe, expect, it } from "vitest";
import { BADGE_DEFS, evaluateBadges } from "./badges";

const snap = (over: Partial<Parameters<typeof evaluateBadges>[0]>): Parameters<typeof evaluateBadges>[0] => ({
  masteredVocab: 0, hanziWritten: 0, shadowingDone: 0, streak: 0, hsk1Passed: false, ...over,
});

describe("evaluateBadges", () => {
  it("đủ điều kiện → trao với awardedAt = today", () => {
    const r = evaluateBadges(snap({ masteredVocab: 50 }), {}, "2026-11-06");
    expect(r.next["mastered-vocab-50"]).toBe("2026-11-06");
    expect(r.newly).toEqual(["mastered-vocab-50"]);
  });
  it("chưa đủ → không trao", () => {
    expect(evaluateBadges(snap({ masteredVocab: 49 }), {}, "d").newly).toEqual([]);
  });
  it("idempotent — đã có awardedAt giữ nguyên, không vào newly", () => {
    const r = evaluateBadges(snap({ masteredVocab: 60 }), { "mastered-vocab-50": "2026-10-01" }, "2026-11-06");
    expect(r.next["mastered-vocab-50"]).toBe("2026-10-01");
    expect(r.newly).toEqual([]);
  });
  it("flag badge (hsk1-done) qua hsk1Passed", () => {
    expect(evaluateBadges(snap({ hsk1Passed: true }), {}, "d").newly).toContain("hsk1-done");
  });
  it("5 huy hiệu định nghĩa đủ", () => {
    expect(BADGE_DEFS.map((b) => b.id)).toEqual([
      "mastered-vocab-50", "hanzi-write-25", "shadowing-30", "streak-7", "hsk1-done",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && pnpm vitest run src/lib/badges.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/badges.ts
/* Huy hiệu — chỉ trao tiến bộ thật (spec 2026-11-06 Wave phụ §2). Idempotent. */

export type BadgeId = "mastered-vocab-50" | "hanzi-write-25" | "shadowing-30" | "streak-7" | "hsk1-done";
export type BadgeSnapshot = {
  masteredVocab: number; hanziWritten: number; shadowingDone: number;
  streak: number; hsk1Passed: boolean;
};

export const BADGE_DEFS: ReadonlyArray<{ id: BadgeId; label: string; target: number; kind: "count" | "flag" }> = [
  { id: "mastered-vocab-50", label: "Thuộc 50 từ", target: 50, kind: "count" },
  { id: "hanzi-write-25", label: "Viết thuộc 25 chữ", target: 25, kind: "count" },
  { id: "shadowing-30", label: "30 câu shadowing đạt", target: 30, kind: "count" },
  { id: "streak-7", label: "Chuỗi 7 ngày", target: 7, kind: "count" },
  { id: "hsk1-done", label: "Xong HSK 1", target: 1, kind: "flag" },
];

function reached(def: (typeof BADGE_DEFS)[number], s: BadgeSnapshot): boolean {
  const v = {
    "mastered-vocab-50": s.masteredVocab,
    "hanzi-write-25": s.hanziWritten,
    "shadowing-30": s.shadowingDone,
    "streak-7": s.streak,
    "hsk1-done": s.hsk1Passed ? 1 : 0,
  }[def.id];
  return v >= def.target;
}

export function evaluateBadges(
  snapshot: BadgeSnapshot,
  current: Record<string, string>,
  today: string,
): { next: Record<string, string>; newly: BadgeId[] } {
  const next = { ...current };
  const newly: BadgeId[] = [];
  for (const def of BADGE_DEFS) {
    if (next[def.id] != null) continue; // idempotent
    if (reached(def, snapshot)) {
      next[def.id] = today;
      newly.push(def.id);
    }
  }
  return { next, newly };
}
```

Nơi gọi: load `/progress` + sau review session/shadowing/hanzi quiz/station pass — build snapshot từ progressStore:

```ts
const snapshot: BadgeSnapshot = {
  masteredVocab: srs.filter(isMature).length,
  hanziWritten: progressStore.getHanziQuizPassed(),   // grep getter thật; nếu chưa có → thêm counter tăng khi quiz viết pass
  shadowingDone: progressStore.getShadowingDoneCount(), // grep getter thật; nếu chưa có → thêm counter
  streak: progressStore.getStreak(),
  hsk1Passed: Object.values(progressStore.getStationProgress("hsk-1")).every((s) => s.pct >= 80),
};
```

**Lưu ý executor:** `getHanziQuizPassed`/`getShadowingDoneCount` có thể chưa tồn tại — grep trước; thiếu thì thêm counter tương ứng (pattern `getPinyinLabBest`) + test trong task này.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && pnpm vitest run src/lib/badges.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
cd app-next && git add src/lib/badges.ts src/lib/badges.test.ts src/lib/store/progress-store.ts
git commit -m "feat(gamify): rule engine 5 huy hiệu idempotent"
```

---

### Task 5: Gallery UI + toast 1 lần

**Files:**
- Create: `app-next/src/components/progress/badge-gallery.tsx`
- Modify: `app-next/src/app/(app)/progress/progress-client.tsx` (mount gallery + toast)
- Test: `app-next/src/components/progress/__tests__/badge-gallery.test.tsx`

**Interfaces:**
- Consumes: `BADGE_DEFS`, `evaluateBadges` (Task 4).
- Produces:
  ```ts
  export function BadgeGallery(props: {
    badges: Record<string, string>; snapshot: BadgeSnapshot;
  }): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// app-next/src/components/progress/__tests__/badge-gallery.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BadgeGallery } from "../badge-gallery";

const snap = { masteredVocab: 12, hanziWritten: 0, shadowingDone: 3, streak: 2, hsk1Passed: false };

describe("BadgeGallery", () => {
  it("đạt → màu + ngày; chưa đạt → xám + tiến độ", () => {
    render(
      <BadgeGallery
        badges={{ "streak-7": "2026-11-06" }}
        snapshot={snap}
      />,
    );
    expect(screen.getByText(/chuỗi 7 ngày/i)).toBeInTheDocument();
    expect(screen.getByText(/0\/50/i)).toBeInTheDocument(); // mastered vocab chưa đạt
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && pnpm vitest run src/components/progress/__tests__/badge-gallery.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// app-next/src/components/progress/badge-gallery.tsx
"use client";

import { BADGE_DEFS, type BadgeSnapshot } from "@/lib/badges";
import { Card } from "@/components/ui/card";

export function BadgeGallery({ badges, snapshot }: {
  badges: Record<string, string>; snapshot: BadgeSnapshot;
}) {
  const progress: Record<string, number> = {
    "mastered-vocab-50": snapshot.masteredVocab,
    "hanzi-write-25": snapshot.hanziWritten,
    "shadowing-30": snapshot.shadowingDone,
    "streak-7": snapshot.streak,
    "hsk1-done": snapshot.hsk1Passed ? 1 : 0,
  };
  return (
    <Card className="p-5">
      <h2 className="text-h3 text-fg">Huy hiệu</h2>
      <p className="mt-1 text-body-sm text-fg-muted">
        Chỉ trao cho tiến bộ thật: từ đã thuộc, câu nói đạt, cấp đã xong.
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BADGE_DEFS.map((b) => {
          const at = badges[b.id];
          return (
            <li key={b.id} className={at ? "rounded-lg border border-line p-3" : "rounded-lg border border-line p-3 opacity-50"}>
              <p className="text-body text-fg">{b.label}</p>
              <p className="text-body-sm text-fg-muted">
                {at ? `Đạt ${at}` : `${Math.min(progress[b.id], b.target)}/${b.target}`}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
```

Toast: trong progress-client, sau `evaluateBadges` nếu `newly.length > 0` và `bye.badgeSeen` chưa chứa id → toast (pattern toast hiện có — grep) + ghi seen; toast hiện đúng 1 lần.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && pnpm vitest run src/components/progress/__tests__/badge-gallery.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd app-next && git add src/components/progress src/app/\(app\)/progress
git commit -m "feat(gamify): gallery huy hiệu trên /progress + toast seen-once"
```

---

### Task 6: Gate cuối

- [ ] **Step 1:** Run: `cd app-next && pnpm typecheck` — Expected: 0 errors.
- [ ] **Step 2:** Run: `cd app-next && pnpm test` — Expected: full suite PASS (computeStreak cũ không regress).
- [ ] **Step 3:** Run: `cd app-next && pnpm lint` — Expected: 0 errors.
- [ ] **Step 4:** Placeholder scan: `grep -rn "TODO\|TBD" app-next/src/lib/gamification.ts app-next/src/lib/badges.ts` — Expected: rỗng.
- [ ] **Step 5:** Commit fix lẻ nếu có: `git commit -m "chore(gamify): fix cuối"`.
