# Static-first W1 — Tách API layer + Worker entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **LUẬT ORCHESTRATOR: agent KHÔNG tự `git commit` — dừng trước bước Commit, báo kết quả verify; orchestrator chạy lại test rồi commit.**

**Goal:** 21 API route có logic dùng chung trong `src/server/api/*` + worker entry (`src/worker/`) chạy được độc lập — prod vẫn deploy OpenNext như cũ (zero risk).

**Architecture:** Handler thuần `(req: Request, params) => Promise<Response>` dùng chung Next dev (thin wrapper) và Worker entry (router tự viết, KHÔNG thêm Hono). Env qua `getEnv()` thay `getCloudflareContext()` ở đúng 3 chỗ lib (auth, db, + wrapper dùng env trực tiếp).

**Tech Stack:** TypeScript strict, Vitest, wrangler (bundle worker bằng esbuild nội bộ), `@cloudflare/workers-types` (type-only).

**Spec:** `docs/superpowers/specs/2026-10-31-static-first-api-worker-design.md` §3, §4 W1, §5

## Global Constraints

- Branch `static-first-refactor`; lệnh từ `app-next/`; pnpm.
- Handler KHÔNG import `next/server` (NextResponse/NextRequest) — chỉ dùng `Request`/`Response` global.
- Giữ `export const dynamic = "force-dynamic"` trong mọi Next route wrapper (chặn Next optimize GET tĩnh lúc build).
- Không đổi behavior/response shape của bất kỳ API nào (e2e + client phụ thuộc).
- Typecheck/lint/test phải xanh sau mỗi task.

---

### Task 1: Env accessor + refactor auth.ts / db/index.ts

**Files:**
- Create: `app-next/src/lib/env.ts`
- Create: `app-next/src/lib/__tests__/env.test.ts`
- Modify: `app-next/src/lib/auth.ts:1,14` — đổi import + dòng lấy env
- Modify: `app-next/src/lib/db/index.ts:1,20` — đổi import + dòng lấy env

**Interfaces:**
- Produces: `setWorkerEnv(env: WorkerEnv): void`, `getEnv(): WorkerEnv`, `resetWorkerEnvForTest(): void`, `type WorkerEnv` (trong `@/lib/env`).

- [ ] **Step 1: Thêm devDep** — Run: `pnpm add -D @cloudflare/workers-types` (chỉ để type-only import D1Database; không thêm vào tsconfig `types` — tránh xung đột DOM).

- [ ] **Step 2: Viết test fail**

```ts
// src/lib/__tests__/env.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { setWorkerEnv, getEnv, resetWorkerEnvForTest } from "@/lib/env";

describe("getEnv", () => {
  beforeEach(() => resetWorkerEnvForTest());

  it("trả về env set bởi worker entry (prod)", () => {
    setWorkerEnv({ DB: {} as never });
    expect(getEnv()).toEqual({ DB: {} });
  });

  it("reset xong throw vì không còn worker env và không có Cloudflare context", () => {
    expect(() => getEnv()).toThrow();
  });
});
```

Run: `pnpm vitest run src/lib/__tests__/env.test.ts` → FAIL (module chưa có).

- [ ] **Step 3: Implement `src/lib/env.ts`**

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

/* Env của Worker. Prod: worker entry set qua setWorkerEnv(env) đúng 1 lần ở đầu
   fetch handler. Dev (`next dev`): fallback getCloudflareContext() — plugin dev
   của OpenNext cung cấp bindings qua wrangler.dev.jsonc (initOpenNextCloudflareForDev
   trong next.config.ts, guard NODE_ENV === "development"). */

export interface WorkerEnv {
  DB?: D1Database;
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
  BETTER_AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  AI_UPSTREAM_URL?: string;
  AI_UPSTREAM_KEY?: string;
  CONTENT_LLM_BASE_URL?: string;
  CONTENT_LLM_KEY?: string;
  CONTENT_LLM_MODEL?: string;
  DEV_LOGIN_SECRET?: string;
  [key: string]: unknown;
}

let workerEnv: WorkerEnv | null = null;

export function setWorkerEnv(env: WorkerEnv): void {
  workerEnv = env;
}

export function resetWorkerEnvForTest(): void {
  workerEnv = null;
}

