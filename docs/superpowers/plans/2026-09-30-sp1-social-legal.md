# SP1 Social & Legal (mock) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port các phần mock social/legal của SP1 sang Next.js App Router: trang `/leaderboard` (2 tab dữ liệu cứng), `/feedback` (localStorage `nhai.feedback`), `/terms`, `/privacy`, `/delete-account` (mock toast), `not-found.tsx` (404), AI widget mock (reply cứng 400ms), notification bell mock (3 item cứng), + content modules `leaderboard.ts` / `certificates.ts`.

**Architecture:** Toàn bộ là client/server components thuần Next.js trong `app-next/` (scaffold thuộc plan anh em `2026-09-30-sp1-learning-core.md`). Dữ liệu cứng tách ra content modules TS typed (port từ `clone/js/data/`), UI là component React giữ nguyên copy + hành vi clone. Không có backend, không fetch network ở SP1 (UPG-2/UPG-5 nâng cấp sau). Test: Vitest + @testing-library/react cho logic/widget, Playwright smoke cho routes.

**Tech Stack:** Next.js App Router + TypeScript + Tailwind v4, Vitest + @testing-library/react + jsdom, Playwright, pnpm. Deploy Cloudflare Workers qua `@opennextjs/cloudflare` (không ảnh hưởng các trang tĩnh này).

**Spec:** `docs/superpowers/specs/fullstack/13-social-monetization-ai.md` (phạm vi SP1 mock: §1.1 bảng ranh giới, A1b SP1, A5 SP1, H1 SP1, H2 SP1, H4 SP1) + `docs/superpowers/specs/2026-09-30-hsk-feature-inventory.md` (A1, A4, A5, A9, H1–H4) + clone specs `clone/specs/SPEC-01-home-course-leaderboard.md` §3–4, `clone/specs/SPEC-15-misc-gaps.md` §5–6. Hợp đồng canonical `docs/superpowers/specs/fullstack/00-platform-data.md` chỉ tham chiếu — plan này KHÔNG làm D1/KV.

## Global Constraints

- Repo root app mới là `app-next/` (đã scaffold sẵn bởi plan 10 — task của plan này tạo file bên trong nó, không scaffold lại).
- Mọi localStorage key giữ nguyên tiền tố `nhai.*` (`nhai.feedback`, `nhai.mockLogin`, `nhai.xp`, `nhai.theme`, `nhai.voice`, `nhai.chatBubble`).
- Copy tiếng Việt giữ NGUYÊN VĂN từng chữ từ `clone/*.html` và `clone/js/*.js` — không dịch lại, không sửa dấu câu.
- Không còn Tailwind CDN; dùng Tailwind v4 + CSS variables của theme (`--nhai-main`, `--nhai-border`, `--nhai-muted`, `--nhai-soft`, `--nhai-bg`, `--nhai-card`, `--nhai-accent`, class `card`, `btn-main`, `btn-ghost`, `pill`, `pill-active`, `shadow-neo`, `zh`, `paper-grid` — đã port trong `app-next/src/app/globals.css` bởi plan 10).
- Không thêm dependency mới ngoài những gì plan 10 đã cài (Next, TS, Tailwind v4, Vitest, @testing-library/react, jsdom, Playwright).
- Mọi component phải client nằm dưới route dùng `"use client"` ở đầu file; static pages (`/terms`, `/privacy`) là server components không directive.
- Mock giữ đúng hành vi clone: AI reply sau đúng 400ms với text cố định; chuông có đúng 3 notification cứng; delete-account toast + disable nút + đổi text; leaderboard đổi tab không fetch/reload (state client).
- Command test chạy từ `app-next/`: `pnpm vitest run <path>`, `pnpm playwright test <path>`; dev server `pnpm dev` (port 3000).

## Phụ thuộc plan anh em (Interfaces: Consumes từ plan `2026-09-30-sp1-learning-core.md`)

Plan 10 PHẢI cung cấp (các task dưới coi như đã tồn tại, compile-passing):

1. Shell layout tại `app-next/src/app/layout.tsx` render `<ThemeProvider>` + `<ToastProvider>` + `<SidebarNav />` + `<Topbar />` + `<LoginModal />` (mock `nhai.mockLogin`) + `<SettingsModal />`, wrap mọi route; body có class `paper-grid` ở desktop.
2. `app-next/src/lib/store/progress-store.ts` export:
   - `type FeedbackEntry = { text: string; at: string }` (chuẩn hoá shape clone: `{text, at: ISO string}`).
   - class `ProgressStore` với `appendFeedback(entry: FeedbackEntry): void` (push vào mảng JSON tại key `nhai.feedback`, tương thích dữ liệu cũ) và `getFeedback(): FeedbackEntry[]` (trả `[]` khi key rỗng/hỏng JSON).
   - export singleton `progressStore: ProgressStore`.
   - `type ProgressSnapshot = { xp: number }` và hook `useProgress(): ProgressSnapshot` (đọc `nhai.xp` — Topbar dùng, plan này không gọi trực tiếp).
3. `app-next/src/components/shell/toast-provider.tsx` export `useToast(): (msg: string) => void` — toast tự ẩn sau 2600ms, chỉ 1 toast tại một thời điểm (giữ `NHAI.toast`).
4. Vitest đã cấu hình (`vitest.config.ts`, environment jsdom, path alias `@/*` → `src/*`) + `@testing-library/react` + `@testing-library/jest-dom` setup file + `matchMedia`/`scrollTo` stubs nếu cần.
5. Playwright đã cấu hình (`playwright.config.ts` — base URL `http://localhost:3000`, webServer chạy `pnpm dev`).
6. Topbar của plan 10 có placeholder mount point: import + render `<NotificationBell />` từ `@/components/social/notification-bell` tại vị trí chuông (giữa span XP và nút Đăng nhập — vị trí `[data-bell]` trong `clone/js/shell.js` dòng 225). Plan 10 tham chiếu task 4 của plan này; nếu plan 10 chạy trước và chưa có component này, giữ chỗ `<div data-bell-slot />` rồi task 4 sửa lại.

**Điều phối 404:** task 8 của plan này viết `app-next/src/app/not-found.tsx` — plan 10 KHÔNG tạo file này (tránh conflict).

## Future phases (KHÔNG làm trong plan này — không viết task)

- **UPG-2:** leaderboard D1 + KV `lb:*` TTL 600s, feedback POST `/feedback`, delete-account cascade + email, notifications GET/mark — xem spec 13 §A1b/H1/H2/H4 và `00-platform-data.md` §3.3, §8.
- **UPG-4:** monetization `/nang-cap`, MoMo/Stripe, redeem FREEHSK — spec 13 SP4.
- **UPG-5:** AI chat SSE `/ai/chat`, TTS server, format-vocab — spec 13 SP5.1–SP5.3.

---

## File Structure (map trước khi bắt đầu)

- Create: `app-next/src/content/leaderboard.ts` — data cứng XP/battle + `initials()` + `formatXp()` (port `clone/js/data/leaderboard.js` + helper từ `clone/js/leaderboard.js`).
- Create: `app-next/src/content/certificates.ts` — data 7 card HSK + 3 card HSKK (port `clone/js/data/certificates.js`).
- Create: `app-next/src/app/leaderboard/page.tsx` — trang 2 tab (client).
- Create: `app-next/src/app/feedback/page.tsx` — form góp ý (client).
- Create: `app-next/src/app/terms/page.tsx`, `app-next/src/app/privacy/page.tsx` — static server components.
- Create: `app-next/src/app/delete-account/page.tsx` — mock xoá tài khoản (client).
- Create: `app-next/src/app/not-found.tsx` — trang 404.
- Create: `app-next/src/components/social/notification-bell.tsx` — chuông + popup 3 item cứng (client, mount trong Topbar của plan 10).
- Create: `app-next/src/components/social/ai-widget.tsx` — floating cluster mascot kép 🤖+🍅 + panel chat reply 400ms + nút Nhắn tin/Ủng hộ (client, mount trong layout — plan 10 gọi `<AiWidget />` dưới cùng body).
- Test: `app-next/src/content/__tests__/leaderboard.test.ts`, `app-next/src/content/__tests__/certificates.test.ts`, `app-next/src/app/feedback/__tests__/feedback-page.test.tsx`, `app-next/src/components/social/__tests__/notification-bell.test.tsx`, `app-next/src/components/social/__tests__/ai-widget.test.tsx`, `app-next/src/app/delete-account/__tests__/delete-account-page.test.tsx`, `app-next/tests/e2e/social-smoke.spec.ts`.

