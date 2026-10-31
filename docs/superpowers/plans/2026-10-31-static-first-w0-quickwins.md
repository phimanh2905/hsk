# Static-first W0 — Quick wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **LUẬT ORCHESTRATOR: agent KHÔNG tự `git commit` — dừng trước bước Commit, báo kết quả verify; orchestrator chạy lại test rồi commit.**

**Goal:** 4 quick wins độc lập với kiến trúc: bật observability bền vững, giảm burst prefetch, cache content API, sửa doc 1102.

**Architecture:** Không đổi kiến trúc — deploy được ngay trên build OpenNext hiện tại.

**Tech Stack:** Next.js 16, wrangler.jsonc, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-31-static-first-api-worker-design.md` §4 W0

## Global Constraints

- Làm việc trên branch `static-first-refactor` (orchestrator tạo từ HEAD `workers-free-1102-analysis`).
- Chạy lệnh từ `app-next/`, dùng pnpm (BẮT BUỘC, không npm).
- Không sửa seed SQL tay; không đụng schema/D1.
- Design token Hanzi khi đụng UI.

---

### Task 1: Bật observability trong wrangler.jsonc + guard test

**Files:**
- Modify: `app-next/wrangler.jsonc`
- Test: `app-next/src/lib/__tests__/wrangler-config.test.ts` (mới)

**Interfaces:**
- Produces: test guard đọc `wrangler.jsonc` — mọi task sau sửa wrangler.jsonc phải giữ test này xanh.

- [ ] **Step 1: Viết test fail**

```ts
// src/lib/__tests__/wrangler-config.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/* Guard: CI deploy theo wrangler.jsonc, mỗi lần quên block observability là prod
   mất logs (CI reset về disabled). Test này chặn config bị xoá. */
function parseJsonc(raw: string): Record<string, unknown> {
  const noComments = raw.replace(/^\s*\/\/.*$/gm, "");
  return JSON.parse(noComments.replace(/,(\s*[}\]])/g, "$1"));
}

describe("wrangler.jsonc (prod)", () => {
  const cfg = parseJsonc(readFileSync(resolve(__dirname, "../../../wrangler.jsonc"), "utf8"));

  it("bật observability (không bị CI reset tắt logs)", () => {
    expect((cfg.observability as { enabled?: boolean } | undefined)?.enabled).toBe(true);
  });

  it("giữ D1 binding DB tên hsk", () => {
    const dbs = cfg.d1_databases as Array<{ binding: string; database_name: string }>;
    expect(dbs.some((d) => d.binding === "DB" && d.database_name === "hsk")).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test xác nhận FAIL**

Run: `pnpm vitest run src/lib/__tests__/wrangler-config.test.ts`
Expected: FAIL — `observability` undefined.

- [ ] **Step 3: Thêm block vào wrangler.jsonc** (đặt sau `"compatibility_flags"`)

```jsonc
  "observability": { "enabled": true },
```

- [ ] **Step 4: Chạy test PASS**

Run: `pnpm vitest run src/lib/__tests__/wrangler-config.test.ts`
Expected: PASS 2/2.

- [ ] **Step 5: (orchestrator) Commit** — `feat(wrangler): bật observability + guard test`

---

### Task 2: `prefetch={false}` cho Link nặng trong shell nav

**Files:**
- Modify: `app-next/src/components/shell/bottom-nav.tsx` (Link ở ~line 34, href từ mảng)
- Modify: `app-next/src/components/shell/sidebar-nav.tsx` (5 Link)
- Modify: `app-next/src/components/shell/topbar.tsx` (nếu có Link dẫn trang — kiểm tra)
- Test: giữ các test hiện có của 3 file này xanh (RTL không đọc được prop prefetch — không thêm assert DOM)

- [ ] **Step 1: Thêm `prefetch={false}` vào MỌI `<Link>` trong 3 file shell trên** (prop thứ 2 sau href). Đây là nav toàn cục — mỗi mount render hàng chục Link, là nguồn burst `?_rsc` đã đo (25 req/2s).

- [ ] **Step 2: Chạy test + typecheck**

Run: `pnpm vitest run src/components/shell/ && pnpm typecheck && pnpm lint`
Expected: tất cả PASS (test hiện có không đổi hành vi).

- [ ] **Step 3: (orchestrator) Commit** — `perf(nav): prefetch={false} cho link shell — giảm burst _rsc`

---

### Task 3: Sửa doc 1102 theo kết quả phân tích sau merge

**Files:**
- Modify: `docs/superpowers/specs/2026-10-30-workers-free-1102-static-first-design.md`

- [ ] **Step 1: 4 edit chính xác:**
  1. §3.1: sửa câu "kể cả trang đã prerender và RSC prefetch ?_rsc= đều chạy qua Worker" — thêm đúng: build thực tế có ~87 trang prerendered (○/●); request tới path prerendered vẫn invoke Worker qua OpenNext handler (không phải asset hit), còn static chunks/audio mới rơi vào asset. Prerendered page hit = 1 invocation OpenNext rẻ hơn SSR nhưng vẫn ăn CPU + quota.
  2. §6.1: đánh dấu ĐÃ FIX — grammar seed remote đã apply (300 rows, merge PR #25 kèm migration/seed remote 2026-10-31).
  3. §4.A: đếm API "16 API route" → **21 API route** (thêm 5 reading).
  4. §4.A G1: bổ sung 3 trang thiếu vào danh sách SSG: `/pinyin` (bỏ searchParams), `/certificate-test/[level]`, `/roadmap/pinyin/session/[n]`; thêm chú ý 2 route id-vô-hạn `/lesson/custom/[deckId]`, `/notebook/[kind]/[id]` phải đổi sang query param + `_redirects` (spec mới 2026-10-31 đã chi tiết hoá).
- [ ] **Step 2:** cuối doc thêm dòng: "→ Spec triển khai chi tiết: `2026-10-31-static-first-api-worker-design.md` (owner chọn A ngày 2026-10-31)."
- [ ] **Step 3: (orchestrator) Commit** — `docs: cập nhật doc 1102 theo build thực tế sau PR #25`