export function getEnv(): WorkerEnv {
  if (workerEnv) return workerEnv;
  const { env } = getCloudflareContext();
  return env as WorkerEnv;
}
```

- [ ] **Step 4: Sửa 2 call site** (giữ comment gốc, chỉ đổi nguồn env):
  - `auth.ts:14`: `const { env } = getCloudflareContext();` → `const env = getEnv();` (+ import `getEnv` thay `getCloudflareContext`).
  - `db/index.ts:20`: `const { env } = getCloudflareContext();` → `const env = getEnv();` (+ import tương tự; comment cache globalThis giữ nguyên).

- [ ] **Step 5: Verify** — Run: `pnpm vitest run src/lib/__tests__/env.test.ts src/lib/store src/app/api/v1/sync` rồi `pnpm typecheck && pnpm lint && pnpm test`. Expected: PASS toàn bộ (1678+).

- [ ] **Step 6: (orchestrator) Commit** — `refactor(env): getEnv() accessor — worker env prod, CloudflareContext dev`

---

### Task 2: json helper + Worker entry + router + wrangler.api.jsonc

**Files:**
- Create: `app-next/src/server/api/json.ts`
- Create: `app-next/src/worker/router.ts`
- Create: `app-next/src/worker/index.ts`
- Create: `app-next/wrangler.api.jsonc` (dev/debug worker độc lập)
- Create: `app-next/src/worker/__tests__/router.test.ts`

**Interfaces:**
- Produces:
  - `json(data: unknown, init?: { status?: number; headers?: Record<string,string> }): Response`
  - `type ApiHandler = (req: Request, params: Record<string,string>) => Promise<Response> | Response`
  - `class Router { get/all/post/put/patch/delete(pattern, handler); handle(req: Request): Promise<Response> }`
  - `buildRouter(): Router` — mount trống lúc này, Task 3–5 lấp dần.

- [ ] **Step 1: Viết test fail** (`src/worker/__tests__/router.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { Router } from "@/worker/router";
import { json } from "@/server/api/json";

const req = (path: string, method = "GET") =>
  new Request(`http://x.test${path}`, { method });

describe("Router", () => {
  it("route exact", async () => {
    const r = new Router();
    r.get("/api/v1/content/vocab", () => json({ ok: 1 }));
    const res = await r.handle(req("/api/v1/content/vocab"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: 1 });
  });

  it("route :param + method khác nhau", async () => {
    const r = new Router();
    r.get("/api/v1/notebook/entries/:id", (_q, p) => json({ id: p.id }));
    r.delete("/api/v1/notebook/entries/:id", () => json({ deleted: true }));
    expect(((await r.handle(req("/api/v1/notebook/entries/abc"))) as Response).status).toBe(200);
    expect(await (await r.handle(req("/api/v1/notebook/entries/abc", "DELETE"))).json())
      .toEqual({ deleted: true });
  });

  it("wildcard cuối * (auth catch-all) + decodeURIComponent param", async () => {
    const r = new Router();
    r.all("/api/v1/auth/*", () => json({ auth: true }));
    const res = await r.handle(req("/api/v1/auth/get-session"));
    expect(res.status).toBe(200);
  });

  it("404 JSON cho path không khớp, 500 khi handler throw", async () => {
    const r = new Router();
    r.get("/boom", () => { throw new Error("x"); });
    expect((await r.handle(req("/nope"))).status).toBe(404);
    expect((await r.handle(req("/boom"))).status).toBe(500);
  });
});
```

Run: `pnpm vitest run src/worker/__tests__/router.test.ts` → FAIL.

- [ ] **Step 2: Implement `src/server/api/json.ts`**

```ts
export function json(
  data: unknown,
  init?: { status?: number; headers?: Record<string, string> }
): Response {
  return new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    headers: { "content-type": "application/json; charset=utf-8", ...(init?.headers ?? {}) },
  });
}
```

- [ ] **Step 3: Implement `src/worker/router.ts`**

```ts
import { json } from "@/server/api/json";

export type ApiHandler = (req: Request, params: Record<string, string>) => Promise<Response> | Response;

interface Route { method: string; segments: string[]; handler: ApiHandler }

function compile(pattern: string): string[] {
  return pattern.split("/").filter(Boolean);
}

function match(pattern: string[], segs: string[]): Record<string, string> | null {
  const wildcard = pattern[pattern.length - 1] === "*";
  if (wildcard ? segs.length < pattern.length - 1 : segs.length !== pattern.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i];
    if (p === "*") return params;
    const s = segs[i];
    if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(s);
    else if (p !== s) return null;
  }
  return params;
}

export class Router {
  private routes: Route[] = [];