---

### Task 1: Content modules leaderboard + certificates

**Files:**
- Create: `app-next/src/content/leaderboard.ts` (port từ `clone/js/data/leaderboard.js`, helper `initials` từ `clone/js/leaderboard.js:8-17`, format XP từ `clone/js/leaderboard.js:47`)
- Create: `app-next/src/content/certificates.ts` (port từ `clone/js/data/certificates.js`)
- Test: `app-next/src/content/__tests__/leaderboard.test.ts`, `app-next/src/content/__tests__/certificates.test.ts`

**Interfaces:**
- Consumes: không (chỉ data thuần).
- Produces:
  - `export type XpRow = { name: string; points: number }`
  - `export type BattleRow = { name: string; score: string; time: string }`
  - `export const leaderboardData: { xp: XpRow[]; battle: BattleRow[] }` (xp: 10 hàng 7915→3235; battle: 10 hàng "12/15"→"9/15")
  - `export function initials(name: string): string`
  - `export function formatXp(points: number): string`
  - `export type CertificateCard = { logo: string; name: string; zh: string; desc: string }`
  - `export const certificateData: { hsk: CertificateCard[]; hskk: CertificateCard[] }`

- [ ] **Step 1: Write the failing test leaderboard**

Tạo `app-next/src/content/__tests__/leaderboard.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { leaderboardData, initials, formatXp } from "../leaderboard";

describe("leaderboardData", () => {
  it("có đúng 10 hàng XP giảm dần, hàng đầu là My Phan 7915", () => {
    expect(leaderboardData.xp).toHaveLength(10);
    expect(leaderboardData.xp[0]).toEqual({ name: "My Phan", points: 7915 });
    const points = leaderboardData.xp.map((r) => r.points);
    expect([...points].sort((a, b) => b - a)).toEqual(points);
  });

  it("có đúng 10 hàng Đấu trí, điểm 12/15 → 9/15, có thời gian", () => {
    expect(leaderboardData.battle).toHaveLength(10);
    expect(leaderboardData.battle[0]).toEqual({
      name: "Minh Anh Phạm",
      score: "12/15",
      time: "5 phút trước",
    });
    expect(leaderboardData.battle[9].score).toBe("9/15");
  });
});

describe("initials", () => {
  it("bỏ phần trong ngoặc và lấy 2 chữ cái", () => {
    expect(initials("Quỳnh Ngọc (Wuynhh)")).toBe("QN");
  });
  it("tên 1 từ lấy 1 chữ cái, viết hoa", () => {
    expect(initials("Tuấn Kiệt")).toBe("TK");
    expect(initials("gia huy")).toBe("GH");
  });
});

describe("formatXp", () => {
  it("format vi-VN với dấu chấm ngăn cách nghìn + ' XP'", () => {
    expect(formatXp(7915)).toBe("7.915 XP");
    expect(formatXp(3235)).toBe("3.235 XP");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/content/__tests__/leaderboard.test.ts`
Expected: FAIL — `Cannot find module '../leaderboard'`

- [ ] **Step 3: Write minimal implementation leaderboard**

Tạo `app-next/src/content/leaderboard.ts`:

```ts
/* Nhai HSK — SP1: dữ liệu bảng xếp hạng (port từ clone/js/data/leaderboard.js + helper từ clone/js/leaderboard.js). */

export type XpRow = { name: string; points: number };
export type BattleRow = { name: string; score: string; time: string };

/* XP tổng — sắp theo điểm giảm dần */
export const leaderboardData: { xp: XpRow[]; battle: BattleRow[] } = {
  xp: [
    { name: "My Phan", points: 7915 },
    { name: "Khánh Linh Trần", points: 5850 },
    { name: "TÔI VÀ EM", points: 4977 },
    { name: "Quỳnh Ngọc (Wuynhh)", points: 4838 },
    { name: "Boi thy Huynh", points: 4523 },
    { name: "Ngọc Nguyễn", points: 4153 },
    { name: "Vân Anh Ngô", points: 3675 },
    { name: "Đạt Nguyễn Thành", points: 3591 },
    { name: "Thi Yen", points: 3397 },
    { name: "Giao Trần Quỳnh", points: 3235 },
  ],
  /* Đấu trí tháng — 10 hàng, điểm 12/15 → 9/15, kèm thời gian */
  battle: [
    { name: "Minh Anh Phạm", score: "12/15", time: "5 phút trước" },
    { name: "Tuấn Kiệt", score: "12/15", time: "18 phút trước" },
    { name: "Hải Yến", score: "11/15", time: "32 phút trước" },
    { name: "Đức Anh Vũ", score: "11/15", time: "1 giờ trước" },
    { name: "Thanh Thảo", score: "11/15", time: "2 giờ trước" },
    { name: "Hoàng Nam", score: "10/15", time: "3 giờ trước" },
    { name: "Kim Chi Lê", score: "10/15", time: "5 giờ trước" },
    { name: "Trung Hiếu", score: "10/15", time: "7 giờ trước" },
    { name: "Bảo Ngọc Trần", score: "9/15", time: "9 giờ trước" },
    { name: "Gia Huy", score: "9/15", time: "hôm qua" },
  ],
};

export function initials(name: string): string {
  const words = String(name)
    .replace(/\([^)]*\)/g, "") // bỏ phần trong ngoặc: (Wuynhh)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const a = (words[0] || "?").charAt(0);
  const b = words.length > 1 ? words[1].charAt(0) : "";
  return (a + b).toUpperCase();
}

export function formatXp(points: number): string {
  return points.toLocaleString("vi-VN") + " XP";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/content/__tests__/leaderboard.test.ts`
Expected: PASS 5/5 test. (Nếu `7.915 XP` fail do ICU môi trường — Node ≥ 18 full-icu mặc định, kiểm tra `node -e "console.log((7915).toLocaleString('vi-VN'))"`.)

- [ ] **Step 5: Write the failing test certificates**

Tạo `app-next/src/content/__tests__/certificates.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { certificateData } from "../certificates";

describe("certificateData", () => {
  it("có 7 card HSK 3.0 đúng logo và tên", () => {
    expect(certificateData.hsk).toHaveLength(7);
    expect(certificateData.hsk[0]).toMatchObject({
      logo: "H1",
      name: "HSK 1",
      zh: "汉语水平考试 一级",
    });
    expect(certificateData.hsk[6].logo).toBe("7-9");
  });
  it("có 3 card HSKK", () => {
    expect(certificateData.hskk).toHaveLength(3);
    expect(certificateData.hskk[0]).toMatchObject({ logo: "K1", name: "HSKK Sơ cấp" });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/content/__tests__/certificates.test.ts`
Expected: FAIL — `Cannot find module '../certificates'`

- [ ] **Step 7: Write minimal implementation certificates**

Tạo `app-next/src/content/certificates.ts` — copy nguyên mảng `hsk` (7 object với đủ `logo/name/zh/desc`: H1 500 từ…, H2 1.272 từ…, H3 2.245 từ…, H4 3.245 từ…, H5 4.316 từ…, H6 5.456 từ…, H7-9 11.092 từ…) và `hskk` (3 object K1/K2/K3) từ `/Volumes/samsung512/Code/hsk/clone/js/data/certificates.js`, đổi sang TS:

