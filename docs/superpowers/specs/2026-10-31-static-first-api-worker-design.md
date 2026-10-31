# Static-first refactor — 1 Worker (assets + API script) cho Workers Free plan

- Ngày: 2026-10-31
- Trạng thái: **spec chi tiết — owner đã duyệt hướng "giữ Free + full refactor" (2026-10-31), chờ review spec rồi mới viết plan**
- Tiền đề: `2026-10-30-workers-free-1102-static-first-design.md` (phân tích root cause 1102, đã sửa các điểm lệch sau merge PR #25)
- Phạm vi branch làm việc: nhánh mới từ `main` sau khi merge `workers-free-1102-analysis`

## 1. Mục tiêu

Loại bỏ Error 1102 (`exceededCpu`, ngưỡng 10 ms Workers Free) về ~0, không đổi URL/origin:

- ~87 trang prerendered + toàn bộ RSC prefetch `?_rsc` + static chunks + audio → **asset hit** (không invoke Worker, 0 ms CPU, 0 quota, free unlimited).
- Chỉ `/api/*` (21 route) chạy trong script Worker nhỏ (không chứa Next bundle) → cold start vài ms, CPU/dưới 10 ms.
- Bounded dynamic pages còn lại (nếu chưa kịp convert) đi qua Worker qua glob allowlist — tỉ lệ nhỏ, giảm dần theo W2.

Non-goal: đổi URL, đổi auth flow, đổi D1 schema, đổi UI.

## 2. Quyết định cấu trúc — 1 Worker, KHÔNG tách project

**Tách API worker riêng là không khả thi trên workers.dev**: `routes` pattern chỉ áp dụng cho custom domain; `*.workers.dev` luôn serve worker ở root → API worker riêng sẽ có hostname khác → CORS + phải đổi Google OAuth redirect URI + cookie cross-origin. Bị loại.

**Cấu trúc chọn: 1 worker `byehsk` giữ nguyên tên/URL, 2 vai trò:**

```jsonc
// wrangler.jsonc (đích đến, W3)
{
  "name": "byehsk",
  "main": "src/worker/index.ts",            // script = chỉ code API
  "compatibility_date": "2026-09-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "out",                      // toàn bộ HTML/JS/audio prerendered của next build
    "binding": "ASSETS",
    "not_found_handling": "404-page",        // serve out/404.html với status 404
    "run_worker_first": ["/api/*"]           // /api/* → script; còn lại → asset
  },
  "d1_databases": [ /* giữ nguyên DB hsk */ ],
  "observability": { "enabled": true }       // G0 — chống CI reset
}
```

- Cùng origin `byehsk.softtip88.workers.dev` → cookie better-auth (basePath `/api/v1/auth`), Google redirect URI, `BETTER_AUTH_URL` **không đổi gì**.
- Static assets hỗ trợ tự động `/foo` → `foo.html` (`html_handling: "auto-trailing-slash"` mặc định) → prerendered HTML serve đúng.

## 3. Kiến trúc đích

```
                ┌─ /api/* ──────────────► Worker script (src/worker/index.ts)
User request ───┤                          ├─ router (Hono) map 21 route → handlers
                │                          ├─ src/lib/auth.ts (better-auth) — env qua getEnv()
                │                          └─ D1 binding DB + secrets (getEnv())
                │
                └─ mọi path khác ────────► Static Assets (out/)
                                           ├─ HTML prerendered, /_next/static/*, /audio/*, /kokoro/vendor/*
                                           ├─ _headers  (Referrer-Policy, cache-control)
                                           └─ _redirects (backward-compat path đổi)
```

### 3.1 Tầng code mới

| Thành phần | Vị trí | Vai trò |
|---|---|---|
| Worker entry | `src/worker/index.ts` | export default `fetch(request, env, ctx)` → set `setWorkerEnv(env)` → router |
| Router | `src/worker/router.ts` | Hono: mount `/api/v1/auth/*` → better-auth handler; map 21 route → shared handlers; 404 JSON cho `/api/*` còn lại |
| Shared API handlers | `src/server/api/*.ts` | logic mỗi route: `(req, ctx: ApiCtx) => Response` thuần — **dùng chung dev + prod**, không import Next |
| Env accessor | `src/lib/env.ts` | `getEnv()`: prod đọc global set bởi worker entry; dev (next dev) fallback `getCloudflareContext().env` — giữ `initOpenNextCloudflareForDev` trong `next.config.ts` chỉ khi `NODE_ENV === "development"` (như hiện tại) |
| Static headers/redirects | `public/_headers`, `public/_redirects` | Next copy vào `out/` khi export |

### 3.2 Refactor env/binding (điểm chạm duy nhất vào lib hiện có)

Hiện `getCloudflareContext()` gọi ở 5 chỗ — tất cả đổi sang `getEnv()`:

| File | Dùng env gì |
|---|---|
| `src/lib/auth.ts:14` | `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET` + `env.DB` (drizzle adapter) |
| `src/lib/db/index.ts:20` | `env.DB` → drizzle client |
| `src/app/api/ai/route.ts:65` | `AI_UPSTREAM_URL`, `AI_UPSTREAM_KEY` |
| `src/lib/server/llm.ts:19` | `CONTENT_LLM_*` |
| `src/app/api/v1/auth/dev-login/route.ts:23` | `BETTER_AUTH_SECRET`, `DEV_LOGIN_SECRET` |

`getEnv()` caching pattern giống fix globalThis đã có (memory: cold-compile transient) — set 1 lần ở worker entry, không set lại.

## 4. Refactor từng phần

### W0 — G0 quick wins (độc lập, deploy được ngay trên kiến trúc cũ)

1. `wrangler.jsonc` thêm `"observability": { "enabled": true }` — **khẩn**, hiện CI deploy mỗi lần reset về disabled → prod mù logs.
2. `prefetch={false}` cho Link dẫn tới trang ƒ (nav sidebar/bottom-nav + link heavy trong pages) — giảm burst `?_rsc` nhân isolate.
3. `Cache-Control` cho GET `/api/v1/content/*` (`public, max-age=300, s-maxage=86400` + version key theo deploy) — data bất biến theo deploy.
4. Sửa doc 1102 (§3.1 asset hit, §6.1 done, 16→21 API, bổ sung G1) + ghi memory `hsk-error-1102-cpu-free-plan`.

### W1 — Tách API layer (chưa đổi prod build)

Mục tiêu: 21 route có handler dùng chung, worker entry chạy được, **prod vẫn deploy OpenNext như cũ** (zero risk prod).

1. Cài `hono` (hoặc viết router tối thiểu ~80 dòng — quyết định lúc plan; khuyến nghị Hono vì chuẩn trên Workers).
2. Extract logic 21 route sang `src/server/api/*` theo bảng §5; Next route files trở thành **thin wrapper** 5–10 dòng gọi handler (dev không đổi hành vi).
3. Viết `src/worker/index.ts` + router; thêm `wrangler.api.jsonc` (main = worker entry, không assets) để dev/debug worker độc lập qua `wrangler dev -c wrangler.api.jsonc`.
4. Unit test: handlers test trực tiếp (mock env/DB như hiện có); thêm test router mapping (mỗi path + method → handler đúng, 404 JSON).
5. CI: typecheck/lint/test không đổi.

### W2 — SSG toàn bộ trang ƒ (chuẩn bị cho export)

Inventory chính xác từ build (Explore 2026-10-31):

| Trang | Dynamic vì | Chuyển thành |
|---|---|---|
| `(wide)/pinyin` | `await searchParams` (mode, drill) | static shell; state qua client `useSearchParams` (client component đọc query không ép dynamic) |
| `(app)/shadowing` | `force-dynamic` + D1 | static; data client-fetch `/api/v1/content/shadowing` |
| `(app)/progress` | server-gate `getAuth` + redirect | static + **client-gate** (component `ClientAuthGate` dùng `useSession`, skeleton khi loading, redirect `/?login=1`) |
| `(wide)/my-vocab` | server-gate | như trên |
| `(wide)/my-grammar` | server-gate | như trên |
| `(app)/certificate-test/[level]` | D1 `getVocab` + `generateExam` | `generateStaticParams` HSK1–5; extract `generateExam` thành pure `src/lib/exam/generate.ts`, client gọi `/api/v1/content/vocab` rồi sinh đề local |
| `(app)/lesson/[book]/[page]` | D1 `getVocabLesson` | `generateStaticParams` từ vocab-meta build-time; data client qua `/api/v1/content/vocab-lesson` (route có sẵn) |
| `(app)/shadowing/[...videoId]` | D1 playlist/subtitles | `generateStaticParams` từ build manifest; data client qua `/api/v1/content/shadowing` |
| `(app)/lesson/custom/[deckId]` | client page nhưng id vô hạn → không enumerate được | **đổi route**: `/lesson/custom?deck=<id>`, client đọc query; `_redirects` 302 cũ → mới |
| `(app)/notebook/[kind]/[id]` | id vô hạn (kind hữu hạn) | giữ `/notebook/[kind]` + `generateStaticParams` kinds; `?id=` client đọc; `_redirects` 302 cũ → mới |
| `roadmap/pinyin/session/[n]` | dynamic segment | `generateStaticParams` n = 1..6 (hoặc số chặng hiện có) |

Lưu ý:

- 11 `page.tsx` import dataset `src/content/` giữ nguyên — build-time only, bundle client, static assets unlimited.
- Bỏ các `export const dynamic = "force-dynamic"` + comment getAuth ở 3 trang gated (nguyên nhân memory: getAuth sync-context không chạy lúc prerender — client-gate xử lý thay).
- Với `output: export`, route handlers không export được (W3 bật); W2 chạy `next build` thường nên chưa đụng.
- Chấp nhận đánh đổi: 3 trang gated mất server-redirect sớm (flash skeleton 1 nhịp); SEO trang gated trống — an toàn vì API vẫn check session, dữ liệu user là localStorage + rows của chính họ.

### W3 — Bật static-first prod

#### W3a — Bật asset-first trên build OpenNext hiện tại (incremental, rủi ro thấp)

Không đợi export: build OpenNext như cũ, chỉ đổi routing trong `wrangler.jsonc`:

```jsonc
"run_worker_first": ["/api/*", "/pinyin", "/shadowing", "/shadowing/*",
                     "/lesson/*", "/progress", "/my-vocab", "/my-grammar",
                     "/notebook/*", "/certificate-test/*", "/roadmap/pinyin/session/*"]
```

→ mọi path prerendered (home, reading, roadmap, hanzi, radicals, course, dictionary, review, sound-rules, privacy/terms/leaderboard…) + `_rsc` + chunks + audio thành **asset hit ngay lập tức**; Worker chỉ còn /api + 11 trang chưa convert (danh sách glob thu hẹp dần theo W2). `_headers`/`_redirects` copy vào `.open-next/assets` ở bước build (script nhỏ).

#### W3b — Export + bỏ Next bundle khỏi Worker

1. `next.config.ts`: `output: "export"` khi `process.env.EXPORT_BUILD === "1"` (build thường giữ nguyên cho dev/e2e).
2. Route handlers không export được → script `build:static`: tạm move `src/app/api` ra ngoài → `EXPORT_BUILD=1 next build` (xuất `out/`) → restore. Kiểm tra build fail nếu còn path nào không prerender (cơ chế phát hiện trang sót).
3. `wrangler.jsonc` chính thức: `main: "src/worker/index.ts"`, `assets.directory: "out"`, `run_worker_first: ["/api/*"]`, `not_found_handling: "404-page"`.
4. `public/_headers`:
   ```
   /*
     Referrer-Policy: strict-origin-when-cross-origin
   /_next/static/*
     Cache-Control: public, max-age=31536000, immutable
   ```
   (Referrer-Policy giữ cho YouTube embed error 153; Kokoro same-origin không hồi quy.)
5. Scripts mới: `build:static`, `preview` (wrangler dev serve assets + worker), `deploy` (build:static + `wrangler deploy`). **Không còn `opennextjs-cloudflare build/deploy`** — giữ dependency chỉ cho `initOpenNextCloudflareForDev` (dev bindings).
6. CI: build worker check = `pnpm build:static`; deploy main = `pnpm run deploy`.

## 5. Mapping 21 API routes → worker router

| Path (worker) | Handler module | Auth | D1 | Env | Subrequest |
|---|---|---|---|---|---|
| `ALL /api/v1/auth/*` | better-auth handler (giữ nguyên basePath) | — | user, session | BETTER_AUTH_*, GOOGLE_* | Google OAuth |
| `POST /api/v1/auth/dev-login` | `server/api/auth-dev-login.ts` | — | user, session | DEV_LOGIN_SECRET | — |
| `GET/POST /api/ai` | `server/api/ai.ts` | ✔ | — | AI_UPSTREAM_* | LLM upstream |
| `POST /api/v1/sync` | `server/api/sync.ts` | ✔ | 7 bảng progress | — | — |
| `GET/POST/DELETE /api/v1/notebook/entries`, `.../[id]` | `server/api/notebook.ts` | ✔ | notebook_entries | — | — |
| `GET /api/v1/content/{vocab,vocab-meta,vocab-lesson,grammar,shadowing,readings}` | `server/api/content.ts` (6 mount) | — | content_* | — | — |
| `GET/PUT /api/v1/shadowing/progress`, `.../[videoId]` | `server/api/shadowing-progress.ts` | ✔ | shadowing_progress | — | — |
| `GET/POST /api/v1/battle/{attempts,leaderboard}` | `server/api/battle.ts` | attempts ✔ | battle_attempts | — | — |
| `GET/POST /api/v1/exam/results` | `server/api/exam.ts` | ✔ | hsk_exam_results | — | — |
| `GET /api/v1/reading/drafts`, `GET/PATCH/DELETE .../[id]` | `server/api/reading-drafts.ts` | ✔ | reading_drafts | — | — |
| `POST /api/v1/reading/generate` | `server/api/reading-generate.ts` | ✔ | reading_usage, reading_drafts | CONTENT_LLM_* | LLM (retry ≤5) |
| `GET /api/v1/reading/quota` | `server/api/reading-quota.ts` | ✔ | reading_usage | — | — |

Quy ước handler: `(req: Request, ctx: ApiCtx) => Response | Promise<Response>` với `ApiCtx = { env: Env, db: DrizzleDb, url: URL }`; parse session bằng `getAuth().api.getSession({ headers: req.headers })` (auth.ts dùng chung).

## 6. Dev / e2e / QA

- `pnpm dev`: **không đổi** — next dev chạy đủ route (thin wrappers) + bindings qua `initOpenNextCloudflareForDev` (guard development như hiện tại). e2e Playwright :3100 giữ nguyên.
- `pnpm preview` (W3b): `build:static` + `wrangler dev` :8787 — assets + worker thật (workerd). Thêm **preview smoke**: subset e2e (login, library, lesson, sync) chạy trên :8787 trước deploy.
- QA control-browser: rerun 11/11 reading journey + journey roadmap trên preview rồi prod.
- Telemetry validation sau deploy: Workers Logs phải thấy **chỉ** `/api/*` invocation; request `/roadmap`, `/reading`, `?_rsc` **vắng mặt** (asset hit) — đây là điểm kiểm chứng cho §3.1 doc cũ.
- Rollback: tag `pre-static-first` trước W3; rollback = redeploy tag (pipeline cũ còn trong git history).

## 7. Rủi ro & kiểm soát

| Rủi ro | Kiểm soát |
|---|---|
| Route handlers làm `EXPORT_BUILD` build fail | W2 bắt buộc xong hết trang ƒ trước W3b; build:static fail = phát hiện trang sót |
| URL đổi (lesson/custom, notebook/[id]) phá deep-link/bookmark | `_redirects` 302 cũ → mới |
| Stale chunk sau deploy (hydration error) | Next chunk đã hash theo content; chỉ cần không cache HTML dài (`_headers` mặc định assets ETag); version key cho cache content API |
| Header Referrer-Policy mất khi bỏ next.config headers | `_headers` (W3b) + kiểm QA video shadowing trên prod |
| run_worker_first glob sai → trang rơi vào 404 | W3a deploy staging rồi QA từng trang trước main; glob test bằng curl matrix trong plan |
| API worker thiếu secret (AI_ROUTER_*, DEV_LOGIN_SECRET…) | checklist `wrangler secret put` trong deploy runbook; verify bằng QA sau deploy |
| Migration/seed D1 | Không đổi schema — migration hiện tại giữ nguyên; quy tắc migrate+seed remote như cũ |
| Quota requests 100k/ngày | asset hit không tính quota; chỉ /api tính → dư địa lớn |

## 8. Phân rã thành plan

1. **Plan W0** (1–2 task, không đụng kiến trúc) — deploy ngay.
2. **Plan W1** (extract API + worker entry + tests, ~6 task) — không đổi prod.
3. **Plan W2** (SSG 11 trang + client-gate + route đổi + _redirects, ~7 task) — build thường vẫn pass.
4. **Plan W3** (W3a routing switch → telemetry verify → W3b export + CI swap → prod QA + rollback tag, ~5 task).

Mỗi plan viết riêng bằng writing-plans, implement qua dispatching-parallel-agents (luật owner: mọi task qua subagent), review receiving-code-review, QA control-browser từng stage.