  private add(method: string, pattern: string, handler: ApiHandler): void {
    this.routes.push({ method, segments: compile(pattern), handler });
  }
  get(p: string, h: ApiHandler) { this.add("GET", p, h); return this; }
  post(p: string, h: ApiHandler) { this.add("POST", p, h); return this; }
  put(p: string, h: ApiHandler) { this.add("PUT", p, h); return this; }
  patch(p: string, h: ApiHandler) { this.add("PATCH", p, h); return this; }
  delete(p: string, h: ApiHandler) { this.add("DELETE", p, h); return this; }
  all(p: string, h: ApiHandler) { this.add("*", p, h); return this; }

  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const segs = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    for (const r of this.routes) {
      if (r.method !== "*" && r.method !== req.method) continue;
      const params = match(r.segments, segs);
      if (params) {
        try {
          return await r.handler(req, params);
        } catch (err) {
          console.error("[worker]", url.pathname, err);
          return json({ error: "Lỗi máy chủ" }, { status: 500 });
        }
      }
    }
    return json({ error: "not found" }, { status: 404 });
  }
}
```

- [ ] **Step 4: Implement `src/worker/index.ts` + `src/worker/router.ts` (buildRouter)**

```ts
// src/worker/index.ts
import { setWorkerEnv } from "@/lib/env";
import type { WorkerEnv } from "@/lib/env";
import { buildRouter } from "./router";

const router = buildRouter();

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    setWorkerEnv(env);
    return router.handle(request);
  },
};
```

Thêm vào cuối `router.ts` (mount rỗng, Task 3–5 thêm):

```ts
export function buildRouter(): Router {
  const r = new Router();
  return r;
}
```

- [ ] **Step 5: `wrangler.api.jsonc`** (debug worker độc lập, không assets)

```jsonc
{
  // Worker API thuần — dev/debug bằng `pnpm wrangler dev -c wrangler.api.jsonc`.
  // KHÔNG dùng khi deploy prod (wrangler.jsonc mới là config deploy).
  "name": "byehsk-api-dev",
  "main": "src/worker/index.ts",
  "compatibility_date": "2026-09-01",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "hsk-dev",
      "database_id": "51aed180-9bd9-4933-b9ef-119036063f7c",
      "migrations_dir": "drizzle"
    }
  ]
}
```

- [ ] **Step 6: Verify** — `pnpm vitest run src/worker && pnpm typecheck && pnpm lint`. Smoke (nếu env cho phép): `pnpm wrangler dev -c wrangler.api.jsonc` → `curl localhost:8787/api/v1/anything` trả 404 JSON → Ctrl-C.

- [ ] **Step 7: (orchestrator) Commit** — `feat(worker): worker entry + router + json helper (mount rỗng)`

---

### Task 3: Extract 6 content routes → `src/server/api/content.ts`

**Files:**
- Create: `app-next/src/server/api/content.ts`
- Modify (thin wrappers, giữ `export const dynamic = "force-dynamic"`):
  - `src/app/api/v1/content/vocab/route.ts`
  - `src/app/api/v1/content/vocab-meta/route.ts`
  - `src/app/api/v1/content/vocab-lesson/route.ts`
  - `src/app/api/v1/content/grammar/route.ts`
  - `src/app/api/v1/content/shadowing/route.ts`
  - `src/app/api/v1/content/readings/route.ts`

**Interfaces:**
- Produces (export từ `content.ts`): `handleContentVocab`, `handleContentVocabMeta`, `handleContentVocabLesson`, `handleContentGrammar`, `handleContentShadowing`, `handleContentReadings` — đều `(req: Request, params?: Record<string,string>) => Promise<Response>`, signature cache-control giữ nguyên.

- [ ] **Step 1: Worked example — `handleContentVocab`**

```ts
// src/server/api/content.ts
import { getVocab } from "@/lib/content/vocab";
import { json } from "./json";