```ts
/* Nhai HSK — SP1: dữ liệu Luyện thi chứng chỉ (port từ clone/js/data/certificates.js — UI-only, đúng số liệu SPEC-07). */

export type CertificateCard = { logo: string; name: string; zh: string; desc: string };

export const certificateData: { hsk: CertificateCard[]; hskk: CertificateCard[] } = {
  hsk: [
    { logo: "H1", name: "HSK 1", zh: "汉语水平考试 一级", desc: "500 từ, 300 chữ Hán — nhập môn: chào hỏi, giới thiệu bản thân, sinh hoạt cơ bản." },
    { logo: "H2", name: "HSK 2", zh: "汉语水平考试 二级", desc: "1.272 từ, 600 chữ Hán — hội thoại đơn giản về đời sống hằng ngày." },
    { logo: "H3", name: "HSK 3", zh: "汉语水平考试 三级", desc: "2.245 từ, 900 chữ Hán — hoàn thành bậc sơ đẳng, tự tin với chủ đề quen thuộc." },
    { logo: "H4", name: "HSK 4", zh: "汉语水平考试 四级", desc: "3.245 từ, 1.200 chữ Hán — mở đầu bậc trung đẳng, trao đổi học tập và công việc." },
    { logo: "H5", name: "HSK 5", zh: "汉语水平考试 五级", desc: "4.316 từ, 1.500 chữ Hán — đọc báo, xem phim, thảo luận có chiều sâu." },
    { logo: "H6", name: "HSK 6", zh: "汉语水平考试 六级", desc: "5.456 từ, 1.800 chữ Hán — hoàn thành bậc trung đẳng, diễn đạt thành thạo." },
    { logo: "7-9", name: "HSK 7–9", zh: "汉语水平考试 七至九级", desc: "11.092 từ, 3.000 chữ Hán — bậc cao đẳng: một bài thi chung xếp cấp 7/8/9, đủ 5 kỹ năng nghe nói đọc viết dịch." },
  ],
  hskk: [
    { logo: "K1", name: "HSKK Sơ cấp", zh: "汉语水平口语考试 初级", desc: "Hỏi đáp và kể chuyện ngắn với vốn từ nền tảng — phù hợp trình độ HSK 1–2." },
    { logo: "K2", name: "HSKK Trung cấp", zh: "汉语水平口语考试 中级", desc: "Nghe rồi thuật lại, miêu tả tranh, trả lời câu hỏi — phù hợp trình độ HSK 3–4." },
    { logo: "K3", name: "HSKK Cao cấp", zh: "汉语水平口语考试 高级", desc: "Thuật lại đoạn dài, đọc thành tiếng, trình bày quan điểm — phù hợp trình độ HSK 5–6." },
  ],
};
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/content/__tests__/`
Expected: PASS tất cả.

- [ ] **Step 9: Commit**

```bash
cd /Volumes/samsung512/Code/hsk && git add app-next/src/content/leaderboard.ts app-next/src/content/certificates.ts app-next/src/content/__tests__/
git commit -m "feat(sp1-social): port leaderboard + certificates content data"
```

---

### Task 2: Trang `/leaderboard` — 2 tab XP | Đấu trí

**Files:**
- Create: `app-next/src/app/leaderboard/page.tsx` (port từ `clone/leaderboard.html` + `clone/js/leaderboard.js`)
- Test: `app-next/tests/e2e/social-smoke.spec.ts` (tạo khung ở task này, smoke đầy đủ ở Task 10)

**Interfaces:**
- Consumes: `leaderboardData`, `initials`, `formatXp` từ `@/content/leaderboard` (Task 1); shell layout + class CSS `card`, `pill`, `pill-active` từ plan 10.
- Produces: route `GET /leaderboard` (tab mặc định `xp`, `?tab=battle` đổi bảng); không export component ra ngoài.

**Conversion pattern DOM→JSX (dùng lại ở các task sau) — hàng leaderboard:**

Before (`clone/js/leaderboard.js:19-33`, DOM string):

```js
return NHAI.el(
  "<li>" +
    '<div class="card px-4 py-3 flex items-center gap-3">' +
      '<span class="w-10 shrink-0 text-center font-extrabold">' + medal + "</span>" +
      '<span class="w-10 h-10 shrink-0 rounded-full bg-[var(--nhai-main)] text-white flex items-center justify-center text-sm font-extrabold">' + initials(name) + "</span>" +
      '<span class="font-semibold min-w-0 truncate">' + name + "</span>" +
      '<span class="ml-auto shrink-0 text-right">' +
        '<span class="font-extrabold text-[var(--nhai-main)]">' + rightText + "</span>" +
        (rightSub ? '<span class="block text-xs text-[var(--nhai-muted)]">' + rightSub + "</span>" : "") +
      "</span>" +
    "</div>" +
  "</li>"
);
```

After (JSX — `className`, self-closing, `{}` expression, không `innerHTML`):

```tsx
function Row({ rank, name, rightText, rightSub }: { rank: number; name: string; rightText: string; rightSub?: string }) {
  const medal = rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : "#" + rank;
  return (
    <li>
      <div className="card px-4 py-3 flex items-center gap-3">
        <span className="w-10 shrink-0 text-center font-extrabold">{medal}</span>
        <span className="w-10 h-10 shrink-0 rounded-full bg-[var(--nhai-main)] text-white flex items-center justify-center text-sm font-extrabold">{initials(name)}</span>
        <span className="font-semibold min-w-0 truncate">{name}</span>
        <span className="ml-auto shrink-0 text-right">
          <span className="font-extrabold text-[var(--nhai-main)]">{rightText}</span>
          {rightSub ? <span className="block text-xs text-[var(--nhai-muted)]">{rightSub}</span> : null}
        </span>
      </div>
    </li>
  );
}
```

- [ ] **Step 1: Write the failing Playwright test khung**

Tạo `app-next/tests/e2e/social-smoke.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("leaderboard: tab XP tổng mặc định, đổi sang Đấu trí tháng không reload", async ({ page }) => {
  await page.goto("/leaderboard");
  await expect(page.getByRole("heading", { name: "Bảng xếp hạng" })).toBeVisible();
  await expect(page.getByText("My Phan")).toBeVisible();
  await expect(page.getByText("7.915 XP")).toBeVisible();

  await page.getByRole("tab", { name: "Đấu trí tháng" }).click();
  await expect(page).toHaveURL(/\/leaderboard\?tab=battle$/);
  await expect(page.getByText("Minh Anh Phạm")).toBeVisible();
  await expect(page.getByText("12/15").first()).toBeVisible();
  await expect(page.getByText("My Phan")).toBeHidden();

  // URL trực tiếp ?tab=battle mở đúng tab
  await page.goto("/leaderboard?tab=battle");
  await expect(page.getByRole("tab", { name: "Đấu trí tháng" })).toHaveAttribute("aria-selected", "true");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm playwright test tests/e2e/social-smoke.spec.ts`
Expected: FAIL — 404 tại `/leaderboard` (page chưa tồn tại).

- [ ] **Step 3: Write minimal implementation**

Tạo `app-next/src/app/leaderboard/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { leaderboardData, initials, formatXp } from "@/content/leaderboard";

type Tab = "xp" | "battle";

function Row({ rank, name, rightText, rightSub }: { rank: number; name: string; rightText: string; rightSub?: string }) {
  const medal = rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : "#" + rank;
  return (
    <li>
      <div className="card px-4 py-3 flex items-center gap-3">
        <span className="w-10 shrink-0 text-center font-extrabold">{medal}</span>
        <span className="w-10 h-10 shrink-0 rounded-full bg-[var(--nhai-main)] text-white flex items-center justify-center text-sm font-extrabold">{initials(name)}</span>
        <span className="font-semibold min-w-0 truncate">{name}</span>
        <span className="ml-auto shrink-0 text-right">
          <span className="font-extrabold text-[var(--nhai-main)]">{rightText}</span>
          {rightSub ? <span className="block text-xs text-[var(--nhai-muted)]">{rightSub}</span> : null}
        </span>
      </div>
    </li>
  );
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "xp";
    const t = new URLSearchParams(window.location.search).get("tab");
    return t === "battle" ? "battle" : "xp";
  });

  function selectTab(next: Tab) {
    setTab(next); // đổi tab không fetch, không reload (giữ clone/js/leaderboard.js)
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight mb-4">Bảng xếp hạng</h1>

      <div className="flex gap-2 mb-3" role="tablist" aria-label="Loại bảng xếp hạng">
        <button type="button" role="tab" aria-selected={tab === "xp"} onClick={() => selectTab("xp")} className={tab === "xp" ? "pill-active" : "pill"}>
          XP tổng
        </button>
        <button type="button" role="tab" aria-selected={tab === "battle"} onClick={() => selectTab("battle")} className={tab === "battle" ? "pill-active" : "pill"}>
          Đấu trí tháng
        </button>
      </div>

      <p className="text-sm text-[var(--nhai-muted)] mb-5">Top 10 học viên chăm nhất — mỗi câu trả lời đúng +1 XP.</p>

      <ol className="space-y-2 mb-8">
        {tab === "battle"
          ? leaderboardData.battle.map((r, i) => <Row key={r.name} rank={i + 1} name={r.name} rightText={r.score} rightSub={r.time} />)
          : leaderboardData.xp.map((r, i) => <Row key={r.name} rank={i + 1} name={r.name} rightText={formatXp(r.points)} />)}
      </ol>

      <section className="card shadow-neo p-5">
        <h2 className="font-extrabold mb-2">Cách tính điểm</h2>
        <p className="text-sm text-[var(--nhai-muted)] mb-2">XP = mỗi câu trả lời đúng ở các chế độ Flashcard, Trắc nghiệm và các bài luyện tập (mỗi câu +1). Điểm được đồng bộ khi bạn đăng nhập.</p>
        <p className="text-sm text-[var(--nhai-muted)]">Bảng xếp hạng cập nhật tối đa 10 phút một lần. Khi bằng điểm, ai đạt trước xếp trước.</p>
      </section>
    </main>
  );
}
```

