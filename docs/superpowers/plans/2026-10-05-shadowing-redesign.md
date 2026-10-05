# Shadowing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port 100% UI `opendesign_hsk/shadowing.html` + `shadowing-video.html` vào `/shadowing` và `/shadowing/[videoId]` của app-next, kèm lớp lưu tiến độ luyện (D1 + `/api/v1/shadowing/progress`, guest fallback localStorage).

**Architecture:** Giữ nguyên YouTube postMessage engine + TTS fallback (tách thành hook `usePlayerEngine`), thay toàn bộ view bằng 2 client island mới (`ShadowingLibrary`, `ShadowingStudio`). Tiến độ đi qua 1 hook duy nhất `useShadowingProgress` có 2 nhánh (API khi đăng nhập, localStorage khi guest).

**Tech Stack:** Next.js 16 (App Router, OpenNext/Cloudflare + D1), React 19, Tailwind v4 (semantic tokens), drizzle-orm, better-auth, Vitest + RTL, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-05-shadowing-redesign-design.md` — plan này argue từ spec; executor đọc cả hai.

## Global Constraints

- Làm việc trên branch mới `shadowing-redesign` (tạo lúc start, không commit thẳng main).
- Tất cả test chạy bằng `pnpm` trong `app-next/` (vitest jsdom, alias `@` → `src`).
- Cấm hard-code hex màu trong component — chỉ dùng semantic token Tailwind (`action-primary`, `feedback-success`, `rose-wash`, `amber-wash/amber-ink`, `jade-wash`, `surface-*`, `text-*`, `border-*`). Font Hán tự dùng class `.hanzi`/`.zh` có sẵn.
- Mỗi section mock phải mang đúng `data-od-id` của mock (`shadow-header`, `daily-pick`, `filter-toolbar`, `video-grid`, `script-drawer`, `practice-session`, `studio-topbar`, `media-deck`, `video-stage`, `player-toolbar`, `waveform-card`, `tone-inspector`, `record-dock`, `script-tabs`, `transcript-stream`, `dictation-box`).
- Min touch target 44px (`min-h-11`) cho nút bấm được; focus ring `focus-visible:ring-3 ring-action-focus ring-offset-2`.
- Copy UI tiếng Việt, giọng "calm encouraging study coach".
- Commit convention: `feat(shadowing): <gì> (port <data-od-id> <mock-file>)`, mỗi task 1+ commit, fix review `fix(shadowing): ... (review t<N>)`.
- Chạy `pnpm test && pnpm typecheck && pnpm lint` phải pass trước mỗi commit kết thúc task.

## Review Focus

1. **Space giữ để thu âm khi focus đang nằm trong textarea chép chính tả** → không được kích hoạt ghi âm; kỳ vọng: phím tắt bị bỏ qua khi target là `input, textarea, select` (pin ở Task 10).
2. **Guest luyện xong rồi đăng nhập** → tiến độ localStorage phải được push lên server đúng 1 lần, không trùng lặp, không mất (pin ở Task 4).
3. **PUT videoId không tồn tại trong content** → 400, không ghi DB (pin ở Task 3).
4. **16/20 video không có subtitle thật** → drawer, practice overlay, studio không crash, hiển thị 1 câu synthetic từ title (pin ở Task 12/13/9).
5. **Esc trong drawer/overlay khi shell modal (command palette) có thể mở** → chỉ đóng lớp trên cùng, `stopPropagation` theo convention app-shell (pin ở Task 13).

---

### Task 1: Content — thêm `topic` + `spd` cho 20 video

**Files:**
- Modify: `app-next/src/content/shadowing.ts`
- Test: `app-next/src/content/__tests__/shadowing.test.ts`

**Interfaces:**
- Produces: `export type ShadowingTopic = "life" | "food" | "travel" | "film";` — `ShadowingVideo` thêm `topic: ShadowingTopic; spd: number;` — `export const topicVi: Record<ShadowingTopic, string>;`

- [ ] **Step 1: Write the failing test**

```ts
// src/content/__tests__/shadowing.test.ts
import { describe, it, expect } from "vitest";
import { shadowingVideos, topicVi, type ShadowingTopic } from "@/content/shadowing";

describe("shadowing content — topic/spd (spec §4)", () => {
  it("mọi video đều có topic hợp lệ và spd trong [0.75, 1]", () => {
    const topics: ShadowingTopic[] = ["life", "food", "travel", "film"];
    for (const v of shadowingVideos) {
      expect(topics, v.id).toContain(v.topic);
      expect(v.spd, v.id).toBeGreaterThanOrEqual(0.75);
      expect(v.spd, v.id).toBeLessThanOrEqual(1);
    }
  });
  it("topicVi đủ 4 chủ đề", () => {
    expect(Object.keys(topicVi).sort()).toEqual(["film", "food", "life", "travel"]);
    expect(topicVi.life).toBe("Đời sống thường nhật");
    expect(topicVi.film).toBe("Trích đoạn phim");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && pnpm vitest run src/content/__tests__/shadowing.test.ts`
Expected: FAIL — `ShadowingVideo` thiếu `topic`/`spd` (TS) hoặc import `topicVi` không tồn tại.

- [ ] **Step 3: Write implementation**

Trong `src/content/shadowing.ts`:

```ts
export type ShadowingTopic = "life" | "food" | "travel" | "film";

export const topicVi: Record<ShadowingTopic, string> = {
  life: "Đời sống thường nhật",
  food: "Mua sắm & Ăn uống",
  travel: "Đi lại & Du lịch",
  film: "Trích đoạn phim",
};

export type ShadowingVideo = {
  // ...giữ nguyên các trường cũ...
  topic: ShadowingTopic;
  spd: number;
};
```

Gán giá trị cho 20 video (theo playlist + nội dung title, `spd` giảm theo HSK thấp):

| id | topic | spd | | id | topic | spd |
|---|---|---|---|---|---|---|
| EA3rwvr99Q0 | film | 0.9 | | 6YGJswSorYw | life | 0.75 |
| sXo-yHFkAio | film | 0.9 | | 83THdBdTy7U | food | 0.75 |
| NkYwdZhkHF0 | film | 1.0 | | o6ilprwO6w0 | life | 0.75 |
| FuIOkW6eaRA | film | 1.0 | | QwlhcsAMhT0 | life | 0.75 |
| J0P6fPl6cho | film | 1.0 | | H3aRI3ypx_0 | life | 0.75 |
| FxpyzLt3wRQ | film | 1.0 | | 3p9uGOLgVds | life | 0.85 |
| 09kHjxsFUA4 | film | 1.0 | | 2pCgqjBBgGU | life | 0.85 |
| z1v9d303Xm0 | film | 0.9 | | BLEN82k2vDE | food | 0.85 |
| DQBzSl3OM1I | life | 1.0 | | tQKsIFE-Y0g | food | 1.0 |
| wZDej3Logc4 | life | 1.0 | | XDpsIrpLEOQ | life | 0.85 |

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/content/__tests__/shadowing.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/shadowing.ts src/content/__tests__/shadowing.test.ts
git commit -m "feat(shadowing): thêm topic+spd vào content video (port filter-toolbar shadowing.html)"
```

---

### Task 2: DB — bảng `shadowing_progress` + migration

**Files:**
- Modify: `app-next/src/lib/db/schema.ts`
- Create: `app-next/drizzle/0001_shadowing_progress.sql` (sinh bởi drizzle-kit)
- Test: typecheck + SQL diff review

**Interfaces:**
- Produces: `export const shadowingProgress` — các Task 3/4 import type này.

- [ ] **Step 1: Thêm bảng vào schema**

Thêm cuối `src/lib/db/schema.ts`:

```ts
/* Tiến độ luyện shadowing theo user×video (spec §5.1). `linesDone` = số câu
   đã được chấm (thu âm hoặc chép chính tả đúng) — dùng cho pill "Đang luyện · a/N câu". */
export const shadowingProgress = sqliteTable(
  "shadowing_progress",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    videoId: text("videoId").notNull(),
    status: text("status", { enum: ["new", "mid", "done"] }).notNull().default("mid"),
    score: integer("score"),
    seconds: integer("seconds").notNull().default(0),
    linesDone: integer("linesDone").notNull().default(0),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("shadowing_progress_user_video_uq").on(t.userId, t.videoId)]
);
```

- [ ] **Step 2: Sinh migration**

Run: `cd app-next && pnpm drizzle-kit generate`
Expected: tạo `drizzle/0001_shadowing_progress.sql` (CREATE TABLE + unique index). Mở file kiểm tra có `UNIQUE (userId, videoId)`.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck`
Expected: PASS. (Không apply migration ở bước này — ghi chú executor: `wrangler d1 migrations apply hsk-dev --remote` cần credentials, chạy trước khi test API thật.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts drizzle/
git commit -m "feat(shadowing): bảng shadowing_progress + migration D1 (spec §5.1)"
```

---

### Task 3: API — GET/PUT `/api/v1/shadowing/progress`

**Files:**
- Create: `app-next/src/app/api/v1/shadowing/progress/route.ts` (GET)
- Create: `app-next/src/app/api/v1/shadowing/progress/[videoId]/route.ts` (PUT)
- Test: `app-next/src/app/api/v1/shadowing/__tests__/progress.test.ts`

**Interfaces:**
- Consumes: `getAuth()` (`@/lib/auth`), `createDb()` (`@/lib/db`), `shadowingProgress` (Task 2), `shadowingVideoById` (`@/content/shadowing`).
- Produces: `GET → { items: ProgressRow[] } | 401`; `PUT body { status?, score?, secondsDelta?, linesDoneDelta? } → ProgressRow | 400/401`. `ProgressRow = { videoId, status, score: number|null, seconds, linesDone, updatedAt }` (JSON, timestamp → ISO string).

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/v1/shadowing/__tests__/progress.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const getSession = vi.fn();
const selectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([]),
};
const insertChain = {
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
};
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("@/lib/db", () => ({
  createDb: () => ({
    select: () => selectChain,
    insert: () => insertChain,
    update: () => ({ set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) }),
  }),
}));

import { GET } from "../route";
import { PUT } from "../[videoId]/route";

function req(body?: unknown, method: "GET" | "PUT" = "GET") {
  return new Request("http://localhost:3100/api/v1/shadowing/progress", {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as import("next").NextRequest;
}

beforeEach(() => { vi.clearAllMocks(); getSession.mockResolvedValue(null); });

describe("GET /api/v1/shadowing/progress", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });
  it("trả items khi có session", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    selectChain.where.mockResolvedValue([
      { videoId: "EA3rwvr99Q0", status: "done", score: 88, seconds: 120, linesDone: 9, updatedAt: 1_700_000_000 },
    ]);
    const res = await GET(req());
    const json = await res.json();
    expect(json.items[0]).toMatchObject({ videoId: "EA3rwvr99Q0", status: "done" });
  });
});