/* Content dataset đọc hiếm/ghi hiếm — cache CDN 1h, stale 1 ngày. */
const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export async function handleContentVocab(): Promise<Response> {
  try {
    return json(await getVocab(), { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error("[api/v1/content/vocab]", err);
    return json({ error: "Không đọc được dữ liệu từ vựng" }, { status: 500 });
  }
}
```

```ts
// src/app/api/v1/content/vocab/route.ts (wrapper thay toàn bộ file cũ)
import { handleContentVocab } from "@/server/api/content";

export const dynamic = "force-dynamic";

export const GET = () => handleContentVocab();
```

- [ ] **Step 2: 5 route còn lại** — di chuyển logic y nguyên từ file cũ vào `content.ts` (đổi `NextResponse.json(x, {status, headers})` → `json(x, {status, headers})`; `NextRequest` → `Request`; `await req.json().catch(() => null)` giữ nguyên). Route `vocab-lesson` nhận query `book`/`page` — đọc qua `new URL(req.url).searchParams` (KHÔNG qua `req.nextUrl`). Shadowing Task W2 sẽ thêm filter `?video=` — không làm trước (YAGNI).

- [ ] **Step 3: Verify** — Run: `pnpm test` (test route cũ import `route.ts` → wrapper → handler vẫn pass). Thêm test mới cho handler content vocab (mock `@/lib/content/vocab` — assert Cache-Control header + error 500 path) trong `src/server/api/__tests__/content.test.ts`. Rồi `pnpm typecheck && pnpm lint`.

- [ ] **Step 4: (orchestrator) Commit** — `refactor(api): extract content routes sang server/api/content.ts`

---

### Task 4: Extract auth mount + dev-login + /api/ai

**Files:**
- Create: `app-next/src/server/api/auth.ts` (dev-login handler)
- Create: `app-next/src/server/api/ai.ts`
- Modify: `src/app/api/v1/auth/dev-login/route.ts`, `src/app/api/ai/route.ts` (wrappers)

**Interfaces:**
- Produces: `handleDevLogin(req: Request): Promise<Response>`, `handleAi(req: Request): Promise<Response>`. better-auth mount KHÔNG extract — router gọi trực tiếp `getAuth().handler(req)`.

- [ ] **Step 1:** Chuyển logic dev-login + ai sang handler (ai route: giữ nguyên toàn bộ rate-limit buckets, SYSTEM_PROMPT, bodySchema — chỉ đổi NextResponse → json, NextRequest → Request). `getCloudflareContext()` trong 2 file cũ → `getEnv()` (Task 1 đã có).
- [ ] **Step 2:** Wrappers giữ `export const dynamic = "force-dynamic"` + `export const POST = (req: Request) => handleX(req);` (dev-login + ai; ai có cả GET? đọc file cũ — giữ đủ method).
- [ ] **Step 3: Verify** — `pnpm test` (test ai route hiện có phải pass qua wrapper) + `pnpm typecheck && pnpm lint`.
- [ ] **Step 4: (orchestrator) Commit** — `refactor(api): extract dev-login + ai sang server/api`

---

### Task 5: Extract user-data routes (sync, notebook, shadowing-progress, battle, exam, reading×4)

**Files:**
- Create: `src/server/api/sync.ts`, `notebook.ts`, `shadowing-progress.ts`, `battle.ts`, `exam.ts`, `reading.ts`
- Modify 12 wrapper route files (sync; notebook/entries + entries/[id]; shadowing/progress + progress/[videoId]; battle/attempts + battle/leaderboard; exam/results; reading/drafts + drafts/[id] + generate + quota)

**Interfaces:**
- Produces: `handleSync`, `handleNotebookEntriesGet/Post`, `handleNotebookEntryPatch/Delete(req, {id})`, `handleShadowingProgressGet/Put`, `handleShadowingProgressVideo(req, {videoId})`, `handleBattleAttempts/Leaderboard`, `handleExamResults`, `handleReadingDraftsGet/Post`, `handleReadingDraft(req, {id})`, `handleReadingGenerate`, `handleReadingQuota`.

- [ ] **Step 1:** Di chuyển logic 12 route theo cùng pattern Task 3 (đổi NextResponse→json, NextRequest→Request). Route có `[id]`/`[videoId]`: handler nhận `params` thứ 2; wrapper:
  ```ts
  export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return handleNotebookEntryDelete(req, { id });
  }
  ```
- [ ] **Step 2:** Thêm mount vào `buildRouter()` (src/worker/router.ts) — 21 route theo bảng §5 spec: auth `r.all("/api/v1/auth/*", (req) => getAuth().handler(req))`, dev-login, ai, 6 content, sync, notebook ×3 method trên 2 pattern, shadowing ×3, battle ×2, exam, reading ×5.
- [ ] **Step 3: Verify** — `pnpm test` (toàn bộ, test route cũ qua wrapper phải xanh) + `pnpm typecheck` + `pnpm lint` + smoke `pnpm wrangler dev -c wrangler.api.jsonc` → `curl -s localhost:8787/api/v1/content/vocab | head -c 200` trả JSON vocab (DB hsk-dev local có seed).
- [ ] **Step 4: (orchestrator) Commit** — `refactor(api): extract 12 user-data routes + full router mount`