Lưu ý: khởi tạo tab từ `window.location.search` trong `useState` initializer để đọc `?tab=` trực tiếp mà không cần `useSearchParams` (tránh Suspense boundary); SSR render tab `xp` rồi client hydrate theo URL — khớp hành vi clone.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm playwright test tests/e2e/social-smoke.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk && git add app-next/src/app/leaderboard/ app-next/tests/e2e/social-smoke.spec.ts
git commit -m "feat(sp1-social): leaderboard page with xp|battle tabs"
```

---

### Task 3: Trang `/feedback` — lưu `nhai.feedback` qua ProgressStore

**Files:**
- Create: `app-next/src/app/feedback/page.tsx` (port từ `clone/feedback.html` + `clone/js/feedback.js`)
- Test: `app-next/src/app/feedback/__tests__/feedback-page.test.tsx`

**Interfaces:**
- Consumes: `progressStore.appendFeedback(entry: FeedbackEntry): void`, `type FeedbackEntry = { text: string; at: string }` từ `@/lib/store/progress-store` (plan 10); `useToast(): (msg: string) => void` từ `@/components/shell/toast-provider` (plan 10).
- Produces: route `GET /feedback`; localStorage `nhai.feedback` = JSON array `FeedbackEntry[]` (khớp shape clone `{text, at: ISO}` để UPG-2 migrate đọc được).

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/app/feedback/__tests__/feedback-page.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FeedbackPage from "../page";

// ToastProvider là mock của plan 10; stub để test độc lập
vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => (msg: string) => { (window as unknown as { __lastToast?: string }).__lastToast = msg; },
}));

function stored(): Array<{ text: string; at: string }> {
  return JSON.parse(localStorage.getItem("nhai.feedback") || "[]");
}

beforeEach(() => {
  localStorage.clear();
  (window as unknown as { __lastToast?: string }).__lastToast = undefined;
});

describe("feedback page", () => {
  it("append entry {text, at ISO} vào nhai.feedback qua ProgressStore rồi xoá textarea", () => {
    render(<FeedbackPage />);
    const textarea = screen.getByLabelText("Nội dung góp ý");
    fireEvent.change(textarea, { target: { value: "App hay quá!" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi góp ý" }));

    const items = stored();
    expect(items).toHaveLength(1);
    expect(items[0].text).toBe("App hay quá!");
    expect(items[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // format thời gian: ISO 8601
    expect(new Date(items[0].at).toString()).not.toBe("Invalid Date");
    expect((textarea as HTMLTextAreaElement).value).toBe("");
    expect((window as unknown as { __lastToast?: string }).__lastToast).toBe("Cảm ơn bạn! Góp ý đã được ghi nhận.");
  });

  it("append nối tiếp vào dữ liệu cũ, không ghi đè", () => {
    localStorage.setItem("nhai.feedback", JSON.stringify([{ text: "cũ", at: "2026-01-01T00:00:00.000Z" }]));
    render(<FeedbackPage />);
    fireEvent.change(screen.getByLabelText("Nội dung góp ý"), { target: { value: "mới" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi góp ý" }));
    const items = stored();
    expect(items).toHaveLength(2);
    expect(items[0].text).toBe("cũ");
    expect(items[1].text).toBe("mới");
  });

  it("text rỗng (chỉ whitespace) thì không lưu, không toast", () => {
    render(<FeedbackPage />);
    fireEvent.change(screen.getByLabelText("Nội dung góp ý"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi góp ý" }));
    expect(stored()).toHaveLength(0);
    expect((window as unknown as { __lastToast?: string }).__lastToast).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/app/feedback/__tests__/feedback-page.test.tsx`
Expected: FAIL — `Cannot find module '../page'`

- [ ] **Step 3: Write minimal implementation**

Tạo `app-next/src/app/feedback/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { progressStore } from "@/lib/store/progress-store";
import { useToast } from "@/components/shell/toast-provider";

export default function FeedbackPage() {
  const [text, setText] = useState("");
  const toast = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    // localStorage có thể bị chặn — vẫn hiện toast (giữ try/catch của clone/js/feedback.js)
    try {
      progressStore.appendFeedback({ text: value, at: new Date().toISOString() });
    } catch {
      /* bỏ qua */
    }
    setText("");
    toast("Cảm ơn bạn! Góp ý đã được ghi nhận.");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Góp ý</h1>
      <p className="text-[var(--nhai-muted)] mb-5">Cảm nhận của bạn giúp Nhai HSK tốt hơn…</p>

      <form onSubmit={handleSubmit} className="card shadow-neo p-5">
        <label htmlFor="feedback-text" className="block text-sm font-bold mb-2">Nội dung góp ý</label>
        <textarea
          id="feedback-text"
          rows={6}
          required
          placeholder="Cảm nhận của bạn giúp Nhai HSK tốt hơn…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full border-2 border-[var(--nhai-border)] rounded-lg px-3 py-2 mb-4 bg-[var(--nhai-bg)] focus:outline-none focus:border-[var(--nhai-main)]"
        />
        <button type="submit" className="btn-main px-6 py-2.5">Gửi góp ý</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/app/feedback/__tests__/feedback-page.test.tsx`
Expected: PASS 3/3.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk && git add app-next/src/app/feedback/
git commit -m "feat(sp1-social): feedback page storing nhai.feedback via ProgressStore"
```

---

### Task 4: Notification bell mock — 3 item cứng (mount trong Topbar của plan 10)

**Files:**
- Create: `app-next/src/components/social/notification-bell.tsx` (port phần `[data-bell]` + `NOTIFS` từ `clone/js/shell.js:253-271`)
- Modify: `app-next/src/components/shell/topbar.tsx` (plan 10 — thay placeholder `data-bell-slot` bằng `<NotificationBell />`; nếu plan 10 chưa chạy xong Topbar, để nguyên và ghi 1 dòng TODO-điều-phối trong PR description, KHÔNG placeholder trong code)
- Test: `app-next/src/components/social/__tests__/notification-bell.test.tsx`

**Interfaces:**
- Consumes: không props; dùng shell CSS (`btn-ghost`, `card`, `shadow-neo`, `--nhai-soft`, `--nhai-border`) từ plan 10. Popup đóng khi click ra ngoài (document click listener) và khi Escape — hành vi `closeSidePanels()` của clone.
- Produces: `export function NotificationBell(): JSX.Element` — nút 🔔 `btn-ghost w-9 h-9` title "Thông báo"; mở popup cố định `fixed right-4 top-16 w-80` tiêu đề "Thông báo" với đúng 3 item: 📘 → `/reading`, 🔔 → `/review`, 🏆 → `/leaderboard?tab=xp`. Plan 10's Topbar import và đặt giữa span XP và nút Đăng nhập.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/social/__tests__/notification-bell.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotificationBell from "../notification-bell";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("NotificationBell", () => {
  it("mặc định ẩn popup; bấm chuông hiện đúng 3 thông báo cứng với link đúng", () => {
    render(<NotificationBell />);
    expect(screen.queryByText("Thông báo")).toBeNull();

    fireEvent.click(screen.getByTitle("Thông báo"));
    const items = screen.getAllByRole("link");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Bài mới: HSK 1 — Bài 1 Đồ ăn đã mở");
    expect(items[0]).toHaveAttribute("href", "/reading");
    expect(items[1]).toHaveAttribute("href", "/review");
    expect(items[2]).toHaveTextContent("Bạn đã vào top 10 Bảng xếp hạng XP tuần này");
    expect(items[2]).toHaveAttribute("href", "/leaderboard?tab=xp");
  });

  it("bấm lần nữa toggle đóng; Escape đóng popup", () => {
    render(<NotificationBell />);
    const bell = screen.getByTitle("Thông báo");
    fireEvent.click(bell);
    expect(screen.getByText("Thông báo")).toBeInTheDocument();
    fireEvent.click(bell); // popup toggle (giữ clone: bấm chuông khi đang mở → đóng)
    expect(screen.queryByText("Thông báo")).toBeNull();
    fireEvent.click(bell);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Thông báo")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/components/social/__tests__/notification-bell.test.tsx`
