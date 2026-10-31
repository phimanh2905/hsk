# Static-first W3 — Bật static-first prod Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **LUẬT ORCHESTRATOR: agent KHÔNG tự `git commit`, KHÔNG deploy, KHÔNG push — dừng trước các bước đó, báo verify; orchestrator thực hiện commit/deploy/push sau khi verify.**

**Goal:** Bật asset-first prod (W3a ngay trên build OpenNext), rồi export + bỏ Next bundle khỏi Worker (W3b), deploy và verify production.

**Architecture:** W3a = `run_worker_first` glob allowlist trên build OpenNext hiện tại. W3b = `output: export` (guard env) + wrangler.jsonc `main: src/worker/index.ts` + `assets.directory: out`.

**Tech Stack:** wrangler.jsonc, Next.js `output: "export"`, GitHub Actions CI.

**Spec:** `docs/superpowers/specs/2026-10-31-static-first-api-worker-design.md` §4 W3, §6, §7

## Global Constraints

- Branch `static-first-refactor`; deploy prod chỉ do ORCHESTRATOR thực hiện sau verify.
- Trước deploy lần đầu W3a: orchestrator tạo tag `pre-static-first` (rollback point).
- Deploy local cần auth wrangler (`wrangler login` đã có; nếu env CLOUDFLARE_API_TOKEN bị khóa IP → `env -u CLOUDFLARE_API_TOKEN pnpm run deploy`).
- Mọi deploy xong phải verify bằng curl matrix + `wrangler tail` trước khi sang bước kế.

---

### Task 1 (W3a): run_worker_first trên build OpenNext

**Files:**
- Modify: `app-next/wrangler.jsonc` — block assets thêm `run_worker_first`

- [ ] **Step 1:** Config mới của block assets:

```jsonc
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS",
    "not_found_handling": "404-page",
    "run_worker_first": [
      "/api/*",
      "/pinyin",
      "/shadowing",
      "/shadowing/*",
      "/lesson",
      "/lesson/*",
      "/progress",
      "/my-vocab",
      "/my-grammar",
      "/notebook",
      "/notebook/*",
      "/certificate-test",
      "/certificate-test/*",
      "/roadmap/pinyin/session/*"
    ]
  },
```

- [ ] **Step 2:** Guard test W0 (`wrangler-config.test.ts`) thêm assert: `assets.run_worker_first` tồn tại và gồm `"/api/*"`.
- [ ] **Step 3 (ORCHESTRATOR):** tag rollback + deploy:
  ```bash
  git tag pre-static-first && pnpm run deploy
  ```
- [ ] **Step 4 (ORCHESTRATOR): curl matrix trên https://byehsk.softtip88.workers.dev** — mỗi URL kỳ vọng:
  - `/` , `/reading`, `/roadmap`, `/hanzi`, `/radicals`, `/course`, `/dictionary`, `/review`, `/privacy`, `/terms` → 200, `content-type: text/html` (asset hit)
  - `/lesson/1/1`, `/certificate-test/1`, `/progress` → 200 (worker hoặc asset tùy trang đã SSG)
  - `/api/v1/content/vocab` → 200 JSON; `/api/v1/auth/get-session` → 200 JSON
  - `/path-khong-ton-tai` → 404 trang 404.html
- [ ] **Step 5 (ORCHESTRATOR): telemetry** — `wrangler tail byehsk --format pretty` chạy nền, đồng thời curl 5 trang prerendered: **phải KHÔNG có invocation line** cho các trang đó (asset hit); curl `/api/v1/content/vocab` phải hiện line. Ghi kết quả vào commit body.
- [ ] **Step 6:** Rollback nếu hỏng: `git checkout pre-static-first && pnpm run deploy`.

---

### Task 2 (W3b-1): Export build

**Files:**
- Modify: `app-next/next.config.ts`
- Modify: `app-next/package.json` — thêm script `build:static`

- [ ] **Step 1:** `next.config.ts`:

```ts
const isExport = process.env.EXPORT_BUILD === "1";

const nextConfig: NextConfig = {
  ...(isExport ? { output: "export" as const } : {}),
  async headers() { /* giữ nguyên — export bỏ qua, _headers thay thế */ },
  // nếu có redirects() → guard: if (isExport) return [];
};
```

- [ ] **Step 2:** Script `build:static` (trong `app-next/package.json`):

```json
"build:static": "pnpm vendor:kokoro && rm -rf .next out && node scripts/build-static.mjs"
```

Tạo `scripts/build-static.mjs`:

```js
// Tạm dời src/app/api (route handlers không export được) → next build export → trả lại.
// trap đảm bảo trả lại cả khi build fail.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync } from "node:fs";

const apiDir = "src/app/api";
const stashDir = "../.api-stash";
mkdirSync(stashDir, { recursive: true });

const restore = () => {
  if (existsSync(`${stashDir}/api`)) {
    renameSync(`${stashDir}/api`, apiDir);
    console.log("restored src/app/api");
  }
};
process.on("exit", restore);
process.on("SIGINT", () => { restore(); process.exit(130); });
process.on("SIGTERM", () => { restore(); process.exit(143); });

renameSync(apiDir, `${stashDir}/api`);
try {
  execSync("EXPORT_BUILD=1 pnpm exec next build", { stdio: "inherit", env: process.env });
} finally {
  restore();
}
```

- [ ] **Step 3:** Chạy `pnpm build:static`. Kỳ vọng `out/` có `index.html`, `404.html`, `reading.html`, `roadmap.html`, `_headers`, `_redirects`, `audio/`, `kokoro/vendor/`, `hanzi-data/`, `_next/static/...`. **Nếu build fail vì trang nào chưa prerender → trang đó là sót của W2: sửa theo pattern W2 rồi chạy lại (không skip).**
- [ ] **Step 4:** Verify `.api-stash` đã sạch (thư mục biến mất) + `git status` không lộ file lạ.
- [ ] **Step 5: (orchestrator) Commit** — `build(next): EXPORT_BUILD output:export + build:static (stash api)`

---

### Task 3 (W3b-2): Đổi config deploy + scripts + CI

**Files:**
- Modify: `app-next/wrangler.jsonc`
- Modify: `app-next/package.json` (`preview`, `deploy`)
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1:** `wrangler.jsonc`:

```jsonc
{
  "name": "byehsk",
  "main": "src/worker/index.ts",
  "compatibility_date": "2026-09-01",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true },
  "assets": {
    "directory": "out",
    "binding": "ASSETS",
    "not_found_handling": "404-page",
    "run_worker_first": ["/api/*"]
  },
  "d1_databases": [ /* giữ nguyên */ ]
}
```

- [ ] **Step 2:** Scripts:

```json
"preview": "pnpm build:static && pnpm wrangler dev",
"deploy": "pnpm build:static && pnpm wrangler deploy"
```

(bỏ `opennextjs-cloudflare build/deploy`; giữ dependency chỉ cho `initOpenNextCloudflareForDev` dev.)

- [ ] **Step 3:** CI: step build-check (PR) đổi `pnpm exec opennextjs-cloudflare build` → `pnpm build:static`; step deploy (main) giữ `pnpm run deploy`.
- [ ] **Step 4:** `pnpm preview` local → curl matrix như Task 1 Step 4 trên `http://localhost:8787` (preview chạy assets + worker thật trong workerd) + smoke login flow nếu có dev-login local.
- [ ] **Step 5: (orchestrator) Commit** — `build(deploy): wrangler main=worker API + assets=out (static-first)`

---

### Task 4 (Deploy + verify production)

- [ ] **Step 1 (ORCHESTRATOR):** `pnpm run deploy` → deploy thành công, ghi version ID.
- [ ] **Step 2 (ORCHESTRATOR): curl matrix** — lặp đủ danh sách Task 1 Step 4 + thêm `/lesson/custom?deck=x` (200), `/notebook/wrong` (200), redirect cũ `/lesson/custom/abc` → 302 về query form, `/_headers` không public (404).
- [ ] **Step 3 (ORCHESTRATOR): telemetry quyết định** — `wrangler tail byehsk` nền + duyệt 10 trang + 1 flow login: tail **chỉ** hiện `/api/*`; mọi path trang **vắng mặt** (đây là bằng chứng asset hit, mục tiêu chính của refactor).
- [ ] **Step 4 (ORCHESTRATOR): QA browser prod** — control-browser trên https://byehsk.softtip88.workers.dev: (1) login Google flow hoặc dev-login QA, (2) /reading 11-case journey, (3) /lesson mở 1 bài, (4) /shadowing mở 1 video có audio, (5) /roadmap gate + session, (6) sync draft → reload giữ dữ liệu. FAIL nào → fix + redeploy + rerun.
- [ ] **Step 5:** So sánh CPU: Workers dashboard/logs — cpuTime của `/api/*` requests (kỳ vọng < 10 ms warm, cold vài chục ms); ghi snapshot số liệu vào PR description.

---

### Task 5 (Merge + CI + xác nhận cuối)

- [ ] **Step 1 (ORCHESTRATOR):** push branch `static-first-refactor`, mở PR → review findings xử lý trước (Task review riêng) → merge main.
- [ ] **Step 2:** CI trên main xanh (typecheck/lint/test + build:static) → CI tự `pnpm run deploy`.
- [ ] **Step 3:** Verify lại prod sau CI deploy (curl matrix rút gọn 6 URL + 1 API) — PASS → đóng goal, cập nhật memory.
