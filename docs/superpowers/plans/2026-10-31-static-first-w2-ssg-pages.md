# Static-first W2 — SSG toàn bộ trang dynamic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **LUẬT ORCHESTRATOR: agent KHÔNG tự `git commit` — dừng trước bước Commit, báo kết quả verify; orchestrator chạy lại test rồi commit.**

**Goal:** Chuyển 11 trang ƒ dynamic thành prerendered (SSG/client-gate/client-fetch) để chuẩn bị `output: export` — build `next build` thường vẫn xanh trong suốt W2.

**Architecture:** Server-gate → `ClientAuthGate` (authClient.useSession); D1-lúc-render → client-fetch qua API có sẵn; route id-vô-hạn → query param + `_redirects`.

**Tech Stack:** Next.js 16 App Router, better-auth/react, Vitest + RTL.

**Spec:** `docs/superpowers/specs/2026-10-31-static-first-api-worker-design.md` §4 W2

## Global Constraints

- Branch `static-first-refactor`; pnpm; design token Hanzi (skeleton dùng token wash hiện có, không hex).
- Sau mỗi task: `pnpm test && pnpm typecheck && pnpm lint` xanh; trang đổi behavior phải chạy e2e liên quan nếu có (`pnpm test:e2e` chỉ chạy khi task đụng flow có spec e2e).
- Không đổi URL của trang khác ngoài 2 route được chỉ định (lesson/custom, notebook/[id]).

---

### Task 1: `ClientAuthGate` + chuyển 3 trang server-gate

**Files:**
- Create: `app-next/src/components/auth/client-auth-gate.tsx` + `__tests__/client-auth-gate.test.tsx`
- Modify: `src/app/(app)/progress/page.tsx`, `src/app/(wide)/my-vocab/page.tsx`, `src/app/(wide)/my-grammar/page.tsx`

**Interfaces:**
- Produces: `default export ClientAuthGate({ children }: { children: React.ReactNode })` — render skeleton khi `isPending`, redirect `/?login=1` khi chưa login, render children khi đã login.

- [ ] **Step 1: Test fail** — mock `@/lib/auth-client`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ClientAuthGate from "@/components/auth/client-auth-gate";

vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: vi.fn() },
}));
const mockUseSession = vi.mocked((await import("@/lib/auth-client")).authClient.useSession);

describe("ClientAuthGate", () => {
  it("đang kiểm tra session → skeleton, không render children", () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true } as never);
    render(<ClientAuthGate><div>content</div></ClientAuthGate>);
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });
  it("chưa login → không render children (redirect ở effect)", async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false } as never);
    render(<ClientAuthGate><div>content</div></ClientAuthGate>);
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });
  it("đã login → render children", () => {
    mockUseSession.mockReturnValue({ data: { user: { id: "u1" } }, isPending: false } as never);
    render(<ClientAuthGate><div>content</div></ClientAuthGate>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

/* Client-gate thay server-gate (SSG): API vẫn tự check session nên an toàn —
   dữ liệu user là localStorage + rows của chính họ. */
export default function ClientAuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) router.replace("/?login=1");
  }, [isPending, session, router]);

  if (isPending || !session) {
    return <div aria-busy="true" className="min-h-[40vh] bg-paper-wash" />;
  }
  return <>{children}</>;
}
```

(Ghi chú executor: `bg-paper-wash` phải là token tồn tại trong Hanzi — grep `paper-wash` trong codebase; nếu không có, dùng token skeleton mà các page khác đang dùng.)

- [ ] **Step 3: Chuyển 3 page** — pattern chung (progress làm mẫu):

```tsx
// src/app/(app)/progress/page.tsx — thay toàn bộ
import type { Metadata } from "next";
import ClientAuthGate from "@/components/auth/client-auth-gate";
import ProgressClient from "./progress-client";

export const metadata: Metadata = { title: "Tiến độ học" };

export default function ProgressPage() {
  return (
    <ClientAuthGate>
      <ProgressClient />
    </ClientAuthGate>
  );
}
```

my-vocab/my-grammar: giữ nguyên metadata + client component gốc của từng trang (đọc page cũ trước khi sửa, bỏ `dynamic = "force-dynamic"`, `headers`, `redirect`, `getAuth`).

- [ ] **Step 4: Verify** — test mới PASS; `pnpm test && pnpm typecheck && pnpm lint`.

- [ ] **Step 5: (orchestrator) Commit** — `refactor(pages): client-gate cho progress/my-vocab/my-grammar (SSG-ready)`

---

### Task 2: `/pinyin` bỏ searchParams server

**Files:**
- Modify: `src/app/(wide)/pinyin/page.tsx`
- Modify: `src/app/(wide)/pinyin/pinyin-lab-root.tsx` (đọc useSearchParams bên trong nếu đang là client; nếu đang là server component → đọc file, tìm client child nhận props initialMode/initialDrill và chuyển việc đọc query xuống đó)

- [ ] **Step 1: page.tsx mới**

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import PinyinLabRoot from "./pinyin-lab-root";

export const metadata: Metadata = {
  title: "Pinyin Lab",
  description: "Làm chủ ngữ âm, vị trí đặt lưỡi và phản xạ 4 thanh điệu tiếng Trung.",
};

export default function PinyinPage() {
  return (
    <Suspense fallback={null}>
      <PinyinLabRoot />
    </Suspense>
  );
}
```