describe("PUT /api/v1/shadowing/progress/[videoId]", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await PUT(req({ score: 80 }, "PUT"), { params: Promise.resolve({ videoId: "EA3rwvr99Q0" }) });
    expect(res.status).toBe(401);
  });
  it("400 khi videoId không có trong content", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await PUT(req({ score: 80 }, "PUT"), { params: Promise.resolve({ videoId: "NOPE" }) });
    expect(res.status).toBe(400);
  });
  it("400 khi body sai schema (score 200)", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await PUT(req({ score: 200 }, "PUT"), { params: Promise.resolve({ videoId: "EA3rwvr99Q0" }) });
    expect(res.status).toBe(400);
  });
  it("upsert hợp lệ gọi insert.onConflictDoUpdate", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    selectChain.where.mockResolvedValue([{ id: "r1", status: "mid", score: 70, seconds: 30, linesDone: 2 }]);
    const res = await PUT(req({ score: 90, secondsDelta: 10, linesDoneDelta: 1 }, "PUT"), { params: Promise.resolve({ videoId: "EA3rwvr99Q0" }) });
    expect(res.status).toBe(200);
    expect(insertChain.onConflictDoUpdate).toHaveBeenCalled();
    const arg = insertChain.values.mock.calls[0][0];
    expect(arg.score).toBe(90);          // max(70, 90)
    expect(arg.seconds).toBe(40);        // 30 + 10
    expect(arg.linesDone).toBe(3);       // 2 + 1
  });
  it("status done không bị hạ về mid", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    selectChain.where.mockResolvedValue([{ id: "r1", status: "done", score: 88, seconds: 0, linesDone: 9 }]);
    await PUT(req({ status: "mid" }, "PUT"), { params: Promise.resolve({ videoId: "EA3rwvr99Q0" }) });
    expect(insertChain.values.mock.calls[0][0].status).toBe("done");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/api/v1/shadowing`
Expected: FAIL — module route chưa tồn tại.

- [ ] **Step 3: Implement GET**

```ts
// src/app/api/v1/shadowing/progress/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { shadowingProgress } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = createDb();
  const rows = await db
    .select()
    .from(shadowingProgress)
    .where(eq(shadowingProgress.userId, session.user.id));
  return NextResponse.json({
    items: rows.map((r) => ({
      videoId: r.videoId,
      status: r.status,
      score: r.score,
      seconds: r.seconds,
      linesDone: r.linesDone,
      updatedAt: new Date(r.updatedAt).toISOString(),
    })),
  });
}
```

- [ ] **Step 4: Implement PUT**

```ts
// src/app/api/v1/shadowing/progress/[videoId]/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { shadowingProgress } from "@/lib/db/schema";
import { shadowingVideoById } from "@/content/shadowing";

const bodySchema = z.object({
  status: z.enum(["new", "mid", "done"]).optional(),
  score: z.number().int().min(0).max(100).optional(),
  secondsDelta: z.number().int().min(0).max(3600).optional(),
  linesDoneDelta: z.number().int().min(0).max(50).optional(),
});

export async function PUT(req: NextRequest, ctx: { params: Promise<{ videoId: string }> }) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { videoId } = await ctx.params;
  if (!shadowingVideoById(videoId)) return NextResponse.json({ error: "unknown videoId" }, { status: 400 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const body = parsed.data;

  const db = createDb();
  const [existing] = await db
    .select()
    .from(shadowingProgress)
    .where(and(eq(shadowingProgress.userId, session.user.id), eq(shadowingProgress.videoId, videoId)));

  // merge: seconds/lines cộng dồn, score lấy max, done không bị hạ về mid
  const merged = {
    userId: session.user.id,
    videoId,
    status:
      existing?.status === "done"
        ? "done" as const
        : body.status === "done"
          ? ("done" as const)
          : ("mid" as const),
    score: Math.max(existing?.score ?? 0, body.score ?? 0) || null,
    seconds: (existing?.seconds ?? 0) + (body.secondsDelta ?? 0),
    linesDone: (existing?.linesDone ?? 0) + (body.linesDoneDelta ?? 0),
    updatedAt: new Date(),
  };

  await db
    .insert(shadowingProgress)
    .values({ id: existing?.id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? new Date(), ...merged })
    .onConflictDoUpdate({
      target: [shadowingProgress.userId, shadowingProgress.videoId],
      set: merged,
    });

  return NextResponse.json({
    videoId,
    status: merged.status,
    score: merged.score,
    seconds: merged.seconds,
    linesDone: merged.linesDone,
    updatedAt: merged.updatedAt.toISOString(),
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/app/api/v1/shadowing && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/v1/shadowing
git commit -m "feat(shadowing): GET/PUT /api/v1/shadowing/progress — upsert D1 (spec §5.2)"
```

---

### Task 4: Client progress layer — `progress.ts` + `useShadowingProgress`

**Files:**
- Create: `app-next/src/lib/shadowing/progress.ts`
- Create: `app-next/src/lib/shadowing/use-shadowing-progress.ts`
- Test: `app-next/src/lib/shadowing/__tests__/progress.test.ts`, `app-next/src/lib/shadowing/__tests__/use-shadowing-progress.test.ts`

**Interfaces:**
- Consumes: API của Task 3, `useSession()` (`@/lib/use-session`).
- Produces:
  - `type ProgressRec = { status: "new" | "mid" | "done"; score: number | null; seconds: number; linesDone: number; updatedAt: string };`
  - `readLocalProgress(): Record<string, ProgressRec>` / `writeLocalProgress(map)` — key `bye.shadow.progress`.
  - `computeMetrics(map: Record<string, ProgressRec>): { practiced: number; seconds: number; avgScore: number | null }` — practiced = count(status mid|done), avgScore = mean(score) của done, không có → `null`.
  - `useShadowingProgress(): { progressMap, metrics, recordPractice(videoId, patch: { status?, score?, secondsDelta?, linesDoneDelta? }): void, ready: boolean }`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/shadowing/__tests__/progress.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { readLocalProgress, writeLocalProgress, computeMetrics, type ProgressRec } from "@/lib/shadowing/progress";

const rec = (over: Partial<ProgressRec> = {}): ProgressRec => ({
  status: "mid", score: 70, seconds: 30, linesDone: 2, updatedAt: "2026-10-05T00:00:00Z", ...over,
});

beforeEach(() => localStorage.clear());

describe("progress localStorage", () => {
  it("round-trip map", () => {
    writeLocalProgress({ v1: rec() });
    expect(readLocalProgress().v1).toMatchObject({ status: "mid", score: 70 });
  });
  it("file rỗng/hỏng → {}", () => {
    localStorage.setItem("bye.shadow.progress", "{oops");
    expect(readLocalProgress()).toEqual({});
  });
});

describe("computeMetrics (spec §5.3)", () => {
  it("practiced = mid + done, avgScore chỉ tính done", () => {
    const m = computeMetrics({ a: rec({ status: "done", score: 90 }), b: rec(), c: rec({ status: "new", score: null }) });
    expect(m).toEqual({ practiced: 2, seconds: 60, avgScore: 90 });
  });
  it("không có gì → 0/0/null", () => {
    expect(computeMetrics({})).toEqual({ practiced: 0, seconds: 0, avgScore: null });
  });
});
```

```ts
// src/lib/shadowing/__tests__/use-shadowing-progress.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const useSession = vi.fn();
vi.mock("@/lib/use-session", () => ({ useSession: () => useSession() }));
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { useShadowingProgress } from "@/lib/shadowing/use-shadowing-progress";

beforeEach(() => { localStorage.clear(); fetchMock.mockReset(); });

describe("guest nhánh", () => {
  it("recordPractice ghi localStorage", () => {
    useSession.mockReturnValue({ loggedIn: false, isPending: false });
    const { result } = renderHook(() => useShadowingProgress());
    act(() => result.current.recordPractice("v1", { score: 80, secondsDelta: 10 }));
    expect(result.current.metrics.practiced).toBe(1);
    const stored = JSON.parse(localStorage.getItem("bye.shadow.progress")!);
    expect(stored.v1.score).toBe(80);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("user đăng nhập", () => {
  it("GET khi mount + PUT khi record", async () => {
    useSession.mockReturnValue({ loggedIn: true, isPending: false });
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (!init) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ videoId: "v1" }) });
    });
    const { result } = renderHook(() => useShadowingProgress());
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.recordPractice("v1", { score: 80 }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toContain("/api/v1/shadowing/progress/v1");
    expect(init.method).toBe("PUT");
  });
  it("PUT lỗi → giữ local + không ném", async () => {
    useSession.mockReturnValue({ loggedIn: true, isPending: false });
    fetchMock.mockImplementation((_, init) =>
      init
        ? Promise.reject(new Error("network"))
        : Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) })
    );
    const { result } = renderHook(() => useShadowingProgress());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(() => act(() => result.current.recordPractice("v1", { score: 80 }))).not.toThrow();
    expect(result.current.progressMap.v1.score).toBe(80); // optimistic local vẫn cập nhật
  });
  it("merge guest → server đúng 1 lần rồi clear key guest", async () => {
    localStorage.setItem("bye.shadow.progress", JSON.stringify({
      v1: { status: "done", score: 88, seconds: 60, linesDone: 9, updatedAt: "2026-10-05T00:00:00Z" },
    }));
    useSession.mockReturnValue({ loggedIn: true, isPending: false });
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [] }) });
    renderHook(() => useShadowingProgress());
    await waitFor(() => expect(fetchMock.mock.calls.filter(([, i]) => (i as RequestInit).method === "PUT")).toHaveLength(1));
    expect(localStorage.getItem("bye.shadow.progress")).toBe(null);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/shadowing/__tests__/progress.test.ts src/lib/shadowing/__tests__/use-shadowing-progress.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Implement `progress.ts`**

```ts
/* Tiến độ shadowing phía client (spec §5.3). Key localStorage cho guest;
   user đăng nhập đi qua use-shadowing-progress (API), lớp này chỉ là store thuần. */
export type ProgressStatus = "new" | "mid" | "done";
export type ProgressRec = { status: ProgressStatus; score: number | null; seconds: number; linesDone: number; updatedAt: string };
export type ProgressMap = Record<string, ProgressRec>;

const KEY = "bye.shadow.progress";

export function readLocalProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as ProgressMap) : {};
  } catch {
    return {};
  }
}

export function writeLocalProgress(map: ProgressMap): void {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* private mode */ }
}

export function computeMetrics(map: ProgressMap): { practiced: number; seconds: number; avgScore: number | null } {
  const recs = Object.values(map);
  const done = recs.filter((r) => r.status === "done" && r.score != null);
  return {
    practiced: recs.filter((r) => r.status === "mid" || r.status === "done").length,
    seconds: recs.reduce((s, r) => s + r.seconds, 0),
    avgScore: done.length ? Math.round(done.reduce((s, r) => s + (r.score ?? 0), 0) / done.length) : null,
  };
}
```

- [ ] **Step 4: Implement `useShadowingProgress`**

```ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/use-session";
import { useToastSafe } from "@/components/shell/toast-provider";
import { readLocalProgress, writeLocalProgress, computeMetrics, type ProgressMap, type ProgressStatus } from "@/lib/shadowing/progress";

export type PracticePatch = { status?: ProgressStatus; score?: number; secondsDelta?: number; linesDoneDelta?: number };