Expected: FAIL — `Cannot find module '../notification-bell'`

- [ ] **Step 3: Write minimal implementation**

Tạo `app-next/src/components/social/notification-bell.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

/* 3 thông báo demo cứng — port NOTIFS từ clone/js/shell.js:254-258 (UPG-2 sẽ thay bằng GET /users/notifications) */
const NOTIFS = [
  { icon: "📘", text: "Bài mới: HSK 1 — Bài 1 Đồ ăn đã mở", href: "/reading" },
  { icon: "🔔", text: "Nhắc học: hoàn thành 10 từ ôn tập hôm nay", href: "/review" },
  { icon: "🏆", text: "Bạn đã vào top 10 Bảng xếp hạng XP tuần này", href: "/leaderboard?tab=xp" },
];

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button type="button" className="btn-ghost w-9 h-9" title="Thông báo" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        🔔
      </button>
      {open ? (
        <div className="card shadow-neo fixed right-4 top-16 w-80 p-1 z-[500]">
          <div className="px-3 py-2 text-sm font-extrabold border-b-2 border-[var(--nhai-border)] mb-1">Thông báo</div>
          {NOTIFS.map((n) => (
            <a key={n.href} href={n.href} className="block px-3 py-2.5 rounded-md text-sm hover:bg-[var(--nhai-soft)] border-b border-[var(--nhai-border)] last:border-b-0">
              <span aria-hidden="true">{n.icon}</span> {n.text}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/components/social/__tests__/notification-bell.test.tsx`
Expected: PASS 2/2.

- [ ] **Step 5: Mount vào Topbar của plan 10**

Mở `app-next/src/components/shell/topbar.tsx` (của plan 10). Tại vị trí chuông (giữa span `data-user` XP và nút "Đăng nhập" — đối chiếu `clone/js/shell.js:225`), thay placeholder slot bằng:

```tsx
import NotificationBell from "@/components/social/notification-bell";
// ... trong JSX của topbar desktop, sau span XP:
<NotificationBell />
```

Nếu file chưa có slot đánh dấu, chèn `<NotificationBell />` trực tiếp vào đúng vị trí đó. Verify Topbar của plan 10 vẫn pass test của nó.

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/components/shell/ src/components/social/`
Expected: PASS toàn bộ (không test nào của plan 10 vỡ).

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk && git add app-next/src/components/social/ app-next/src/components/shell/topbar.tsx
git commit -m "feat(sp1-social): notification bell mock with 3 hardcoded items"
```

---

### Task 5: AI widget mock — mascot kép + reply cứng 400ms

**Files:**
- Create: `app-next/src/components/social/ai-widget.tsx` (port `renderFloating()` từ `clone/js/shell.js:419-465`, mascot kép theo `clone/specs/SPEC-15-misc-gaps.md` §6)
- Test: `app-next/src/components/social/__tests__/ai-widget.test.tsx`

**Interfaces:**
- Consumes: `useToast()` từ `@/components/shell/toast-provider` (plan 10); setting `nhai.chatBubble` (`=== "0"` → ẩn nút mascot) đọc trực tiếp localStorage như clone. Plan 10 mount `<AiWidget />` trong layout cuối body.
- Produces: `export default function AiWidget(): JSX.Element` — cluster `fixed right-4 bottom-6 z-[600]` gồm: panel chat (ẩn mặc định, header "🤖 Tiểu Ngữ — trợ lý AI của Nhai HSK", log chào mặc định, input placeholder "Nhập câu hỏi…", nút ➤), nút mascot kép (🤖 giữa + 🍅 `-rotate-12` góc dưới phải, ẩn khi `nhai.chatBubble === "0"`), nút "💬 Nhắn tin" (toast theo login), nút "❤️ Ủng hộ Nhai HSK" (toast). Reply sau 400ms với text cố định.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/social/__tests__/ai-widget.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import AiWidget from "../ai-widget";

vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => (msg: string) => { (window as unknown as { __lastToast?: string }).__lastToast = msg; },
}));

beforeEach(() => {
  localStorage.clear();
  (window as unknown as { __lastToast?: string }).__lastToast = undefined;
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

const REPLY = "Mình là bản demo — thử bấm ⭐ trong bài học, tra từ điển hoặc vào bài từ vựng để học nhé!";

describe("AiWidget", () => {
  it("mở panel, gửi câu hỏi → bubble user ngay, bubble AI đúng text sau 400ms", () => {
    render(<AiWidget />);
    fireEvent.click(screen.getByRole("button", { name: /🤖/ }));
    fireEvent.change(screen.getByPlaceholderText("Nhập câu hỏi…"), { target: { value: "HSK 1 học gì?" } });
    fireEvent.click(screen.getByRole("button", { name: "➤" }));

    expect(screen.getByText("HSK 1 học gì?")).toBeInTheDocument();
    expect(screen.queryByText(REPLY)).toBeNull(); // chưa đủ 400ms

    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.getByText(REPLY)).toBeInTheDocument();
    expect((screen.getByPlaceholderText("Nhập câu hỏi…") as HTMLInputElement).value).toBe("");
  });

  it("Enter cũng gửi; input rỗng thì không gửi", () => {
    render(<AiWidget />);
    fireEvent.click(screen.getByRole("button", { name: /🤖/ }));
    const input = screen.getByPlaceholderText("Nhập câu hỏi…");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    act(() => { vi.advanceTimersByTime(500); });
    expect(screen.queryByText(REPLY)).toBeNull();
  });

  it("nhai.chatBubble=0 ẩn nút mascot; nút Ủng hộ hiện toast đúng", () => {
    localStorage.setItem("nhai.chatBubble", "0");
    render(<AiWidget />);
    expect(screen.queryByRole("button", { name: /🤖/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /❤️ Ủng hộ Nhai HSK/ }));
    expect((window as unknown as { __lastToast?: string }).__lastToast).toBe("Cảm ơn bạn đã ủng hộ Nhai HSK! ❤️");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/components/social/__tests__/ai-widget.test.tsx`
Expected: FAIL — `Cannot find module '../ai-widget'`

- [ ] **Step 3: Write minimal implementation**

Tạo `app-next/src/components/social/ai-widget.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useToast } from "@/components/shell/toast-provider";

const REPLY_TEXT = "Mình là bản demo — thử bấm ⭐ trong bài học, tra từ điển hoặc vào bài từ vựng để học nhé!";

export default function AiWidget() {
  const toast = useToast();
  const [chatOpen, setChatOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    { role: "ai", text: "Xin chào! Mình là trợ lý Nhai HSK. Hỏi về pinyin, từ vựng hoặc bấm một bài để học nhé!" },
  ]);
  // SP1 mock: chatBubble=0 chỉ ẩn nút mascot (giữ clone — panel vẫn mở được nếu đang mở)
  const bubbleHidden = typeof window !== "undefined" && localStorage.getItem("nhai.chatBubble") === "0";

  function send() {
    const value = input.trim();
    if (!value) return;
    setMessages((m) => [...m, { role: "user", text: value }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [...m, { role: "ai", text: REPLY_TEXT }]);
    }, 400);
  }

  return (
    <div className="fixed right-4 bottom-6 z-[600] flex flex-col items-end gap-2">
      {chatOpen ? (
        <div className="card shadow-neo w-80 p-3 mb-1">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">🤖 Tiểu Ngữ — trợ lý AI của Nhai HSK</span>
            <button type="button" className="btn-ghost w-7 h-7 text-xs" aria-label="Đóng chat" onClick={() => setChatOpen(false)}>✕</button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto text-sm">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-8 bg-[var(--nhai-soft)] rounded-lg p-2">{m.text}</div>
              ) : (
                <div key={i} className="bg-[var(--nhai-soft)] rounded-lg p-2">{m.text}</div>
              )
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              className="flex-1 border-2 border-[var(--nhai-border)] rounded-lg px-2 py-1.5 bg-[var(--nhai-bg)]"
              placeholder="Nhập câu hỏi…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            />
            <button type="button" className="btn-main px-3" onClick={send}>➤</button>
          </div>
        </div>
      ) : null}

      {!bubbleHidden ? (
        <button type="button" className="card shadow-neo relative w-[90px] h-[58px] hover:-translate-y-0.5 transition-transform" aria-label="Hỏi AI" onClick={() => setChatOpen((v) => !v)}>
          <span className="absolute inset-0 flex items-center justify-center text-3xl" aria-hidden="true">🤖</span>
          <span className="absolute bottom-0.5 right-1 text-lg -rotate-12" aria-hidden="true">🍅</span>
        </button>
      ) : null}

      <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => toast(isLoggedIn() ? "Hộp tin nhắn đang được mở (demo)…" : "Tin nhắn chỉ khả dụng khi đăng nhập")}>
        💬 Nhắn tin
      </button>
      <button type="button" className="btn-main px-3 py-2 text-sm" onClick={() => toast("Cảm ơn bạn đã ủng hộ Nhai HSK! ❤️")}>
        ❤️ Ủng hộ Nhai HSK
      </button>
    </div>
  );
}