- [ ] **Step 2:** Trong client component: `const sp = useSearchParams(); const initialMode = sp.get("mode") === "quiz" ? "quiz" : "matrix"; const initialDrill = sp.get("drill");` — hợp nhất với state hiện có (đừng double-init; dùng giá trị query làm giá trị khởi tạo duy nhất).
- [ ] **Step 3:** Cập nhật test liên quan của PinyinLabRoot (nếu có) — mock `useSearchParams` trả `new URLSearchParams(...)`.
- [ ] **Step 4: Verify** — `pnpm test && pnpm typecheck && pnpm lint`.
- [ ] **Step 5: (orchestrator) Commit** — `refactor(pinyin): bỏ searchParams server → useSearchParams client (SSG-ready)`

---

### Task 3: `/shadowing` (index) static + client-fetch

**Files:**
- Modify: `src/app/(app)/shadowing/page.tsx` (bỏ `force-dynamic` + imports content layer)
- Modify: client component của trang (tìm file cùng thư mục được page render) — chuyển nạp playlist sang `useEffect` gọi `/api/v1/content/shadowing` (route có sẵn, trả full dataset)

- [ ] **Step 1:** Page mới: metadata + render client component thuần (không await).
- [ ] **Step 2:** Client component: thêm state `loading` + fetch on-mount + skeleton/token; giữ nguyên UI sau khi data về. Không nhân thêm fetch — component nào đang nhận props data thì fetch tại component ngoài cùng của trang.
- [ ] **Step 3: Verify** — `pnpm test && pnpm typecheck && pnpm lint` + e2e shadowing nếu có spec.
- [ ] **Step 4: (orchestrator) Commit** — `refactor(shadowing): index page static, data client-fetch`

---

### Task 4: `/lesson/[book]/[page]` SSG + client-fetch

**Files:**
- Modify: `src/app/(app)/lesson/[book]/[page]/page.tsx`

**Interfaces:**
- Consumes: GET `/api/v1/content/vocab-lesson?book=&page=` (route có sẵn).
- Produces: `generateStaticParams` cho mọi (book, page) có lesson — nguồn truth = dataset seed `src/content/vocab.ts` (build-time import OK vì file này là seed source, không đụng D1).

- [ ] **Step 1:** Đọc đầu `src/content/vocab.ts` xác nhận tên export + tên field book/lesson (kỳ vọng `book: number`, `lesson: number` — sửa theo thực tế nếu khác).
- [ ] **Step 2: page.tsx mới**

```tsx
import type { Metadata } from "next";
import LessonClient from "./lesson-client"; // tên thật từ file cũ
// import dataset seed — build-time only

export function generateStaticParams() {
  const seen = new Set<string>();
  const out: { book: string; page: string }[] = [];
  for (const w of VOCAB_EXPORT) {
    const key = `${w.book}/${w.lesson}`;
    if (!seen.has(key)) { seen.add(key); out.push({ book: String(w.book), page: String(w.lesson) }); }
  }
  return out;
}

export default async function LessonPage({ params }: { params: Promise<{ book: string; page: string }> }) {
  const { book, page } = await params;
  return <LessonClient book={book} page={page} />;
}
```

- [ ] **Step 3:** LessonClient (client): nhận book/page qua props thay vì dữ liệu server; fetch on-mount `/api/v1/content/vocab-lesson?book=${book}&page=${page}` + skeleton khi loading; giữ nguyên UI. Nếu LessonClient hiện nhận word list qua props từ server → đổi thành tự fetch (dùng promise-cache pattern như `readings-client.ts`).
- [ ] **Step 4: Verify** — `pnpm build` (bắt buộc: confirm params prerender — log build phải có `● /lesson/[book]/[page]`) + `pnpm test && pnpm typecheck && pnpm lint`.
- [ ] **Step 5: (orchestrator) Commit** — `refactor(lesson): SSG params + client-fetch vocab-lesson`

---

### Task 5: `/shadowing/[...videoId]` SSG + client-fetch (+ filter `?video=` API)

**Files:**
- Modify: `src/app/(app)/shadowing/[...videoId]/page.tsx`
- Modify: `src/server/api/content.ts` — `handleContentShadowing` nhận query `?video=<id>` (trả 1 video + subtitles của nó) và `?playlist=<id>` (playlist + videos con); không query → full dataset như cũ.
- Test: `src/server/api/__tests__/content.test.ts` thêm case filter.
- Client component detail: fetch `?video=` thay vì nhận props từ server.