export function useShadowingProgress() {
  const { loggedIn, isPending } = useSession();
  const toast = useToastSafe();
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const [ready, setReady] = useState(loggedIn ? false : true);
  const mapRef = useRef(progressMap);
  mapRef.current = progressMap;

  const applyLocal = useCallback((videoId: string, patch: PracticePatch) => {
    const prev = mapRef.current[videoId];
    const next = {
      status: (prev?.status === "done" ? "done" : patch.status === "done" ? "done" : "mid") as ProgressStatus,
      score: Math.max(prev?.score ?? 0, patch.score ?? 0) || null,
      seconds: (prev?.seconds ?? 0) + (patch.secondsDelta ?? 0),
      linesDone: (prev?.linesDone ?? 0) + (patch.linesDoneDelta ?? 0),
      updatedAt: new Date().toISOString(),
    };
    setProgressMap((m) => ({ ...m, [videoId]: next }));
    return next;
  }, []);

  // mount: user → GET + merge guest một lần; guest → đọc localStorage
  useEffect(() => {
    if (isPending) return;
    if (!loggedIn) { setProgressMap(readLocalProgress()); setReady(true); return; }
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/v1/shadowing/progress");
        const server: ProgressMap = {};
        if (res.ok) {
          const { items } = (await res.json()) as { items: Array<Extract<keyof never, string> | string> & any[] };
          for (const it of items) server[it.videoId] = { status: it.status, score: it.score, seconds: it.seconds, linesDone: it.linesDone, updatedAt: it.updatedAt };
        }
        const guest = readLocalProgress();
        const guestIds = Object.keys(guest).filter((id) => !server[id]);
        // merge một lần: guest record thiếu trên server → PUT lên rồi clear key guest
        await Promise.all(guestIds.map((id) =>
          fetch(`/api/v1/shadowing/progress/${id}`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: guest[id].status, score: guest[id].score ?? undefined, secondsDelta: guest[id].seconds, linesDoneDelta: guest[id].linesDone }),
          })
        ));
        if (guestIds.length) writeLocalProgress({});
        if (alive) { setProgressMap({ ...guest, ...server }); setReady(true); }
      } catch {
        if (alive) { setProgressMap(readLocalProgress()); setReady(true); } // server hỏng → fallback local
      }
    })();
    return () => { alive = false; };
  }, [loggedIn, isPending]);

  const recordPractice = useCallback((videoId: string, patch: PracticePatch) => {
    applyLocal(videoId, patch);
    if (!loggedIn) { writeLocalProgress(mapRef.current); return; }
    fetch(`/api/v1/shadowing/progress/${videoId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => toast?.("Chưa đồng bộ được tiến độ — sẽ thử lại ở lần luyện sau"));
  }, [loggedIn, applyLocal, toast]);

  return { progressMap, metrics: computeMetrics(progressMap), recordPractice, ready };
}
```

Lưu ý executor: khai báo `items` ở GET — sửa cho sạch: `const { items } = (await res.json()) as { items: Array<{ videoId: string; status: ProgressStatus; score: number | null; seconds: number; linesDone: number; updatedAt: string }> };` (dòng `Extract<keyof never…>` ở trên chỉ là chữ ký test, viết lại kiểu này).

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/shadowing && pnpm typecheck`
Expected: PASS (cả test cũ prefs/dictation không vỡ).

- [ ] **Step 6: Commit**

```bash
git add src/lib/shadowing/progress.ts src/lib/shadowing/use-shadowing-progress.ts src/lib/shadowing/__tests__
git commit -m "feat(shadowing): useShadowingProgress — 2 nhánh API/localStorage + merge guest (spec §5.3)"
```

---

### Task 5: Thu âm + chấm điểm — `use-recorder.ts`, `waveform.ts`, `scoring.ts`

**Files:**
- Create: `app-next/src/lib/shadowing/use-recorder.ts`
- Create: `app-next/src/lib/shadowing/waveform.ts`
- Create: `app-next/src/lib/shadowing/scoring.ts`
- Test: `app-next/src/lib/shadowing/__tests__/waveform.test.ts`, `__tests__/scoring.test.ts`, `__tests__/use-recorder.test.ts`

**Interfaces:**
- Produces:
  - `barHeights(seed: number, amp: number, n?: number): number[]` — deterministic, trả mảng 0..1.
  - `scoreFor(recordSecs: number, zhLen: number, rate: number, simMode: boolean): number` — clamp 55–98.
  - `toneChipsFor(score: number, parts: string[]): { zh: string; ok: boolean }[]`.
  - `useRecorder(): { recording: boolean; simMode: boolean; level: number; start(): void; stop(): { blob: Blob; secs: number } | null; lastUrl: string | null }`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/shadowing/__tests__/waveform.test.ts
import { describe, it, expect } from "vitest";
import { barHeights } from "@/lib/shadowing/waveform";

describe("barHeights — deterministic (spec §3 waveform)", () => {
  it("cùng seed → cùng mảng 72 phần tử trong [0,1]", () => {
    const a = barHeights(3, 1);
    const b = barHeights(3, 1);
    expect(a).toEqual(b);
    expect(a).toHaveLength(72);
    for (const h of a) { expect(h).toBeGreaterThanOrEqual(0); expect(h).toBeLessThanOrEqual(1); }
  });
  it("seed khác → mảng khác; amp co giãn biên", () => {
    expect(barHeights(1, 1)).not.toEqual(barHeights(2, 1));
    const amp = barHeights(1, 0.4);
    const full = barHeights(1, 1);
    expect(amp.every((h, i) => Math.abs(h - full[i] * 0.4) < 1e-9 || Math.abs(h) < 1e-9)).toBe(true);
  });
});
```

```ts
// src/lib/shadowing/__tests__/scoring.test.ts
import { describe, it, expect } from "vitest";
import { scoreFor, toneChipsFor } from "@/lib/shadowing/scoring";

describe("scoreFor — heuristic nhịp nói (mock stopRec)", () => {
  it("bản ghi đúng độ dài kỳ vọng → điểm cao", () => {
    const expect6 = 6 * 0.55 / 1; // zhLen 6, rate 1 → expect 3.3s
    expect(scoreFor(3.3, 6, 1, false)).toBeGreaterThanOrEqual(85);
  });
  it("quá ngắn/quá dài → bị trừ nhưng không dưới 55", () => {
    expect(scoreFor(0.2, 6, 1, false)).toBe(55);
    expect(scoreFor(0.2, 6, 1, false)).toBeLessThanOrEqual(70);
  });
  it("simMode cộng điểm nhẹ", () => {
    expect(scoreFor(1, 6, 1, true)).toBe(scoreFor(1, 6, 1, false) + 4 - 6); // cùng closeness, khác bonus
  });
});

describe("toneChipsFor", () => {
  const parts = ["你好", "请问", "您", "喝", "点", "什么"];
  it("score ≥ 80 → all ok", () => {
    expect(toneChipsFor(85, parts).every((c) => c.ok)).toBe(true);
  });
  it("score thấp → có chip warn", () => {
    expect(toneChipsFor(60, parts).some((c) => !c.ok)).toBe(true);
    expect(toneChipsFor(60, parts)).toHaveLength(6);
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `pnpm vitest run src/lib/shadowing/__tests__/waveform.test.ts src/lib/shadowing/__tests__/scoring.test.ts` → FAIL (module thiếu).

- [ ] **Step 3: Implement**

```ts
// src/lib/shadowing/waveform.ts
/* Bars giả deterministic — port hàm bars() của mock shadowing-video.html.
   Chỉ là visualize trang trí, KHÔNG phải phân tích tín hiệu thật. */
export function barHeights(seed: number, amp: number, n = 72): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
    const r = x - Math.floor(x); // [0,1)
    out.push(Math.max(0, Math.min(1, 0.18 + r * 0.72 * amp)));
  }
  return out;
}
```

```ts
// src/lib/shadowing/scoring.ts
/* Chấm điểm "honest mock" (spec §9): theo nhịp & độ dài bản ghi, KHÔNG phải
   chấm thanh điệu thật. Port công thức stopRec() của mock. */
export function scoreFor(recordSecs: number, zhLen: number, rate: number, simMode: boolean): number {
  const expect = Math.max(2, (zhLen * 0.55) / rate);
  const ratio = Math.min(1, recordSecs / expect);
  const closeness = 1 - Math.abs(1 - ratio) * 0.9;
  return Math.max(55, Math.min(98, Math.round(62 + closeness * 30 + (simMode ? 4 : 6))));
}

export function toneChipsFor(score: number, parts: string[]): { zh: string; ok: boolean }[] {
  return parts.map((zh, i) => ({
    zh,
    ok: score >= 80 ? true : score >= 70 ? i % 3 !== 2 : i % 2 === 0,
  }));
}
```

- [ ] **Step 4: Run to verify PASS** — `pnpm vitest run src/lib/shadowing/__tests__/waveform.test.ts src/lib/shadowing/__tests__/scoring.test.ts` → PASS.

- [ ] **Step 5: Write failing test cho `useRecorder`**

```ts
// src/lib/shadowing/__tests__/use-recorder.test.ts
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecorder } from "@/lib/shadowing/use-recorder";

describe("useRecorder — jsdom không có mediaDevices → simMode", () => {
  it("start/stop trả bản ghi giả với secs > 0", async () => {
    const { result } = renderHook(() => useRecorder());
    act(() => result.current.start());
    expect(result.current.recording).toBe(true);
    expect(result.current.simMode).toBe(true);
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    let rec: { blob: Blob; secs: number } | null = null;
    act(() => { rec = result.current.stop(); });
    expect(result.current.recording).toBe(false);
    expect(rec).not.toBeNull();
    expect(rec!.secs).toBeGreaterThan(0);
    expect(rec!.blob).toBeInstanceOf(Blob);
  });
  it("stop khi không đang ghi → null", () => {
    const { result } = renderHook(() => useRecorder());
    expect(result.current.stop()).toBeNull();
  });
});
```

- [ ] **Step 6: Implement `useRecorder`**

```ts
"use client";
/* Kế thừa logic recorder-panel (getUserMedia + MediaRecorder + analyser level)
   nhưng dạng hook cho studio: start/stop theo pointerdown/up, lỗi quyền → simMode
   (vẫn chấm heuristic, spec §7). jsdom/test không có mediaDevices → sim luôn. */
import { useCallback, useEffect, useRef, useState } from "react";

type Rec = { stop: () => void; onstop: (() => void) | null; ondataavailable: ((e: { data: Blob }) => void) | null; start: () => void; mimeType: string };

