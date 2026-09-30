# SP1 Learning Core Implementation Plan (Next.js + Cloudflare Workers)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port phần SP1 "learning core" của app Nhai HSK từ clone tĩnh (`clone/`) sang Next.js App Router: Phase 0 scaffold + B1–B3 (home/course/content), C1–C11 (lesson engine 7 chế độ), D1–D4 (pinyin, pinyin-practice, radicals, sound-rules), E1–E3 (roadmap 3 trang) — kết thúc: app port đủ tính năng + deploy Cloudflare Workers xanh + không Tailwind CDN.

**Architecture:** Toàn bộ content học là TS modules build-time dưới `app-next/src/content/` (SSG, không runtime fetch — 00 §7). Tiến độ client đi qua 1 `ProgressStore` (localStorage `nhai.*`), lesson/roadmap KHÔNG đụng localStorage trực tiếp. Lesson là client-heavy: RSC shell + `LessonProvider` state machine + registry 7 mode thay `window.NHAI.lessonModes`. Shell (Topbar/Sidebar/modals) nằm ở root layout, dùng chung cho mọi route.

**Tech Stack:** Next.js App Router + TypeScript strict + Tailwind v4 (`@theme`), pnpm, Vitest + jsdom + @testing-library/react, Playwright, `@opennextjs/cloudflare` + wrangler (Cloudflare Workers).

**Spec:** `docs/superpowers/specs/fullstack/10-learning-core.md` (spec chính), `docs/superpowers/specs/fullstack/00-platform-data.md` (hợp đồng canonical — SP1 chỉ dùng localStorage, D1/KV là SP2), `docs/superpowers/specs/2026-09-30-hsk-feature-inventory.md` (B1–B3, C1–C11, D1–D5, E1–E3 `[PORT]`), clone specs `clone/specs/SPEC-01-home-course-leaderboard.md`, `SPEC-02-vocab-lesson.md`, `SPEC-14-lesson-polish.md`, `SPEC-04-radicals-pinyin-soundrules.md`, `SPEC-05-roadmap-review-gated.md`, `SPEC-20-radicals-autoplay-strokes.md`, `SPEC-21-roadmap-session.md`.

## Global Constraints

- App mới ở repo root `app-next/` (create-next-app, pnpm, TS strict, `--src-dir`, import alias `@/*` → `src/*`). Không sửa gì trong `clone/`.
- Mọi localStorage key giữ nguyên tiền tố `nhai.*` (`nhai.xp`, `nhai.today`, `nhai.heat`, `nhai.pageDone`, `nhai.srs.*`, `nhai.battle.best.*`, `nhai.roadmap.pinyin`, `nhai.theme`, `nhai.voice`, `nhai.mockLogin`, `nhai.mockName`).
- Copy tiếng Việt / tiếng Trung giữ NGUYÊN VĂN từ `clone/*.html`, `clone/js/*.js`, `clone/js/data/*.js` — không dịch lại, không sửa dấu câu.
- Không Tailwind CDN. Tailwind v4 qua `@import "tailwindcss"` + `@theme` trong `app-next/src/app/globals.css`. Các class sau PHẢI còn nguyên tên và hành vi (port từ `clone/assets/theme.css`): `.card .btn-main .btn-ghost .pill .pill-active .pill .shadow-neo .toast .grid-cell .zh .modal-backdrop .paper-grid .zh-faded` + CSS variables `--nhai-bg/card/border/ink/muted/main/main-hi/accent/gold/soft` (light + `html.dark`).
- Không fetch network cho content — import trực tiếp từ `@/content/*`. Không dùng `window.NHAI` / `window.NHAI_DATA` — thay bằng import.
- **Conversion patterns DOM→JSX dùng xuyên suốt (before → after):**
  - `window.NHAI_DATA.vocab.hsk1["lesson-1"]` → `import { vocab } from "@/content/vocab"` rồi `vocab.hsk1["lesson-1"]`.
  - `NHAI.q('[data-foo]')` + `addEventListener` + `innerHTML = '...'` → JSX + state/handler React:
    ```tsx
    // Trước (clone/js/course.js): list.innerHTML = rows.map(r => `<a href="...">${r.title}</a>`).join("")
    // Sau (JSX):
    {pages.map((p) => (
      <Link key={p.pageId} href={`/lesson/${book}/${p.pageId}`} className="card p-3 flex items-center gap-3">…</Link>
    ))}
    ```
  - IIFE DOM building (mỗi mode 1 IIFE render string) → 1 component React per mode, registry thay `window.NHAI.lessonModes`.
  - `cleanups.push(clearInterval(t))` → `useEffect(() => { const id = setInterval(…); return () => clearInterval(id); }, […])` — mọi timer/interval/AudioContext/speechSynthesis PHẢI dọn trong useEffect return (cleanup C1/SOC-20).
  - `NHAI.toast("…")` → `const toast = useToast(); toast("…")`.
  - `NHAI.speak(text, "zh-CN")` → `const { speak } = useTts(); speak(text, { lang: "zh-CN" })`.
  - `?book=hsk1&page=lesson-1` → route params: `/lesson/[book]/[page]` (page.js `params`), `?skill=grammar` → `useSearchParams()` trong client component (bọc `<Suspense>`).
- Mọi component có state/event là client component (`"use client"` đầu file). Trang tĩnh là server component, không directive.
- SP1 đúng: leaderboard/battle Top-10 dữ liệu cứng, login mock `nhai.mockLogin`, mọi ghi tiến độ qua localStorage. UPG-2/3/4/5 KHÔNG làm trong plan này.
- Command chạy từ `app-next/` (trừ khi ghi rõ): `pnpm vitest run <path>`, `pnpm playwright test <path>`, `pnpm dev` (port 3000), `pnpm build`. Mỗi task commit riêng theo message ghi trong step cuối.

## Phụ thuộc / phối hợp plan anh em

- **Plan anh em (đã viết):** `docs/superpowers/plans/2026-09-30-sp1-social-legal.md` — phụ thuộc scaffold + shell của plan này. Nó PRODUCING: `<NotificationBell />` (`@/components/social/notification-bell`), `<AiWidget />` (`@/components/social/ai-widget`), `app-next/src/app/not-found.tsx`, routes `/leaderboard /feedback /terms /privacy /delete-account`, content modules `@/content/leaderboard` + `@/content/certificates`.
- **Plan này KHÔNG viết task** cho AiWidget/NotificationBell/404/leaderboard/certificates. Chỉ để slot mount: Topbar có `<div data-bell-slot />` giữa span XP và nút Đăng nhập (vị trí `[data-bell]` trong `clone/js/shell.js:225`); layout có `<div data-ai-slot />` cuối body. Plan social-legal tự thay 2 slot này bằng component của nó.
- **Consumes từ plan khác (chỉ đặt link, không spec):** route `/review` (F1, plan sp1-personal-tools) — nút "Tổng ôn" ở course/roadmap chỉ link `/review`; route `/hanzi/[char]` (G2) — link trong radicals; route `/create-file?tpl=radicals` (G6) — nút ở radicals. Link tới route chưa tồn tại là chấp nhận được ở SP1 đang port dần (không assert 200 trong e2e cho các route này).

## Future phases (KHÔNG làm trong plan này — không viết task)

- **UPG-2 (SP2):** XP thật `POST /users/xp`, SRS `PUT /users/srs` batch ≤200, page-done `POST /users/page-dones`, battle best `PUT /users/battle-best`, roadmap `PUT /users/roadmap-progress`, `HybridStore` outbox sync — xem spec 10 §2 ranh giới + `00-platform-data.md` §3.2, §5, §8.
- **UPG-3 (SP3):** nội dung thật B3/D5 (9.789 từ, 153 bài; metadata đầy đủ + JSON-LD) — spec 10 §2 B3/D5.
- **UPG-4 (SP4):** gate "In file" FREEHSK — spec 10 §3.1. **UPG-5 (SP5):** TTS server, AI — spec 13.

---

## File Structure (map trước khi bắt đầu)

- `app-next/` — scaffold Next.js + wrangler + CI (Task 1, 4).
- `app-next/src/app/globals.css` — theme tokens + class dùng chung (Task 3).
- `app-next/src/lib/pinyin-utils.ts` — `toPinyin, stripTones, shuffle, splitPinyin, pinyinLine` (Task 5).
- `app-next/src/lib/tts/use-tts.ts` — hook TTS chunking + retry Safari (Task 5).
- `app-next/src/lib/store/progress-store.ts` — `ProgressStore`, `SrsStatus`, `progressStore`, `useProgress` (Task 7).
- `app-next/src/content/*.ts` — `courses.ts, vocab.ts, pinyin.ts, radicals.ts, strokeRules.ts, soundrules.ts, roadmapPinyin.ts, roadmap.ts` + zod validate (Task 8–10). (`leaderboard.ts`/`certificates.ts` thuộc plan social-legal; `dictionary/hanzi/templates/reading/shadowing/notebooks/review` thuộc plan domain sau.)
- `app-next/src/components/shell/*` — `theme-provider.tsx, toast-provider.tsx, topbar.tsx, sidebar-nav.tsx, settings-modal.tsx, login-modal.tsx` (Task 11).
- `app-next/src/app/(app)/layout.tsx` — container `max-w-5xl` cho các trang; shell providers ở root `src/app/layout.tsx` (Task 11).
- `app-next/src/components/lesson/lesson-provider.tsx`, `lesson-client.tsx`, `word-list.tsx`, `modes/{flashcard,typing,quiz,reading,listen,dance,battle}.tsx`, `modes/index.ts`, `src/lib/use-keyboard.ts` (Task 12–20).
- `app-next/src/app/(app)/page.tsx` + `components/home/*` (Task 21); `src/app/(app)/course/page.tsx`, `course/[book]/page.tsx` + `components/course/course-progress.tsx` (Task 22).
- `src/app/(app)/pinyin/page.tsx` + `components/pinyin/{matrix-client,tone-dialog}.tsx`; `pinyin/practice/page.tsx` + `components/pinyin/practice-client.tsx` (Task 23).
- `src/app/(app)/radicals/page.tsx` + `components/radicals/{deck-client,autoplay-modal,stroke-rules}.tsx` (Task 24); `sound-rules/page.tsx` + `components/sound-rules/quiz-client.tsx` (Task 25).
- `src/app/(app)/roadmap/page.tsx` (Task 26); `roadmap/pinyin/page.tsx` + `components/roadmap/timeline-client.tsx` + `src/lib/roadmap-status.ts` (Task 27); `roadmap/pinyin/session/[n]/page.tsx` + `components/roadmap/session-client.tsx` (Task 28).
- `src/app/sitemap.ts`, `src/app/robots.ts`, metadata per route (Task 29); `app-next/e2e/*.spec.ts` smoke (Task 4, 29).

---

# Phase 0 — Scaffold & nền tảng

### Task 1: Scaffold Next.js app

**Files:**
- Create: `app-next/` (toàn bộ do create-next-app sinh), giữ nguyên `app-next/src/app/layout.tsx`, `app-next/src/app/page.tsx` mặc định (Task 3/11/21 sẽ sửa).
- Modify: `app-next/package.json` (scripts `typecheck`).

**Interfaces:**
- Consumes: không.
- Produces: app Next.js App Router chạy được ở `pnpm dev` port 3000; alias `@/*` → `./src/*` trong `app-next/tsconfig.json`; TS strict (mặc định create-next-app); package manager pnpm.

- [ ] **Step 1: Scaffold app**

```bash
cd /Volumes/samsung512/Code/hsk
pnpm create next-app@latest app-next --ts --tailwind --app --src-dir --eslint --import-alias "@/*" --use-pnpm --yes
```
Expected: thư mục `app-next/` với `package.json`, `tsconfig.json` (có `"strict": true` và `"paths": {"@/*": ["./src/*"]}`), `src/app/layout.tsx`, `src/app/globals.css` chứa `@import "tailwindcss";` (Tailwind v4).

- [ ] **Step 2: Thêm script typecheck**

Trong `app-next/package.json` thêm vào `"scripts"`: `"typecheck": "tsc --noEmit"`.

- [ ] **Step 3: Khởi động dev server kiểm tra**

```bash
cd /Volumes/samsung512/Code/hsk/app-next && pnpm dev
```
Expected: mở `http://localhost:3000` thấy trang welcome mặc định của Next, không lỗi console. Ctrl+C để dừng.

- [ ] **Step 4: Kiểm tra lint + typecheck xanh**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm typecheck && pnpm lint`
Expected: cả hai exit 0, không lỗi.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next
git commit -m "chore: scaffold Next.js app (TS strict + Tailwind v4 + pnpm) for SP1 learning core"
```

### Task 2: Test harness — Vitest + Testing Library + Playwright

**Files:**
- Create: `app-next/vitest.config.ts`, `app-next/vitest.setup.ts`, `app-next/playwright.config.ts`, `app-next/e2e/scaffold.spec.ts`
- Modify: `app-next/package.json` (scripts `test`, `test:e2e`), `app-next/.gitignore` (thêm `test-results/`, `playwright-report/`)

**Interfaces:**
- Consumes: Task 1 (app chạy được).
- Produces: `pnpm vitest run` (jsdom, alias `@/*`, setup file nạp `@testing-library/jest-dom`); `pnpm playwright test` (base URL `http://localhost:3000`, webServer tự chạy `pnpm dev`); mọi task sau viết test theo cấu hình này.

- [ ] **Step 1: Cài dependencies**

```bash
cd /Volumes/samsung512/Code/hsk/app-next
pnpm add -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test
pnpm exec playwright install chromium
```
Expected: cài thành công, không peer-dep error.

- [ ] **Step 2: Viết cấu hình Vitest**

Tạo `app-next/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

Tạo `app-next/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
// jsdom thiếu API browser dùng trong app: stub tối thiểu
if (!window.matchMedia) {
  window.matchMedia = (q: string) =>
    ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }) as MediaQueryList;
}
window.scrollTo = window.scrollTo ?? (() => {});
```

(`@vitejs/plugin-react` cài kèm nếu thiếu: `pnpm add -D @vitejs/plugin-react`.)

- [ ] **Step 3: Viết cấu hình Playwright + smoke test scaffold**

Tạo `app-next/playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

Tạo `app-next/e2e/scaffold.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("app Next mặc định render", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Next/);
});
```

- [ ] **Step 4: Thêm scripts test**

Trong `app-next/package.json` thêm: `"test": "vitest run"`, `"test:e2e": "playwright test"`. Thêm 2 dòng vào `app-next/.gitignore`: `test-results/` và `playwright-report/`.

- [ ] **Step 5: Chạy cả 2 bộ test xanh**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm test && pnpm test:e2e`
Expected: vitest "no test files found" là chấp nhận được ở bước này (exit code 0 nếu dùng `vitest run --passWithNoTests` — thêm flag đó vào script `test`); Playwright 1 test passed.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next
git commit -m "chore: add Vitest + Testing Library + Playwright test harness"
```

### Task 3: Theme — port `theme.css` sang Tailwind v4 `@theme`

**Files:**
- Modify: `app-next/src/app/globals.css` (thay toàn bộ bằng port của `clone/assets/theme.css`)
- Modify: `app-next/src/app/layout.tsx` (body class `paper-grid` trên desktop qua wrapper div, `<html lang="vi">`)
- Test: `app-next/src/app/__tests__/theme.test.ts`

**Interfaces:**
- Consumes: Task 2 (vitest).
- Produces: class dùng chung mọi task sau: `.card .btn-main .btn-ghost .pill .pill-active .shadow-neo .toast .grid-cell .modal-backdrop .paper-grid .zh .zh-faded` + variables `--nhai-*` (đã expose qua `@theme` để dùng được như utility Tailwind, vd `text-nhai-main`).

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/app/__tests__/theme.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const css = readFileSync(path.resolve(__dirname, "../../globals.css"), "utf8");