function isLoggedIn(): boolean {
  try {
    return localStorage.getItem("nhai.mockLogin") === "1";
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/components/social/__tests__/ai-widget.test.tsx`
Expected: PASS 3/3.

- [ ] **Step 5: Mount vào layout**

Mở `app-next/src/app/layout.tsx` (của plan 10) và thêm `<AiWidget />` ngay trong `<body>`, sau shell (đối chiếu clone: `renderFloating()` chạy sau `renderShell()`):

```tsx
import AiWidget from "@/components/social/ai-widget";
// trong <body>, sau <ToastProvider>/<SidebarNav>/<Topbar>:
<AiWidget />
```

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run`
Expected: PASS toàn bộ suite (plan 10 + plan này).

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk && git add app-next/src/components/social/ai-widget.tsx app-next/src/components/social/__tests__/ai-widget.test.tsx app-next/src/app/layout.tsx
git commit -m "feat(sp1-social): AI widget mock with 400ms canned reply"
```

---

### Task 6: Trang `/terms` và `/privacy` — static, copy nguyên văn

**Files:**
- Create: `app-next/src/app/terms/page.tsx` (port từ `clone/terms.html`)
- Create: `app-next/src/app/privacy/page.tsx` (port từ `clone/privacy.html`)
- Test: `app-next/src/app/(static-legal)/__tests__/legal-pages.test.tsx`

**Interfaces:**
- Consumes: không (server components, không directive `"use client"`).
- Produces: routes `GET /terms`, `GET /privacy`; internal link `/feedback` (terms §5, privacy §5), `/delete-account` (privacy §4). Link trong login modal của plan 10 (`terms.html`/`privacy.html` ở `clone/js/shell.js:323`) phải trỏ về `/terms` và `/privacy` — kiểm tra khi mount; nếu plan 10 còn link `.html`, sửa 2 đường dẫn đó thành `/terms`, `/privacy`.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/app/(static-legal)/__tests__/legal-pages.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TermsPage from "../../terms/page";
import PrivacyPage from "../../privacy/page";

describe("/terms", () => {
  it("hiện đúng 5 mục với copy nguyên văn", () => {
    render(<TermsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Điều khoản sử dụng" })).toBeInTheDocument();
    for (const h of ["1. Chấp nhận điều khoản", "2. Nội dung học liệu", "3. Tài khoản", "4. Sử dụng hợp lý", "5. Thay đổi điều khoản"]) {
      expect(screen.getByRole("heading", { level: 2, name: h })).toBeInTheDocument();
    }
    const link = screen.getByRole("link", { name: "Góp ý" });
    expect(link).toHaveAttribute("href", "/feedback");
  });
});

describe("/privacy", () => {
  it("hiện đúng 5 mục và link xoá tài khoản", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Chính sách quyền riêng tư" })).toBeInTheDocument();
    for (const h of ["1. Dữ liệu thu thập", "2. Mục đích sử dụng", "3. Lưu trữ & bảo mật", "4. Quyền của bạn", "5. Liên hệ"]) {
      expect(screen.getByRole("heading", { level: 2, name: h })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Xoá tài khoản" })).toHaveAttribute("href", "/delete-account");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run "src/app/(static-legal)/__tests__/legal-pages.test.tsx"`
Expected: FAIL — `Cannot find module '../../terms/page'`

- [ ] **Step 3: Write /terms**

Tạo `app-next/src/app/terms/page.tsx` (copy nguyên văn từng câu từ `clone/terms.html`):

```tsx
export const metadata = { title: "Điều khoản sử dụng | Nhai HSK" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Điều khoản sử dụng</h1>
      <p className="text-[var(--nhai-muted)] mb-6">Vui lòng đọc kỹ các điều khoản dưới đây trước khi sử dụng Nhai HSK.</p>

      <div className="space-y-4">
        <section className="card p-5">
          <h2 className="text-xl font-extrabold mb-2">1. Chấp nhận điều khoản</h2>
          <p className="text-[15px] leading-relaxed">Khi truy cập hoặc sử dụng Nhai HSK, bạn đồng ý tuân thủ toàn bộ các điều khoản này. Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng ngừng sử dụng website. Chúng tôi có thể cập nhật điều khoản vào bất cứ lúc nào; phiên bản mới nhất luôn được đăng tại trang này.</p>
        </section>
        <section className="card p-5">
          <h2 className="text-xl font-extrabold mb-2">2. Nội dung học liệu</h2>
          <p className="text-[15px] leading-relaxed">Toàn bộ bài học, từ vựng, ngữ pháp, âm thanh và công cụ luyện tập trên Nhai HSK chỉ phục vụ mục đích học tập và tham khảo. Chúng tôi nỗ lực đảm bảo nội dung chính xác nhưng không bảo đảm tuyệt đối về mặt chuyên môn. Bạn không được sao chép, bán lại hoặc sử dụng nội dung vào mục đích thương mại khi chưa có sự đồng ý bằng văn bản.</p>
        </section>
        <section className="card p-5">
          <h2 className="text-xl font-extrabold mb-2">3. Tài khoản</h2>
          <p className="text-[15px] leading-relaxed">Bạn chịu trách nhiệm giữ bí mật thông tin đăng nhập và mọi hoạt động phát sinh từ tài khoản của mình. Không được mượn, cho mượn hoặc chia sẻ tài khoản cho người khác. Chúng tôi có quyền tạm khóa tài khoản vi phạm điều khoản mà không cần báo trước.</p>
        </section>
        <section className="card p-5">
          <h2 className="text-xl font-extrabold mb-2">4. Sử dụng hợp lý</h2>
          <p className="text-[15px] leading-relaxed">Bạn cam kết không sử dụng Nhai HSK cho bất kỳ hành vi bất hợp pháp nào, không can thiệp, tải scraping số lượng lớn hoặc làm gián đoạn hoạt động của hệ thống. Việc sử dụng tự động (bot, script) để truy cập nội dung không được cho phép.</p>
        </section>
        <section className="card p-5">
          <h2 className="text-xl font-extrabold mb-2">5. Thay đổi điều khoản</h2>
          <p className="text-[15px] leading-relaxed">Chúng tôi có thể sửa đổi điều khoản này theo thời gian. Khi có thay đổi quan trọng, chúng tôi sẽ thông báo trên website. Việc bạn tiếp tục sử dụng Nhai HSK sau khi điều khoản được cập nhật đồng nghĩa với việc chấp nhận phiên bản mới. Mọi thắc mắc xin gửi qua trang <a href="/feedback" className="text-[var(--nhai-accent)] font-semibold">Góp ý</a>.</p>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Write /privacy**

Tạo `app-next/src/app/privacy/page.tsx` (copy nguyên văn từng câu từ `clone/privacy.html`):

```tsx
export const metadata = { title: "Chính sách quyền riêng tư | Nhai HSK" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Chính sách quyền riêng tư</h1>
      <p className="text-[var(--nhai-muted)] mb-6">Nhai HSK tôn trọng quyền riêng tư của bạn. Dưới đây là cách chúng tôi xử lý dữ liệu.</p>

      <div className="space-y-4">
        <section className="card p-5">
          <h2 className="text-xl font-extrabold mb-2">1. Dữ liệu thu thập</h2>
          <p className="text-[15px] leading-relaxed">Chúng tôi chỉ thu thập những dữ liệu cần thiết: địa chỉ email khi bạn đăng nhập, tiến trình học (bài đã học, từ đã lưu, điểm luyện tập) và các góp ý bạn tự nguyện gửi. Chúng tôi không thu thập dữ liệu nhạy cảm và không bán dữ liệu cho bên thứ ba.</p>
        </section>
        <section className="card p-5">
          <h2 className="text-xl font-extrabold mb-2">2. Mục đích sử dụng</h2>
          <p className="text-[15px] leading-relaxed">Dữ liệu được dùng để: lưu và đồng bộ tiến trình học của bạn, cá nhân hoá lộ trình ôn tập, cải thiện chất lượng nội dung và hỗ trợ kỹ thuật khi bạn yêu cầu. Chúng tôi không dùng dữ liệu của bạn để quảng cáo.</p>
        </section>
        <section className="card p-5">
          <h2 className="text-xl font-extrabold mb-2">3. Lưu trữ &amp; bảo mật</h2>
          <p className="text-[15px] leading-relaxed">Dữ liệu được lưu trữ an toàn và chỉ những người có thẩm quyền mới được truy cập. Trong bản demo này, tiến trình học của bạn được lưu ngay trên thiết bị (localStorage của trình duyệt), không gửi lên máy chủ.</p>
        </section>
        <section className="card p-5">
          <h2 className="text-xl font-extrabold mb-2">4. Quyền của bạn</h2>
          <p className="text-[15px] leading-relaxed">Bạn có quyền xem, chỉnh sửa hoặc yêu cầu xoá toàn bộ dữ liệu cá nhân của mình bất cứ lúc nào. Để xoá vĩnh viễn tài khoản và dữ liệu liên quan, hãy truy cập trang <a href="/delete-account" className="text-[var(--nhai-accent)] font-semibold">Xoá tài khoản</a>.</p>
        </section>
        <section className="card p-5">
          <h2 className="text-xl font-extrabold mb-2">5. Liên hệ</h2>
          <p className="text-[15px] leading-relaxed">Mọi câu hỏi về chính sách quyền riêng tư, vui lòng gửi qua trang <a href="/feedback" className="text-[var(--nhai-accent)] font-semibold">Góp ý</a> hoặc liên hệ nhóm Nhai HSK qua nhóm Facebook chính thức. Chúng tôi thường xuyên phản hồi trong vòng 3–5 ngày làm việc.</p>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run "src/app/(static-legal)/__tests__/legal-pages.test.tsx"`
Expected: PASS 2/2.

- [ ] **Step 6: Sửa link trong LoginModal của plan 10 (nếu còn .html)**

Trong `app-next/src/components/shell/login-modal.tsx` (plan 10, đối chiếu `clone/js/shell.js:323`): đảm bảo link thẳng (`<a>`) hoặc `next/link` trỏ `/terms` và `/privacy` (không phải `terms.html`/`privacy.html`). Nếu đã đúng thì bỏ qua bước sửa.

Run: `grep -rn "terms.html\|privacy.html" /Volumes/samsung512/Code/hsk/app-next/src || echo CLEAN`
Expected: `CLEAN` (hoặc chỉ match trong comment tham chiếu clone).

- [ ] **Step 7: Commit**

```bash
cd /Volumes/samsung512/Code/hsk && git add app-next/src/app/terms app-next/src/app/privacy "app-next/src/app/(static-legal)"
git commit -m "feat(sp1-social): terms and privacy static pages with verbatim copy"
```

---

### Task 7: Trang `/delete-account` — mock toast + disable nút

**Files:**
- Create: `app-next/src/app/delete-account/page.tsx` (port từ `clone/delete-account.html` gồm inline script dòng 24-37)
- Test: `app-next/src/app/delete-account/__tests__/delete-account-page.test.tsx`

**Interfaces:**
- Consumes: `useToast()` từ `@/components/shell/toast-provider` (plan 10).
- Produces: route `GET /delete-account`. Hành vi mock đúng clone: submit email → toast `"Đã gửi yêu cầu xoá tài khoản. Chúng tôi sẽ xác nhận qua email <email>."` → nút disabled text "Đã gửi yêu cầu" (đổi `btn-main` → `btn-ghost`) → input email disabled. (UPG-2 sẽ thay bằng request/confirm token — spec 13 §H4.)

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/app/delete-account/__tests__/delete-account-page.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DeleteAccountPage from "../page";

vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => (msg: string) => { (window as unknown as { __lastToast?: string }).__lastToast = msg; },
}));

beforeEach(() => {
  (window as unknown as { __lastToast?: string }).__lastToast = undefined;
});

describe("delete-account page (mock)", () => {
  it("submit → toast kèm email, disable nút + input, đổi text nút", () => {
    render(<DeleteAccountPage />);
    const email = screen.getByLabelText("Email tài khoản");
    const btn = screen.getByRole("button", { name: "Yêu cầu xoá" });

    fireEvent.change(email, { target: { value: "me@example.com" } });
    fireEvent.click(btn);

    expect((window as unknown as { __lastToast?: string }).__lastToast).toBe(
      "Đã gửi yêu cầu xoá tài khoản. Chúng tôi sẽ xác nhận qua email me@example.com."
    );
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Đã gửi yêu cầu" })).toBeDisabled();
    expect((screen.getByLabelText("Email tài khoản") as HTMLInputElement).disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/app/delete-account/__tests__/delete-account-page.test.tsx`
Expected: FAIL — `Cannot find module '../page'`

- [ ] **Step 3: Write minimal implementation**

Tạo `app-next/src/app/delete-account/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useToast } from "@/components/shell/toast-provider";

export default function DeleteAccountPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    toast("Đã gửi yêu cầu xoá tài khoản. Chúng tôi sẽ xác nhận qua email " + value + ".");
    setSent(true);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Xoá tài khoản</h1>
      <p className="text-[var(--nhai-muted)] mb-6">Nhập email của tài khoản để yêu cầu xoá vĩnh viễn. Toàn bộ tiến trình học, từ vựng đã lưu và dữ liệu liên quan sẽ bị xoá và không thể khôi phục.</p>

      <form onSubmit={handleSubmit} className="card shadow-neo p-5">
        <label htmlFor="delete-email" className="block text-sm font-bold mb-2">Email tài khoản</label>
        <input
          id="delete-email"
          type="email"
          required
          placeholder="email@example.com"
          disabled={sent}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border-2 border-[var(--nhai-border)] rounded-lg px-3 py-2.5 mb-4 bg-[var(--nhai-bg)] focus:outline-none focus:border-[var(--nhai-main)] disabled:opacity-60"
        />
        <button type="submit" disabled={sent} className={(sent ? "btn-ghost" : "btn-main") + " px-6 py-2.5 disabled:opacity-60"}>
          {sent ? "Đã gửi yêu cầu" : "Yêu cầu xoá"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/app/delete-account/__tests__/delete-account-page.test.tsx`
Expected: PASS 1/1.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk && git add app-next/src/app/delete-account/
git commit -m "feat(sp1-social): delete-account mock page with toast and disabled submit"
```

---

### Task 8: Trang 404 — `not-found.tsx`

**Files:**
- Create: `app-next/src/app/not-found.tsx` (port từ `clone/404.html`; theo `clone/specs/SPEC-15-misc-gaps.md` §5)

**Interfaces:**
- Consumes: shell CSS classes từ plan 10 (`card`, `shadow-neo`, `btn-main`, `--nhai-soft`, `--nhai-border`). Next.js App Router tự render `not-found.tsx` cho mọi route không khớp (thay cho fallback redirect của page.js cũ).
- Produces: route fallback 404 toàn app — plan 10 tham chiếu, KHÔNG tạo file này.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/app/__tests__/not-found.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "../not-found";

describe("not-found (404)", () => {
  it("hiện mascot 🤔, h1 404, đúng copy và nút về trang chủ", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "404" })).toBeInTheDocument();
    expect(screen.getByText("Trang bạn tìm không tồn tại hoặc đã bị chuyển.")).toBeInTheDocument();
    expect(screen.getByText("🤔")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về trang chủ" })).toHaveAttribute("href", "/");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/app/__tests__/not-found.test.tsx`
Expected: FAIL — `Cannot find module '../not-found'`

- [ ] **Step 3: Write minimal implementation**

Tạo `app-next/src/app/not-found.tsx`:

```tsx
export default function NotFound() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <section className="flex justify-center py-12">
        <div className="card shadow-neo p-10 text-center max-w-md w-full">
          <div className="mx-auto w-24 h-24 rounded-xl border-2 border-[var(--nhai-border)] bg-[var(--nhai-soft)] flex items-center justify-center text-6xl mb-4" aria-hidden="true">🤔</div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-2">404</h1>
          <p className="text-sm text-[var(--nhai-muted)] mb-6">Trang bạn tìm không tồn tại hoặc đã bị chuyển.</p>
          <a href="/" className="btn-main inline-block px-6 py-3">Về trang chủ</a>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/app/__tests__/not-found.test.tsx`
Expected: PASS 1/1.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk && git add app-next/src/app/not-found.tsx app-next/src/app/__tests__/not-found.test.tsx
git commit -m "feat(sp1-social): 404 not-found page with mascot"
```

---

### Task 9: Playwright smoke 5 route + 404 + verify deploy-local

**Files:**
- Modify: `app-next/tests/e2e/social-smoke.spec.ts` (bổ sung từ Task 2)

**Interfaces:**
- Consumes: routes `/leaderboard` (Task 2), `/feedback` (Task 3), `/terms` + `/privacy` (Task 6), `/delete-account` (Task 7), `not-found.tsx` (Task 8); shell layout của plan 10.
- Produces: suite smoke chạy xanh = điều kiện xong phần social/legal của SP1.

- [ ] **Step 1: Bổ sung smoke test cho 5 route + 404**

Thêm vào cuối `app-next/tests/e2e/social-smoke.spec.ts`:

```ts
test("feedback: gửi góp ý hiện toast và lưu localStorage", async ({ page }) => {
  await page.goto("/feedback");
  await page.getByLabel("Nội dung góp ý").fill("Smoke test góp ý");
  await page.getByRole("button", { name: "Gửi góp ý" }).click();
  await expect(page.getByText("Cảm ơn bạn! Góp ý đã được ghi nhận.")).toBeVisible();
  const stored = await page.evaluate(() => localStorage.getItem("nhai.feedback"));
  expect(stored).toContain("Smoke test góp ý");
});

test("terms + privacy render đủ mục", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "1. Chấp nhận điều khoản" })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "4. Quyền của bạn" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Xoá tài khoản" })).toBeVisible();
});