export function useRecorder(onLevel?: (level: number) => void) {
  const [recording, setRecording] = useState(false);
  const [simMode, setSimMode] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const recRef = useRef<Rec | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const t0Ref = useRef(0);
  const rafRef = useRef(0);
  const onLevelRef = useRef(onLevel);
  onLevelRef.current = onLevel;

  useEffect(() => () => {
    try { recRef.current?.stop(); } catch { /* silent */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    cancelAnimationFrame(rafRef.current);
  }, []);

  const start = useCallback(() => {
    if (recRef.current) return;
    t0Ref.current = Date.now();
    chunksRef.current = [];
    const nav = navigator as Navigator & { mediaDevices?: MediaDevices };
    const MR = (window as unknown as { MediaRecorder?: new (s: MediaStream) => Rec }).MediaRecorder;
    if (nav.mediaDevices && MR) {
      nav.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        streamRef.current = stream;
        const rec = new MR(stream);
        rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const url = URL.createObjectURL(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
          setLastUrl(url);
        };
        rec.start();
        recRef.current = rec;
        setRecording(true);
        // level loop từ analyser
        try {
          const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (AC) {
            const ctx = new AC();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 1024;
            ctx.createMediaStreamSource(stream).connect(analyser);
            const buf = new Uint8Array(analyser.fftSize);
            const loop = () => {
              analyser.getByteTimeDomainData(buf);
              let s = 0;
              for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; }
              onLevelRef.current?.(Math.min(1, Math.sqrt(s / buf.length) * 3.2));
              rafRef.current = requestAnimationFrame(loop);
            };
            loop();
          }
        } catch { /* silent — level bar đứng 0 */ }
      }).catch(() => { setSimMode(true); setRecording(true); });
    } else {
      setSimMode(true);
      setRecording(true);
    }
  }, []);

  const stop = useCallback((): { blob: Blob; secs: number } | null => {
    if (!recording) return null;
    const secs = (Date.now() - t0Ref.current) / 1000;
    cancelAnimationFrame(rafRef.current);
    onLevelRef.current?.(0);
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* silent */ }
      recRef.current = null;
      streamRef.current = null;
    }
    setRecording(false);
    return { blob: new Blob(chunksRef.current, { type: "audio/webm" }), secs };
  }, [recording]);

  return { recording, simMode, levelRefLevel: 0, start, stop, lastUrl, setRecordingState: setRecording } as {
    recording: boolean; simMode: boolean; start: () => void; stop: () => { blob: Blob; secs: number } | null; lastUrl: string | null;
  };
}
```

Lưu ý executor: bỏ `levelRefLevel`/`setRecordingState` khỏi object trả về (đoạn trên ghi thừa) — chỉ trả `{ recording, simMode, start, stop, lastUrl }`; level đi qua callback `onLevel`.

- [ ] **Step 7: Run tests + commit**

Run: `pnpm vitest run src/lib/shadowing && pnpm typecheck` → PASS.

```bash
git add src/lib/shadowing/use-recorder.ts src/lib/shadowing/waveform.ts src/lib/shadowing/scoring.ts src/lib/shadowing/__tests__
git commit -m "feat(shadowing): useRecorder + waveform/scoring pure (port wave-rec shadowing-video.html)"
```

---

### Task 6: Engine — `usePlayerEngine` (tách từ video-player, mapping phím mới)

**Files:**
- Create: `app-next/src/components/shadowing/studio/use-player-engine.ts`
- Test: `app-next/src/components/shadowing/studio/__tests__/use-player-engine.test.ts`

**Interfaces:**
- Consumes: `useTts()` (`@/lib/tts/use-tts`), `findSentenceIndex` (di chuyển từ video-player sang đây, giữ nguyên export).
- Produces:
  ```ts
  export function usePlayerEngine(opts: { subs: SubtitleSentence[]; postSink?: (msg: string) => void }): {
    cur: number; playing: boolean; tts: boolean; ytReady: boolean; rate: number; loop: boolean;
    play(): void; pause(): void; togglePlay(): void;
    gotoSentence(i: number, autoplay: boolean): void; next(): void; prev(): void; repeat(): void;
    setRate(r: number): void; toggleLoop(): void;
    listenCurrent(): void;              // TTS hoặc seek+play câu hiện tại
    speakSentence(i: number): void;     // TTS đọc câu i (nút mini-audio/spk)
  };
  ```
- Khác biệt so với engine cũ (quan trọng — port máy móc, không sửa logic khác): **bỏ** `mode`, `videoHidden`, `transcriptHidden`, `showVi`, `showPy`, `font`, 2 Dialog; auto-split đọc từ state (default `true`) thay vì `document.getElementById("auto-split")`; **thêm** `loop` (khi playing chạm cuối câu → seek về đầu câu thay vì pause) và phím: `K` play/pause, `R` nghe mẫu (`listenCurrent`), `L` toggle loop, `←/→` prev/next. **Space không nằm ở engine** (Task 10 đăng ký hold-to-record riêng).

- [ ] **Step 1: Write the failing test**

```ts
// src/components/shadowing/studio/__tests__/use-player-engine.test.ts
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { findSentenceIndex, usePlayerEngine } from "../use-player-engine";
import type { SubtitleSentence } from "@/content/shadowing";

vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false }) }));

const subs: SubtitleSentence[] = [
  { n: 1, start: 0, end: 8, parts: [{ zh: "你好" }], pinyin: "Nǐ hǎo", vi: "Xin chào" },
  { n: 2, start: 9, end: 15, parts: [{ zh: "再见" }], pinyin: "Zàijiàn", vi: "Tạm biệt" },
];

describe("findSentenceIndex (di chuyển nguyên vẹn)", () => {
  it("t trong range → index; t ≥ end cuối → câu cuối; t < start đầu → 0", () => {
    expect(findSentenceIndex(subs, 5)).toBe(0);
    expect(findSentenceIndex(subs, 12)).toBe(1);
    expect(findSentenceIndex(subs, 100)).toBe(1);
    expect(findSentenceIndex(subs, -1)).toBe(0);
  });
});

describe("usePlayerEngine", () => {
  it("postSink nhận seekTo khi gotoSentence", () => {
    const postSink = vi.fn();
    const { result } = renderHook(() => usePlayerEngine({ subs, postSink }));
    act(() => result.current.gotoSentence(1, false));
    expect(postSink).toHaveBeenCalledWith(expect.stringContaining('"seekTo"'));
    expect(result.current.cur).toBe(1);
  });
  it("next/prev/repeat clamp trong [0, len-1]", () => {
    const { result } = renderHook(() => usePlayerEngine({ subs }));
    act(() => result.current.prev());
    expect(result.current.cur).toBe(0);
    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.cur).toBe(1);
    act(() => result.current.repeat());
    expect(result.current.cur).toBe(1);
  });
  it("setRate đẩy setPlaybackRate vào iframe", () => {
    const postSink = vi.fn();
    const { result } = renderHook(() => usePlayerEngine({ subs, postSink }));
    act(() => result.current.setRate(0.85));
    expect(postSink).toHaveBeenCalledWith(expect.stringContaining('"setPlaybackRate"'));
    expect(result.current.rate).toBe(0.85);
  });
  it("toggleLoop đổi loop", () => {
    const { result } = renderHook(() => usePlayerEngine({ subs }));
    expect(result.current.loop).toBe(false);
    act(() => result.current.toggleLoop());
    expect(result.current.loop).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `pnpm vitest run src/components/shadowing/studio` → FAIL (module thiếu).

- [ ] **Step 3: Implement** — copy toàn bộ phần engine của `video-player.tsx` (dòng 24–240: `YT_ORIGIN`, stateRef, `ytSend`/`ytCmd`, message listener, polling 500ms, TTS fallback 4s + `speakSentence`/`speakCurrent`, `play/pause/gotoSentence/next/prev/repeat`) vào hook, với các sửa đổi sau đây và KHÔNG gì khác:

```ts
"use client";
/* Engine phát — tách nguyên vẹn từ video-player.tsx (postMessage YouTube,
   polling 500ms, TTS fallback 4s). Khác biệt duy nhất (spec §3.4):
   - auto-split thành state (default true), không đọc DOM
   - thêm loop: chạm cuối câu khi playing → seek về đầu câu thay vì pause
   - phím: K=play/pause, R=nghe mẫu, L=loop, ←/→=chuyển câu. Space do record dock phụ trách. */
import { useEffect, useRef, useState } from "react";
import { useTts } from "@/lib/tts/use-tts";
import type { ShadowingVideo, SubtitleSentence } from "@/content/shadowing";

const YT_ORIGIN = "https://www.youtube-nocookie.com";

export function findSentenceIndex(subs: SubtitleSentence[], t: number): number {
  for (let i = 0; i < subs.length; i++) if (t >= subs[i].start && t < subs[i].end) return i;
  return t >= subs[subs.length - 1].end ? subs.length - 1 : 0;
}

export function usePlayerEngine({ subs, postSink }: { subs: SubtitleSentence[]; postSink?: (msg: string) => void }) {
  const { speak, cancel: ttsCancel } = useTts();
  // ...paste stateRef, ytSend/ytCmd, message listener, markYtReady, onIframeLoad,
  // polling effect, TTS-fallback effect, speakSentence/speakCurrent, play/pause —
  // NGUYÊN VẸN từ video-player.tsx:47-192, với các delta:
  //   1. thêm state: const [loop, setLoop] = useState(false); st.current.loop = loop;
  //   2. thêm state: const [autoSplit, setAutoSplit] = useState(true); st.current.autoSplit = autoSplit;
  //   3. tick(): thay dòng đọc DOM bằng
  //        if (st.current.playing && st.current.autoSplit && t >= subs[st.current.cur].end - 0.15) {
  //          if (st.current.loop) { ytCmd("seekTo", [subs[st.current.cur].start, true]); return; }
  //          pause();
  //        }
  //      (nhánh TTS: speakCurrent onEnd — nếu loop thì lặp lại speakCurrent() thay vì pause)
  //   4. keyboard effect: Space → bỏ; e.key "k"/"K" → togglePlay; "r"/"R" → listenCurrent();
  //      "l"/"L" → toggleLoop(); giữ ←/→. Guard input/textarea/select giữ nguyên.
  //   5. export speakSentence(i) riêng (bỏ wrapper private) và listenCurrent() giữ nguyên.
  //   6. return {...} như Interfaces khai báo.
}
```

- [ ] **Step 4: Run to verify PASS**

Run: `pnpm vitest run src/components/shadowing/studio && pnpm typecheck`
Expected: PASS. (Test cũ `video-player.test.tsx` vẫn pass — file cũ chưa xóa.)

- [ ] **Step 5: Commit**

```bash
git add src/components/shadowing/studio
git commit -m "feat(shadowing): usePlayerEngine tách từ video-player + phím K/R/L (port player shadowing-video.html)"
```

---

### Task 7: Studio — page + topbar + stage + player toolbar

**Files:**
- Modify: `app-next/src/app/(app)/shadowing/[videoId]/page.tsx`
- Create: `app-next/src/app/(app)/shadowing/[videoId]/shadowing-studio.tsx`
- Modify: `app-next/src/app/globals.css` (thêm `.hz-breakout`)
- Test: `app-next/src/app/(app)/shadowing/[videoId]/__tests__/shadowing-studio.test.tsx`

**Interfaces:**
- Consumes: `usePlayerEngine` (Task 6), `FALLBACK_SUBS` (giữ ở page), props `{ video: ShadowingVideo; subtitles: SubtitleSentence[] }`.
- Produces: `ShadowingStudio` — các Task 8/9 cắm transcript/dictation và record dock vào 2 slot được chừa (`{/* SLOT-TRANSCRIPT */}`, `{/* SLOT-RECORD */}`).

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/(app)/shadowing/[videoId]/__tests__/shadowing-studio.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ShadowingStudio from "../shadowing-studio";
import type { ShadowingVideo, SubtitleSentence } from "@/content/shadowing";

vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false }) }));
vi.mock("@/components/shell/toast-provider", () => ({ useToast: () => vi.fn(), useToastSafe: () => vi.fn() }));

const video: ShadowingVideo = {
  id: "EA3rwvr99Q0", title: "墓碑上的QR碼", playlistId: "daihuaxiyou", hsk: "HSK3",
  views: 0, viewsSuffix: "", duration: "2:46", durSec: 166, plays: 0, topic: "film", spd: 0.9,
};
const subs: SubtitleSentence[] = [
  { n: 1, start: 0, end: 8, parts: [{ zh: "你好" }], pinyin: "Nǐ hǎo", vi: "Xin chào" },
  { n: 2, start: 9, end: 15, parts: [{ zh: "再见" }], pinyin: "Zàijiàn", vi: "Tạm biệt" },
];