describe("globals.css port theme.css", () => {
  it("giữ nguyên các class dùng chung của clone", () => {
    for (const cls of [".card", ".btn-main", ".btn-ghost", ".pill", ".pill-active", ".shadow-neo", ".toast", ".grid-cell", ".modal-backdrop", ".paper-grid", ".zh", ".zh-faded"]) {
      expect(css).toContain(cls);
    }
  });
  it("có đủ biến light + dark và màu chủ đạo đỏ Nhai", () => {
    expect(css).toContain("--nhai-main: #c23b22");
    expect(css).toContain("html.dark");
    expect(css).toContain("--nhai-bg: #1c1a17"); // dark bg
  });
  it("không còn Tailwind CDN / @tailwind directive cũ", () => {
    expect(css).not.toContain("cdn.tailwindcss.com");
    expect(css).toContain('@import "tailwindcss"');
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/app/__tests__/theme.test.ts`
Expected: FAIL — globals.css mặc định của create-next-app không chứa `.card`/`--nhai-main`.

- [ ] **Step 3: Port theme**

Thay toàn bộ `app-next/src/app/globals.css` bằng nội dung port từ `clone/assets/theme.css`, cấu trúc Tailwind v4:

```css
@import "tailwindcss";

:root {
  --nhai-bg: #fdf9f3; --nhai-card: #ffffff; --nhai-border: #e7e0d4;
  --nhai-ink: #1f1e1d; --nhai-muted: #6b665c; --nhai-main: #c23b22;
  --nhai-main-hi: #a83319; --nhai-accent: #2563eb; --nhai-gold: #f5b301; --nhai-soft: #f6f1e7;
}
html.dark {
  --nhai-bg: #1c1a17; --nhai-card: #262320; --nhai-border: #3a352e;
  --nhai-ink: #f0ece4; --nhai-muted: #a09a8e; --nhai-soft: #2e2a25;
}
@theme inline {
  --color-nhai-bg: var(--nhai-bg); --color-nhai-card: var(--nhai-card);
  --color-nhai-border: var(--nhai-border); --color-nhai-ink: var(--nhai-ink);
  --color-nhai-muted: var(--nhai-muted); --color-nhai-main: var(--nhai-main);
  --color-nhai-main-hi: var(--nhai-main-hi); --color-nhai-accent: var(--nhai-accent);
  --color-nhai-gold: var(--nhai-gold); --color-nhai-soft: var(--nhai-soft);
}
/* ... body, .zh, .card, .shadow-neo, .btn-main, .btn-ghost, .pill, .pill-active,
   .grid-cell, .zh-faded, .toast, .modal-backdrop, @media print, .paper-grid —
   copy TỪNG DÒNG CSS từ clone/assets/theme.css:1-97 giữ nguyên giá trị,
   chỉ bỏ comment "SPEC-10 task 2" nếu muốn. */
```

Sửa `app-next/src/app/layout.tsx`: `<html lang="vi" suppressHydrationWarning>`, `<body>` bọc `<div className="min-h-screen paper-grid">` quanh `{children}` (nền giấy kẻ ô như clone).

- [ ] **Step 4: Run test verify pass**

Run: `pnpm vitest run src/app/__tests__/theme.test.ts`
Expected: PASS 3 tests.

- [ ] **Step 5: Kiểm tra trực quan + commit**

Run: `pnpm dev` → mở `http://localhost:3000` — nền giấy kẻ ô, font system-ui. Sau đó:

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/app/globals.css app-next/src/app/layout.tsx app-next/src/app/__tests__/theme.test.ts
git commit -m "feat: port theme.css to Tailwind v4 globals.css (card/btn/pill/shadow-neo/toast/grid-cell/zh)"
```

### Task 4: Deploy Cloudflare Workers + CI

**Files:**
- Create: `app-next/wrangler.jsonc`, `app-next/open-next.config.ts`, `.github/workflows/ci.yml`
- Modify: `app-next/package.json` (scripts `preview`, `deploy`)

**Interfaces:**
- Consumes: Task 1–2.
- Produces: `pnpm preview` (build OpenNext + wrangler dev local), `pnpm deploy` (deploy Workers); CI `.github/workflows/ci.yml` chạy typecheck + lint + vitest + build + deploy preview. Tên binding assets `ASSETS` (plan khác thêm binding D1/R2/KV vào cùng file này ở SP2).

- [ ] **Step 1: Cài OpenNext + wrangler, tạo cấu hình**

```bash
cd /Volumes/samsung512/Code/hsk/app-next
pnpm add -D @opennextjs/cloudflare wrangler
```

Tạo `app-next/wrangler.jsonc`:

```jsonc
{
  "name": "nhai-hsk",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-09-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" }
}
```

Tạo `app-next/open-next.config.ts`:

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig({});
```

- [ ] **Step 2: Thêm scripts + build verify**

Trong `app-next/package.json` thêm: `"preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview"`, `"deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"`.
Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm exec opennextjs-cloudflare build`
Expected: build thành công, sinh `.open-next/worker.js` và `.open-next/assets/`. Thêm `.open-next/` vào `app-next/.gitignore`.

- [ ] **Step 3: Verify chạy trên workerd local**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm preview`
Expected: wrangler dev phục vụ app ở `http://localhost:8787` — mở thấy trang chủ, không lỗi 500 trong terminal. Ctrl+C.

- [ ] **Step 4: Viết CI workflow**

Tạo `.github/workflows/ci.yml` (ở repo root):

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: app-next
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: app-next/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm exec opennextjs-cloudflare build
      - name: Deploy preview (main only)
        if: github.ref == 'refs/heads/main'
        run: pnpm exec opennextjs-cloudflare deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next .github/workflows/ci.yml
git commit -m "ci: build + deploy Cloudflare Workers via @opennextjs/cloudflare"
```

---

# Phase 1 — Lib & content (data layer)

### Task 5: `pinyin-utils` + hook TTS `useTts`

**Files:**
- Create: `app-next/src/lib/pinyin-utils.ts` (port từ `clone/js/pinyin-utils.js:1-111` + `NHAI.stripTones` từ `clone/js/shell.js`)
- Create: `app-next/src/lib/tts/use-tts.ts`
- Test: `app-next/src/lib/__tests__/pinyin-utils.test.ts`, `app-next/src/lib/tts/__tests__/use-tts.test.ts`

**Interfaces:**
- Consumes: Task 2 (vitest + jsdom).
- Produces:
  - `export function toPinyin(input: string): string` — `"ni3 hao3" → "nǐ hǎo"`, `"lv4" → "lǜ"`, `"zhong1" → "zhōng"` (port `NHAI.toPinyin`).
  - `export function stripTones(s: string): string` — `"nǐ hǎo" → "ni hao"` (NFD + ü→v, bỏ dấu câu `:' ’·`).
  - `export function shuffle<T>(arr: T[]): T[]` — Fisher-Yates, không mutate input.
  - `export function splitPinyin(pinyin: string): string[]` — `"Wáng lǎoshī" → ["wáng","lǎo","shī"]`.
  - `export function pinyinLine(perChar: { c: string; py: string }[]): string` — ghép `"lǐ míng，nǐ hǎo。"`.
  - `export function useTts(): { speak: (text: string, opts?: { lang?: "zh-CN" | "vi-VN"; rate?: number; onEnd?: () => void }) => void; cancel: () => void; speaking: boolean }` — chunk câu >200 ký tự, chọn voice theo `nhai.voice` (`female`/`male`), retry Safari nếu `speak` không phát trong ~15s (timer setTimeout re-call), cancel huỷ toàn bộ chunk + timer.

- [ ] **Step 1: Write the failing tests**

Tạo `app-next/src/lib/__tests__/pinyin-utils.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { toPinyin, stripTones, shuffle, splitPinyin, pinyinLine } from "../pinyin-utils";

describe("toPinyin", () => {
  it("đổi số thành dấu đúng nguyên âm chính", () => {
    expect(toPinyin("ni3")).toBe("nǐ");
    expect(toPinyin("zhong1")).toBe("zhōng");
    expect(toPinyin("hao3")).toBe("hǎo");
    expect(toPinyin("ni3 hao3")).toBe("nǐ hǎo");
  });
  it("lv -> ü, dấu đặt trên ü", () => {
    expect(toPinyin("lv4")).toBe("lǜ");
    expect(toPinyin("nv3")).toBe("nǚ");
  });
  it("iu/ui đặt dấu đúng ngoại lệ", () => {
    expect(toPinyin("liu4")).toBe("liù");
    expect(toPinyin("hui4")).toBe("huì");
  });
  it("giữ nguyên token không hợp lệ / đã có dấu", () => {
    expect(toPinyin("Wáng lǎoshī")).toBe("Wáng lǎoshī");
    expect(toPinyin("nǐ, hǎo")).toBe("nǐ, hǎo");
  });
});

describe("stripTones", () => {
  it("bỏ dấu thanh, ü -> v", () => {
    expect(stripTones("nǐ hǎo")).toBe("ni hao");
    expect(stripTones("lǜ")).toBe("lv");
    expect(stripTones("Zhōng")).toBe("zhong");
  });
});

describe("shuffle / splitPinyin / pinyinLine", () => {
  it("shuffle giữ nguyên phần tử và input gốc", () => {
    const a = [1, 2, 3, 4, 5];
    const b = shuffle(a);
    expect([...b].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(a).toEqual([1, 2, 3, 4, 5]);
  });
  it("splitPinyin tách âm tiết có sẵn dấu", () => {
    expect(splitPinyin("Wáng lǎoshī")).toEqual(["wáng", "lǎo", "shī"]);
  });
  it("pinyinLine ghép không chèn space quanh dấu câu", () => {
    expect(
      pinyinLine([
        { c: "李", py: "lǐ" }, { c: "明", py: "míng" }, { c: "，", py: "，" }, { c: "你", py: "nǐ" },
      ])
    ).toBe("lǐ míng，nǐ");
  });
});
```

Tạo `app-next/src/lib/tts/__tests__/use-tts.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTts } from "../use-tts";

const chunkTexts = () =>
  (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls.map(
    (c) => (c[0] as SpeechSynthesisUtterance).text
  );

beforeEach(() => {
  vi.stubGlobal("speechSynthesis", {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => [
      { name: "Tingting", lang: "zh-CN" },
      { name: "Male-ZH", lang: "zh-CN" },
    ]),
  });
});

describe("useTts", () => {
  it("phát 1 utterance cho câu ngắn, lang zh-CN", () => {
    const { result } = renderHook(() => useTts());
    act(() => result.current.speak("你好"));
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    expect(chunkTexts()[0]).toBe("你好");
  });
  it("chunk câu dài >200 ký tự thành nhiều utterance", () => {
    const { result } = renderHook(() => useTts());
    act(() => result.current.speak("好".repeat(450)));
    expect(window.speechSynthesis.speak.mock.calls.length).toBeGreaterThanOrEqual(3);
    for (const t of chunkTexts()) expect(t.length).toBeLessThanOrEqual(200);
  });
  it("cancel gọi speechSynthesis.cancel", () => {
    const { result } = renderHook(() => useTts());
    act(() => result.current.cancel());
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests verify fail**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/lib`
Expected: FAIL — module `../pinyin-utils` / `../use-tts` không tồn tại.

- [ ] **Step 3: Implement pinyin-utils**

Tạo `app-next/src/lib/pinyin-utils.ts` — port 1:1 logic `clone/js/pinyin-utils.js` (bảng `MARKS` 6 nguyên âm × 5 thanh, `PRIORITY = ["a","o","e","i","u","ü"]`, ngoại lệ `iu`→u / `ui`→i, regex `^([a-züv:]+)(\d)?$`, map `u:|v` → ü) thành TS thuần, thay `NHAI.toPinyin` bằng `export function toPinyin`… (giữ đúng thuật toán — xem code nguồn `clone/js/pinyin-utils.js:11-111`); thêm `stripTones` từ `clone/js/shell.js` (NFD, bỏ `\u0300-\u036f`, ü→v, bỏ `[:' ’·]`).

- [ ] **Step 4: Implement useTts**

Tạo `app-next/src/lib/tts/use-tts.ts`:

```ts
"use client";
import { useCallback, useRef, useState, useEffect } from "react";

const CHUNK = 200;
const SAFARI_RETRY_MS = 15_000;

function chunkText(text: string): string[] {
  if (text.length <= CHUNK) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > 0) {
    let cut = Math.min(CHUNK, rest.length);
    const dot = rest.lastIndexOf("。", cut);
    const comma = rest.lastIndexOf("，", cut);
    const brk = Math.max(dot, comma);
    if (brk > 0) cut = brk + 1;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  return parts;
}

export function useTts() {
  const [speaking, setSpeaking] = useState(false);
  const chunksRef = useRef<SpeechSynthesisUtterance[]>([]);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => cancelRef.current(), []); // dọn dẹp khi unmount (C1)

  const cancelRef = useRef<() => void>(() => {});
  const cancel = useCallback(() => {
    if (retryRef.current) clearTimeout(retryRef.current);
    retryRef.current = null;
    window.speechSynthesis.cancel();
    chunksRef.current = [];
    setSpeaking(false);
  }, []);
  cancelRef.current = cancel;

  const speak = useCallback(
    (text: string, opts?: { lang?: "zh-CN" | "vi-VN"; rate?: number; onEnd?: () => void }) => {
      cancel();
      const lang = opts?.lang ?? "zh-CN";
      const rate = opts?.rate ?? 1;
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("zh")) ?? null;
      const chunks = chunkText(text);
      setSpeaking(true);
      chunks.forEach((t, i) => {
        const u = new SpeechSynthesisUtterance(t);
        u.lang = lang; u.rate = rate;
        if (voice && lang.startsWith("zh")) u.voice = voice;
        if (i === chunks.length - 1) {
          u.onend = () => { setSpeaking(false); opts?.onEnd?.(); };
        }
        chunksRef.current.push(u);
        window.speechSynthesis.speak(u);
      });
      // Safari đôi khi nuốt speak() — nếu sau ~15s vẫn "đang nói" mà không có utterance active thì thử lại
      retryRef.current = setTimeout(() => {
        if (speaking && !window.speechSynthesis.speaking) {
          chunks.forEach((u) => window.speechSynthesis.speak(u));
        }
      }, SAFARI_RETRY_MS);
    },
    [cancel, speaking]
  );

  return { speak, cancel, speaking };
}
```

- [ ] **Step 5: Run tests verify pass**

Run: `pnpm vitest run src/lib`
Expected: PASS toàn bộ (pinyin-utils 10 assertions, use-tts 3 tests).

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/lib
git commit -m "feat: pinyin-utils (toPinyin/stripTones/shuffle/splitPinyin) + useTts hook (chunking + Safari retry)"
```

### Task 6: `ProgressStore` — LocalStorage store + migration 3 format SRS

**Files:**
- Create: `app-next/src/lib/store/progress-store.ts`
- Test: `app-next/src/lib/store/__tests__/progress-store.test.ts`

**Interfaces:**
- Consumes: Task 2 (vitest + jsdom).
- Produces (contract dùng chung — plan sp1-social-legal PHỤ THUỘC đúng các tên này):
  - `export type SrsStatus = "new" | "learning" | "learned" | "known";`
  - `export type SrsItem = { key: string; status: SrsStatus; dueAt: number; reviewCount: number; lastReviewedAt: number | null; updatedAt: number };`
  - `export type FeedbackEntry = { text: string; at: string };`
  - `export type ProgressSnapshot = { xp: number };`
  - `export interface ProgressStore` với các method (đầy đủ chữ ký):
    - `getXp(): number`; `addXp(n: number): void` (đồng thời tăng `nhai.today`, `nhai.heat[YYYY-MM-DD]`, `nhai.streak` nếu ngày liên tiếp).
    - `getFeedback(): FeedbackEntry[]`; `appendFeedback(entry: FeedbackEntry): void` (key `nhai.feedback`).
    - `getPageDone(book: string, page: string): boolean`; `markPageDone(book: string, page: string): void`; `listPageDone(book?: string): string[]` (key `nhai.pageDone` JSON map `<book>/<page>` → 1).
    - `getSrs(key: string): SrsItem | null`; `toggleSrs(key: string): boolean` (true = đã thêm; false = đã bỏ); `addSrsBatch(keys: string[]): number` (bỏ qua key đã có, trả số item mới; status `new`, `dueAt = Date.now()`); `countSrsNew(): number` (ghi lại counter `nhai.srs.new` để tương thích).
    - `getBattleBest(ctx: string): { correct: number; timeMs: number } | null`; `saveBattleBest(ctx: string, correct: number, timeMs: number): boolean` (true nếu ghi mới — max correct rồi min timeMs; key `nhai.battle.best.<ctx>`).
    - `getRoadmapDone(): number[]`; `markRoadmapSession(n: number): void` (key `nhai.roadmap.pinyin` JSON array số buổi done).
    - `migrateLegacySrs(): void` — gộp 3 format cũ thành items chuẩn.
  - `export const progressStore: ProgressStore;` (singleton đọc-ghi localStorage).
  - `export function useProgress(): ProgressSnapshot` — hook React trả `{ xp }`, subscribe qua custom event `nhai:progress` mà `addXp` dispatch (Topbar đếm XP tăng realtime khi quiz +1).

- [ ] **Step 1: Write the failing tests**

Tạo `app-next/src/lib/store/__tests__/progress-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { ProgressStore } from "../progress-store";

const KEY = "nhai.pageDone";

beforeEach(() => localStorage.clear());

function fresh() {
  return new ProgressStore();
}

describe("XP / heat / pageDone", () => {
  it("addXp cộng dồn và đẩy event nhai:progress", () => {
    const s = fresh();
    s.addXp(3); s.addXp(2);
    expect(s.getXp()).toBe(5);
    const heat = JSON.parse(localStorage.getItem("nhai.heat")!);
    expect(Object.values(heat).reduce((a, b) => a + b, 0)).toBe(5); // hôm nay cộng vào heat
    expect(localStorage.getItem("nhai.today")).toBe("5");
  });
  it("markPageDone ghi map <book>/<page>", () => {
    const s = fresh();
    s.markPageDone("hsk1", "lesson-1");
    expect(s.getPageDone("hsk1", "lesson-1")).toBe(true);
    expect(s.getPageDone("hsk1", "lesson-2")).toBe(false);
    expect(s.listPageDone("hsk1")).toEqual(["hsk1/lesson-1"]);
    expect(Object.keys(JSON.parse(localStorage.getItem(KEY)!))).toEqual(["hsk1/lesson-1"]);
  });
});

describe("SRS — toggle, batch, migration 3 format cũ", () => {
  it("toggleSrs thêm rồi bỏ, key chuẩn <book>.<page>.<index>", () => {
    const s = fresh();
    expect(s.toggleSrs("hsk1.lesson-1.0")).toBe(true);
    expect(s.getSrs("hsk1.lesson-1.0")?.status).toBe("new");
    expect(s.toggleSrs("hsk1.lesson-1.0")).toBe(false);
    expect(s.getSrs("hsk1.lesson-1.0")).toBeNull();
  });
  it("addSrsBatch bỏ qua key đã có (idempotent)", () => {
    const s = fresh();
    expect(s.addSrsBatch(["hsk1.lesson-1.0", "hsk1.lesson-1.1"])).toBe(2);
    expect(s.addSrsBatch(["hsk1.lesson-1.0", "hsk1.lesson-1.2"])).toBe(1);
  });
  it("migrateLegacySrs gộp format 1 (nhai.srs.w.*) + format 2 (nhai.srs.st JSON) + format 3 (nhai.srs.st.<k>/t.<k>)", () => {
    localStorage.setItem("nhai.srs.w.hsk1.lesson-1.0", "1");
    localStorage.setItem("nhai.srs.st", JSON.stringify({ "hsk1.lesson-1.1": "learning" }));
    localStorage.setItem("nhai.srs.st.hsk1.lesson-1.2", "learned");
    localStorage.setItem("nhai.srs.t.hsk1.lesson-1.2", String(Date.now() - 1000));
    const s = fresh();
    s.migrateLegacySrs();
    expect(s.getSrs("hsk1.lesson-1.0")?.status).toBe("new");
    expect(s.getSrs("hsk1.lesson-1.1")?.status).toBe("learning");
    expect(s.getSrs("hsk1.lesson-1.2")?.status).toBe("learned");
    expect(s.getSrs("hsk1.lesson-1.2")?.lastReviewedAt).toBeGreaterThan(0);
  });
});

describe("battle best + roadmap", () => {
  it("saveBattleBest giữ max correct rồi min time", () => {
    const s = fresh();
    expect(s.saveBattleBest("hsk1.lesson-1", 10, 30_000)).toBe(true);
    expect(s.saveBattleBest("hsk1.lesson-1", 12, 40_000)).toBe(true); // nhiều đúng hơn
    expect(s.saveBattleBest("hsk1.lesson-1", 12, 25_000)).toBe(true); // bằng điểm, nhanh hơn
    expect(s.saveBattleBest("hsk1.lesson-1", 9, 10_000)).toBe(false); // kém hơn
    expect(s.getBattleBest("hsk1.lesson-1")).toEqual({ correct: 12, timeMs: 25_000 });
    expect(localStorage.getItem("nhai.battle.best.hsk1.lesson-1")).toBe(JSON.stringify({ correct: 12, timeMs: 25_000 }));
  });
  it("roadmap done lưu mảng buổi", () => {
    const s = fresh();
    s.markRoadmapSession(1);
    s.markRoadmapSession(2);
    expect(s.getRoadmapDone()).toEqual([1, 2]);
  });
});

describe("feedback (contract plan sp1-social-legal)", () => {
  it("appendFeedback/getFeedback, trả [] khi rỗng/hỏng JSON", () => {
    const s = fresh();
    expect(s.getFeedback()).toEqual([]);
    localStorage.setItem("nhai.feedback", "{broken");
    expect(s.getFeedback()).toEqual([]);
    s.appendFeedback({ text: "Ổn!", at: new Date().toISOString() });
    expect(s.getFeedback()).toEqual([{ text: "Ổn!", at: expect.any(String) }]);
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/lib/store`
Expected: FAIL — không tìm thấy `../progress-store`.

- [ ] **Step 3: Implement ProgressStore**

Tạo `app-next/src/lib/store/progress-store.ts` — class thuần (không React) đọc/ghi localStorage, MỌI getter bọc try/catch trả mặc định khi JSON hỏng (như `clone/js/review.js:7-27`). Storage mapping:
- `nhai.xp` = string số; `nhai.today` = string số (reset theo ngày VN `Asia/Ho_Chi_Minh` — so sánh day string `YYYY-MM-DD` lưu kèm trong `nhai.todayDay`); `nhai.heat` = JSON `{ "YYYY-MM-DD": xp }`; `nhai.streak` = string số.
- `nhai.pageDone` = JSON `Record<"book/page", 1>`; `nhai.feedback` = JSON `FeedbackEntry[]`.
- `nhai.srs.items` = JSON `Record<itemKey, SrsItem>` (canonical mới); `migrateLegacySrs()` đọc và GỘP 3 format cũ (không xoá key cũ, chỉ đọc): (1) key khớp regex `/^nhai\.srs\.w\.([a-z0-9-]+)\.(.+)\.(\d+)$/` giá trị `"1"` → `{key:"$1.$2.$3", status:"new"}`; (2) `nhai.srs.st` JSON object `key→status` map thẳng vào `SrsStatus`; (3) `nhai.srs.st.<key>` + `nhai.srs.t.<key>` (epoch ms string) → status + `lastReviewedAt`; key trùng nhau thì format mới hơn (có `lastReviewedAt`) thắng; sau merge luôn ghi `nhai.srs.new` = số item `status === "new"`.
- `nhai.battle.best.<ctx>` = JSON `{correct, timeMs}`; `nhai.roadmap.pinyin` = JSON `number[]`.
- Mọi ghi XP dispatch `window.dispatchEvent(new CustomEvent("nhai:progress"))`.
- Cuối file: `export const progressStore = new ProgressStore();` + hook:

```ts
export function useProgress(): ProgressSnapshot {
  const [xp, setXp] = useState(progressStore.getXp());
  useEffect(() => {
    const sync = () => setXp(progressStore.getXp());
    window.addEventListener("nhai:progress", sync);
    return () => window.removeEventListener("nhai:progress", sync);
  }, []);
  return { xp };
}
```

(`useState/useEffect` import từ `react` — file cần `"use client"` vì export hook.)

- [ ] **Step 4: Run test verify pass**

Run: `pnpm vitest run src/lib/store`
Expected: PASS toàn bộ (10 tests).

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/lib/store
git commit -m "feat: ProgressStore (xp/heat/pageDone/srs 3-format migration/battle best/roadmap) + useProgress"
```

### Task 7: Content module `courses` + `vocab` + zod validate

**Files:**
- Create: `app-next/src/content/courses.ts` (port từ `clone/js/data/courses.js:1-128`)
- Create: `app-next/src/content/vocab.ts` (port từ `clone/js/data/vocab.js:1-317`)
- Create: `app-next/src/content/schema.ts` (zod schemas dùng chung)
- Test: `app-next/src/content/__tests__/content-validate.test.ts`

**Interfaces:**
- Consumes: Task 2 (vitest), `zod` (cài bước 1).
- Produces:
  - `export type Skill = "vocab" | "grammar" | "hanzi";`
  - `export type LessonMeta = { pageId: string; order: number; title: string; words?: number; meta?: string; skill: Skill };`
  - `export type BookMeta = { slug: string; name: string; cardMeta: string; lessons: number };` — 7 sách theo SPEC-01 §1: `hsk1` "Nhai HSK 1" "333 từ vựng · 41 mẫu" 15 bài; `hsk2` "213 từ vựng · 45 mẫu" 45 bài; `hsk3` "483 từ vựng · 63 mẫu" 63 bài; `hsk4` "972 từ vựng"; `hsk5` "1059 từ vựng"; `hsk6` "1123 từ vựng"; `hsk79` "Nhai HSK 7-9" "5606 từ vựng" 30 bài.
  - `export const books: BookMeta[];` `export const courses: Record<string, { pages: LessonMeta[] }>;` (hsk1 đủ 15 bài tên thật; sách khác `genLessons/genGrammar/genHanzi` giữ nguyên logic port từ courses.js).
  - `export type PinyinPerChar = { c: string; py: string };`
  - `export type Example = { zh: string; pinyinPerChar: PinyinPerChar[]; vi: string };`
  - `export type VocabWord = { hanzi: string; pinyin: string; hanViet: string; meaning: string; pos: string; example: Example };`
  - `export type VocabLesson = { title: string; words: VocabWord[] };`
  - `export const vocab: Record<string, Record<string, VocabLesson>>;` — shape khớp 1:1 `NHAI_DATA.vocab`.
  - zod schemas `vocabWordSchema`, `vocabSchema`, `courseSchema` trong `schema.ts` — test validate chạy trong CI (thay "validate lúc build").

- [ ] **Step 1: Cài zod + write the failing test**

```bash
cd /Volumes/samsung512/Code/hsk/app-next && pnpm add zod
```

Tạo `app-next/src/content/__tests__/content-validate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { books, courses } from "../courses";
import { vocab } from "../vocab";
import { vocabSchema, courseSchema } from "../schema";

describe("courses", () => {
  it("đủ 7 sách đúng meta SPEC-01", () => {
    expect(books.map((b) => b.slug)).toEqual(["hsk1", "hsk2", "hsk3", "hsk4", "hsk5", "hsk6", "hsk79"]);
    expect(books[0]).toMatchObject({ slug: "hsk1", name: "Nhai HSK 1", cardMeta: "333 từ vựng · 41 mẫu", lessons: 15 });
    expect(books[6]).toMatchObject({ slug: "hsk79", cardMeta: "5606 từ vựng", lessons: 30 });
  });
  it("hsk1 đủ 15 bài vocab tên thật, bài 1 có 13 từ", () => {
    const pages = courses.hsk1.pages.filter((p) => p.skill === "vocab");
    expect(pages).toHaveLength(15);
    expect(pages[0]).toMatchObject({ pageId: "lesson-1", title: "Xin chào!", words: 13 });
    expect(pages[6]?.title).toBe("Tôi tan làm lúc 6 rưỡi tối");
  });
  it("zod course schema hợp lệ cho 7 sách", () => {
    for (const b of books) expect(courseSchema.safeParse(courses[b.slug]).success).toBe(true);
  });
});

describe("vocab", () => {
  it("bài 1 HSK1 đủ 13 từ, từ đầu đúng theo SPEC-02", () => {
    const l = vocab.hsk1["lesson-1"];
    expect(l.title).toBe("Xin chào!");
    expect(l.words).toHaveLength(13);
    expect(l.words[0]).toMatchObject({
      hanzi: "你好", pinyin: "nǐ hǎo", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ",
    });
    expect(l.words[0].example).toMatchObject({ zh: "李明，你好。", vi: "Chào Lý Minh" });
    expect(l.words[0].example.pinyinPerChar[0]).toEqual({ c: "李", py: "lǐ" });
  });
  it("mọi lesson có zod schema hợp lệ (pinyin/meaning/example bắt buộc)", () => {
    for (const book of Object.keys(vocab)) {
      for (const [pageId, lesson] of Object.entries(vocab[book])) {
        const res = vocabSchema.safeParse(lesson);
        if (!res.success) throw new Error(`schema fail: ${book}/${pageId}: ${res.error.message}`);
      }
    }
  });
  it("pinyinPerChar khớp 1-1 số ký tự của câu zh", () => {
    for (const w of vocab.hsk1["lesson-1"].words) {
      expect(w.example.pinyinPerChar).toHaveLength(Array.from(w.example.zh).length);
    }
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/content`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Port courses.ts + schema.ts**

Tạo `app-next/src/content/schema.ts`:

```ts
import { z } from "zod";

export const pinyinPerCharSchema = z.object({ c: z.string().min(1), py: z.string() });
export const exampleSchema = z.object({
  zh: z.string().min(1),
  pinyinPerChar: z.array(pinyinPerCharSchema).min(1),
  vi: z.string().min(1),
});
export const vocabWordSchema = z.object({
  hanzi: z.string().min(1),
  pinyin: z.string().min(1),
  hanViet: z.string().min(1),
  meaning: z.string().min(1),
  pos: z.string().min(1),
  example: exampleSchema,
});
export const vocabLessonSchema = z.object({ title: z.string().min(1), words: z.array(vocabWordSchema).min(1) });
export const vocabSchema = vocabLessonSchema;
export const lessonMetaSchema = z.object({
  pageId: z.string(), order: z.number(), title: z.string(),
  words: z.number().optional(), meta: z.string().optional(),
  skill: z.enum(["vocab", "grammar", "hanzi"]),
});
export const courseSchema = z.object({ pages: z.array(lessonMetaSchema).min(1) });
```

Tạo `app-next/src/content/courses.ts`: copy mảng `hsk1Titles` (15 tên + số từ, `clone/js/data/courses.js:8-24`) và 3 hàm `genLessons/genGrammar/genHanzi` (dòng 26–54) + bảng số bài 7 sách — chuyển sang TS typed theo `LessonMeta`/`BookMeta`, thay `window.NHAI_DATA.courses` bằng `export const courses`. Giữ nguyên số liệu (`hsk2` 45 bài, `hsk3` 63 bài, `hsk7-9` 30 bài — xem `clone/js/data/courses.js:60-128`).

- [ ] **Step 4: Port vocab.ts**

Tạo `app-next/src/content/vocab.ts`: copy helper `perChar()` + `W()` từ `clone/js/data/vocab.js:10-29` (chuyển `NHAI.toPinyin` → import `toPinyin` từ `@/lib/pinyin-utils`, `PUNCT = /[，。？！、：；…—]/`), rồi copy TOÀN BỘ data 13 từ bài 1 + các bài 2–15 + demo các sách khác (dòng 31–317) thành `export const vocab`. Không bỏ sót từ nào — số từ mỗi bài phải khớp `courses.ts` (bài 1 = 13, bài 7 = 27…).

- [ ] **Step 5: Run test verify pass**

Run: `pnpm vitest run src/content`
Expected: PASS (5 tests — kể cả validate zod toàn bộ vocab).

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/content
git commit -m "feat: content modules courses + vocab (HSK1 15 bài, bài 1 đủ 13 từ thật) + zod schema validate"
```

### Task 8: Content `pinyin` + `radicals` + `strokeRules` + `soundrules`

**Files:**
- Create: `app-next/src/content/pinyin.ts` (port `clone/js/data/pinyin.js:1-16`)
- Create: `app-next/src/content/radicals.ts` (port `clone/js/data/radicals.js:1-8`)
- Create: `app-next/src/content/strokeRules.ts` (port `clone/js/data/stroke-rules.js:1-20`)
- Create: `app-next/src/content/soundrules.ts` (port `clone/js/data/soundrules.js:1-123`)
- Test: `app-next/src/content/__tests__/foundation-data.test.ts`

**Interfaces:**
- Consumes: Task 2.
- Produces:
  - `export const pinyinInitials: string[]` (22: "Ø" + 21 phụ âm), `export const pinyinFinals: string[]` (37), `export const pinyinValid: Record<string, Record<string, string>>` (initial→final→syllable không dấu), `export const pinyinExamples: Record<string, [string, string, string][]>` (âm tiết → từ ví dụ).
  - `export type Radical = { i: number; char: string; hanViet: string; meaning: string; strokes: number };` `export const radicals: Radical[];` (214).
  - `export type StrokeRule = { n: number; name: string; chars: string[]; desc: string };` `export const strokeRules: StrokeRule[];` (7) + `export const lastStrokes: { glyph: string; name: string }[]` (3: 辶/廴/ㄑ).
  - `export type ToneRow = { name: string; count: number; tones: { label: string; mark: string; pct: number }[]; examples: [string, string, string][] };` `export type SoundRule = { rule: string; examples: [string, string, string][] };` `export type SoundQuiz = { q: string; options: string[]; answer: number; explain: string };` `export const soundRulesData: { note: string; toneTotal: number; toneColors: Record<string, string>; toneRows: ToneRow[]; initialRules: SoundRule[]; finalRules: SoundRule[]; quiz: SoundQuiz[] };`

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/content/__tests__/foundation-data.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { pinyinInitials, pinyinFinals, pinyinValid } from "../pinyin";
import { radicals } from "../radicals";
import { strokeRules, lastStrokes } from "../strokeRules";
import { soundRulesData } from "../soundrules";

describe("pinyin data", () => {
  it("22 thanh mẫu, 37 vận mẫu, đủ 405 âm hợp lệ", () => {
    expect(pinyinInitials).toHaveLength(22);
    expect(pinyinFinals).toHaveLength(37);
    const cells = Object.values(pinyinValid).flatMap((f) => Object.values(f));
    expect(cells).toHaveLength(405);
    expect(pinyinValid["Ø"]["i"]).toBe("yi"); // Ø hàng: i -> yi
    expect(pinyinValid["j"]["u"]).toBeUndefined(); // j không ghép u
  });
});

describe("radicals data", () => {
  it("đủ 214 bộ, nhóm số nét đúng (1 nét 6 bộ, 2 nét 25 bộ)", () => {
    expect(radicals).toHaveLength(214);
    expect(radicals.filter((r) => r.strokes === 1)).toHaveLength(6);
    expect(radicals.filter((r) => r.strokes === 2)).toHaveLength(25);
    expect(radicals[0]).toMatchObject({ i: 1, char: "一", hanViet: "Nhất" });
  });
});

describe("stroke rules", () => {
  it("7 quy tắc đúng chữ ví dụ + 3 nét cuối", () => {
    expect(strokeRules.map((r) => r.chars[0])).toEqual(["爸", "月", "们", "国", "区", "夫", "女"]);
    expect(lastStrokes.map((s) => s.glyph)).toEqual(["辶", "廴", "ㄑ"]);
  });
});

describe("sound rules data", () => {
  it("bảng thanh điệu 6 hàng, quiz 5 câu", () => {
    expect(soundRulesData.toneRows).toHaveLength(6);
    expect(soundRulesData.toneRows[0]).toMatchObject({ name: "Ngang", count: 3094 });
    expect(soundRulesData.toneRows[0].tones[0]).toEqual({ label: "thanh 1", mark: "ā", pct: 61 });
    expect(soundRulesData.quiz).toHaveLength(5);
    expect(soundRulesData.note).toContain("9721");
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/content/__tests__/foundation-data.test.ts`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Port 4 file data**

Chuyển 4 IIFE `window.NHAI_DATA.*` thành TS exports (thay `NHAI_DATA.pinyin = {...}` → `export const pinyinValid = {...}` v.v.):
- `pinyin.ts`: copy `initials`/`finals`/`valid`/`examples` nguyên khối từ `clone/js/data/pinyin.js` (405 ô `valid` — copy y nguyên, KHÔNG tự sinh lại).
- `radicals.ts`: copy 214 bộ từ `clone/js/data/radicals.js` (file nguồn là data nén — copy y nguyên sang `export const radicals: Radical[]`).
- `strokeRules.ts`: copy `strokeRules` 7 quy tắc + `lastStrokes` từ `clone/js/data/stroke-rules.js`.
- `soundrules.ts`: copy `toneRows` (6 hàng: Ngang 3094/Sắc 2150/Nặng 1796/Huyền 1058/hỏi-ngã tổng hợp…), `initialRules`, `finalRules`, `quiz`, `note`, `toneColors` từ `clone/js/data/soundrules.js` thành `export const soundRulesData`.

- [ ] **Step 4: Run test verify pass**

Run: `pnpm vitest run src/content/__tests__/foundation-data.test.ts`
Expected: PASS 4 tests.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/content
git commit -m "feat: content modules pinyin (405 âm) + radicals (214 bộ) + strokeRules + soundrules"
```

### Task 9: Content `roadmap` (8 buổi) + `roadmapPinyin` (6 bước) + chặng E1

**Files:**
- Create: `app-next/src/content/roadmap.ts` (port `clone/js/data/roadmap.js:1-230`)
- Create: `app-next/src/content/roadmapPinyin.ts` (port `clone/js/data/roadmapPinyin.js:1-162`)
- Test: `app-next/src/content/__tests__/roadmap-data.test.ts`

**Interfaces:**
- Consumes: Task 2.
- Produces:
  - `export type SessionLearn = { tone: string; name: string; detail: string; ex: { hanzi: string; pinyin: string; meaning: string } };`
  - `export type SessionCard = { hanzi: string; pinyin: string; hv: string; meaning: string };`
  - `export type SessionQuiz = { q: string; options: string[]; answer: number; explain: string };`
  - `export type SessionTestItem = { kind: "quiz" | "written"; q: string; options?: string[]; answer?: number; explain?: string; accept?: string[] };`
  - `export type PinyinSession = { n: number; title: string; minutes: number; desc: string; learn: SessionLearn[]; cards: SessionCard[]; quiz: SessionQuiz[]; test: SessionTestItem[] };`
  - `export const roadmapSessions: PinyinSession[]` (8 buổi: "4 thanh cơ bản" 15 phút, "Thanh biến đổi" 18, "Nguyên âm & phụ âm" 20, "Tổng hợp âm tiết" 20, "Dấu thanh" 15, "Luyện đọc" 20, "Ngữ pháp cơ bản" 20, "Bài tổng kết" 25 — mỗi buổi ≥4 thẻ, 2 quiz, 2 test).
  - `export type PinyinStep = { key: string; label: string; title: string; intro: string; initials?: string[]; theory?: string; vowels?: { s: string; zh: string; vi: string }[]; groups?: { name: string; items: string[] }[]; tones?: { mark: string; name: string; desc: string; ex: string }[]; rules?: { rule: string; example: string }[]; links?: { label: string; href: string }[] };`
  - `export const roadmapPinyinSteps: PinyinStep[]` (6 bước: initials/finals/compound/tones/rules/overview — đúng nội dung `clone/js/data/roadmapPinyin.js`).
  - `export type RoadmapStage = { marker: string; book: string; level: string; title: string; desc: string; tags: string[] };`
  - `export const roadmapStages: RoadmapStage[]` (6 chặng E1: 拼音→`/roadmap/pinyin`, 1级→`/course/hsk1`, 2级→`/course/hsk2`, 3级→`/course/hsk3`, 4–6级→`/course/hsk4`, 7–9级→`/course/hsk79`; desc + tags đúng SPEC-05 §1) + `export const roadmapCopy = { badge: "🚧 Tính năng đang phát triển", yourJourney: "Hành trình của bạn 🚩", atNow: "Bạn đang ở: 拼音 · Bảng chữ cái Pinyin", continueCta: "Tiếp tục học", reviewDesc: "Ôn tập ngắt quãng (SRS) từ vựng & ngữ pháp đã học — thêm thẻ bằng nút ⭐ trong bài, đến hạn là vào ôn.", ending: "Đích đến: HSK 7–9 — đọc hiểu văn bản học thuật, báo chí chuyên sâu và giao tiếp thành thạo như người bản ngữ." };`

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/content/__tests__/roadmap-data.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { roadmapSessions } from "../roadmap";
import { roadmapPinyinSteps } from "../roadmapPinyin";

describe("roadmapSessions (8 buổi)", () => {
  it("đủ 8 buổi đúng tên + thời lượng", () => {
    expect(roadmapSessions).toHaveLength(8);
    expect(roadmapSessions[0]).toMatchObject({ n: 1, title: "4 thanh cơ bản", minutes: 15 });
    expect(roadmapSessions[7]).toMatchObject({ n: 8, title: "Bài tổng kết", minutes: 25 });
  });
  it("mỗi buổi >=4 learn, 6 cards, 2 quiz, 2 test", () => {
    for (const s of roadmapSessions) {
      expect(s.learn.length).toBeGreaterThanOrEqual(4);
      expect(s.cards).toHaveLength(6);
      expect(s.quiz).toHaveLength(2);
      expect(s.test).toHaveLength(2);
      for (const q of s.quiz) {
        expect(q.options).toHaveLength(4);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(4);
      }
    }
  });
  it("buổi 1 đúng 4 ô thanh ā/á/ǎ/à với ví dụ 妈/麻/马/骂", () => {
    expect(roadmapSessions[0].learn.map((l) => l.tone)).toEqual(["ā", "á", "ǎ", "à"]);
    expect(roadmapSessions[0].learn.map((l) => l.ex.hanzi)).toEqual(["妈", "麻", "马", "骂"]);
  });
});

describe("roadmapPinyinSteps (6 bước)", () => {
  it("đủ 6 bước đúng key + label", () => {
    expect(roadmapPinyinSteps.map((s) => s.label)).toEqual([
      "Thanh mẫu", "Vận mẫu đơn", "Vận mẫu ghép", "Thanh điệu", "Quy tắc đọc", "Tổng ôn pinyin",
    ]);
  });
  it("bước 1 đủ 23 phụ âm, bước 6 có links practice", () => {
    expect(roadmapPinyinSteps[0].initials).toHaveLength(23);
    expect(roadmapPinyinSteps[5].links).toEqual([
      { label: "Làm bài tập pinyin", href: "/pinyin/practice" },
      { label: "Xem lại bảng", href: "/pinyin" },
    ]);
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/content/__tests__/roadmap-data.test.ts`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Port roadmap.ts (8 buổi)**

Copy `sessions[8]` từ `clone/js/data/roadmap.js` thành `export const roadmapSessions` — giữ nguyên toàn bộ text tiếng Việt/tiếng Trung của `learn/cards/quiz/test` (nếu `test[]` trong nguồn dùng shape khác, chuẩn hoá về `SessionTestItem` với `kind: "quiz"` có `options/answer/explain` và `kind: "written"` có `q/accept` — `accept` = mảng pinyin chấp nhận được, so bằng `stripTones`).

- [ ] **Step 4: Port roadmapPinyin.ts (6 bước) + chặng E1**

Copy `steps[6]` từ `clone/js/data/roadmapPinyin.js` thành `export const roadmapPinyinSteps`. Thêm `roadmapStages` + `roadmapCopy` với nội dung đúng SPEC-05 §1 (HSK1 "500 từ vựng đầu tiên, mẫu câu cơ bản, chào hỏi và giao tiếp đời thường." tags [Từ vựng, Ngữ pháp]; HSK2 "Mở rộng vốn từ, ngữ pháp sơ cấp và hội thoại tình huống hằng ngày." tags [Từ vựng, Ngữ pháp, Nghe hiểu]; HSK3 "Hoàn thiện sơ cấp: đọc đoạn văn ngắn, kể chuyện và diễn đạt ý kiến đơn giản." tags [Từ vựng, Ngữ pháp, Luyện đề]; HSK4–6 "Trung cấp: đọc hiểu bài dài, ngữ pháp nâng cao và luyện đề theo cấp độ." tags [Từ vựng, Ngữ pháp, Luyện đề]; HSK7–9 "Cao cấp: văn bản học thuật, chuyên ngành và chiến lược thi thật." tags [Từ vựng, Nghe hiểu, Luyện đề]).

- [ ] **Step 5: Run test verify pass + commit**

Run: `pnpm vitest run src/content/__tests__/roadmap-data.test.ts`
Expected: PASS 3 tests.

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/content
git commit -m "feat: content modules roadmap (8 buổi pinyin) + roadmapPinyin (6 bước) + 6 chặng lộ trình"
```

---

# Phase 2 — Shell

### Task 10: Shell — ThemeProvider, ToastProvider, Topbar, SidebarNav, SettingsModal, LoginModal

**Files:**
- Create: `app-next/src/components/shell/theme-provider.tsx`, `toast-provider.tsx`, `topbar.tsx`, `sidebar-nav.tsx`, `settings-modal.tsx`, `login-modal.tsx`
- Modify: `app-next/src/app/layout.tsx` (root — mount shell), `app-next/src/app/(app)/layout.tsx` (container)
- Test: `app-next/src/components/shell/__tests__/toast-provider.test.tsx`, `app-next/src/components/shell/__tests__/login-modal.test.tsx`
- Port-from: `clone/js/shell.js:1-484`, `clone/TEMPLATE.html` (topbar/sidebar markup), `clone/js/pinyin-utils.js` không liên quan

**Interfaces:**
- Consumes: Task 3 (theme classes), Task 6 (`useProgress` → `{ xp }`, `progressStore`), Task 5 (`useTts` cho preview voice).
- Produces (contract plan sp1-social-legal phụ thuộc):
  - `app-next/src/components/shell/toast-provider.tsx`: `export function useToast(): (msg: string) => void` — toast tự ẩn sau 2600ms, chỉ 1 toast tại một thời điểm (class `.toast`).
  - Root `src/app/layout.tsx` render: `<ThemeProvider>` → `<ToastProvider>` → `<LoginProvider>` → `<Topbar />` + `<SidebarNav />` + `{children}` + `<SettingsModal />` + `<LoginModal />` + `<div data-ai-slot />`.
  - `export function useLoginModal(): { isOpen: boolean; openLogin: () => void; close: () => void }` (context; `openLogin` từ bất kỳ trang nào — B2/C8 dùng).
  - `export function useTheme(): { theme: "light" | "dark"; setTheme: (t: "light" | "dark") => void }` (key `nhai.theme`, toggle `html.dark`).
  - Topbar: logo + seal đỏ, span `⚡ <xp>` từ `useProgress()`, `<div data-bell-slot />`, nút "Đăng nhập"/avatar mock (mở LoginModal; logout xoá `nhai.mockLogin`).
  - SidebarNav: 8 mục đúng `clone/js/shell.js` — Trang chủ `/`, Nền tảng (con: `/pinyin`, `/pinyin/practice`, `/radicals`, `/sound-rules`), Cá nhân hoá (con: `/review`, `/progress`, `/my-vocab`), Tra từ điển (con: `/dictionary`, `/hanzi`), Shadowing `/shadowing`, Bài khoá `/course`, Luyện thi chứng chỉ `/certificate-test`, Tạo file `/create-file`; active state theo `usePathname`; mobile hamburger.
  - SettingsModal: theme sáng/tối, giọng TTS nữ/nam (`nhai.voice`), flags `nhai.chatBubble`/`nhai.selectionLookup` (`!== "0"` = bật mặc định).
  - LoginModal: 3 nút Google/Apple/Email mock — bấm bất kỳ → set `nhai.mockLogin = "1"`, `nhai.mockName` = chữ trong input (mặc định "T"), đóng modal, reload nhẹ (dispatch `nhai:progress`).

- [ ] **Step 1: Write the failing tests**

Tạo `app-next/src/components/shell/__tests__/toast-provider.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from "../toast-provider";

function Fire() {
  const toast = useToast();
  return <button onClick={() => toast("Đã thêm vào ôn tập")}>fire</button>;
}

describe("useToast", () => {
  it("hiện toast rồi tự ẩn sau 2600ms, chỉ 1 toast tại một thời điểm", () => {
    vi.useFakeTimers();
    render(<ToastProvider><Fire /></ToastProvider>);
    act(() => screen.getByText("fire").click());
    expect(screen.getByText("Đã thêm vào ôn tập")).toBeInTheDocument();
    act(() => screen.getByText("fire").click()); // toast thứ 2 thay thế
    act(() => vi.advanceTimersByTime(2600));
    expect(screen.queryByText("Đã thêm vào ôn tập")).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
```

Tạo `app-next/src/components/shell/__tests__/login-modal.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LoginProvider, LoginModal, useLoginModal } from "../login-modal";

function Trigger() {
  const { openLogin } = useLoginModal();
  return <button onClick={openLogin}>mở</button>;
}

beforeEach(() => localStorage.clear());

describe("LoginModal (mock)", () => {
  it("openLogin mở modal; bấm Google mock set nhai.mockLogin=1 và đóng", () => {
    render(<LoginProvider><Trigger /><LoginModal /></LoginProvider>);
    act(() => screen.getByText("mở").click());
    expect(screen.getByText(/Đăng nhập/)).toBeInTheDocument();
    act(() => screen.getByRole("button", { name: /Google/ }).click());
    expect(localStorage.getItem("nhai.mockLogin")).toBe("1");
  });
});
```

- [ ] **Step 2: Run tests verify fail**

Run: `pnpm vitest run src/components/shell`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement providers + modals**

- `toast-provider.tsx`: context giữ 1 message; `useToast` trả callback set message + setTimeout 2600ms clear (clear timeout cũ khi gọi lần nữa). Toast render `<div className="toast">{msg}</div>`.
- `theme-provider.tsx`: state từ `localStorage.getItem("nhai.theme") || "light"`; `setTheme` ghi + `document.documentElement.classList.toggle("dark", t === "dark")`.
- `login-modal.tsx`: `LoginProvider` (state isOpen) + `LoginModal` dùng `useLoginModal()`; 3 nút Google/Apple/Email + input tên; markup `.modal-backdrop` + `.card .shadow-neo` (port `clone/js/shell.js:300-355`).
- `settings-modal.tsx`: port `clone/js/shell.js:365-403` — 2 pill theme, 2 pill voice, 2 checkbox flags; ghi localStorage + áp theme ngay.

- [ ] **Step 4: Implement Topbar + SidebarNav + layouts**

- `topbar.tsx`: port markup topbar từ `clone/TEMPLATE.html` + `clone/js/shell.js:359-363` — logo + seal, `⚡ {xp}` (useProgress), `<div data-bell-slot />`, nút Đăng nhập (nếu `nhai.mockLogin !== "1"`) / avatar 2 chữ từ `nhai.mockName` + Đăng xuất.
- `sidebar-nav.tsx`: mảng mục + dropdown con (state `open`), `usePathname` active đỏ (`pill-active`), mobile: button hamburger toggle.
- Root `app-next/src/app/layout.tsx`:

```tsx
import { ThemeProvider } from "@/components/shell/theme-provider";
import { ToastProvider } from "@/components/shell/toast-provider";
import { LoginProvider, LoginModal } from "@/components/shell/login-modal";
import Topbar from "@/components/shell/topbar";
import SidebarNav from "@/components/shell/sidebar-nav";
import SettingsModal from "@/components/shell/settings-modal";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <LoginProvider>
              <Topbar />
              <div className="flex">
                <SidebarNav />
                <main className="flex-1">{children}</main>
              </div>
              <SettingsModal />
              <LoginModal />
              <div data-ai-slot />
            </LoginProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- Tạo `app-next/src/app/(app)/layout.tsx`: `export default function AppLayout({ children }: { children: React.ReactNode }) { return <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>; }` — mọi trang của plan này đặt dưới `(app)/`.

- [ ] **Step 5: Run tests verify pass + smoke dev**

Run: `pnpm vitest run src/components/shell`
Expected: PASS 2 test files.
Run `pnpm dev` → `/` có topbar (⚡ 0), sidebar 8 mục, nút Đăng nhập mở modal mock, settings đổi theme sang tối được.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: shell (ThemeProvider/ToastProvider/Topbar/SidebarNav/SettingsModal/LoginModal mock) + (app) layout"
```

---

# Phase 3 — Lesson engine (C1–C11)

### Task 11: `LessonProvider` + route `/lesson/[book]/[page]` (C1)

**Files:**
- Create: `app-next/src/components/lesson/lesson-provider.tsx`, `app-next/src/components/lesson/lesson-client.tsx`, `app-next/src/components/lesson/modes/index.ts`
- Create: `app-next/src/app/(app)/lesson/[book]/[page]/page.tsx`
- Test: `app-next/src/components/lesson/__tests__/lesson-provider.test.tsx`
- Port-from: `clone/js/lesson.js:1-294` (state machine + header + sidebar), `clone/specs/SPEC-02-vocab-lesson.md` §Layout

**Interfaces:**
- Consumes: Task 7 (`vocab`, `VocabWord`), Task 6 (`progressStore`), Task 10 (shell).
- Produces:
  - `export type LessonMode = "flash" | "quiz" | "typing" | "reading" | "listen" | "dance" | "battle";`
  - `export type LessonItem = VocabWord & { index: number; itemKey: string };` (`itemKey = "<book>.<page>.<index>"` hoặc `"deck.<deckId>.<ord>"` cho Task 18).
  - `export type KnownFlag = "known" | "unknown";`
  - `export function LessonProvider({ items, book, page, deckName, children }: { items: LessonItem[]; book?: string; page?: string; deckName?: string; children: React.ReactNode }): JSX.Element` — context: `{ items, book, page, deckName, mode, setMode(m: LessonMode): void, index, setIndex(i: number): void, known: Record<number, KnownFlag>, markKnown(i: number, f: KnownFlag): void }`. Unmount/mode-change dọn tài nguyên bằng useEffect return ở từng mode (provider chỉ giữ state; không timer nào ở đây).
  - `app-next/src/components/lesson/modes/index.ts`: `export const modeRegistry: Record<LessonMode, React.ComponentType>` + `export const modeLabels: Record<LessonMode, { name: string; badge: string }>`.
  - Server page `page.tsx`: `params: Promise<{ book: string; page: string }>` (Next 15 async params) — đọc `vocab[book]?.[page]`, 404 nếu không có (import { notFound } from "next/navigation"); truyền `items` vào `<LessonClient>`. Header: link "← Danh sách bài" (`/course/[book]?skill=vocab`), badge "Bài N" nền đen, pill "N từ vựng", `h1` + mascot 🍅 (chi tiết visual Task 19 — C11; ở task này để cấu trúc đúng trước).

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/lesson/__tests__/lesson-provider.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LessonProvider, useLesson } from "../lesson-provider";
import type { LessonItem } from "../lesson-provider";

const items: LessonItem[] = [
  { hanzi: "你好", pinyin: "nǐ hǎo", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ",
    example: { zh: "李明，你好。", pinyinPerChar: [], vi: "Chào Lý Minh" }, index: 0, itemKey: "hsk1.lesson-1.0" },
];

function Probe() {
  const { mode, setMode, index, setIndex, known, markKnown } = useLesson();
  return (
    <div>
      <span data-mode={mode} data-index={index} />
      <button onClick={() => setMode("quiz")}>to-quiz</button>
      <button onClick={() => setIndex(1)}>next</button>
      <button onClick={() => markKnown(0, "known")}>known</button>
      <span data-known={known[0] ?? "none"} />
    </div>
  );
}

describe("LessonProvider state machine", () => {
  it("mode mặc định flash, setMode/setIndex/markKnown cập nhật", () => {
    render(
      <LessonProvider items={items} book="hsk1" page="lesson-1">
        <Probe />
      </LessonProvider>
    );
    expect(screen.querySelector("[data-mode='flash']")).toBeTruthy(); // mode mặc định
    act(() => screen.getByText("to-quiz").click());
    expect(screen.querySelector("[data-mode='quiz']")).toBeTruthy();
    act(() => screen.getByText("next").click());
    expect(screen.querySelector("[data-index='1']")).toBeTruthy();
    act(() => screen.getByText("known").click());
    expect(screen.querySelector("[data-known='known']")).toBeTruthy();
  });
});
```

(Sửa lại assertion dùng `container.querySelector` qua `render(...).container` — mục đích test: mode mặc định `"flash"`, đổi mode/index/known hoạt động.)

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/components/lesson`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement LessonProvider**

`lesson-provider.tsx` — `"use client"`; context + reducer đơn giản (`mode: LessonMode = "flash"`, `index = 0`, `known: Record<number, KnownFlag> = {}`); export `useLesson()` (throw nếu ngoài provider).

- [ ] **Step 4: Implement mode registry + LessonClient khung**

`modes/index.ts` — 7 mode bắt đầu bằng placeholder component hợp lệ (task sau thay từng cái — mỗi placeholder render `<div>{/* mode:<tên> — thay ở Task 12–17 */}</div>`; registry là điểm thay):

```ts
"use client";
import type { LessonMode } from "../lesson-provider";
import FlashcardMode from "./flashcard";
import QuizMode from "./quiz";
import TypingMode from "./typing";
import ReadingMode from "./reading";
import ListenMode from "./listen";
import DanceMode from "./dance";
import BattleMode from "./battle";

export const modeRegistry: Record<LessonMode, React.ComponentType> = {
  flash: FlashcardMode, quiz: QuizMode, typing: TypingMode,
  reading: ReadingMode, listen: ListenMode, dance: DanceMode, battle: BattleMode,
};
export const modeLabels: Record<LessonMode, { name: string; badge: string }> = {
  flash: { name: "Flashcard", badge: "" },
  quiz: { name: "Trắc nghiệm", badge: "" },
  typing: { name: "Gõ từ", badge: "" },
  reading: { name: "Đọc hiểu", badge: "" },
  listen: { name: "Nghe ghép câu", badge: "" },
  dance: { name: "Hanzi Dance", badge: "Chưa học" },
  battle: { name: "Đấu trí", badge: "Xếp hạng" },
};
```

`lesson-client.tsx` — bọc `LessonProvider`, render: hàng tabs "Từ vựng/Ví dụ" + counter pill "1 / N" ở giữa (state tab `example` hiện list câu ví dụ: `example.zh` + `pinyinLine(example.pinyinPerChar)` + dịch + nút 🔊 useTts); khu mode = `const Mode = modeRegistry[mode]; <Mode />`; sidebar "Chọn chế độ học" 7 nút (`modeLabels`, active `pill-active`) + nút "In file" + "Thêm cả bài vào ôn tập" (đ Tasks 18) — port bố cục `clone/js/lesson.js:180-230`.

Server `page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { vocab } from "@/content/vocab";
import LessonClient from "@/components/lesson/lesson-client";
import type { LessonItem } from "@/components/lesson/lesson-provider";

export default async function LessonPage({ params }: { params: Promise<{ book: string; page: string }> }) {
  const { book, page } = await params;
  const lesson = vocab[book]?.[page];
  if (!lesson) notFound();
  const items: LessonItem[] = lesson.words.map((w, i) => ({ ...w, index: i, itemKey: `${book}.${page}.${i}` }));
  return <LessonClient items={items} book={book} page={page} />;
}
```

- [ ] **Step 5: Run test verify pass + smoke**

Run: `pnpm vitest run src/components/lesson` → PASS. `pnpm dev` → mở `/lesson/hsk1/lesson-1`: header + tabs + sidebar 7 nút đổi được (placeholder mode), counter "1 / 13".

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: LessonProvider state machine + lesson route shell + 7-mode registry (C1)"
```

### Task 12: Mode Flashcard (C2) + `useKeyboard`

**Files:**
- Create: `app-next/src/components/lesson/modes/flashcard.tsx`, `app-next/src/lib/use-keyboard.ts`
- Modify: `app-next/src/components/lesson/modes/index.ts` (bỏ placeholder flashcard — đã thật)
- Test: `app-next/src/lib/__tests__/use-keyboard.test.ts`, `app-next/src/components/lesson/__tests__/flashcard.test.tsx`
- Port-from: `clone/js/lesson-flashcard.js` (toàn bộ), `clone/specs/SPEC-02-vocab-lesson.md` §1, `clone/specs/SPEC-14-lesson-polish.md` §3–5

**Interfaces:**
- Consumes: Task 11 (`useLesson`: `items/index/setIndex/known/markKnown`), Task 5 (`useTts`, `shuffle`).
- Produces:
  - `export function useKeyboard(handlers: Record<string, (e: KeyboardEvent) => void>): void` — key là `event.key` ("ArrowLeft", "a", "x"…); BỎ qua khi `e.target` là `input/textarea/select` hoặc `isContentEditable`.
  - `export default function FlashcardMode(): JSX.Element` — không props, đọc `useLesson()`.
  - State flashcard: `flipped`, `dir: "zh-vi" | "vi-zh"`, `auto` (tự động phát âm + next), `shuffled` (deck xáo trộn — thứ tự local, không đổi `items` gốc), `autoplayCfg { intervalSec: 2 | 3 | 5; speakOn: boolean }` (⚙ popover đơn giản).

- [ ] **Step 1: Write the failing tests**

Tạo `app-next/src/lib/__tests__/use-keyboard.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboard } from "../use-keyboard";

function press(key: string, target?: Partial<HTMLElement>) {
  const e = new KeyboardEvent("keydown", { key, bubbles: true });
  Object.defineProperty(e, "target", { value: target ?? window });
  window.dispatchEvent(e);
}

describe("useKeyboard", () => {
  it("gọi handler theo key", () => {
    const onArrowLeft = vi.fn();
    renderHook(() => useKeyboard({ ArrowLeft: onArrowLeft }));
    press("ArrowLeft");
    expect(onArrowLeft).toHaveBeenCalledTimes(1);
  });
  it("bỏ qua phím khi đang focus input", () => {
    const onA = vi.fn();
    renderHook(() => useKeyboard({ a: onA }));
    press("a", { tagName: "INPUT", isContentEditable: false });
    expect(onA).not.toHaveBeenCalled();
  });
});
```

Tạo `app-next/src/components/lesson/__tests__/flashcard.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LessonProvider, useLesson, type LessonItem } from "../lesson-provider";
import FlashcardMode from "../modes/flashcard";

const words: LessonItem[] = [0, 1].map((i) => ({
  hanzi: `字${i}`, pinyin: `zì${i}`, hanViet: "TỰ", meaning: `nghĩa ${i}`, pos: "Danh từ",
  example: { zh: `例${i}`, pinyinPerChar: [], vi: `ví dụ ${i}` }, index: i, itemKey: `hsk1.lesson-1.${i}`,
}));

function Harness() {
  const { known } = useLesson();
  return (
    <LessonProvider items={words} book="hsk1" page="lesson-1">
      <FlashcardMode />
      <span data-testid="known0">{known[0] ?? "none"}</span>
    </LessonProvider>
  );
}

beforeEach(() => localStorage.clear());

describe("FlashcardMode", () => {
  it("lật thẻ khi click (mặt sau hiện pinyin + nghĩa)", async () => {
    render(<Harness />);
    expect(screen.queryByText(/NHĨ|TỰ/)).not.toBeInTheDocument(); // ước mặt trước chưa lộ nghĩa
    await act(async () => screen.getByText(/Click để lật/).click());
    expect(screen.getByText("nghĩa 0")).toBeInTheDocument();
  });
  it("nút 'Đã thuộc' đánh dấu known + sang thẻ sau", async () => {
    render(<Harness />);
    await act(async () => screen.getByRole("button", { name: /Đã thuộc/ }).click());
    expect(screen.getByTestId("known0").textContent).toBe("known");
    expect(screen.getByText("字1")).toBeInTheDocument();
  });
  it("phím ArrowUp = Đã thuộc, ArrowRight = thẻ sau", async () => {
    render(<Harness />);
    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" })));
    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" })));
    expect(screen.getByText("字1")).toBeInTheDocument();
  });
  it("Xáo trộn đổi thứ tự deck", async () => {
    render(<Harness />);
    await act(async () => screen.getByRole("button", { name: /Xáo trộn/ }).click());
    const hanzi = ["字0", "字1"];
    expect(hanzi.includes(screen.getByText(/字[01]/).textContent!)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests verify fail**

Run: `pnpm vitest run src/lib/__tests__/use-keyboard.test.ts src/components/lesson/__tests__/flashcard.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement useKeyboard**

```ts
"use client";
import { useEffect, useRef } from "react";

export function useKeyboard(handlers: Record<string, (e: KeyboardEvent) => void>): void {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable)) return;
      ref.current[e.key]?.(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
```

- [ ] **Step 4: Implement FlashcardMode**

Port `clone/js/lesson-flashcard.js` sang JSX:
- Hàng controls 1 hàng (SPEC-14 §3): toggle chiều "ZH → VI"/"VI → ZH", "Tự động", "Xáo trộn", ⚙ (mở popover `autoplayCfg`), 🔊 `speak(item.hanzi, { lang: "zh-CN" })`.
- Thẻ 3D flip: wrapper `perspective` + inner `transform-style: preserve-3d; transition: transform .5s` + `rotateY(180deg)` khi flipped; mặt trước `h2` chữ Hán to + pill `pos` + "Click để lật"; mặt sau nền `#f7e9c8` pinyin + `hanViet` + meaning.
- 4 nút nav NGOÀI card (hàng riêng dưới card, full-width `justify-center`): `‹ Trước` (btn-ghost) · `✕ Chưa thuộc` (nền `#c03922` trắng) · `✓ Đã thuộc` (nền `#2e7d32` trắng) · `Sau ›` (btn-ghost), `px-8 py-2.5`. Nav bọc index trong `[0, items.length-1]`.
- Keyboard: `useKeyboard({ ArrowLeft: prev, a: prev, ArrowDown: unknown, x: unknown, ArrowUp: known, z: known, ArrowRight: next, d: next })` — `known` = `markKnown(index, "known"); setIndex(index + 1)`.
- "Tự động": useEffect khi bật — interval theo `autoplayCfg.intervalSec` (mặc định 2s): nếu `speakOn` thì `speak`, rồi `setIndex(index+1)`; **return `clearInterval`** trong useEffect.

- [ ] **Step 5: Run tests verify pass + smoke**

Run: `pnpm vitest run src/lib/__tests__/use-keyboard.test.ts src/components/lesson/__tests__/flashcard.test.tsx`
Expected: PASS. `pnpm dev` → `/lesson/hsk1/lesson-1`: lật được, phím tắt chạy, badge sidebar đổi màu khi Đã thuộc (sidebar task 11 đọc `known`).

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: flashcard mode (3D flip, ZH-VI toggle, keyboard, autoplay) + useKeyboard hook (C2)"
```

### Task 13: Mode Quiz (C3)

**Files:**
- Create: `app-next/src/components/lesson/modes/quiz.tsx`
- Modify: `app-next/src/components/lesson/modes/index.ts`
- Test: `app-next/src/components/lesson/__tests__/quiz.test.tsx`
- Port-from: `clone/js/lesson-quiz.js` (toàn bộ)

**Interfaces:**
- Consumes: Task 11 (`useLesson`), Task 5 (`useTts`, `shuffle`), Task 6 (`progressStore.addXp`, `useProgress`), Task 10 (`useToast`).
- Produces:
  - `export default function QuizMode(): JSX.Element`
  - `export function pickDistractors(all: LessonItem[], correct: LessonItem, n?: number): LessonItem[]` (export để test thuần — lấy `n=3` item KHÁC từ cùng bài, không trùng nhau; fallback lặp nếu bài < 4 từ).

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/lesson/__tests__/quiz.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LessonProvider, type LessonItem } from "../lesson-provider";
import QuizMode, { pickDistractors } from "../modes/quiz";
import { progressStore } from "@/lib/store/progress-store";

const mk = (i: number): LessonItem => ({
  hanzi: `词${i}`, pinyin: `cí${i}`, hanViet: "TỪ", meaning: `nghĩa ${i}`, pos: "Danh từ",
  example: { zh: "例", pinyinPerChar: [], vi: "ví dụ" }, index: i, itemKey: `hsk1.lesson-1.${i}`,
});
const words = [0, 1, 2, 3].map(mk);

beforeEach(() => localStorage.clear());

describe("pickDistractors", () => {
  it("3 nhiễu từ cùng bài, không chứa đáp án đúng, không trùng", () => {
    const d = pickDistractors(words, words[0]);
    expect(d).toHaveLength(3);
    expect(d.every((x) => x.index !== 0)).toBe(true);
    expect(new Set(d.map((x) => x.index)).size).toBe(3);
  });
});

describe("QuizMode", () => {
  it("chọn đúng -> +1 XP; 'Không biết' không cộng XP", () => {
    render(
      <LessonProvider items={words} book="hsk1" page="lesson-1">
        <QuizMode />
      </LessonProvider>
    );
    const xpBefore = progressStore.getXp();
    act(() => screen.getByRole("button", { name: `cí0` }).click()); // đáp án đúng (pinyin của từ 0)
    expect(progressStore.getXp()).toBe(xpBefore + 1);
    act(() => screen.getByRole("button", { name: /Không biết/ }).click());
    expect(progressStore.getXp()).toBe(xpBefore + 1);
  });
  it("chọn sai -> viền đỏ, tự sang câu kế sau 800ms", () => {
    vi.useFakeTimers();
    render(
      <LessonProvider items={words} book="hsk1" page="lesson-1">
        <QuizMode />
      </LessonProvider>
    );
    const wrong = screen.getAllByRole("button").find((b) => b.textContent === "cí1")!;
    act(() => wrong.click());
    expect(wrong.className).toContain("border-red");
    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByText(/2 \/ 4/)).toBeInTheDocument();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/components/lesson/__tests__/quiz.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement QuizMode**

Port `clone/js/lesson-quiz.js`:
- Toggle "Cài đặt hiển thị đề bài": 3 pill Cách đọc/Từ vựng/Ý nghĩa (state `promptMode`); đề luôn hiện đủ chữ Hán + `hanViet` + meaning theo SPEC-02 (toggle chỉ nhấn mạnh phần được chọn — giữ hành vi clone: các phần không chọn ẩn).
- Mỗi câu: `const opts = shuffle([correct, ...pickDistractors(items, correct)])` 4 nút pinyin; đúng → viền xanh + `progressStore.addXp(1)` + toast "⚡ +1 XP" + setTimeout 800ms `setIndex(index+1)`; sai → viền đỏ + class rung `animate-[shake_0.4s]` (định nghĩa keyframes `shake` trong globals.css nếu chưa có: translateX ±6px); "Không biết" → sang câu kế KHÔNG cộng XP; "Nghe phát âm gợi ý" → `speak(correct.hanzi)` + caption "Bí quá thì nghe".
- Timer 800ms trong useEffect return clearTimeout.

- [ ] **Step 4: Run test verify pass + commit**

Run: `pnpm vitest run src/components/lesson/__tests__/quiz.test.tsx`
Expected: PASS 3 tests.

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: quiz mode (4-option pinyin MCQ, distractors cùng bài, +1 XP, rung 800ms) (C3)"
```

### Task 14: Mode Typing (C4)

**Files:**
- Create: `app-next/src/components/lesson/modes/typing.tsx`
- Modify: `app-next/src/components/lesson/modes/index.ts`
- Test: `app-next/src/components/lesson/__tests__/typing.test.tsx`
- Port-from: `clone/js/lesson-typing.js` (toàn bộ — logic parser đã tách ở Task 5 `toPinyin`)

**Interfaces:**
- Consumes: Task 11 (`useLesson`), Task 5 (`toPinyin`, `stripTones`, `splitPinyin`), Task 6 (`progressStore.addXp`).
- Produces: `export default function TypingMode(): JSX.Element` + `export function checkTyped(input: string, expected: string): boolean` (chuẩn hoá 2 bên qua `stripTones` — chấp nhận chuỗi số tương đương dấu: `"ni3 hao3"` đúng với `"nǐ hǎo"`).

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/lesson/__tests__/typing.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonProvider, type LessonItem } from "../lesson-provider";
import TypingMode, { checkTyped } from "../modes/typing";
import { progressStore } from "@/lib/store/progress-store";

const word: LessonItem = {
  hanzi: "你好", pinyin: "nǐ hǎo", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ",
  example: { zh: "李明，你好。", pinyinPerChar: [], vi: "Chào Lý Minh" }, index: 0, itemKey: "hsk1.lesson-1.0",
};

beforeEach(() => localStorage.clear());

describe("checkTyped", () => {
  it("chấp nhận input số tương đương dấu", () => {
    expect(checkTyped("ni3 hao3", "nǐ hǎo")).toBe(true);
    expect(checkTyped("ni hao", "nǐ hǎo")).toBe(true); // không gõ thanh vẫn đúng (stripTones 2 bên)
    expect(checkTyped("ni3 hao4", "nǐ hǎo")).toBe(false);
  });
});

describe("TypingMode", () => {
  it("gõ đúng -> +1 XP + tự sang thẻ sau", async () => {
    const user = userEvent.setup();
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><TypingMode /></LessonProvider>);
    const xpBefore = progressStore.getXp();
    await user.type(screen.getByPlaceholderText(/Gõ pinyin/), "ni3 hao3");
    await act(async () => screen.getByRole("button", { name: /Kiểm tra/ }).click());
    expect(progressStore.getXp()).toBe(xpBefore + 1);
  });
  it("Gợi ý mở dần từng ký tự, tối đa 5", async () => {
    const user = userEvent.setup();
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><TypingMode /></LessonProvider>);
    await user.click(screen.getByRole("button", { name: /Gợi ý \(0\/5\)/ }));
    await user.click(screen.getByRole("button", { name: /Gợi ý \(1\/5\)/ }));
    expect(screen.getByText("n")).toBeInTheDocument(); // ký tự đầu "nǐ hǎo" đã lộ
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/components/lesson/__tests__/typing.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement TypingMode**

Port `clone/js/lesson-typing.js`:
- Toggle đề: Cách đọc/Âm Hán/Chữ Hán (ẩn phần không chọn).
- Hàng ô trống: `splitPinyin(item.pinyin).length` ô (dưới dạng hàng `_` cách nhau); 1 input duy nhất placeholder "Gõ pinyin, số là thanh điệu (ni3 → nǐ)".
- `checkTyped(input, expected)` = `stripTones(toPinyin(input)).replace(/\s+/g, " ").trim() === stripTones(expected).replace(/\s+/g, " ").trim()`; export thuần để test.
- "Gợi ý (k/5)": state `hints` 0→5; mỗi bấm +1; phần gợi ý hiển thị = `expected.slice(0, hints)`; đạt 5 nút disabled.
- "Kiểm tra": đúng → viền xanh + `addXp(1)` + setTimeout 800ms `setIndex(index+1)`; sai → viền đỏ + rung, giữ input để sửa.

- [ ] **Step 4: Run test verify pass + commit**

Run: `pnpm vitest run src/components/lesson/__tests__/typing.test.tsx`
Expected: PASS 3 tests.

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: typing mode (pinyin số -> dấu, 5 gợi ý, chấm bỏ qua kiểu gõ thanh) (C4)"
```

### Task 15: Mode Reading cloze (C5) + Mode Listen (C6)

**Files:**
- Create: `app-next/src/components/lesson/modes/reading.tsx`, `app-next/src/components/lesson/modes/listen.tsx`
- Modify: `app-next/src/components/lesson/modes/index.ts`
- Test: `app-next/src/components/lesson/__tests__/reading.test.tsx`, `app-next/src/components/lesson/__tests__/listen.test.tsx`
- Port-from: `clone/js/lesson-reading.js`, `clone/js/lesson-listen.js`

**Interfaces:**
- Consumes: Task 11, Task 5 (`useTts` với `rate`, `shuffle`, `splitPinyin`), Task 6 (`addXp`).
- Produces:
  - `export default function ReadingMode(): JSX.Element` + `export function clozeZh(zh: string, hanzi: string): { before: string; blank: string; after: string }` — tách câu ví dụ quanh vị trí từ đang học (dùng `zh.indexOf(hanzi)`; fallback thay 2 ký tự đầu nếu không tìm thấy).
  - `export default function ListenMode(): JSX.Element` + `export const listenRates: number[] = [0.5, 0.8, 1, 1.5, 2];`

- [ ] **Step 1: Write the failing tests**

Tạo `app-next/src/components/lesson/__tests__/reading.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LessonProvider, type LessonItem } from "../lesson-provider";
import ReadingMode, { clozeZh } from "../modes/reading";

const word: LessonItem = {
  hanzi: "你好", pinyin: "nǐ hǎo", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ",
  example: { zh: "李明，你好。", pinyinPerChar: [], vi: "Chào Lý Minh" }, index: 0, itemKey: "hsk1.lesson-1.0",
};

beforeEach(() => localStorage.clear());

describe("clozeZh", () => {
  it("tách đúng vị trí từ trong câu", () => {
    expect(clozeZh("李明，你好。", "你好")).toEqual({ before: "李明，", blank: "你好", after: "。" });
  });
});

describe("ReadingMode", () => {
  it("hiện chỗ trống + bản dịch; 'Câu này bó tay' không cộng XP", () => {
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><ReadingMode /></LessonProvider>);
    expect(screen.getByText(/李明，/)).toBeInTheDocument();
    expect(screen.getByText(/Chào Lý Minh/)).toBeInTheDocument();
    act(() => screen.getByRole("button", { name: /Câu này bó tay/ }).click());
    // không XP nào được cộng (không assert trên store vì bó tay không đụng store) — sang câu kế/kết thúc
    expect(screen.queryByRole("button", { name: /Câu này bó tay/ })).not.toBeInTheDocument();
  });
});
```

Tạo `app-next/src/components/lesson/__tests__/listen.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LessonProvider, type LessonItem } from "../lesson-provider";
import ListenMode, { listenRates } from "../modes/listen";

const word: LessonItem = {
  hanzi: "你好", pinyin: "nǐ hǎo", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ",
  example: { zh: "李明，你好。", pinyinPerChar: [], vi: "Chào Lý Minh" }, index: 0, itemKey: "hsk1.lesson-1.0",
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn(), getVoices: vi.fn(() => []), speaking: false });
});

describe("ListenMode", () => {
  it("5 mức tốc độ, active đỏ, 'Nghe câu' phát với rate đang chọn", async () => {
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><ListenMode /></LessonProvider>);
    expect(listenRates).toEqual([0.5, 0.8, 1, 1.5, 2]);
    await act(async () => screen.getByRole("button", { name: "2x" }).click());
    await act(async () => screen.getByRole("button", { name: /Nghe câu/ }).click());
    const u = (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(u.rate).toBe(2);
  });
  it("ghép đúng thứ tự chữ -> xanh + +1 XP; 'Gõ lại' reset về pool", async () => {
    const { progressStore } = await import("@/lib/store/progress-store");
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><ListenMode /></LessonProvider>);
    const xpBefore = progressStore.getXp();
    for (const ch of ["李", "明", "，", "你", "好", "。"]) {
      await act(async () => screen.getByRole("button", { name: ch }).click());
    }
    await act(async () => screen.getByRole("button", { name: /Ghép câu/ }).click());
    expect(progressStore.getXp()).toBe(xpBefore + 1);
    await act(async () => screen.getByRole("button", { name: /Gõ lại/ }).click());
    expect(screen.getByRole("button", { name: "李" })).toBeInTheDocument(); // về pool
  });
});
```

- [ ] **Step 2: Run tests verify fail**

Run: `pnpm vitest run src/components/lesson/__tests__/reading.test.tsx src/components/lesson/__tests__/listen.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement ReadingMode**

Port `clone/js/lesson-reading.js`: đề = `clozeZh(example.zh, item.hanzi)` — chỗ trống render ô gạch dưới `____` thay `blank`; bản dịch `example.vi` hiện sẵn; 4 đáp án chữ Hán = từ đúng + 3 hanzi khác trong cùng bài (shuffle); "Câu này bó tay" → `setIndex(index+1)` không XP; toggle "Nghĩa" ẩn/hiện `meaning`; "Nghe câu ví dụ gợi ý" → `speak(example.zh)` (câu GỐC, không phải câu khuyết); chấm như C3 (xanh/đỏ/rung/800ms, đúng +1 XP).

- [ ] **Step 4: Implement ListenMode**

Port `clone/js/lesson-listen.js`: state `rate` (mặc định 1), pool = `shuffle(Array.from(example.zh))` lọc bỏ dấu cách; bấm thẻ pool → nhảy lên mảng `built` (bấm lại trên vùng câu → trả về pool); "Ghép câu": so `built.join("") === Array.from(example.zh).join("")` — đúng → xanh + `addXp(1)`, sai → feedback đỏ + giữ `built` để sửa; "Gõ lại" → reset `built` = [], pool shuffle lại; "Nghe câu"/"Nghe lại" → `speak(example.zh, { rate })`; 5 pill tốc độ (active `pill-active`).

- [ ] **Step 5: Run tests verify pass + commit**

Run: `pnpm vitest run src/components/lesson/__tests__/reading.test.tsx src/components/lesson/__tests__/listen.test.tsx`
Expected: PASS.

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: reading cloze + listen sentence-building modes (C5, C6)"
```

### Task 16: Mode Dance (C7) + Mode Battle (C8)

**Files:**
- Create: `app-next/src/components/lesson/modes/dance.tsx`, `app-next/src/components/lesson/modes/battle.tsx`
- Modify: `app-next/src/components/lesson/modes/index.ts`
- Test: `app-next/src/components/lesson/__tests__/dance.test.tsx`, `app-next/src/components/lesson/__tests__/battle.test.tsx`
- Port-from: `clone/js/lesson-dance.js`, `clone/js/lesson-battle.js`

**Interfaces:**
- Consumes: Task 11, Task 5 (`toPinyin`, `shuffle`), Task 6 (`addXp`, `saveBattleBest`), Task 10 (`useLoginModal`).
- Produces:
  - `export default function DanceMode(): JSX.Element` — nhạc WebAudio: `AudioContext` tạo trong handler "Bắt đầu" (không phải render), oscillator loop đơn giản; **useEffect return: `ctx.close()`** khi unmount.
  - `export default function BattleMode(): JSX.Element` + `export type BattleQuestion = { kind: "han2vi" | "vi2han" | "han2py" | "cloze" | "typing"; item: LessonItem; options: string[]; answer: string }` + `export function buildBattleQuestions(items: LessonItem[]): BattleQuestion[]` (13 câu trộn đủ 5 dạng — nếu bài <13 từ lặp lại item với dạng khác).

- [ ] **Step 1: Write the failing tests**

Tạo `app-next/src/components/lesson/__tests__/battle.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LessonProvider, type LessonItem } from "../lesson-provider";
import BattleMode, { buildBattleQuestions } from "../modes/battle";
import { progressStore } from "@/lib/store/progress-store";

const words: LessonItem[] = Array.from({ length: 13 }, (_, i) => ({
  hanzi: `词${i}`, pinyin: `cí${i}`, hanViet: "TỪ", meaning: `nghĩa ${i}`, pos: "Danh từ",
  example: { zh: `例${i}，词${i}。`, pinyinPerChar: [], vi: `ví dụ ${i}` }, index: i, itemKey: `hsk1.lesson-1.${i}`,
}));

beforeEach(() => localStorage.clear());

describe("buildBattleQuestions", () => {
  it("đúng 13 câu, đủ 5 dạng, mỗi câu có options + answer", () => {
    const qs = buildBattleQuestions(words);
    expect(qs).toHaveLength(13);
    expect(new Set(qs.map((q) => q.kind))).toEqual(new Set(["han2vi", "vi2han", "han2py", "cloze", "typing"]));
    for (const q of qs) {
      expect(q.options).toHaveLength(4);
      expect(q.options).toContain(q.answer);
    }
  });
});

describe("BattleMode", () => {
  it("thi xong lưu best (max correct); 'Đăng nhập' mở modal không điều hướng", async () => {
    vi.useFakeTimers();
    render(
      <LessonProvider items={words} book="hsk1" page="lesson-1">
        <BattleMode />
      </LessonProvider>
    );
    await act(async () => screen.getByRole("button", { name: /Bắt đầu thi/ }).click());
    // trả lời đúng câu 1 (bấm đáp án chứa answer của câu hiện tại) rồi "Không biết" phần còn lại
    for (let i = 0; i < 13; i++) {
      const btn = screen.queryAllByRole("button").find((b) => b.dataset.answer === "true");
      act(() => { (btn ?? screen.getByRole("button", { name: /Không biết/ })).click(); });
      act(() => vi.advanceTimersByTime(300));
    }
    expect(progressStore.getBattleBest("hsk1.lesson-1")?.correct).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Đăng nhập để lưu kết quả lên bảng xếp hạng/)).toBeInTheDocument();
    vi.useRealTimers();
  });
  it("Top-10 cứng hiển thị cả khi chưa thi", () => {
    render(<LessonProvider items={words} book="hsk1" page="lesson-1"><BattleMode /></LessonProvider>);
    expect(screen.getByText(/Top 10 bài này/)).toBeInTheDocument();
    expect(screen.getByText(/Thùy Trâm/)).toBeInTheDocument(); // 🥇 13/13 0:25.9 theo SPEC-02 §7
  });
});
```

Tạo `app-next/src/components/lesson/__tests__/dance.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonProvider, type LessonItem } from "../lesson-provider";
import DanceMode from "../modes/dance";

const word: LessonItem = {
  hanzi: "你好", pinyin: "nǐ hǎo", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ",
  example: { zh: "李明，你好。", pinyinPerChar: [], vi: "Chào Lý Minh" }, index: 0, itemKey: "hsk1.lesson-1.0",
};

beforeEach(() => localStorage.clear());

describe("DanceMode", () => {
  it("Bắt đầu -> hiện chữ + input; gõ đúng -> emoji nhảy + sang từ kế", async () => {
    const user = userEvent.setup();
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><DanceMode /></LessonProvider>);
    await user.click(screen.getByRole("button", { name: /Bắt đầu/ }));
    expect(screen.getByText("你好")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/Gõ pinyin/), "ni3 hao3");
    await user.keyboard("{Enter}");
    expect(screen.getByText(/🕺|💃/)).toBeInTheDocument();
    expect(screen.getByText(/Hết lượt|1 \/ 1/)).toBeInTheDocument();
  });
  it("3 pill chọn nhạc hiển thị", () => {
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><DanceMode /></LessonProvider>);
    for (const name of ["Làng Lá", "Lãm Làng", "Nhạc của tôi"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 2: Run tests verify fail**

Run: `pnpm vitest run src/components/lesson/__tests__/dance.test.tsx src/components/lesson/__tests__/battle.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement DanceMode**

Port `clone/js/lesson-dance.js`: card "Hanzi Dance" + nút "Bắt đầu" + 3 pill nhạc (state `music`, active đỏ; mô tả "Gõ đúng cách đọc của từ → nhân vật của bạn nhảy; sai thì đứng im. Lượt này có N từ trong bài."); bấm Bắt đầu → tạo `new AudioContext()` + oscillator loop (gain 0.03, đổi tần số theo beat bằng setInterval — setInterval lưu ref, **useEffect return: clearInterval + ctx.close()**); chơi: hiện `hanzi` + input dùng `checkTyped` (Task 14) — đúng → emoji 🕺💃 thêm class nhảy (`animate-bounce`) 600ms + `addXp(1)` + từ kế; sai → đứng im viền đỏ.

- [ ] **Step 4: Implement BattleMode**

Port `clone/js/lesson-battle.js`:
- `buildBattleQuestions(items)`: 13 câu — phân bố 5 dạng `han2vi` (đề hanzi, đáp án meaning), `vi2han` (đề meaning, đáp án hanzi), `han2py` (đề hanzi, đáp án pinyin), `cloze` (đề `clozeZh` blank, đáp án hanzi), `typing` (đề hanzi, đáp án pinyin, dùng checkTyped khi nộp); mỗi câu 4 options (1 đúng + 3 nhiễu từ cùng bài, `data-answer="true"` trên nút đúng).
- "Bắt đầu thi" → state `running`, timer đếm giây (`setInterval` 1s, useEffect return clear); kết thúc 13 câu → màn kết quả "Đúng X/13 · <mm:ss>" + `saveBattleBest("<book>.<page>", correct, elapsedMs)`; nút "Thi lại" reset.
- "Đăng nhập để lưu kết quả lên bảng xếp hạng." + nút Đăng nhập → `useLoginModal().openLogin()` (không điều hướng).
- "Top 10 bài này" luôn hiện: 10 hàng cứng đúng SPEC-02 §7 (🥇 Thùy Trâm 13/13 0:25.9, 🥈 Vân Anh Ngô 13/13 0:26.1, 🥉 vân anh ngô 13/13 0:27.3, #4 Nha 13/13 0:27.6, #5 Linh Trần 13/13 0:28.1, #6 Diễm Kiều 13/13 0:29.3, #7 Ngọc Phạm 13/13 0:30.4, #8 Hoa Nguyen 13/13 0:31.6, #9 Thang Nguyen 13/13 0:34.3, #10 Ngọc Lê 13/13 0:34.4) + link "Xem BXH Đấu trí tháng này →" → `/leaderboard?tab=battle`.

- [ ] **Step 5: Run tests verify pass + commit**

Run: `pnpm vitest run src/components/lesson/__tests__/dance.test.tsx src/components/lesson/__tests__/battle.test.tsx`
Expected: PASS.

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: dance mode (WebAudio, cleanup ctx) + battle mode (13 câu 5 dạng, best score, Top-10 cứng) (C7, C8)"
```

### Task 17: Danh sách từ + ⭐ SRS + "Thêm cả bài vào ôn tập" (C9)

**Files:**
- Create: `app-next/src/components/lesson/word-list.tsx`
- Modify: `app-next/src/components/lesson/lesson-client.tsx` (mount `<WordList />` cuối trang + nút "Thêm cả bài vào ôn tập" sidebar), `app-next/src/components/lesson/lesson-provider.tsx` (sidebar badge ⭐: nút "Thêm cả bài vào ôn tập" — đặt trong lesson-client phần sidebar)
- Test: `app-next/src/components/lesson/__tests__/word-list.test.tsx`
- Port-from: `clone/js/lesson.js:229-280` (srsId/toggle), `clone/js/lesson.js:130-140` (thêm cả bài), `clone/specs/SPEC-02-vocab-lesson.md` §"Danh sách từ"

**Interfaces:**
- Consumes: Task 11 (`useLesson`), Task 6 (`progressStore.toggleSrs/addSrsBatch/getSrs`), Task 5 (`useTts`, `pinyinLine`), Task 10 (`useToast`).
- Produces: `export default function WordList(): JSX.Element` — list đánh số mỗi mục: hanzi + pos pill + pinyin + hanViet + meaning + câu ví dụ (zh, pinyin từng chữ màu muted, "→ vi") + 3 nút icon: "Báo lỗi" (toast "Cảm ơn bạn! Báo lỗi đã được ghi nhận." — SP1 mock, đúng điểm UI spec 10 §3.4), "⭐ Thêm vào bộ thẻ ôn tập" (vàng khi đã thêm — toggle qua `toggleSrs(itemKey)`, toast "Đã thêm vào ôn tập"/"Đã bỏ khỏi ôn tập"), "🔊 Phát âm từ" (`speak(hanzi)`).

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/lesson/__tests__/word-list.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LessonProvider, type LessonItem } from "../lesson-provider";
import WordList from "../word-list";
import { progressStore } from "@/lib/store/progress-store";

const word: LessonItem = {
  hanzi: "你好", pinyin: "nǐ hǎo", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ",
  example: { zh: "李明，你好。", pinyinPerChar: [{ c: "李", py: "lǐ" }, { c: "明", py: "míng" }, { c: "，", py: "，" }, { c: "你", py: "nǐ" }, { c: "好", py: "hǎo" }, { c: "。", py: "。" }], vi: "Chào Lý Minh" },
  index: 0, itemKey: "hsk1.lesson-1.0",
};

beforeEach(() => localStorage.clear());

describe("WordList + SRS (C9)", () => {
  it("⭐ thêm vào SRS với item_key chuẩn, vàng persist, bấm lại bỏ", () => {
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><WordList /></LessonProvider>);
    const star = screen.getByTitle("Thêm vào bộ thẻ ôn tập");
    act(() => star.click());
    expect(progressStore.getSrs("hsk1.lesson-1.0")?.status).toBe("new"); // item_key <book>.<page>.<index>
    expect(star.className).toContain("text-yellow");
    act(() => star.click());
    expect(progressStore.getSrs("hsk1.lesson-1.0")).toBeNull();
  });
  it("toast 'Đã thêm vào ôn tập' khi bấm ⭐", () => {
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><WordList /></LessonProvider>);
    act(() => screen.getByTitle("Thêm vào bộ thẻ ôn tập").click());
    expect(screen.getByText("Đã thêm vào ôn tập")).toBeInTheDocument();
  });
  it("🔊 phát âm từ", () => {
    vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn(), getVoices: vi.fn(() => []) });
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><WordList /></LessonProvider>);
    act(() => screen.getByTitle("Phát âm từ").click());
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/components/lesson/__tests__/word-list.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement WordList**

Port `clone/js/lesson.js:229-280` sang JSX: `useLesson().items.map(...)`; trạng thái ⭐ đọc `progressStore.getSrs(itemKey) !== null` trong state local (khởi tạo 1 lần + cập nhật khi bấm); class vàng = `text-yellow-500` khi đã thêm.

- [ ] **Step 4: Mount + nút "Thêm cả bài vào ôn tập"**

Trong `lesson-client.tsx`: (a) render `<WordList />` dưới khu mode (luôn hiện); (b) sidebar thêm nút "Thêm cả bài vào ôn tập" — handler: `const added = progressStore.addSrsBatch(items.map((it) => it.itemKey)); toast(added > 0 ? \`Đã thêm ${added} từ vào ôn tập\` : "Tất cả từ đã có trong bộ ôn tập")` — idempotent theo itemKey (spec 10 §3.2).

- [ ] **Step 5: Run test verify pass + commit**

Run: `pnpm vitest run src/components/lesson/__tests__/word-list.test.tsx`
Expected: PASS 3 tests.

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: word list + star-to-SRS (item_key chuẩn) + add-whole-lesson batch (C9)"
```

### Task 18: Route `/lesson/custom/[deckId]` — học deck tự tạo (C10)

**Files:**
- Create: `app-next/src/app/(app)/lesson/custom/[deckId]/page.tsx`
- Create: `app-next/src/lib/store/decks.ts` (đọc deck từ ProgressStore storage)
- Test: `app-next/src/lib/store/__tests__/decks.test.ts`
- Port-from: `clone/js/lesson.js:1-60` (nhánh `?custom=`), `clone/specs/SPEC-02-vocab-lesson.md` (deck rows shape)

**Interfaces:**
- Consumes: Task 11 (`LessonClient`), Task 6 (localStorage keys), Task 10 (shell).
- Produces:
  - `app-next/src/lib/store/decks.ts`: `export type Deck = { id: string; name: string; rows: { hanzi: string; pinyin?: string; hanViet?: string; meaning?: string; exampleZh?: string }[] };` + `export function getDeck(deckId: string): Deck | null` (đọc key `nhai.decks` JSON — clone shape MẢNG `[{ id, name, rows: [{ hanzi, pinyin, hanviet, meaning }] }]`, map `hanviet` → `hanViet`) + `export function listDecks(): Deck[]`.
  - Route page: server component đọc `params: Promise<{ deckId: string }>`, truyền qua client wrapper `CustomLessonClient` (trong cùng file, `"use client"`): `getDeck(deckId)` — deck rỗng/không tồn tại → empty state "Bộ thẻ này không tồn tại hoặc đang trống." + Link "Về bộ từ vựng của tôi" `/my-vocab`; có deck → `<LessonClient items={mapped} deckName={deck.name} />` với `itemKey = "deck.<deckId>.<ord>"`, `example` fallback `{ zh: row.exampleZh ?? row.hanzi, pinyinPerChar: [], vi: row.meaning ?? "" }`.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/lib/store/__tests__/decks.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { getDeck, listDecks } from "../decks";

beforeEach(() => localStorage.clear());

describe("getDeck / listDecks", () => {
  it("đọc deck từ nhai.decks, map đúng trường rows", () => {
    localStorage.setItem("nhai.decks", JSON.stringify([
      { id: "d1", name: "Bộ thi HSK 1", rows: [{ hanzi: "你好", pinyin: "nǐ hǎo", hanviet: "NHĨ HẢO", meaning: "Xin chào" }] },
    ]));
    const d = getDeck("d1");
    expect(d?.name).toBe("Bộ thi HSK 1");
    expect(d?.rows[0]).toMatchObject({ hanzi: "你好", pinyin: "nǐ hǎo", meaning: "Xin chào" });
    expect(listDecks()).toHaveLength(1);
  });
  it("trả null khi không tồn tại / JSON hỏng", () => {
    expect(getDeck("nope")).toBeNull();
    localStorage.setItem("nhai.decks", "{broken");
    expect(listDecks()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/lib/store/__tests__/decks.test.ts`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement decks.ts + route**

`decks.ts` — đọc `localStorage.getItem("nhai.decks")` try/catch, map shape MẢNG của clone (`[{id,name,rows:[{hanzi,pinyin,hanviet,meaning}]}]`, `hanviet`→`hanViet`; không ghi — CRUD deck là trang my-vocab/notebook, domain khác). Route `page.tsx`:

```tsx
"use client";
import { use } from "react";
import Link from "next/link";
import LessonClient from "@/components/lesson/lesson-client";
import type { LessonItem } from "@/components/lesson/lesson-provider";
import { getDeck } from "@/lib/store/decks";

export default function CustomLessonPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = use(params);
  const deck = getDeck(deckId);
  if (!deck || deck.rows.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p>Bộ thẻ này không tồn tại hoặc đang trống.</p>
        <Link href="/my-vocab" className="btn-main inline-block mt-4 px-6 py-2">Về bộ từ vựng của tôi</Link>
      </div>
    );
  }
  const items: LessonItem[] = deck.rows.map((r, i) => ({
    hanzi: r.hanzi,
    pinyin: r.pinyin ?? "",
    hanViet: (r.hanViet ?? "").toUpperCase(),
    meaning: r.meaning ?? "",
    pos: "",
    example: { zh: r.exampleZh ?? r.hanzi, pinyinPerChar: [], vi: r.meaning ?? "" },
    index: i,
    itemKey: `deck.${deckId}.${i}`,
  }));
  return <LessonClient items={items} deckName={deck.name} />;
}
```

(LessonClient của Task 11 đã hỗ trợ `deckName` — khi có `deckName`, header badge "Bài 1" thay bằng tên deck; mode Reading/Listen tự ẩn nút câu ví dụ khi `example.zh === hanzi` fallback — thêm điều kiện `hasExample = items.example.zh !== items.hanzi` trong 2 mode này.)

- [ ] **Step 4: Run test verify pass + smoke**

Run: `pnpm vitest run src/lib/store/__tests__/decks.test.ts` → PASS. `pnpm dev` → set `nhai.decks` trong console → mở `/lesson/custom/d1`: 7 mode chạy với item deck; học xong KHÔNG có `hsk1/lesson-*` mới trong `nhai.pageDone` (deck không ghi page_dones — không có nút hoàn thành bài ở custom).

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: custom deck lesson route (C10) + decks reader"
```

### Task 19: Lesson polish visual (C11)

**Files:**
- Create: `app-next/public/assets/vietnam-map.svg` (outline đơn giản bản đồ VN, fill đỏ nhạt)
- Modify: `app-next/src/components/lesson/lesson-client.tsx`, `modes/flashcard.tsx` (6 điểm polish SPEC-14)
- Test: `app-next/src/app/(app)/lesson/[book]/[page]/__tests__/lesson-polish.test.tsx` (khẳng định markup polish) — hoặc mở rộng `flashcard.test.tsx`

**Interfaces:**
- Consumes: Task 11–17 (mọi mode đã chạy).
- Produces: lesson khớp 6 điểm SPEC-14; không đổi logic (regression: test C2–C9 vẫn pass).

- [ ] **Step 1: Write the failing test**

Thêm vào `app-next/src/components/lesson/__tests__/flashcard.test.tsx` (file đã có từ Task 12 — thêm dòng `import LessonClient from "../lesson-client";` ở đầu file) describe mới:

```tsx
describe("Lesson polish (SPEC-14)", () => {
  it("header: badge Bài N nền đen, mascot 🍅 trước h1, watermark có mặt (render qua LessonClient)", () => {
    const { container } = render(
      <LessonProvider items={words} book="hsk1" page="lesson-1">
        <LessonClient book="hsk1" page="lesson-1" />
      </LessonProvider>
    );
    expect(container.querySelector("[data-badge='page']")?.className).toContain("bg-black");
    expect(container.querySelector("[data-mascot]")?.textContent).toBe("🍅");
    expect(container.querySelector("[data-watermark]")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/components/lesson/__tests__/flashcard.test.tsx`
Expected: FAIL mới — chưa có `data-badge='page'` nền đen / mascot / watermark.

- [ ] **Step 3: Thêm watermark + mascot + badge**

- Tạo `app-next/public/assets/vietnam-map.svg` — outline đơn giản path polygon hình chữ S Việt Nam, `fill="#c23b22"` (được mờ bằng opacity ở nơi dùng):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200">
  <path d="M62 8 L70 20 L66 34 L74 48 L70 64 L78 80 L72 96 L80 112 L74 128 L82 144 L76 160 L66 176 L56 188 L48 176 L52 160 L44 144 L50 128 L42 112 L48 96 L40 80 L46 64 L38 48 L46 34 L40 20 L50 8 Z" fill="#c23b22"/>
</svg>
```

- `lesson-client.tsx`: (1) `<img src="/assets/vietnam-map.svg" alt="" data-watermark className="absolute left-8 top-1/3 opacity-[0.08] pointer-events-none w-40" />` trong container relative của card/vùng main; (2) mascot `<span data-mascot className="text-[44px]">🍅</span>` trước `h1`, title bọc `<span className="bg-[#f5d76e]/50 rounded px-2">`; (3) badge "Bài N" → `className="bg-black text-white px-2 py-0.5 rounded text-sm font-bold" data-badge="page"`; pill "N từ vựng" pill thường cạnh nó; (4) hàng controls 1 hàng `[tabs]—[counter pill giữa]—[flash controls]` responsive `flex flex-wrap items-center justify-between gap-2`.

- [ ] **Step 4: Verify 4 nút nav ngoài card + mặt sau #f7e9c8 (đã có từ Task 12 — rà lại đúng mã màu)**

Mở `modes/flashcard.tsx` confirm: hàng nav là sibling sau card (không nằm trong), `✕ Chưa thuộc` `style={{ background: "#c03922" }}`, `✓ Đã thuộc` `style={{ background: "#2e7d32" }}`, mặt sau thẻ `style={{ background: "#f7e9c8" }}`, pill từ loại dưới chữ Hán. Sửa nếu lệch.

- [ ] **Step 5: Regression + commit**

Run: `pnpm vitest run src/components/lesson` — PASS toàn bộ (C1–C9 regression).
Run: `pnpm dev` → `/lesson/hsk1/lesson-1` đối chiếu 6 điểm SPEC-14.

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next
git commit -m "feat: lesson polish — watermark VN, mascot, badge đen, controls 1 hàng, nav ngoài card (C11)"
```

---

# Phase 4 — Trang nền tảng & roadmap (B1–B2, D1–D4, E1–E3)

### Task 20: Trang chủ `/` (B1)

**Files:**
- Modify: `app-next/src/app/(app)/page.tsx` (thay trang mặc định)
- Create: `app-next/src/components/home/continue-card.tsx`
- Test: `app-next/src/components/home/__tests__/continue-card.test.tsx`
- Port-from: `clone/index.html` + `clone/js/home.js`, `clone/specs/SPEC-01-home-course-leaderboard.md` §1

**Interfaces:**
- Consumes: Task 7 (`books`), Task 6 (`listPageDone`), Task 3 (theme), Task 10 (shell).
- Produces: `export default function ContinueCard(): JSX.Element` — client component đọc `progressStore.listPageDone()`: có bài dở → card "Học tiếp: <tên sách> · Bài N" link `/lesson/[book]/[page]` (bài CHƯA done kế tiếp cùng book; nếu book đã xong hết thì bỏ qua book đó); không có → `return null`.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/home/__tests__/continue-card.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ContinueCard from "../continue-card";

beforeEach(() => localStorage.clear());

describe("ContinueCard (B1)", () => {
  it("ẩn khi chưa có pageDone", () => {
    render(<ContinueCard />);
    expect(screen.queryByText(/Học tiếp/)).not.toBeInTheDocument();
  });
  it("hiện 'Học tiếp' đúng bài kế chưa hoàn thành", () => {
    localStorage.setItem("nhai.pageDone", JSON.stringify({ "hsk1/lesson-1": 1 }));
    render(<ContinueCard />);
    const link = screen.getByText(/Học tiếp/).closest("a")!;
    expect(link.getAttribute("href")).toBe("/lesson/hsk1/lesson-2");
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/components/home`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement ContinueCard**

`continue-card.tsx` — `"use client"`; `useEffect` (SSG-safe: chỉ đọc localStorage sau mount, `mounted` state); tính bài kế: với mỗi key `book/page` trong `listPageDone()`, tra `courses[book].pages` tìm page vocab đầu tiên chưa done; tên bài từ `vocab[book][pageId].title`; link `/lesson/${book}/${pageId}`.

- [ ] **Step 4: Implement trang `/`**

Thay `app-next/src/app/(app)/page.tsx` (server component, SSG):

```tsx
import Link from "next/link";
import { books } from "@/content/courses";
import ContinueCard from "@/components/home/continue-card";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">Chào bạn 👋</h1>
        <p className="text-nhai-muted">Tiếp tục hành trình từ vựng tiếng Trung của bạn — mỗi ngày một chút là đủ.</p>
      </section>
      <section className="card p-4">
        <p>Vào nhóm học cùng mọi người nhé:</p>
        <a className="text-nhai-main font-semibold underline" href="https://www.facebook.com/groups/nhaihsk" target="_blank" rel="noreferrer">
          Nhai tiếng Trung mỗi ngày
        </a>
      </section>
      <ContinueCard />
      <section>
        <h2 className="text-xl font-bold">HSK 3.0</h2>
        <p className="text-nhai-muted text-sm">Bản cải tiến</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {books.map((b) => (
            <Link key={b.slug} href={`/course/${b.slug}`}
              className="card shadow-neo p-4 hover:-translate-y-px transition-transform">
              <div className="font-bold">{b.name}</div>
              <div className="text-sm text-nhai-muted">{b.cardMeta}</div>
            </Link>
          ))}
        </div>
      </section>
      <footer className="text-xs text-nhai-muted text-center py-6">
        Nhai tiếng Trung mỗi ngày — facebook.com/groups/nhaihsk
      </footer>
    </div>
  );
}
```

- [ ] **Step 5: Run test verify pass + smoke**

Run: `pnpm vitest run src/components/home` → PASS. `pnpm dev` → `/`: 7 card đúng meta SPEC-01, link đúng; hoàn thành 1 bài (set `nhai.pageDone` thủ công) reload → card "Học tiếp" hiện.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: home page — hero, Facebook card, BookGrid 7 sách, ContinueCard pageDone (B1)"
```

### Task 21: Course — kệ sách + trang khóa + CourseProgress (B2)

**Files:**
- Create: `app-next/src/app/(app)/course/page.tsx`, `app-next/src/app/(app)/course/[book]/page.tsx`, `app-next/src/components/course/course-client.tsx`, `app-next/src/components/course/course-progress.tsx`
- Test: `app-next/src/components/course/__tests__/course-progress.test.tsx`
- Port-from: `clone/course.html` + `clone/js/course.js:1-190`, `clone/specs/SPEC-01-home-course-leaderboard.md` §2

**Interfaces:**
- Consumes: Task 7 (`books`, `courses`, `vocab`), Task 6 (`listPageDone`), Task 10 (`useLoginModal`).
- Produces:
  - `app-next/src/components/course/course-client.tsx`: `export default function CourseClient({ slug }: { slug: string })` — client: đọc `useSearchParams()` `skill` (mặc định `vocab`); 3 pill "Từ vựng · 词汇 / Ngữ pháp · 语法 / Chữ Hán · 汉字" (active đỏ) đổi skill bằng `router.replace(\`/course/${slug}?skill=${s}\`, { scroll: false })`; hàng vocab = Link `/lesson/[book]/[pageId]` + "N từ vựng"; hàng grammar/hanzi = button + 🔒 mở `useLoginModal().openLogin()`.
  - `export default function CourseProgress({ book }: { book: string })` — client: "x/N bài" (N = số bài vocab của book) + progress bar % = `listPageDone(book).length / N`.
  - `/course/page.tsx` (server): heading "Bài khoá — Kệ sách" + grid 7 card (tên + cardMeta + "N bài").
  - `/course/[book]/page.tsx` (server): breadcrumb "Trang chủ" + badge "Nhai" + `h1` "<name> 3.0" + sub "标准教程 <name> · 3.0" + nút "Tổng ôn" cuối danh sách → `/review` (link; đích UPG-2 §3.3 là `/review?book=`).

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/course/__tests__/course-progress.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CourseProgress from "../course-progress";

beforeEach(() => localStorage.clear());

describe("CourseProgress (B2)", () => {
  it("0/15 khi trống", () => {
    render(<CourseProgress book="hsk1" />);
    expect(screen.getByText("0/15 bài")).toBeInTheDocument();
  });
  it("đếm đúng theo pageDone của book", () => {
    localStorage.setItem("nhai.pageDone", JSON.stringify({ "hsk1/lesson-1": 1, "hsk1/lesson-2": 1, "hsk2/lesson-1": 1 }));
    render(<CourseProgress book="hsk1" />);
    expect(screen.getByText("2/15 bài")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/components/course`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement CourseProgress + CourseClient + 2 route**

- `course-progress.tsx`: `"use client"`; như test — bar `<div className="h-2 bg-nhai-soft rounded"><div className="h-2 bg-nhai-main rounded" style={{ width: pct% }} /></div>`.
- `course-client.tsx`: như Interfaces; bọc `<Suspense>` quanh `useSearchParams` trong route page (Next requirement cho static render).
- `/course/page.tsx` + `/course/[book]/page.tsx`: server, map data `books`/`courses`; `notFound()` nếu slug lạ.

- [ ] **Step 4: Run test verify pass + smoke**

Run: `pnpm vitest run src/components/course` → PASS. `pnpm dev` → `/course/hsk1`: 15 bài đúng tên + số từ; bấm pill Ngữ pháp đổi danh sách + URL `?skill=grammar`; hoàn thành bài → về course thấy "1/15 bài" + hàng bài có badge hoàn thành (thêm dấu ✓ trên hàng đã done trong CourseClient — đọc `listPageDone`); bấm hàng ngữ pháp → Login modal mở, không điều hướng.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: course shelf + book page (skill pills, progress x/N, login-gated rows) (B2)"
```

### Task 22: Bảng Pinyin + Pinyin Practice (D1, D2)

**Files:**
- Create: `app-next/src/app/(app)/pinyin/page.tsx`, `app-next/src/components/pinyin/matrix-client.tsx`, `app-next/src/components/pinyin/tone-dialog.tsx`, `app-next/src/app/(app)/pinyin/practice/page.tsx`, `app-next/src/components/pinyin/practice-client.tsx`
- Test: `app-next/src/components/pinyin/__tests__/practice-logic.test.ts`
- Port-from: `clone/pinyin.html` + `clone/js/pinyin.js:1-124`, `clone/pinyin-practice.html` + `clone/js/pinyin-practice.js`, `clone/specs/SPEC-04-radicals-pinyin-soundrules.md` §2–3

**Interfaces:**
- Consumes: Task 8 (`pinyinValid`…), Task 5 (`useTts`).
- Produces:
  - `matrix-client.tsx`: `export default function MatrixClient(): JSX.Element` — filter pills ("Tất cả", "Ø", b…h — 22 giá trị `pinyinInitials`), ma trận 1 hàng filter hoặc đầy đủ; ô hợp lệ bấm được, ô "·" muted không bấm.
  - `tone-dialog.tsx`: `export default function ToneDialog({ syllable, onClose }: { syllable: string; onClose: () => void })` — âm to + 4 nút `ā á ǎ à` (`speak(syllable với thanh, { lang: "zh-CN" })` — tone áp bằng thay nguyên âm chính qua bảng MARKS: tái sử dụng `toPinyin(syllable + toneNumber)` từ Task 5) + từ ví dụ `pinyinExamples[syllable]`; đóng X/Escape (useEffect keydown)/backdrop click.
  - `practice-client.tsx`: `export default function PracticeClient(): JSX.Element` + `export function buildQuestion(valid: Record<string, Record<string, string>>, kind: "listen" | "tone"): { prompt: string; options: string[]; answer: string }` (thuần, test được).
  - `/pinyin/page.tsx` (server SSG): `h1` "Bảng Pinyin", sub "拼音表 — Thanh mẫu (声母) × Vận mẫu (韵母)", mô tả "406 âm tiết chuẩn — bấm ô bất kỳ để xem chi tiết và nghe phát âm", link "Học theo lộ trình" `/roadmap/pinyin` + "Bài tập" `/pinyin/practice`.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/pinyin/__tests__/practice-logic.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildQuestion } from "../practice-client";
import { pinyinValid } from "@/content/pinyin";

describe("buildQuestion (D2)", () => {
  it("dạng listen: prompt là âm, 4 options syllable khác nhau, có đáp án", () => {
    const q = buildQuestion(pinyinValid, "listen");
    expect(new Set(q.options).size).toBe(4);
    expect(q.options).toContain(q.answer);
    expect(q.prompt.length).toBeGreaterThan(0);
  });
  it("dạng tone: 4 options là 4 thanh ā á ǎ à trên cùng âm", () => {
    const q = buildQuestion(pinyinValid, "tone");
    expect(q.options).toEqual(expect.arrayContaining([
      expect.stringMatching(/[\u0304]/), expect.stringMatching(/[\u0301]/),
    ]));
    expect(q.options).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/components/pinyin`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement MatrixClient + ToneDialog**

Port `clone/js/pinyin.js`: state `filter: string | null` (null = "Tất cả"); ma trận: `<table>` header 37 `pinyinFinals`, cột đầu `pinyinInitials` (lọc theo filter); ô: `pinyinValid[init][final]` tồn tại → `<button className="grid-cell">` với syllable; không → `<span className="grid-cell text-nhai-muted">·</span>`; bấm ô → mở `ToneDialog`. ToneDialog: backdrop `onClick={onClose}`, Escape qua useEffect keydown, 4 nút tone gọi `useTts().speak(toPinyin(syllable + n))`.

- [ ] **Step 4: Implement PracticeClient + route**

Port `clone/js/pinyin-practice.js`: `buildQuestion` — (a) `listen`: chọn syllable random từ `pinyinValid`, prompt = syllable (phát TTS khi render câu), options = syllable + 3 syllable khác; (b) `tone`: prompt = syllable, options = 4 dạng thanh `ā á ǎ à` của âm đó (áp tone 1–4 qua `toPinyin`); 10 câu luân phiên 2 dạng (câu i chẵn `listen`, lẻ `tone`); chấm: chọn → đúng xanh / sai đỏ; counter; hết 10 → "Đúng X/10" + nút "Làm lại" (reset state, sinh câu mới). Route `/pinyin/practice/page.tsx`: client page với `h1` "Bài tập Pinyin" + mô tả "Luyện nghe và gõ pinyin — nhận biết thanh điệu".

- [ ] **Step 5: Run test verify pass + smoke**

Run: `pnpm vitest run src/components/pinyin` → PASS. `pnpm dev` → `/pinyin`: filter chọn 1 thanh mẫu chỉ hiện hàng đó; bấm ô "ba" → dialog 4 thanh phát được, Escape đóng; `/pinyin/practice`: 10 câu 2 dạng xen kẽ, "Làm lại" reset.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: pinyin matrix (405 âm, filter, tone dialog TTS) + pinyin practice 10 câu (D1, D2)"
```

### Task 23: Radicals — deck + grid + modal autoplay + quy tắc nét (D3)

**Files:**
- Create: `app-next/src/app/(app)/radicals/page.tsx`, `app-next/src/components/radicals/deck-client.tsx`, `app-next/src/components/radicals/autoplay-modal.tsx`, `app-next/src/components/radicals/stroke-rules.tsx`
- Test: `app-next/src/components/radicals/__tests__/radicals-page.test.tsx`
- Port-from: `clone/radicals.html` + `clone/js/radicals.js:1-347`, `clone/specs/SPEC-04-radicals-pinyin-soundrules.md` §1, `clone/specs/SPEC-20-radicals-autoplay-strokes.md`

**Interfaces:**
- Consumes: Task 8 (`radicals`, `strokeRules`, `lastStrokes`), Task 5 (`useTts`, `shuffle`), Task 10 (shell).
- Produces:
  - `deck-client.tsx`: `export default function DeckClient(): JSX.Element` — deck flashcard rút gọn pattern C2: counter "1 / 214", "Tự động" ⏸/▶ (autoplay nhanh 2s + speak), "Xáo trộn", ⚙ mở `AutoplayModal`, 🔊; 4 nút nav + phím tắt ←/A ↓/X ↑/Z →/D (`useKeyboard`); thẻ trước chữ bộ thủ + "Click để lật", sau tên Hán Việt + nghĩa; `export function jumpTo(i: number): void` không export — state `index` được nâng lên page qua props? KHÔNG: `DeckClient` tự giữ `index` + nhận prop `initialIndex`? Cần grid bấm → deck nhảy: đưa cả deck+grid vào 1 component cha `RadicalsClient` (file `deck-client.tsx` export default `RadicalsClient`) giữ `index` dùng chung.
  - `autoplay-modal.tsx`: `export default function AutoplayModal({ onStart, onClose }: { onStart: (cfg: AutoplayCfg) => void; onClose: () => void })` + `export type AutoplayCfg = { flipSec: 2 | 3 | 5 | 10; nextSec: 1 | 2 | 3; speakOn: boolean; repeat: 1 | 2 | 3 }` (mặc định `{ flipSec: 3, nextSec: 2, speakOn: false, repeat: 1 }`; select "Số lần nghe lại" `disabled` khi `!speakOn`).
  - `stroke-rules.tsx`: `export default function StrokeRules(): JSX.Element` — 7 card lưới 2 cột (số tròn đỏ + tên + mô tả + ô minh hoạ chữ Hán 40px `#1f2937` nền `--nhai-soft`) + card vàng "⏳ Ba nét cuối luôn viết sau cùng" viền trái 4px vàng với 3 ô 辶 廴 ㄑ.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/radicals/__tests__/radicals-page.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import RadicalsClient from "../deck-client";
import AutoplayModal, { type AutoplayCfg } from "../autoplay-modal";
import StrokeRules from "../stroke-rules";
import { radicals } from "@/content/radicals";

beforeEach(() => localStorage.clear());

describe("RadicalsClient (D3)", () => {
  it("deck 1/214, bấm thẻ grid nhảy deck tới thẻ đó", () => {
    render(<RadicalsClient />);
    expect(screen.getByText(/1 \/ 214/)).toBeInTheDocument();
    const cells = screen.getAllByRole("button", { name: /#/ });
    act(() => cells[1].click()); // bấm bộ #2
    expect(screen.getByText(/2 \/ 214/)).toBeInTheDocument();
  });
  it("modal autoplay: mặc định 3/2/tắt/1, select nghe lại disabled khi toggle tắt", () => {
    const cfgs: AutoplayCfg[] = [];
    render(<AutoplayModal onStart={(c) => cfgs.push(c)} onClose={() => {}} />);
    expect(screen.getByLabelText(/Thời gian lật thẻ/)).toHaveValue("3");
    expect(screen.getByLabelText(/Số lần nghe lại/)).toBeDisabled();
    act(() => screen.getByRole("button", { name: /Bất đầu/ }).click());
    expect(cfgs[0]).toEqual({ flipSec: 3, nextSec: 2, speakOn: false, repeat: 1 });
  });
  it("7 quy tắc nét + card 3 nét cuối", () => {
    render(<StrokeRules />);
    expect(screen.getByText("Trước – sau")).toBeInTheDocument();
    expect(screen.getByText("⏳ Ba nét cuối luôn viết sau cùng")).toBeInTheDocument();
    expect(screen.getByText("辶")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/components/radicals`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement RadicalsClient (deck + grid)**

Port `clone/js/radicals.js`: state `{ index, flipped, cfg: AutoplayCfg | null }`; deck flashcard như C2 (4 nút nav + keyboard); grid: nhóm theo `strokes` (`"1 nét (6 bộ)"`, `"2 nét (25 bộ)"`… — nhóm tính runtime từ `radicals`), grid 4 cột thẻ button (chữ to + Hán Việt + `#i` + mô tả ngắn `meaning.slice(0, 24)…`); bấm thẻ grid → `setIndex(i); setFlipped(false); scrollTo deck`. Bấm thẻ grid cũng nhảy: giữ chung `index` (test trên bấm `#` cell).

- [ ] **Step 4: Implement AutoplayModal + autoplay engine**

Port `clone/js/radicals.js` phần modal (SPEC-20 §A): select flip `2/3/5/10` mặc định 3, select next `1/2/3` mặc định 2, toggle "Nghe từ vựng" OFF, select repeat `1/2/3` mặc định 1 disabled khi toggle tắt; "Huỷ"/"Bất đầu". Autoplay engine trong `RadicalsClient` useEffect khi `cfg` khác null: interval `flipSec` — lật (`setFlipped(true)`); nếu `speakOn` → `speak(radicals[index].hanViet... pinyin? — speak(radicals[index].char, { lang: "zh-CN" })` lặp `repeat` lần cách 400ms (chuỗi setTimeout lưu ref); sau `nextSec` sang thẻ kế; badge "Tự động" → nút ⏸ dừng (`setCfg(null)`); **useEffect return clear tất cả interval/timeout**.

- [ ] **Step 5: Implement StrokeRules + route**

`stroke-rules.tsx` port `clone/js/data/stroke-rules.js` + SPEC-20 §B–C (ô minh hoạ `<span className="grid-cell" style={{ fontSize: 40, color: "#1f2937", background: "var(--nhai-soft)" }}>爸</span>`; card vàng `style={{ borderLeft: "4px solid var(--nhai-gold)", background: "var(--nhai-warn-bg, #fdf6e3)" }}`). Route `/radicals/page.tsx` (server): `h1` "214 Bộ Thủ", sub "部首 — nền móng để nhớ mặt chữ Hán", mô tả "214 bộ thủ — phân loại theo số nét, bấm thẻ để nghe âm đọc", nút "Tạo file luyện viết (214 bộ)" → Link `/create-file?tpl=radicals`; trong nghĩa có chữ Hán (`meaning` chứa ký tự CJK — regex `/[\u4e00-\u9fff]/`) → Link `/hanzi/<char>`.

- [ ] **Step 6: Run test verify pass + commit**

Run: `pnpm vitest run src/components/radicals` → PASS. `pnpm dev` → `/radicals` đối chiếu SPEC-04 §1 + SPEC-20 (modal 4 control, autoplay nhịp đúng, rời trang timer dừng — console không tick).

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: radicals deck+grid+autoplay modal+7 stroke rules (D3, SPEC-20)"
```

### Task 24: Sound rules (D4)

**Files:**
- Create: `app-next/src/app/(app)/sound-rules/page.tsx`, `app-next/src/components/sound-rules/quiz-client.tsx`
- Test: `app-next/src/components/sound-rules/__tests__/quiz-client.test.tsx`
- Port-from: `clone/sound-rules.html` + `clone/js/sound-rules.js:1-127`, `clone/specs/SPEC-04-radicals-pinyin-soundrules.md` §4

**Interfaces:**
- Consumes: Task 8 (`soundRulesData`).
- Produces: `export default function SoundQuiz(): JSX.Element` — 5 câu `quiz[]`: đề "铁 thiết = ?" style (`q`), 4 nút options; chọn → đúng viền xanh / sai viền đỏ + hiện `explain` của câu; sau khi chọn không cho chọn lại (state `picked[i]`); đếm "Đúng x/5".

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/sound-rules/__tests__/quiz-client.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import SoundQuiz from "../quiz-client";
import { soundRulesData } from "@/content/soundrules";

describe("SoundQuiz (D4)", () => {
  it("5 câu, chọn đúng tăng counter + hiện giải thích", () => {
    render(<SoundQuiz />);
    expect(screen.getAllByRole("button", { name: /.*/ }).length).toBeGreaterThanOrEqual(5 * 4);
    const correct = soundRulesData.quiz[0].options[soundRulesData.quiz[0].answer];
    act(() => screen.getByRole("button", { name: correct }).click());
    expect(screen.getByText(/Đúng 1\/5/)).toBeInTheDocument();
    expect(screen.getByText(soundRulesData.quiz[0].explain)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/components/sound-rules`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement SoundQuiz**

Port `clone/js/sound-rules.js` phần quiz: state `picked: Record<number, number>`; render 5 card câu; mỗi nút class: đã chọn đúng `border-green-600`, sai `border-red-600 animate-[shake_0.4s]`; hiện `explain` dưới câu sau khi chọn; counter "Đúng x/5".

- [ ] **Step 4: Implement trang `/sound-rules` (server SSG)**

Port `clone/sound-rules.html`: `h1` "Quy tắc chuyển âm" + mô tả + note (`soundRulesData.note`); (1) `h2` "Bảng thanh điệu" — table 3 cột (Thanh Hán Việt / Thanh pinyin / Ví dụ) 6 hàng từ `toneRows`, mỗi `%` kèm bar `<span style={{ width: pct + "%", background: toneColors[String(i + 1)] }} className="inline-block h-1.5 rounded" />`; (2) `h2` "Quy tắc âm đầu" — list `initialRules` (mỗi cái: rule + 2–3 ví dụ `字 HV pinyin`); (3) `h2` "Quy tắc âm cuối & vần" — `finalRules`; (4) `h2` "Bài tập áp dụng" — `<SoundQuiz />`.

- [ ] **Step 5: Run test verify pass + commit**

Run: `pnpm vitest run src/components/sound-rules` → PASS. `pnpm dev` → `/sound-rules` khớp số liệu SPEC-04 §4 (Ngang 61%/32%, Sắc 66%/13%, Nặng 72%/17%, Huyền 86%/8%).

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: sound-rules page (tone table %, initial/final rules, 5-question quiz) (D4)"
```

### Task 25: Roadmap tổng quan (E1)

**Files:**
- Create: `app-next/src/app/(app)/roadmap/page.tsx`, `app-next/src/components/roadmap/journey-card.tsx`
- Test: `app-next/src/components/roadmap/__tests__/journey-card.test.tsx`
- Port-from: `clone/roadmap.html` + `clone/js/roadmap.js` (phần render), `clone/specs/SPEC-05-roadmap-review-gated.md` §1

**Interfaces:**
- Consumes: Task 9 (`roadmapStages`, `roadmapCopy`), Task 6 (`getRoadmapDone`).
- Produces: `export default function JourneyCard(): JSX.Element` — client: badge "🚧 Tính năng đang phát triển" (đặt ở page); "Hành trình của bạn 🚩" + "Bạn đang ở: 拼音 · Bảng chữ cái Pinyin" + nút "Tiếp tục học" → `/roadmap/pinyin` + "N% toàn lộ trình" progress bar — % = `getRoadmapDone().length / 8` (tiến độ chặng pinyin), SP1 thường 0%.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/roadmap/__tests__/journey-card.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import JourneyCard from "../journey-card";

beforeEach(() => localStorage.clear());

describe("JourneyCard (E1)", () => {
  it("0% khi chưa làm buổi nào, link Tiếp tục học đúng", () => {
    render(<JourneyCard />);
    expect(screen.getByText(/0% toàn lộ trình/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tiếp tục học/ }).getAttribute("href")).toBe("/roadmap/pinyin");
  });
  it("phản ánh buổi pinyin đã xong (3/8 = 37%)", () => {
    localStorage.setItem("nhai.roadmap.pinyin", JSON.stringify([1, 2, 3]));
    render(<JourneyCard />);
    expect(screen.getByText(/37% toàn lộ trình/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/components/roadmap/__tests__/journey-card.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement JourneyCard + trang `/roadmap`**

`journey-card.tsx` ("use client", đọc localStorage sau mount như ContinueCard). `/roadmap/page.tsx` (server): badge + JourneyCard + timeline dọc 6 chặng từ `roadmapStages` — marker tròn (`marker` text: 拼音/1级/2级/3级/4–6级/7–9级) + card (title + level + desc + tags pill + "Chưa bắt đầu" + "Vào học") mỗi card là Link `book` tương ứng; card "Tổng ôn" Link `/review` với `roadmapCopy.reviewDesc` + tags [Từ vựng, Ngữ pháp]; đoạn kết `roadmapCopy.ending`.

- [ ] **Step 4: Run test verify pass + smoke + commit**

Run: `pnpm vitest run src/components/roadmap/__tests__/journey-card.test.tsx` → PASS. `pnpm dev` → `/roadmap` khớp SPEC-05 §1 (6 chặng, mọi link, card Tổng ôn).

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: roadmap overview — 6 chặng + journey card % + tổng ôn card (E1)"
```

### Task 26: Roadmap Pinyin — stepper 6 bước + timeline 8 buổi (E2)

**Files:**
- Create: `app-next/src/app/(app)/roadmap/pinyin/page.tsx`, `app-next/src/components/roadmap/steps-client.tsx`, `app-next/src/components/roadmap/timeline-client.tsx`
- Create: `app-next/src/lib/roadmap-status.ts`
- Test: `app-next/src/lib/__tests__/roadmap-status.test.ts`
- Port-from: `clone/roadmap-pinyin.html` + `clone/js/roadmap-pinyin.js:1-288`, `clone/specs/SPEC-05-roadmap-review-gated.md` §2, `clone/specs/SPEC-21-roadmap-session.md` §A

**Interfaces:**
- Consumes: Task 9 (`roadmapPinyinSteps`, `roadmapSessions`), Task 6 (`getRoadmapDone`), Task 5 (`useTts`).
- Produces:
  - `app-next/src/lib/roadmap-status.ts`: `export type SessionStatus = "done" | "current" | "locked";` + `export function sessionStatus(done: number[], n: number): SessionStatus` — `done.includes(n)` → done; `n === 1 || done.includes(n - 1)` → current; else locked. (Thuần, test được; dùng ở Task 27 nữa.)
  - `steps-client.tsx`: `export default function StepsClient(): JSX.Element` — stepper 6 bước ngang (label `roadmapPinyinSteps[i].label`, bước hiện tại nền đỏ, Link `?step=n`), nội dung bước render theo `key` (initials: grid 23 card chữ to + 🔊 `useTts`; vowels; compound groups; tones; rules; overview links), nút "← Bước trước"/"Bước sau →".
  - `timeline-client.tsx`: `export default function TimelineClient(): JSX.Element` — 8 node dọc xen kẽ `translateX(±3rem)` desktop (`md:` variant), 1 cột mobile; trạng thái `sessionStatus(getRoadmapDone(), n)`; node done vòng xanh ✓, current vòng đỏ + badge "Bạn đang ở đây", locked 🔒 + card mờ + tooltip CSS hover "Buổi chưa mở khoá 🔒 — Hoàn thành Bài kiểm tra của Buổi N-1 để mở Buổi N"; click node mở → `/roadmap/pinyin/session/[n]`; cuối: "🚩 8 buổi · Hoàn thành chặng" + "Bạn mới học N/8 buổi".
  - `/roadmap/pinyin/page.tsx` (server): `h1` "Bảng chữ cái Pinyin — Học theo lộ trình" + sub "8 buổi, mỗi buổi 15–20 phút — hoàn thành bài kiểm tra để mở buổi tiếp theo." + `<Suspense><StepsClient /></Suspense>` + `<TimelineClient />`.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/lib/__tests__/roadmap-status.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sessionStatus } from "../roadmap-status";

describe("sessionStatus", () => {
  it("buổi 1 mở sẵn (current) khi chưa done", () => {
    expect(sessionStatus([], 1)).toBe("current");
  });
  it("buổi N khóa khi buổi N-1 chưa done", () => {
    expect(sessionStatus([], 2)).toBe("locked");
    expect(sessionStatus([1], 3)).toBe("locked");
  });
  it("buổi N mở khi buổi N-1 done; done giữ trạng thái", () => {
    expect(sessionStatus([1], 2)).toBe("current");
    expect(sessionStatus([1, 2], 2)).toBe("done");
    expect(sessionStatus([1, 2, 3], 2)).toBe("done");
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/lib/__tests__/roadmap-status.test.ts`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement roadmap-status.ts**

Như Interfaces — 6 dòng logic, so `done.includes(n - 1)` TRƯỚC khi kiểm tra `done.includes(n)`? Không: thứ tự đúng là `done.includes(n)` → "done" trước, rồi `n === 1 || done.includes(n - 1)` → "current", else "locked".

- [ ] **Step 4: Implement StepsClient + TimelineClient + route**

Port `clone/js/roadmap-pinyin.js` (stepper + nội dung 6 bước) và SPEC-21 §A (timeline): `?step=` qua `useSearchParams` (bọc Suspense ở page); timeline dùng `roadmapSessions` cho tên/phút/desc; tooltip: `<span className="hidden group-hover:block absolute …">Buổi chưa mở khoá 🔒 — Hoàn thành Bài kiểm tra của Buổi {n-1} để mở Buổi {n}</span>`; node click chỉ khi status !== "locked" (`<Link href={\`/roadmap/pinyin/session/${n}\`}>` hoặc span disabled).

- [ ] **Step 5: Run test verify pass + smoke**

Run: `pnpm vitest run src/lib/__tests__/roadmap-status.test.ts` → PASS. `pnpm dev` → `/roadmap/pinyin`: deep-link `?step=4` mở đúng bước; node 2–8 🔒; làm xong buổi 1 (Task 27 sẽ ghi) — tạm test bằng set `nhai.roadmap.pinyin = [1]` reload → buổi 2 thành current đỏ.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: roadmap pinyin — stepper 6 bước + timeline 8 buổi khoá tuần tự + tooltip (E2)"
```

### Task 27: Roadmap Session — trang buổi 4 tab (E3)

**Files:**
- Create: `app-next/src/app/(app)/roadmap/pinyin/session/[n]/page.tsx`, `app-next/src/components/roadmap/session-client.tsx`
- Test: `app-next/src/components/roadmap/__tests__/session-client.test.tsx`
- Port-from: `clone/roadmap-session.html` + `clone/js/roadmap-session.js:1-394`, `clone/specs/SPEC-21-roadmap-session.md` §B–C

**Interfaces:**
- Consumes: Task 9 (`roadmapSessions`), Task 26 (`sessionStatus`), Task 6 (`markRoadmapSession`), Task 14 (`checkTyped`), Task 5 (`useTts`).
- Produces: `export default function SessionClient({ n }: { n: number })` — client: header link "‹ Lộ trình pinyin" (`/roadmap/pinyin`) + `h2` "Buổi N — <title>" + progress bar mỏng (tab hiện tại /4); 4 tab pill (active viền đỏ): "Hoc" → label "Học" (+✓ khi learnSeen) · "Flashcard" · "Trắc nghiệm" · "Bài kiểm tra" (+🔒 khi `sessionStatus(done, n) === "locked"`):
  - **Học** (mặc định): các card `learn[]` (ký hiệu thanh + tên + detail + ví dụ 妈/麻/马/骂 + 🔊 speak ex.pinyin) + bảng "Tự nhận biết" 2 cột + nút "Đã đọc xong, sang Flashcard →" (set `learnSeen`, chuyển tab flashcard).
  - **Flashcard**: mini deck `cards[]` (6 thẻ): đếm "x/N", flip, nút "Đã thuộc"/"Chưa thuộc"; xong N thẻ → hiện nút sang Trắc nghiệm.
  - **Trắc nghiệm**: `quiz[]` 2 câu 4 nút; hiện "Đúng x/2" + "Làm lại" sau khi hết.
  - **Bài kiểm tra**: `test[0]` trắc nghiệm + `test[1]` tự luận (input pinyin, nút "Nộp bài" — chấm `checkTyped(input, accept[0])`); điểm "x/2"; nút "Hoàn thành buổi N →" disabled đến khi điểm ≥1; bấm → `progressStore.markRoadmapSession(n)` + `router.push("/roadmap/pinyin")`.
  - Route page: `export default async function Page({ params }: { params: Promise<{ n: string }> })` — `const { n } = await params;` validate `1..8` else `notFound()`; render `<SessionClient n={Number(n)} />`.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/roadmap/__tests__/session-client.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SessionClient from "../session-client";
import { progressStore } from "@/lib/store/progress-store";
import { roadmapSessions } from "@/content/roadmap";

beforeEach(() => localStorage.clear());

describe("SessionClient (E3)", () => {
  it("4 tab đúng thứ tự; tab Bài kiểm tra mở ở buổi 1", () => {
    render(<SessionClient n={1} />);
    expect(screen.getByRole("button", { name: /Học/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Flashcard/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Trắc nghiệm/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bài kiểm tra/ })).toBeInTheDocument();
  });
  it("Trắc nghiệm chấm + Làm lại", async () => {
    render(<SessionClient n={1} />);
    act(() => screen.getByRole("button", { name: /Trắc nghiệm/ }).click());
    const q = roadmapSessions[0].quiz[0];
    await act(async () => screen.getByRole("button", { name: q.options[q.answer] }).click());
    expect(screen.getByText(/Đúng 1\/2/)).toBeInTheDocument();
  });
  it("Bài kiểm tra: nút hoàn thành chỉ bật khi đạt >=1/2; bấm ghi done", async () => {
    const user = userEvent.setup();
    render(<SessionClient n={1} />);
    act(() => screen.getByRole("button", { name: /Bài kiểm tra/ }).click());
    const doneBtn = screen.getByRole("button", { name: /Hoàn thành buổi 1/ });
    expect(doneBtn).toBeDisabled();
    const t = roadmapSessions[0].test;
    const quizItem = t.find((x) => x.kind === "quiz")!;
    await user.click(screen.getByRole("button", { name: quizItem.options![quizItem.answer!] }));
    expect(doneBtn).toBeEnabled();
    await user.click(doneBtn);
    expect(progressStore.getRoadmapDone()).toContain(1);
  });
  it("buổi 2 khóa tab Bài kiểm tra khi buổi 1 chưa done", () => {
    render(<SessionClient n={2} />);
    expect(screen.getByRole("button", { name: /Bài kiểm tra/ }).textContent).toContain("🔒");
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/components/roadmap/__tests__/session-client.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement SessionClient**

Port `clone/js/roadmap-session.js` theo Interfaces — mỗi tab 1 render branch trong `SessionClient` (state `tab: "learn" | "flash" | "quiz" | "test"`); tab test gated: `const locked = sessionStatus(progressStore.getRoadmapDone(), n) === "locked"` — nếu locked, bấm tab test hiện thông báo + 🔒 trên tab; điểm test: `score = (quiz đúng ? 1 : 0) + (written đúng ? 1 : 0)`; hoàn thành: `markRoadmapSession(n)` rồi `router.push("/roadmap/pinyin")` (timeline sẽ mở khoá buổi N+1 qua Task 26).

- [ ] **Step 4: Implement route + run verify pass**

Route như Interfaces. Run: `pnpm vitest run src/components/roadmap/__tests__/session-client.test.tsx` → PASS 4 tests.

- [ ] **Step 5: Smoke luồng end-to-end**

Run: `pnpm dev` → `/roadmap/pinyin` → bấm buổi 1 → 4 tab → tab Bài kiểm tra → đạt ≥1/2 → "Hoàn thành buổi 1 →" → về timeline: buổi 1 xanh ✓, buổi 2 đỏ "Bạn đang ở đây"; reload giữ trạng thái (localStorage).

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: roadmap session — 4 tab (Học/Flashcard/Trắc nghiệm/Bài kiểm tra), unlock tuần tự (E3)"
```

### Task 28: Metadata SEO + sitemap + robots (D5) + e2e smoke cuối + deploy xanh

**Files:**
- Create: `app-next/src/app/sitemap.ts`, `app-next/src/app/robots.ts`, `app-next/e2e/learning-flow.spec.ts`
- Modify: `app-next/src/app/layout.tsx` (metadata root: `metadataBase`, `title.template`, og), `app-next/src/app/(app)/page.tsx`, `course/page.tsx`, `course/[book]/page.tsx`, `lesson/[book]/[page]/page.tsx`, `pinyin/page.tsx`, `pinyin/practice/page.tsx`, `radicals/page.tsx`, `sound-rules/page.tsx`, `roadmap/page.tsx`, `roadmap/pinyin/page.tsx` (thêm `export const metadata` / `generateMetadata` từng file)

**Interfaces:**
- Consumes: mọi task trước; Task 4 (`pnpm preview`).
- Produces: metadata mỗi route public; `/sitemap.xml` đúng danh sách; e2e smoke toàn luồng; deploy Workers xanh.

- [ ] **Step 1: Write the failing e2e test**

Tạo `app-next/e2e/learning-flow.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("home → course → lesson → flip → star từ (luồng chính)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Chào bạn 👋" })).toBeVisible();
  await page.getByRole("link", { name: /Nhai HSK 1/ }).click();
  await expect(page).toHaveURL(/\/course\/hsk1/);
  await page.getByRole("link", { name: /Xin chào!/ }).click();
  await expect(page).toHaveURL(/\/lesson\/hsk1\/lesson-1/);
  await page.getByText("Click để lật").click();
  await expect(page.getByText("Xin chào")).toBeVisible(); // nghĩa mặt sau
  await page.getByTitle("Thêm vào bộ thẻ ôn tập").first().click();
  await expect(page.getByText("Đã thêm vào ôn tập")).toBeVisible();
});

test("sitemap chứa đúng các route public", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  const xml = await res.text();
  for (const path of ["/", "/course", "/course/hsk1", "/pinyin", "/pinyin/practice", "/radicals", "/sound-rules", "/roadmap", "/roadmap/pinyin"]) {
    expect(xml).toContain(`<loc>http://localhost:3000${path}</loc>`);
  }
  expect(xml).not.toContain("/lesson/custom");
  expect(xml).not.toContain("/review");
});

test("metadata lesson chứa tên bài", async ({ page }) => {
  await page.goto("/lesson/hsk1/lesson-1");
  await expect(page).toHaveTitle(/Xin chào!/);
});
```

- [ ] **Step 2: Run e2e verify fail**

Run: `pnpm test:e2e e2e/learning-flow.spec.ts`
Expected: FAIL — sitemap chưa tồn tại (404), title lesson chưa có tên bài.

- [ ] **Step 3: Thêm metadata + sitemap + robots**

Root `layout.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://nhaihsk.example"),
  title: { default: "Nhai HSK — Học tiếng Trung mỗi ngày", template: "%s · Nhai HSK" },
  description: "Học từ vựng tiếng Trung theo HSK 3.0 — flashcard, trắc nghiệm, pinyin, bộ thủ.",
  openGraph: { images: ["/mascot.png"], locale: "vi_VN", type: "website" },
};
```

(`public/mascot.png` — copy mascot cà chua từ `clone/assets/` nếu có, nếu không dùng `/assets/vietnam-map.svg` tạm: đặt `images: ["/assets/vietnam-map.svg"]`.)

Tạo `app-next/src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";
import { books } from "@/content/courses";

const BASE = "https://nhaihsk.example";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "", "/course", ...books.map((b) => `/course/${b.slug}`),
    "/pinyin", "/pinyin/practice", "/radicals", "/sound-rules", "/roadmap", "/roadmap/pinyin",
  ].map((p) => ({ url: BASE + p, lastModified: new Date() }));
}
```

Tạo `app-next/src/app/robots.ts`:

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/lesson/custom/", "/lesson/"] }],
    sitemap: "https://nhaihsk.example/sitemap.xml",
  };
}
```

Thêm `export const metadata` vào từng route public: `{ title: "Trang chủ" }` ở `/`, `{ title: "Bài khoá" }` ở `/course`, `generateMetadata` cho `/course/[book]` (`{ title: "HSK 1 3.0" }` từ `courses[book]`) và `/lesson/[book]/[page]` (`{ title: vocab[book][page].title }` — build-time từ content module); `{ title: "Bảng Pinyin" }`, `{ title: "Bài tập Pinyin" }`, `{ title: "214 Bộ Thủ" }`, `{ title: "Quy tắc chuyển âm" }`, `{ title: "Lộ trình" }`, `{ title: "Lộ trình pinyin" }` + `description` tiếng Việt riêng từng trang (lấy đúng sub/mô tả của trang).

- [ ] **Step 4: Run e2e + unit verify pass**

Run: `pnpm test:e2e e2e/learning-flow.spec.ts && pnpm test`
Expected: e2e 3 tests PASS; toàn bộ vitest suite PASS (regression).

- [ ] **Step 5: Build + deploy Workers xanh**

```bash
cd /Volumes/samsung512/Code/hsk/app-next
pnpm typecheck && pnpm lint && pnpm exec opennextjs-cloudflare build && pnpm deploy
```
Expected: build thành công; deploy lên Workers (nếu có `CLOUDFLARE_API_TOKEN` local) hoặc tối thiểu `pnpm preview` chạy app đúng trên workerd ở `http://localhost:8787` (kiểm tra `/`, `/lesson/hsk1/lesson-1`, `/sitemap.xml`). `grep -r "cdn.tailwindcss" app-next/src app-next/public` → không kết quả (không Tailwind CDN).

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next
git commit -m "feat: metadata SEO + sitemap + robots (D5) + e2e learning flow; deploy Workers xanh"
```

---

## Phụ lục A — Self-review đã chạy (kết quả)

- **Spec coverage (spec 10):** B1→Task 20; B2→Task 21; B3→Task 7 (+8, 9); C1→Task 11; C2→Task 12; C3→Task 13; C4→Task 14; C5/C6→Task 15; C7/C8→Task 16; C9→Task 17; C10→Task 18; C11→Task 19; D1/D2→Task 22; D3→Task 23; D4→Task 24; D5→Task 28; E1→Task 25; E2→Task 26; E3→Task 27; Phase 0 scaffold/deploy/CI→Task 1–4; theme→Task 3; ProgressStore→Task 6. Feature inventory B1–B3, C1–C11, D1–D5, E1–E3 đều `[PORT]` — đủ.
- **Placeholder scan:** không có "TBD"/"add error handling"/"similar to Task N"; mỗi task có test code hoặc lệnh verify cụ thể; các chỗ "port từ file X dòng Y" là lệnh copy nguồn xác định kèm rule chuyển đổi, không phải bỏ trống.
- **Type consistency:** `SrsStatus` 4 giá trị dùng thống nhất Task 6/17; `LessonItem`/`LessonMode`/`KnownFlag` định nghĩa Task 11, dùng Task 12–18; `sessionStatus(done, n)` định nghĩa Task 26 dùng Task 27; `useToast`/`useProgress`/`FeedbackEntry`/`ProgressSnapshot { xp }` khớp contract plan sp1-social-legal; `toPinyin`/`stripTones` Task 5 dùng Task 14/16/22/27; `AutoplayCfg` Task 23; `ProgressStore` methods gọi đúng tên ở mọi task (`toggleSrs`, `addSrsBatch`, `saveBattleBest`, `markRoadmapSession`, `listPageDone`, `addXp`, `getRoadmapDone`).
- **Đồng bộ plan anh em:** Topbar để `<div data-bell-slot />` + layout để `<div data-ai-slot />` (Task 10); KHÔNG tạo `not-found.tsx`, `/leaderboard`, `@/content/leaderboard`, `@/content/certificates`, `@/components/social/*` (plan sp1-social-legal sản xuất); root layout mount đúng chuỗi provider sibling kỳ vọng.