test("delete-account: mock toast + nút disabled", async ({ page }) => {
  await page.goto("/delete-account");
  await page.getByLabel("Email tài khoản").fill("smoke@example.com");
  await page.getByRole("button", { name: "Yêu cầu xoá" }).click();
  await expect(page.getByText("Đã gửi yêu cầu xoá tài khoản. Chúng tôi sẽ xác nhận qua email smoke@example.com.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Đã gửi yêu cầu" })).toBeDisabled();
});

test("404: route không tồn tại hiện mascot và nút về trang chủ", async ({ page }) => {
  await page.goto("/route-khong-ton-tai");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Về trang chủ" })).toBeVisible();
});

test("AI widget: mascot kép render ở mọi route và reply sau 400ms", async ({ page }) => {
  await page.goto("/leaderboard");
  const mascot = page.getByRole("button", { name: "Hỏi AI" });
  await expect(mascot).toBeVisible();
  await mascot.click();
  await page.getByPlaceholderText("Nhập câu hỏi…").fill("xin chào");
  await page.getByRole("button", { name: "➤" }).click();
  await expect(page.getByText("Mình là bản demo — thử bấm ⭐ trong bài học, tra từ điển hoặc vào bài từ vựng để học nhé!")).toBeVisible({ timeout: 2000 });
});
```

- [ ] **Step 2: Run full Playwright suite**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm playwright test tests/e2e/social-smoke.spec.ts`
Expected: PASS 6/6 test (1 leaderboard từ Task 2 + 5 mới).