- [ ] **Step 1:** Tìm nguồn videoId build-time: đọc `scripts/seed/gen-shadowing-seed.mts` xem nó import dataset nào (JSON trong `scripts/content/data/...` hoặc export từ `src/content/`) — dùng chính nguồn đó cho `generateStaticParams` trả `{ videoId: [playlistId, videoId] }` theo đúng cấu trúc catch-all hiện tại (đọc page cũ để biết số segment).
- [ ] **Step 2:** Thêm filter vào handler + test; page chuyển client-fetch `?video=`; giữ deep-link `?_rsc` hoạt động tự nhiên (page tĩnh).
- [ ] **Step 3: Verify** — `pnpm build` (log có `● /shadowing/[...videoId]`) + `pnpm test && pnpm typecheck`.
- [ ] **Step 4: (orchestrator) Commit** — `refactor(shadowing): SSG detail + API filter ?video=`

---

### Task 6: `/certificate-test/[level]` SSG + generateExam client-side

**Files:**
- Modify: `src/app/(app)/certificate-test/[level]/page.tsx`
- Consumes: `src/lib/exam/generate.ts` — ĐÃ pure (nhận `VocabWord[]`, không randomness, verified 2026-10-31) → dùng trực tiếp client-side, KHÔNG sửa file này.

- [ ] **Step 1: page.tsx mới**

```tsx
import type { Metadata } from "next";
import CertificateTestClient from "./certificate-test-client"; // tên thật từ file cũ

export function generateStaticParams() {
  return ["1", "2", "3", "4", "5"].map((level) => ({ level }));
}

export default async function CertificateTestPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  return <CertificateTestClient level={level} />;
}
```

- [ ] **Step 2:** Client component: fetch `/api/v1/content/vocab?level=${level}` (public API có sẵn) → `generateExam(words, level)` tại client; giữ nguyên UI/thi demo. Bỏ imports D1/content-layer khỏi page.
- [ ] **Step 3: Verify** — `pnpm build` (log có `● /certificate-test/[level]` với 5 params) + tests + typecheck.
- [ ] **Step 4: (orchestrator) Commit** — `refactor(certificate-test): SSG + generateExam client-side`

---

### Task 7: 2 route id-vô-hạn + session pinyin + `_redirects`/`_headers`

**Files:**
- Modify: `src/app/(app)/lesson/custom/[deckId]/page.tsx` → **XÓA** thư mục `[deckId]`, tạo `src/app/(app)/lesson/custom/page.tsx` (static)
- Modify: `src/app/(app)/notebook/[kind]/[id]/page.tsx` → giữ `[kind]`, **XÓA** `[id]`, page `[kind]` static + `generateStaticParams` kinds `["wrong","chars","personal"]`; client đọc `useSearchParams().get("id")`
- Modify: mọi nơi tạo link `/lesson/custom/<id>` → `/lesson/custom?deck=<id>`; `/notebook/<kind>/<id>` → `/notebook/<kind>?id=<id>` (grep `lesson/custom/` và `notebook/` trong src để tìm hết — dashboard notebook + lesson-client + create-file)
- Modify: `src/app/(app)/roadmap/pinyin/session/[n]/page.tsx` — thêm `generateStaticParams` (đọc data module pinyin session để lấy đúng số session hiện có; trả `{ n: String(i+1) }`)
- Create: `public/_redirects`, `public/_headers`

- [ ] **Step 1:** `public/_redirects`:

```
/lesson/custom/:deckId  /lesson/custom?deck=:deckId  302
/notebook/:kind/:id     /notebook/:kind?id=:id       302
```

- [ ] **Step 2:** `public/_headers`:

```
/*
  Referrer-Policy: strict-origin-when-cross-origin
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
```

- [ ] **Step 3:** Chuyển 2 page (custom deck + notebook detail) sang client đọc query; cập nhật toàn bộ link tạo URL mới; giữ logic deep-link cũ qua `_redirects` (prod-only — next dev không đọc `_redirects`, ghi chú trong commit message).
- [ ] **Step 4:** `generateStaticParams` cho `roadmap/pinyin/session/[n]`.
- [ ] **Step 5: Verify** — `pnpm build` (log: `/lesson/custom` ○, `/notebook/[kind]` ●, `/roadmap/pinyin/session/[n]` ●; **0 trang ƒ còn lại ngoài không có gì**) + `pnpm test && pnpm typecheck && pnpm lint` + chạy e2e đủ bộ (lesson/notebook/reading flows): `pnpm test:e2e`.
- [ ] **Step 6: (orchestrator) Commit** — `refactor(routes): SSG session/notebook-kind/custom-deck + _redirects + _headers`