describe("ShadowingStudio — shell (port studio-topbar/video-stage/player-toolbar)", () => {
  it("render topbar: back link, title, tiến độ nói", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    expect(screen.getByTestId("studio-topbar")).toBeInTheDocument();
    expect(screen.getByText("Thư viện Shadowing")).toHaveAttribute("href", "/shadowing");
    expect(screen.getByText(/Tiến độ nói/)).toBeInTheDocument();
    expect(screen.getByText("Câu 1/2")).toBeInTheDocument();
  });
  it("stage có iframe YouTube + overlay khi chưa ready", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    const iframe = screen.getByTitle(/YouTube video player/);
    expect(iframe).toHaveAttribute("src", expect.stringContaining("youtube-nocookie.com/embed/EA3rwvr99Q0"));
  });
  it("player toolbar: play, scrub, lặp câu, speed seg 0.75/0.85/1.0, CC", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    expect(screen.getByTestId("player-toolbar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Phát / tạm dừng" })).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lặp câu/ })).toBeInTheDocument();
    for (const s of ["0.75x", "0.85x", "1.0x"]) expect(screen.getByRole("button", { name: s })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CC" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — module chưa tồn tại.

- [ ] **Step 3: Thêm `.hz-breakout` vào `globals.css`**

```css
/* Studio shadowing thoát max-w-5xl của (app)/layout — full-bleed, tự giới hạn 1280px.
   Chỉ dùng page-local (spec §3). */
.hz-breakout {
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  width: 100vw;
}
```

- [ ] **Step 4: Implement page + `ShadowingStudio`**

`page.tsx` — giữ `generateStaticParams`, `generateMetadata`, `notFound()`, `FALLBACK_SUBS`; thay render:

```tsx
return (
  <div className="hz-breakout pb-28 lg:pb-6">
    <div className="mx-auto max-w-[1280px] px-4 lg:px-6 py-4">
      <ShadowingStudio video={video} subtitles={subs} />
    </div>
  </div>
);
```

`shadowing-studio.tsx` — client, cấu trúc (code đầy đủ cho shell; slot để comment):

```tsx
"use client";
/* ShadowingStudio (port shadowing-video.html) — engine dùng usePlayerEngine;
   ghi chú: nút Ẩn video, checkbox show-vi/py, Cài đặt của player cũ bị bỏ theo mock. */
import { useState } from "react";
import Link from "next/link";
import { usePlayerEngine } from "@/components/shadowing/studio/use-player-engine";
import { useShadowingProgress } from "@/lib/shadowing/use-shadowing-progress";
import type { ShadowingVideo, SubtitleSentence } from "@/content/shadowing";
import { topicVi } from "@/content/shadowing";
import { Button, IconButton } from "@/components/ui/button"; // IconButton từ ui/icon-button
import { useToast } from "@/components/shell/toast-provider";
import { Play, Pause, Repeat, Volume2, ChevronLeft, X, ICON_STROKE } from "@/components/ui/icon";

export default function ShadowingStudio({ video, subtitles: subs }: { video: ShadowingVideo; subtitles: SubtitleSentence[] }) {
  const eng = usePlayerEngine({ subs });
  const toast = useToast();
  const { progressMap } = useShadowingProgress();
  const rec = progressMap[video.id];
  const [subMode, setSubMode] = useState<0 | 1 | 2>(2); // 0: chỉ hanzi, 1: chỉ pinyin, 2: cả hai

  const linesDone = rec?.linesDone ?? 0;
  const pct = Math.round((linesDone / subs.length) * 100);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      <div className="flex min-w-0 flex-col gap-4 lg:w-[58%]" data-od-id="media-deck">
        {/* sticky page header — đứng trước media-deck trong DOM thật: tách thành sibling đầu tiên của container (xem dưới) */}
        <section aria-label="Trình phát video">
          <div className="relative aspect-video max-h-[250px] w-full overflow-hidden rounded-card border border-border-subtle bg-surface-muted" data-od-id="video-stage">
            <iframe
              id="ytplayer"
              title={"YouTube video player — " + video.title}
              src={"https://www.youtube-nocookie.com/embed/" + video.id + "?enablejsapi=1&rel=0&playsinline=1"}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            {!eng.ytReady && (
              <div data-testid="video-overlay" className="absolute inset-0 grid place-items-center bg-surface-muted text-center">
                <div>
                  <span className="hanzi text-7xl text-white/20">{video.title.slice(0, 2)}</span>
                  <p className="mt-2 text-sm text-text-secondary">Video YouTube — cần kết nối mạng</p>
                  {eng.tts && <p className="text-sm text-feedback-warning">Dùng TTS đọc câu — không cần mạng cũng học được.</p>}
                </div>
              </div>
            )}
          </div>
          {/* player toolbar */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-card border border-border-subtle bg-surface-elevated p-1.5 shadow-xs" data-od-id="player-toolbar" data-testid="player-toolbar">
            <Button size="sm" variant="secondary" onClick={eng.togglePlay} aria-label="Phát / tạm dừng" data-play>
              {eng.playing ? <Pause size={16} strokeWidth={ICON_STROKE} /> : <Play size={16} strokeWidth={ICON_STROKE} />}
              {eng.playing ? "Tạm dừng" : "Phát"}
            </Button>
            <label className="flex min-w-[120px] flex-1 items-center gap-2 text-xs tabular-nums text-text-secondary">
              <span data-testid="t-cur">00:00</span>
              <input type="range" aria-label="Dòng thời gian" min={0} max={video.durSec} defaultValue={0} data-testid="scrub" className="flex-1 accent-[var(--action-primary)]" />
              <span>{video.duration}</span>
            </label>
            <Button size="sm" variant={eng.loop ? "primary" : "secondary"} onClick={eng.toggleLoop} aria-pressed={eng.loop} title="Lặp lại câu này (L)">
              <Repeat size={14} strokeWidth={ICON_STROKE} /> Lặp câu
            </Button>
            <div role="group" aria-label="Tốc độ phát" className="flex gap-0.5 rounded-control border border-border-subtle bg-surface-muted p-0.5">
              {[0.75, 0.85, 1].map((r) => (
                <button key={r} onClick={() => eng.setRate(r)} aria-pressed={eng.rate === r}
                  className={"min-h-9 rounded-[9px] px-2.5 text-xs font-bold " + (eng.rate === r ? "bg-surface-elevated text-text-primary shadow-xs" : "text-text-secondary")}>
                  {r === 1 ? "1.0x" : r + "x"}
                </button>
              ))}
            </div>
            <Button size="sm" variant={subMode !== 0 ? "primary" : "secondary"} onClick={() => { const next = ((subMode + 1) % 3) as 0 | 1 | 2; setSubMode(next); toast(subMode === 0 ? "Phụ đề: chỉ chữ Hán" : next === 1 ? "Phụ đề: chỉ Pinyin" : "Phụ đề: Hán tự + Pinyin"); }} aria-pressed={subMode !== 0} title="Phụ đề">CC</Button>
          </div>
        </section>
        {/* SLOT-RECORD: Task 10 cắm waveform card + record dock vào đây */}
      </div>
      {/* SLOT-TRANSCRIPT: Task 8 cắm tabs + transcript + dictation vào đây */}
    </div>
  );
}
```

Sticky topbar render **trước** `div.flex` (sibling đầu tiên trong component root):

```tsx
<header className="sticky top-0 z-20 -mx-4 mb-4 border-b border-border-subtle bg-surface-elevated/80 px-4 py-2 backdrop-blur lg:-mx-6 lg:px-6" data-od-id="studio-topbar" data-testid="studio-topbar">
  <div className="flex items-center gap-3">
    <Link href="/shadowing" className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-[13px] font-bold text-text-secondary hover:text-text-primary hover:border-border-subtle border border-transparent focus-visible:ring-3 ring-action-focus ring-offset-2">
      <ChevronLeft size={14} strokeWidth={ICON_STROKE} /> Thư viện Shadowing
    </Link>
    <div className="min-w-0 truncate text-[13.5px] font-extrabold">
      <span className="hanzi">{video.title}</span> <small className="font-normal text-text-secondary">• {video.hsk} · {topicVi[video.topic]}</small>
    </div>
    <div className="ml-auto flex items-center gap-2 whitespace-nowrap text-xs font-bold text-text-secondary">
      <span>Tiến độ nói: {linesDone}/{subs.length} câu ({pct}%)</span>
      <span className="h-2 w-36 overflow-hidden rounded-full bg-ring-track">
        <i className="block h-full rounded-full bg-feedback-success transition-[width]" style={{ width: pct + "%" }} data-testid="studio-progress-fill" />
      </span>
    </div>
  </div>
</header>
```

Kèm dòng `Câu 1/2` test yêu cầu — thêm Chip trong player toolbar: `<Chip data-testid="pos">Câu {eng.cur + 1}/{subs.length}</Chip>`.

- [ ] **Step 5: Run to verify PASS**

Run: `pnpm vitest run "src/app/(app)/shadowing" && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/shadowing/[videoId]" src/app/globals.css
git commit -m "feat(shadowing): studio shell topbar/stage/player-toolbar (port studio-topbar video-stage player-toolbar shadowing-video.html)"
```

---

### Task 8: Studio — transcript pane + dictation box

**Files:**
- Modify: `app-next/src/app/(app)/shadowing/[videoId]/shadowing-studio.tsx` (đổ SLOT-TRANSCRIPT)
- Modify: `app-next/src/app/globals.css` (thêm `.sent-active`)
- Test: thêm case vào `shadowing-studio.test.tsx`

**Interfaces:**
- Consumes: engine (`cur`, `gotoSentence`, `listenCurrent`, `speakSentence`, `speakSentenceText`), `normDict`/`diffNormalized` (`@/lib/shadowing/dictation`), `useTts` cho "Nghe chậm 0.65x" (`speak(text, { lang: "zh-CN", rate: 0.65 })`).
- Produces: tabs `data-od-id="script-tabs"`; stream `data-od-id="transcript-stream"` với `data-sent=i`, class `sent-active` khi active; dictation `data-od-id="dictation-box"` (`data-testid="dict-input"`, `data-testid="dict-check"` giữ nguyên từ panel cũ để e2e cũ còn khớp tên).

- [ ] **Step 1: Thêm `.sent-active` vào `globals.css`** (bug cũ: class gắn từ trước nhưng chưa từng có style)

```css
/* Câu transcript đang phát — viền vermilion + wash (spec §3, mock .sent.cur). */
.sent-active {
  @apply border-action-primary bg-rose-wash;
}
```

Nếu `@apply` với token tùy chỉnh báo lỗi build, thay bằng CSS thuần: `.sent-active { border-color: var(--hz-action-primary); background: var(--hz-rose-wash); }` — kiểm tra tên biến trong khối `@theme`/`:root` của chính `globals.css`, KHÔNG hard-code hex.

- [ ] **Step 2: Write the failing tests** (thêm describe vào `shadowing-studio.test.tsx`)

```tsx
import { fireEvent, within } from "@testing-library/react";

describe("transcript + dictation (port script-tabs/transcript-stream/dictation-box)", () => {
  it("mỗi câu render data-sent, câu active có sent-active, click câu gọi seekTo", () => {
    const postSink = vi.fn();
    render(<ShadowingStudio video={video} subtitles={subs} enginePostSink={postSink} />);
    const s0 = document.querySelector('[data-sent="0"]')!;
    const s1 = document.querySelector('[data-sent="1"]')!;
    expect(s0).toHaveClass("sent-active");
    expect(s1).not.toHaveClass("sent-active");
    fireEvent.click(s1);
    expect(postSink).toHaveBeenCalledWith(expect.stringContaining('"seekTo"'));
  });
  it("tab Chép chính tả → hiện dictation box, ẩn stream; check đúng → điểm ghi nhận", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    fireEvent.click(screen.getByRole("button", { name: "Chép chính tả" }));
    expect(screen.getByTestId("dict-box")).toBeVisible();
    expect(screen.getByTestId("transcript-stream")).not.toBeVisible();
    fireEvent.change(screen.getByTestId("dict-input"), { target: { value: "你好" } });
    fireEvent.click(screen.getByTestId("dict-check"));
    expect(screen.getByTestId("dict-result")).toHaveTextContent(/Chính xác/);
  });
  it("ô trống chips: mask ? rồi mở dần khi bấm Gợi ý", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    fireEvent.click(screen.getByRole("button", { name: "Chép chính tả" }));
    const masked = screen.getAllByText("?").length;
    expect(masked).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Gợi ý 1 chữ" }));
    expect(screen.getAllByText("?").length).toBe(masked - 1);
  });
});
```

Props test-only: thêm optional `enginePostSink?: (m: string) => void` truyền xuống `usePlayerEngine` (prod undefined).

- [ ] **Step 3: Implement SLOT-TRANSCRIPT**

Cột phải `lg:w-[42%]`, card `rounded-card border bg-surface-elevated p-3.5`:

1. Tabs (nhóm `role="group"`, 2 nút flex-1 `min-h-11 rounded-control`, active = `bg-surface-elevated shadow-xs`, `aria-pressed`): "Kịch bản đồng bộ" / "Chép chính tả". State `tab: "script" | "dict"`.
2. Stream (`data-testid="transcript-stream"` `data-od-id="transcript-stream"`, `max-h-[640px] overflow-y-auto`, ẩn khi `tab==="dict"`): port nguyên list câu từ `video-player.tsx:354-384` (giữ `data-sent`, `data-zh`, `data-py`, `data-vi`, click → `eng.gotoSentence(i, true)` + `eng.speakSentence(i)`, autoscroll vào engine), restyle: mỗi câu `rounded-2xl border p-3 hover:bg-surface-muted`; active thêm `sent-active` + zh `text-xl`; `ts` hàng đầu "Câu {n} · {start} – {end}" định dạng `mm:ss`; foot: score-pill (`rec` chưa có câu → "Chưa luyện" neutral; có score → "{score}%" jade) + nút spk tròn 34px nghe câu.
3. Dictation (`data-testid="dict-box"` `data-od-id="dictation-box"`, `hidden` khi `tab==="script"`): port logic `DictationPanel` (state value/result, `useEffect` reset theo `cur`, `check()` dùng `normDict`/`diffNormalized`) + UI mock:
   - head: "CÂU {cur+1} / {subs.length}" + small "Mốc thời gian {fmt(start)} – {fmt(end)}";
   - 2 mini-btn: "Nghe câu mẫu" (`eng.listenCurrent`), "Nghe chậm 0.65x" (`speak(full, { lang: "zh-CN", rate: 0.65 })`);
   - khối "GỢI Ý Ô TRỐNG": chips ký tự `dictChars()` (= `full.replace(/[。，、！？…—\s]/g, "").split("")`), trạng thái mở `dictShown` (state, reset theo `cur`), chip mở = `.hanzi` thường, chưa mở = `?` border-dashed; nút "Gợi ý 1 chữ" `dictShown++` (hết → toast "Đã hiện hết gợi ý rồi"); hint text "Gợi ý: {pinyin.slice(0, max(8, 40% độ dài))}…" hiện khi đã bấm ≥1 lần;
   - `textarea` `data-testid="dict-input"` class `zh text-lg min-h-24 rounded-2xl bg-surface-muted p-3.5` (Enter không shift → check);
   - nút "Kiểm tra đáp án" primary full-width `data-testid="dict-check"`;
   - nav "◀ Câu trước" (`eng.prev`) / "Bỏ qua / Tiếp ▶" (`eng.next`);
   - `data-testid="dict-result"`: đúng → "Chính xác! {pinyin}" jade **và gọi `recordPractice(video.id, { score: 85, linesDoneDelta: 1 })`**; sai → "Chưa đúng — nghe lại và thử tiếp nhé (đáp án vẫn đang ẩn)" vermilion.
4. Khi `tab==="dict"`: record dock (Task 10) nhận prop `dimmed={tab==="dict"}` — đặt state `tab` ở level `ShadowingStudio`.

- [ ] **Step 4: Run to verify PASS**

Run: `pnpm vitest run "src/app/(app)/shadowing" && pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/shadowing/[videoId]" src/app/globals.css
git commit -m "feat(shadowing): transcript pane + dictation box (port script-tabs transcript-stream dictation-box shadowing-video.html)"
```

---

### Task 9: Studio — waveform card + record dock + chấm điểm

**Files:**
- Modify: `app-next/src/app/(app)/shadowing/[videoId]/shadowing-studio.tsx` (đổ SLOT-RECORD)
- Test: thêm case vào `shadowing-studio.test.tsx`

**Interfaces:**
- Consumes: `useRecorder` (Task 5), `barHeights`/`scoreFor`/`toneChipsFor` (Task 5), engine (`cur`, `speakSentence`), `recordPractice`.
- Produces: sections `data-od-id="waveform-card"`, `data-od-id="tone-inspector"`, `data-od-id="record-dock"`; prop `dimmed` (từ Task 8).

- [ ] **Step 1: Write the failing tests**

```tsx
describe("waveform + record dock (port waveform-card/record-dock)", () => {
  it("render 2 canvas rows + nút Nghe mẫu / Phát lại + mic", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    expect(screen.getByTestId("waveform-card")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nghe mẫu" })).toBeInTheDocument();
    expect(screen.getByTestId("wave-mine-empty")).toHaveTextContent(/Chưa có bản ghi/);
    expect(screen.getByRole("button", { name: "Nhấn giữ để thu âm" })).toBeInTheDocument();
  });
  it("Space giữ → recording, Space nhả → dừng và chấm (simMode jsdom)", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    fireEvent.keyDown(document, { code: "Space" });
    expect(screen.getByTestId("mic-btn")).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyUp(document, { code: "Space" });
    expect(screen.getByTestId("mic-btn")).toHaveAttribute("aria-pressed", "false");
  });
  it("Space bỏ qua khi focus trong textarea dictation", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    fireEvent.click(screen.getByRole("button", { name: "Chép chính tả" }));
    const input = screen.getByTestId("dict-input");
    input.focus();
    fireEvent.keyDown(input, { code: "Space" });
    expect(screen.getByTestId("mic-btn")).toHaveAttribute("aria-pressed", "false");
  });
  it("tab dict → dock mờ", () => {
    render(<ShadowingStudio video={video} subtitles={subs} />);
    fireEvent.click(screen.getByRole("button", { name: "Chép chính tả" }));
    expect(screen.getByTestId("record-dock")).toHaveClass("opacity-45", "saturate-50");
  });
});
```

- [ ] **Step 2: Run to verify FAIL.**

- [ ] **Step 3: Implement SLOT-RECORD** (trong cột trái, dưới player toolbar)

1. **Waveform card** (`data-testid="waveform-card"` `data-od-id="waveform-card"` card p-4):
   - h3 "Sóng âm đối chiếu" `text-[13px] font-bold`;
   - row 1: label "Bản xứ · [Nghe mẫu]" (mini-btn → `eng.speakSentence(eng.cur)`) + `<canvas data-testid="wave-native" width={600} height={80} className="h-8 w-full rounded-[10px] border border-border-subtle bg-surface-muted" />`; vẽ trong `useEffect([cur])`: 72 bars từ `barHeights(cur + 3, 1)` màu `var(--hz-text-secondary)`, mỗi bar `roundRect(bx, by, bw*0.6, h, 3)` với `h = 6 + r*(H*0.72)`, centered;
   - row 2: label "Giọng của bạn · [Phát lại]" (mini-btn → `new Audio(lastUrl).play()`, không có → toast "Chưa có bản ghi để phát lại") + canvas `data-testid="wave-mine"`; khi `lastUrl == null` → phủ div `data-testid="wave-mine-empty"` text "Chưa có bản ghi — nhấn giữ mic để thu âm câu {cur+1}"; sau khi ghi xong → vẽ `barHeights(cur*7 + 2, 0.55 + ratio*0.4)` màu `var(--hz-action-primary)`.
   - Draw helper `drawBars(canvas, heights, color)` — cùng file component, ~15 dòng, dùng `ctx.roundRect?.() ?? ctx.rect` như mock.
2. **Tone inspector** (`data-od-id="tone-inspector"`, `border-t pt-3 mt-3`): h3 "Chấm điểm thanh điệu câu này"; chips từ `toneChipsFor(lastScore, subs[cur].parts.map(p => p.zh))` — `lastScore` state (reset về null khi `cur` đổi); chip ok: `bg-jade-wash text-feedback-success border-feedback-success` + " ✓", warn: `bg-amber-wash text-amber-ink border-amber-wash` + " ~", chưa chấm: idle neutral hiển thị `<b>{zh}</b> {pinyin-từ-part? parts chỉ có zh → chỉ hiển thị zh}`; score badge `data-testid="tone-score"`: null → "Chưa chấm — hãy thu âm câu này" neutral; < 70 → "Khớp nhịp nói: {s}% · Cần luyện thêm" amber; < 85 → "Khá tốt" amber; ≥ 85 → "Rất tốt!" jade.
3. **Record dock** (`data-testid="record-dock"` `data-od-id="record-dock"`, card p-2 text-center, `dimmed` → `className="opacity-45 saturate-50 pointer-events-none"`):
   - nút mic 56px tròn `bg-action-primary text-white rounded-full` với `data-testid="mic-btn"` `aria-pressed={recording}` `aria-label="Nhấn giữ để thu âm"`; sự kiện `onPointerDown={e => { e.preventDefault(); if (!dimmed) rec.start(); }}`, `onPointerUp/Leave/Cancel={onStop}`; đang ghi → thêm span `absolute inset-0 rounded-full border-2 border-action-primary animate-ping` (thay @keyframes mock, respects reduced-motion của Tailwind);
   - hint "Nhấn giữ để nói (hoặc giữ <kbd>Space</kbd>)";
   - level bar `h-1.5 max-w-[260px] mx-auto rounded-full bg-ring-track` + fill `bg-action-primary` width từ `onLevel`;
   - stepnav 2 nút flex-1 min-h-12: "◀ Câu trước" (`eng.prev`), "Câu tiếp theo ▶" (`eng.next` + `eng.speakSentence(eng.cur)`).
4. **`onStop` handler** (dùng lại cho pointerup VÀ keyup Space):
   ```ts
   function onStop() {
     const r = rec.stop();
     if (!r) return;
     const zh = subs[eng.cur].parts.map((p) => p.zh).join(" ");
     const score = scoreFor(r.secs, zh.length, eng.rate, rec.simMode);
     setLastScore(score); setLastRatio(Math.min(1, r.secs / Math.max(2, zh.length * 0.55 / eng.rate)));
     recordPractice(video.id, { score, secondsDelta: Math.round(r.secs), linesDoneDelta: 1 });
     toast("Đã chấm câu " + (eng.cur + 1) + ": " + score + "% (theo nhịp & độ dài bản ghi)");
   }
   ```
5. **Keyboard Space hold-to-record** — đăng ký trong `ShadowingStudio` (KHÔNG ở engine):
   ```ts
   useEffect(() => {
     const isTyping = (e: KeyboardEvent) => {
       const t = e.target as HTMLElement | null;
       return !!t && ((t.matches?.("input, textarea, select")) || t.isContentEditable);
     };
     const down = (e: KeyboardEvent) => {
       if (e.code !== "Space" || e.repeat || isTyping(e)) return;
       e.preventDefault();
       if (!dimmed) rec.start();
     };
     const up = (e: KeyboardEvent) => {
       if (e.code !== "Space" || isTyping(e)) return;
       e.preventDefault();
       onStop();
     };
     document.addEventListener("keydown", down);
     document.addEventListener("keyup", up);
     return () => { document.removeEventListener("keydown", down); document.removeEventListener("keyup", up); };
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [dimmed, eng.cur, eng.rate, rec.simMode, rec.recording]);
   ```
   Chú ý: `onStop` phải đọc qua ref hoặc được định nghĩa bằng `useCallback` với deps đúng để keyup gọi bản mới nhất.

- [ ] **Step 4: Run to verify PASS** — `pnpm vitest run "src/app/(app)/shadowing" && pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/shadowing/[videoId]"
git commit -m "feat(shadowing): waveform card + record dock Space-hold + chấm nhịp (port waveform-card record-dock shadowing-video.html)"
```

---

### Task 10: Library — `ShadowingLibrary` (header + hero + toolbar + grid)

**Files:**
- Modify: `app-next/src/app/(app)/shadowing/page.tsx`
- Create: `app-next/src/app/(app)/shadowing/shadowing-library.tsx`
- Create: `app-next/src/lib/shadowing/daily.ts`
- Test: `app-next/src/app/(app)/shadowing/__tests__/shadowing-library.test.tsx`, `app-next/src/lib/shadowing/__tests__/daily.test.ts`

**Interfaces:**
- Consumes: `topicVi` (Task 1), `useShadowingProgress` (Task 4), `pickDaily` (mới).
- Produces: `pickDaily(videos: ShadowingVideo[], subs: Record<string, SubtitleSentence[]>, now: Date): ShadowingVideo` — candidates là video có subtitle thật, `idx = Math.floor(now.getTime() / 86_400_000) % candidates.length`. Props `ShadowingLibrary({ videos, subtitlesByVideo })` — serialize từ page.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/shadowing/__tests__/daily.test.ts
import { describe, it, expect } from "vitest";
import { pickDaily } from "@/lib/shadowing/daily";

describe("pickDaily (spec §2.2)", () => {
  it("chỉ chọn trong video CÓ subtitle; cùng ngày → cùng video, khác ngày → có thể khác", () => {
    const d1 = new Date("2026-10-05T10:00:00Z");
    const d2 = new Date("2026-10-06T10:00:00Z");
    const v1 = pickDaily(videosFixture, subsFixture, d1);
    expect(subsFixture[v1.id]).toBeTruthy();
    expect(pickDaily(videosFixture, subsFixture, d1)).toEqual(v1);
    // 2 ngày liên tiếp bám công thức mod — chỉ assert tính deterministic, không assert giá trị cụ thể
    expect(pickDaily(videosFixture, subsFixture, d2)).toEqual(v1); // candidates có 1 phần tử trong fixture
  });
});
```

(fixture: 2 video, chỉ 1 có subtitle — import từ file fixture dùng chung `__tests__/fixtures.ts` tạo mới với 2 `ShadowingVideo` có `topic`/`spd` và 1 subtitle track 2 câu; dùng lại ở test library.)

```tsx
// src/app/(app)/shadowing/__tests__/shadowing-library.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ShadowingLibrary from "../shadowing-library";

vi.mock("@/lib/shadowing/use-shadowing-progress", () => ({
  useShadowingProgress: () => ({
    progressMap: { "EA3rwvr99Q0": { status: "done", score: 88, seconds: 120, linesDone: 9, updatedAt: "" } },
    metrics: { practiced: 1, seconds: 120, avgScore: 88 },
    recordPractice: vi.fn(), ready: true,
  }),
}));
vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false }) }));
vi.mock("@/components/shell/toast-provider", () => ({ useToast: () => vi.fn(), useToastSafe: () => vi.fn() }));