- [ ] **Step 3: Run toàn bộ test + build để chắc không vỡ plan 10**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run && pnpm exec tsc --noEmit && pnpm build`
Expected: Vitest PASS toàn bộ; `tsc` 0 error; `pnpm build` thành công (các route tĩnh được prerender, không lỗi hydrate). Nếu build fail do plan 10 chưa xong phần của nó — chỉ được phép fail ở file KHÔNG thuộc danh sách Files của plan này, khi đó ghi rõ vào báo cáo và dừng.

- [ ] **Step 4: Commit**

```bash
cd /Volumes/samsung512/Code/hsk && git add app-next/tests/e2e/social-smoke.spec.ts
git commit -m "test(sp1-social): playwright smoke for social/legal routes and 404"
```

---

## Self-review (đã chạy theo skill writing-plans)

1. **Spec coverage (spec 13 phạm vi SP1 mock + inventory A1/A4/A5/A9/H1–H4):**
   - H1 leaderboard 2 tab dữ liệu cứng → Task 1 + 2. ✓ (UI theo SPEC-01 §3: tab pill active đỏ qua `pill-active`, 10 hàng medal/avatar/điểm, note "Cách tính điểm" nguyên văn, `?tab=` không reload.)
   - H2 feedback localStorage `nhai.feedback` → Task 3. ✓ (shape `{text, at ISO}` khớp clone `js/feedback.js`.)
   - H3 terms/privacy static → Task 6. ✓ (copy nguyên văn 5+5 mục, link chéo `/feedback`, `/delete-account`.)
   - H4 delete-account mock toast → Task 7. ✓ (toast + disable nút + đổi text, đúng inline script clone.)
   - A5 AI widget reply cứng 400ms + mascot kép 🤖+🍅 → Task 5. ✓ (kèm nút Nhắn tin/Ủng hộ đúng clone; chatBubble=0 ẩn mascot.)
   - A1b SP1 chuông 3 item cứng → Task 4. ✓ (icon/text/href đúng `shell.js:254-258`, toggle + Escape + click-outside.)
   - A9 404 → Task 8. ✓ (điều phối: plan 10 không tạo `not-found.tsx`.)
   - A4 LoginModal mock — shell chung, GÁN CHO plan 10; plan này chỉ sửa link `/terms` `/privacy` trong nó (Task 6 Step 6). ✓
   - Wiring `content/certificates.ts` → Task 1. ✓ (data dùng bởi plan 12/plan 10 cho `/certificate-test`.)
   - UPG-2/4/5 → chỉ mục "Future phases" trỏ spec, không task giả. ✓
2. **Placeholder scan:** không có "TBD"/"add error handling"/"similar to Task N"; mọi step code đều có code block hoàn chỉnh; Task 1 Step 7 nêu rõ nguồn copy (`clone/js/data/certificates.js`) kèm toàn bộ 10 object đã viết ra. Try/catch localStorage ở Task 3 là hành vi clone cụ thể (comment nguyên context), không phải placeholder.
3. **Type consistency:** `FeedbackEntry {text, at}` khớp giữa Consumes (plan 10) và test Task 3; `useToast(): (msg: string) => void` dùng nhất quán Task 3/4/5/7; `leaderboardData/initials/formatXp` định nghĩa Task 1, dùng Task 2; `NotificationBell` default export, `<AiWidget />` default export — khớp hướng dẫn mount; tab type `Tab = "xp" | "battle"` khớp Playwright URL `?tab=battle`. Route names và commit messages nhất quán (`feat(sp1-social): …`).