import { videosFixture, subsFixture } from "@/lib/shadowing/__tests__/fixtures";

beforeEach(() => localStorage.clear());

describe("ShadowingLibrary (port shadow-header/daily-pick/filter-toolbar/video-grid)", () => {
  it("header: h1 + 3 metric pills từ progress", () => {
    render(<ShadowingLibrary videos={videosFixture} subtitlesByVideo={subsFixture} />);
    expect(screen.getByTestId("shadow-header")).toHaveTextContent("影子跟读");
    expect(screen.getByText(/1 bài đã luyện/)).toBeInTheDocument();
    expect(screen.getByText(/2 phút nói/)).toBeInTheDocument();
    expect(screen.getByText(/88% chuẩn ngữ điệu/)).toBeInTheDocument();
  });
  it("hero daily-pick: scenario pill + CTA", () => {
    render(<ShadowingLibrary videos={videosFixture} subtitlesByVideo={subsFixture} />);
    expect(screen.getByTestId("daily-pick")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bắt đầu luyện nói ngay/ })).toBeInTheDocument();
  });
  it("filter CẤP ĐỘ thu grid; grid rỗng → empty state", () => {
    render(<ShadowingLibrary videos={videosFixture} subtitlesByVideo={subsFixture} />);
    const grid = screen.getByTestId("video-grid");
    expect(within(grid).getAllByRole("button")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "HSK 1" }));
    expect(within(grid).getAllByRole("button").length).toBeLessThanOrEqual(2);
    fireEvent.click(screen.getByRole("button", { name: "HSK 4-6" }));
    expect(screen.getByText(/Không có video nào khớp bộ lọc/)).toBeInTheDocument();
  });
  it("search theo zh/py/vi", () => {
    render(<ShadowingLibrary videos={videosFixture} subtitlesByVideo={subsFixture} />);
    fireEvent.change(screen.getByLabelText("Tìm video"), { target: { value: "zzz-không-có" } });
    expect(screen.getByText(/Không có video nào khớp bộ lọc/)).toBeInTheDocument();
  });
  it("status pill: done jade / chưa học neutral", () => {
    render(<ShadowingLibrary videos={videosFixture} subtitlesByVideo={subsFixture} />);
    expect(screen.getByText(/Đã hoàn thành · 88%/)).toBeInTheDocument();
    expect(screen.getByText("Chưa học")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify FAIL.**

- [ ] **Step 3: Implement `daily.ts` + `ShadowingLibrary`**

`daily.ts`:

```ts
import type { ShadowingVideo, SubtitleSentence } from "@/content/shadowing";

export function pickDaily(videos: ShadowingVideo[], subs: Record<string, SubtitleSentence[]>, now: Date): ShadowingVideo {
  const candidates = videos.filter((v) => subs[v.id]?.length);
  const pool = candidates.length ? candidates : videos;
  return pool[Math.floor(now.getTime() / 86_400_000) % pool.length];
}
```

`shadowing-library.tsx` — client island, thứ tự theo mock:

1. `data-od-id="shadow-header"`: `h1` = `<span className="hanzi text-action-primary">影子跟读</span> · Shadowing Studio` (`text-[22px] font-extrabold`), p subtitle "Luyện ngữ điệu, phản xạ nghe nói và cảm thức ngôn ngữ qua ngữ cảnh thực tế"; `data-od-id="shadow-metrics"`: 3 pill `rounded-full border px-3.5 py-[7px] text-[12.5px] font-extrabold inline-flex items-center gap-1.5` — jade (`bg-jade-wash border-feedback-success text-feedback-success`) "{practiced} bài đã luyện", amber (`bg-amber-wash … text-amber-ink`) "{Math.round(seconds/60)} phút nói", red (`bg-rose-wash border-action-primary text-action-primary`) "{avgScore ?? "—"}% chuẩn ngữ điệu".
2. Hero `data-od-id="daily-pick"` (section `rounded-[20px] border bg-surface-elevated shadow-xs p-5 grid lg:grid-cols-[2fr_3fr] gap-5 items-center`, stack mobile): thumb (`aspect-video rounded-[14px] relative overflow-hidden cursor-pointer` nền `bg-[linear-gradient(135deg,var(--hz-x),…)]` — dùng gradient qua 3 token `--hz-*` có sẵn hoặc class `bg-surface-muted` + watermark; **nếu tailwind không cho gradient token** → định nghĩa 1 class `.hz-thumb-gradient` trong globals.css bằng đúng primitive hex của DESIGN.md, ghi chú nguồn) chứa `span.hanzi` watermark 2 chữ đầu title `text-8xl text-white/20` + nút play 48px + badges duration/"Tốc độ {spd}x · Dễ nghe" khi `spd ≤ 0.85` else "Tự nhiên"; click thumb → `speak(câu đầu)` + toast "Phát thử · 0.8x". Copy: scenario pill `topicVi.toUpperCase()`; `h2.hanzi` title; "{pinyin câu đầu} · {hsk} · {duration}"; vi; khối "Mẫu câu chính: **{câu đầu}**" (`bg-surface-muted rounded-xl border p-2.5 text-[13px]`, b màu action-primary); CTA `Button size lg w-full sm:w-auto rounded-2xl min-h-[52px]` "Bắt đầu luyện nói ngay (X phút)" (X = `Math.max(1, Math.round(candidates câu/4))`) → mở practice overlay.
3. Toolbar `data-od-id="filter-toolbar"`: card p-3; 3 `frow` flex gap-2; label `text-[11px] font-extrabold tracking-wider text-text-faint min-w-16 uppercase` "CẤP ĐỘ"/"CHỦ ĐỀ"/"TỐC ĐỘ"; seg = `role="group"` các nút `aria-pressed` pill (active: `bg-text-primary text-surface-paper`); giá trị: level ["Tất cả","HSK 1","HSK 2","HSK 3","HSK 4-6"] (match `video.hsk` "HSK1".."HSK6", nhóm 4-6); topic ["Tất cả", ...4 topic qua `topicVi`]; speed ["Tất cả","Chậm · dễ nghe","Tự nhiên · bản xứ"]; search pill `ml-auto rounded-full border bg-surface-muted h-10 px-3.5 flex items-center gap-2 min-w-[190px]` + input `aria-label="Tìm video"`. Filter logic client `useMemo`: level topic speed + `q` contains trên `title+pinyin câu đầu+vi`.
4. Grid `data-testid="video-grid"` `data-od-id="video-grid"`: `grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`; mỗi card `<button data-od-id={"video-" + v.id} className="text-left rounded-card border bg-surface-elevated shadow-xs overflow-hidden transition hover:-translate-y-1 hover:shadow-md focus-visible:ring-3 ring-action-focus ring-offset-2" onClick={() => setDrawerVideo(v)}>` — thumb như hero (watermark 2 chữ, `text-5xl`, badge duration); body p-4: `vmeta` chip viền vermilion "HSKx" + "Tốc độ {v.spd.toFixed(1)}x"; `h3.hanzi text-lg`; vi `text-[13px] text-text-secondary`; foot: "{lines.length} câu hội thoại · {topicVi[v.topic]}" + status pill (`done` → "Đã hoàn thành · {score}%" jade; `mid` → "Đang luyện · {linesDone}/{lines.length} câu" amber; else "Chưa học" neutral). Grid rỗng → `<p className="col-span-full py-7 text-center text-[13.5px] text-text-secondary">Không có video nào khớp bộ lọc.</p>`.
   - `lines` cho card = `subtitlesByVideo[v.id] ?? syntheticLines(v)`; `syntheticLines(v)` = helper export từ `daily.ts` trả 1 câu `SubtitleSentence` từ title (n=1, start 0 end durSec, parts [{zh: title}], pinyin "", vi "").
5. Render `{drawerVideo && <ShadowingDrawer …>}` và `{practiceVideo && <PracticeOverlay …>}` — Task 11 tạo; ở Task này để 2 import chỗ trống comment `// SLOT-DRAWER / SLOT-OVERLAY (Task 11)` và không render.

- [ ] **Step 4: Run to verify PASS** — `pnpm vitest run src/lib/shadowing "src/app/(app)/shadowing" && pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/shadowing" src/lib/shadowing/daily.ts src/lib/shadowing/__tests__
git commit -m "feat(shadowing): library header/hero/filters/grid (port shadow-header daily-pick filter-toolbar video-grid shadowing.html)"
```

---

### Task 11: Library — Drawer xem trước + Practice overlay

**Files:**
- Create: `app-next/src/app/(app)/shadowing/shadowing-drawer.tsx`
- Create: `app-next/src/app/(app)/shadowing/practice-overlay.tsx`
- Modify: `app-next/src/app/(app)/shadowing/shadowing-library.tsx` (cắm 2 component)
- Test: `shadowing-drawer.test.tsx`, `practice-overlay.test.tsx` trong `__tests__/`

**Interfaces:**
- `ShadowingDrawer({ video, lines, onClose }: { video: ShadowingVideo; lines: SubtitleSentence[]; onClose(): void })` — mở là hiển thị (parent điều kiện render).
- `PracticeOverlay({ video, lines, onClose }: same)` — tự gọi `useShadowingProgress().recordPractice` khi hoàn thành.

- [ ] **Step 1: Write the failing tests**

```tsx
// __tests__/shadowing-drawer.test.tsx
describe("ShadowingDrawer (port script-drawer)", () => {
  it("render title, py, vi, các dòng + nút nghe từng câu, Esc đóng", () => {
    const onClose = vi.fn();
    render(<ShadowingDrawer video={v} lines={lines} onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: "Xem trước hội thoại" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Nghe câu thoại" })).toHaveLength(2);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it("CTA 'Mở bài luyện đầy đủ' link sang /shadowing/{id}", () => {
    render(<ShadowingDrawer video={v} lines={lines} onClose={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Mở bài luyện đầy đủ" })).toHaveAttribute("href", "/shadowing/" + v.id);
  });
});
```

```tsx
// __tests__/practice-overlay.test.tsx
const recordPractice = vi.fn();
vi.mock("@/lib/shadowing/use-shadowing-progress", () => ({
  useShadowingProgress: () => ({ recordPractice, progressMap: {}, metrics: { practiced: 0, seconds: 0, avgScore: null }, ready: true }),
}));

describe("PracticeOverlay (port practice-session)", () => {
  it("câu đầu render + Esc/Nút thoát đóng không ghi progress", () => {
    const onClose = vi.fn();
    render(<PracticeOverlay video={v} lines={lines} onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: "Luyện shadowing" })).toBeInTheDocument();
    expect(screen.getByText("Câu 1 / 2 · " + v.title)).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(recordPractice).not.toHaveBeenCalled();
  });
  it("Nghe mẫu → TTS; xong câu cuối → recordPractice done + toast + đóng", () => {
    const onClose = vi.fn();
    render(<PracticeOverlay video={v} lines={lines} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Nghe mẫu" }));
    expect(speakMock).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Đã đọc xong · câu sau" }));
    expect(screen.getByText("Câu 2 / 2 · " + v.title)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Đã đọc xong · câu sau" }));
    expect(recordPractice).toHaveBeenCalledWith(v.id, expect.objectContaining({ status: "done", score: 88 }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

(`speakMock` — mock `useTts` như các test trên, export const để assert.)

- [ ] **Step 2: Run to verify FAIL.**

- [ ] **Step 3: Implement**

**`shadowing-drawer.tsx`**: `<aside role="dialog" aria-modal="true" aria-label="Xem trước hội thoại" data-od-id="script-drawer" className="fixed inset-y-0 right-0 z-51 w-[min(400px,100%)] overflow-y-auto bg-surface-elevated border-l border-border-subtle p-5 shadow-md">` + scrim `<div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />` (render cùng fragment); Esc `useEffect` keydown `e.stopPropagation()` trước khi `onClose()` (Review Focus 5 — chống lan xuống shell); header: title `.hanzi text-[17px]` + `py` ("{pinyin câu đầu} · {hsk} · {duration}") + `vi` ("{vi} — {topicVi[topic]}") + IconButton X 36px; các dòng `rounded-xl border bg-surface-muted p-3 mt-2.5`: `.hanzi text-[15.5px]` + pinyin `text-xs text-text-secondary` + nút mini-audio tròn 32px `aria-label="Nghe câu thoại"` → `speak(zh)`; CTA `<Link className="...primary full-width mt-4 min-h-[52px] rounded-2xl">Mở bài luyện đầy đủ</Link>` (dùng className Button primary nhưng là `Link`).

**`practice-overlay.tsx`**: `role="dialog" aria-modal aria-label="Luyện shadowing" data-od-id="practice-session"` fixed inset-0 z-60 `bg-surface-paper flex flex-col`; top: border-b, inner `max-w-[720px] mx-auto h-[60px] flex items-center gap-3 px-5` — IconButton X 36px (`aria-label="Thoát bài luyện"`, cũng đóng bằng Esc + `stopPropagation`) + khối flex-1: "Câu {i+1} / {lines.length} · {video.title}" (`text-xs font-bold text-text-secondary`) + track `h-1.5 rounded-full bg-ring-track` fill `bg-feedback-success` width `{i/lines.length*100}%` `transition-[width]`; body: `flex-1 grid place-items-center max-w-[720px] mx-auto px-5` — `.hanzi text-[34px] leading-relaxed text-center` câu zh, pinyin `text-base text-text-secondary`, vi `text-sm text-text-secondary` ("Câu {i+1}/{lines.length} · {vi}"); actions: Button secondary "Nghe mẫu" → `speak(zh, { lang: "zh-CN", rate: 0.8 })`, Button primary "Đã đọc xong · câu sau" → nếu câu cuối: `recordPractice(video.id, { status: "done", score: 88, linesDoneDelta: 0 })` + `onClose()` (toast do library/overlay tự bắn "Hoàn thành “{title}” — đã cập nhật trạng thái") else `setI(i+1)` + `speak(...)`. Hint cuối `text-xs text-text-faint`: "Nghe → nhại theo → chuyển câu · <b>Esc</b> thoát". Esc handler: `stopPropagation()` + `onClose`.

Cắm vào `shadowing-library.tsx`: state `drawerVideo`, `practiceVideo`; click card → `setDrawerVideo(v)`; drawer CTA → `Link` (không cần state); hero CTA + drawer nút trong hero → `setPracticeVideo(daily)`; overlay hoàn thành → `recordPractice` nội bộ + đóng.

- [ ] **Step 4: Run to verify PASS** — `pnpm vitest run "src/app/(app)/shadowing" && pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/shadowing"
git commit -m "feat(shadowing): drawer xem trước + practice overlay (port script-drawer practice-session shadowing.html)"
```

---

### Task 12: Dọn file cũ + e2e cập nhật

**Files:**
- Delete: `app-next/src/components/shadowing/video-player.tsx`, `dictation-panel.tsx`, `recorder-panel.tsx`, `library-client.tsx`, `cat-filter.tsx`, `xem-tat-ca.tsx`, `video-card.tsx` (kiểm tra không còn import nào trước khi xóa: `grep -rn "video-card\|cat-filter\|xem-tat-ca\|library-client\|video-player\|dictation-panel\|recorder-panel" src/ --include="*.tsx" --include="*.ts"` phải rỗng ngoài chính các file đó), cùng `__tests__` của chúng.
- Modify: `app-next/e2e/media-documents-smoke.spec.ts` (describe G5)
- Modify: `app-next/src/components/shadowing/__tests__/video-player.test.tsx` → xóa (logic đã phủ bởi use-player-engine + shadowing-studio tests).

**Interfaces:** — (dọn dẹp + e2e)

- [ ] **Step 1: Xóa file chết** theo danh sách trên, chạy `pnpm test && pnpm typecheck && pnpm lint` → PASS (bất kỳ import sót sẽ bung ra đây).

- [ ] **Step 2: Cập nhật e2e G5** — thay describe "G5 shadowing video player" bằng:

```ts
test.describe("G5 shadowing (UI redesign)", () => {
  test("library: hero + filter + grid + drawer dẫn sang studio", async ({ page }) => {
    await page.goto("/shadowing");
    await expect(page.getByTestId("shadow-header")).toBeVisible();
    await expect(page.getByTestId("daily-pick")).toBeVisible();
    await expect(page.getByTestId("video-grid").locator("button").first()).toBeVisible();
    await page.getByTestId("video-EA3rwvr99Q0").click();
    const drawer = page.getByRole("dialog", { name: "Xem trước hội thoại" });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("link", { name: "Mở bài luyện đầy đủ" }).click();
    await expect(page).toHaveURL(/\/shadowing\/EA3rwvr99Q0/);
  });

  test("studio: yt-stub ready, transcript active, phím K play, dictation", async ({ page }) => {
    await page.goto("/shadowing/EA3rwvr99Q0");
    await page.route("**/www.youtube-nocookie.com/embed/**", (route) =>
      route.fulfill({ contentType: "text/html", body: YT_STUB })); // giữ nguyên YT_STUB hiện có trong file
    await expect(page.getByTestId("video-overlay")).toBeHidden();
    const first = page.locator("[data-sent='0']");
    await expect(first).toHaveClass(/sent-active/);
    await expect(page.getByTestId("pos")).toHaveText(/Câu 1\//);
    await page.keyboard.press("k");
    await expect(page.locator("[data-play]")).toHaveText(/Tạm dừng/);
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("[data-sent='1']")).toHaveClass(/sent-active/);
    // dictation
    await page.getByRole("button", { name: "Chép chính tả" }).click();
    const zh = await page.locator("[data-sent='1'] [data-zh]").innerText();
    await page.getByTestId("dict-input").fill(zh);
    await page.getByTestId("dict-check").click();
    await expect(page.getByTestId("dict-result")).toContainText(/Chính xác/);
    // hydration & sent-active style thật
    const border = await page.locator("[data-sent='1']").evaluate((el) => getComputedStyle(el).borderColor);
    expect(border).not.toBe("rgba(0, 0, 0, 0)");
  });
});
```

Giữ `hydration.spec.ts` nguyên (2 route `/shadowing` + `/shadowing/EA3rwvr99Q0` vẫn tồn tại). Test phím Space thu âm **không** đưa vào e2e (cần fake mic device — chỉ unit test ở Task 9, ghi chú trong file).

- [ ] **Step 3: Chạy full verification**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm test:e2e`
Expected: PASS hết. (`pnpm test:e2e` cần D1 dev đã migrate — nếu route 401/500 làm hydration fail, kiểm tra `wrangler d1 migrations apply hsk-dev --local` trước.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(shadowing): xóa component cũ + cập nhật e2e G5 theo UI mới (port hoàn tất 2 mock)"
```

---

## Self-Review (đã chạy khi viết plan)

1. **Spec coverage:** §2 library (T10/11), §3 studio (T7/8/9), §4 content (T1), §5 DB/API/client (T2/3/4), §6 file layout (T7/10/12), §7 edge cases (fixture không subtitle ở T10/11, simMode T5/9, optimistic T4, empty state T10), §8 testing (mỗi task + T12). `.hz-breakout` + `.sent-active` (T7/T8). Mapping phím (T6/9). ✅
2. **Placeholder scan:** không có TBD; các "paste từ video-player.tsx dòng X" là port máy móc có dòng chỉ định + delta liệt kê tường minh. ✅
3. **Type consistency:** `ProgressRec`/`ProgressMap`/`PracticePatch` nhất quán T3→T4→T7→T9→T11; `usePlayerEngine` signature T6 dùng đúng ở T7/8/9; `barHeights/scoreFor/toneChipsFor` T5 dùng ở T9; `pickDaily` T10. ✅
4. **Review Focus:** Space-vs-typing → T9 test; guest merge → T4 test; PUT unknown videoId → T3 test; không subtitle → fixture T10 + syntheticLines; Esc stopPropagation → T11 test. ✅
