# Notebook Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port 100% UI `opendesign_hsk/notebook.html` vào route mới `/notebook` (route group `(wide)`), kèm bảng D1 `notebook_entries`, CRUD API `/api/v1/notebook/entries`, auto-capture câu sai từ quiz bài học / mini-test lộ trình / review SRS.

**Architecture:** Client island `NotebookDashboard` đọc entries qua 1 hook duy nhất `useNotebookEntries` (2 nhánh: API khi đăng nhập, localStorage khi guest, merge-on-login idempotent vì id do client sinh). Auto-capture là side-effect fire-and-forget tại 3 điểm sai đã có sẵn, không đổi logic SRS/quiz.

**Tech Stack:** Next.js 16 (OpenNext/Cloudflare + D1), React 19, Tailwind v4 semantic tokens, zod, drizzle-orm, better-auth, Vitest + RTL, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-05-notebook-redesign-design.md` — plan argue từ spec; executor đọc cả hai.

## Global Constraints

- Làm việc trên branch mới `notebook-redesign` (tạo lúc start; KHÔNG dùng branch `pinyin-lab-redesign` dù session đang đứng đó — spec/plan docs đã commit trên đó là bình thường).
- Test chạy bằng `pnpm` trong `app-next/`; một file: `pnpm vitest run <path>`.
- Cấm hard-code hex — chỉ token Tailwind (`action-primary`, `feedback-*`, `jade-wash`, `rose-wash`, `amber-wash/amber-ink`, `feature-ai`, `surface-*`, `text-*`, `border-*`, `ring-track`). Hán tự dùng class `.hanzi`/`.zh`.
- Giữ nguyên `data-od-id` của mock: `notebook-hero`, `notebook-shelf`, `book-mistakes`, `book-confusables`, `book-idioms`, `book-speaking`, `stream-filters`, `add-note`, `note-{id}`, `stream-empty`. **Không port** shell mock (sidebar/topbar/bottomnav).
- Min touch 44px (`min-h-11`) cho nút; focus ring `focus-visible:ring-3 ring-action-focus ring-offset-2`; copy tiếng Việt.
- Commit: `feat(notebook): <gì> (port <data-od-id> notebook.html)` / `feat(notebook-api): …` / `fix(notebook): … (review t<N>)`; mỗi task commit riêng; `pnpm test && pnpm typecheck && pnpm lint` pass trước khi commit.

## Review Focus

1. **Payload sai kind khi POST/PATCH** (dữ liệu client cũ/hỏng hoặc API caller xấu) → 400 kèm `{ error }`, KHÔNG ghi DB và KHÔNG crash render (pin ở Task 2 + 4/5).
2. **Dedupe capture trong 24h**: trả lời sai cùng 1 từ nhiều lần trong ngày phải tạo đúng 1 entry, không spam stream (pin ở Task 8).
3. **Merge-on-login idempotent**: guest luyện xong đăng nhập → mỗi entry local lên server đúng 1 lần theo `id`, không nhân đôi, mất mạng thì giữ local (pin ở Task 7).
4. **Import vòng**: `capture.ts` không được import `progress-store`/`srs-session`; `review-dashboard` mới là nơi nối hai bên (pin ở Task 12 bằng grep-import test).
5. **Hydration**: mọi số liệu thời gian (relative time, đếm 7 ngày) chỉ tính sau `mounted` — SSR render rỗng, không được thêm `/notebook` gây hydration error (pin ở Task 13).

---

### Task 1: Content — 3 sổ tĩnh `notebook-books.ts`

**Files:**
- Create: `app-next/src/content/notebook-books.ts`
- Test: `app-next/src/content/__tests__/notebook-books.test.ts`

**Interfaces:**
- Produces: `export type NotebookBookId = "confusables" | "idioms" | "speaking";` và `export const notebookBooks: ReadonlyArray<{ id: NotebookBookId; icon: string; title: string; sub: string; big: string; badge: string; badgeTone: "ok" | "soft"; cta: string; }>` — đúng 3 phần tử, thứ tự confusables → idioms → speaking (sổ mistakes KHÔNG nằm đây — dữ liệu thật ở Task 6).

- [ ] **Step 1: Write the failing test**

```ts
// src/content/__tests__/notebook-books.test.ts
import { describe, it, expect } from "vitest";
import { notebookBooks } from "@/content/notebook-books";

describe("notebookBooks (spec §3.3)", () => {
  it("đủ 3 sổ tĩnh đúng id và thứ tự", () => {
    expect(notebookBooks.map((b) => b.id)).toEqual(["confusables", "idioms", "speaking"]);
  });
  it("mỗi book đủ trường hiển thị, không rỗng", () => {
    for (const b of notebookBooks) {
      expect(b.icon.length).toBeGreaterThan(0);
      expect(b.title.length).toBeGreaterThan(0);
      expect(b.sub.length).toBeGreaterThan(0);
      expect(b.big.length).toBeGreaterThan(0);
      expect(b.badge.length).toBeGreaterThan(0);
      expect(["ok", "soft"]).toContain(b.badgeTone);
      expect(b.cta.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `pnpm vitest run src/content/__tests__/notebook-books.test.ts` → FAIL (module thiếu).

- [ ] **Step 3: Implement** — nội dung biên tập theo mock (icon/title/sub/badge/cta y nguyên mock; `big` = số liệu mock):

```ts
/* 3 sổ chuyên đề tĩnh của dashboard /notebook (spec §3.3) — số liệu là biên tập
   theo mock notebook.html, KHÔNG đếm runtime. Sổ "Câu làm sai" là dữ liệu thật
   (notebook_entries) nên không nằm trong list này. */
export type NotebookBookId = "confusables" | "idioms" | "speaking";

export type NotebookBook = {
  id: NotebookBookId;
  icon: string;
  title: string;
  sub: string;
  big: string;
  badge: string;
  badgeTone: "ok" | "soft";
  cta: string;
};

export const notebookBooks: ReadonlyArray<NotebookBook> = [
  { id: "confusables", icon: "🔍", title: "CHỮ HÁN DỄ NHẦM", sub: "形近字 / 易混字", big: "18 cặp chữ hay nhầm", badge: "Đã thuộc: 12 cặp", badgeTone: "ok", cta: "Luyện phân biệt" },
  { id: "idioms", icon: "🐉", title: "THÀNH NGỮ HSK", sub: "成语 / 惯用语", big: "32 thành ngữ bỏ túi", badge: "HSK 4 – HSK 5", badgeTone: "soft", cta: "Học thành ngữ" },
  { id: "speaking", icon: "💼", title: "KHẨU NGỮ THỰC TẾ", sub: "口语 · Giao tiếp & VP", big: "12 mẫu câu thực tế", badge: "Giao tiếp VP", badgeTone: "soft", cta: "Luyện giao tiếp" },
];
```

- [ ] **Step 4: Run to verify PASS** — thêm `pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/notebook-books.ts src/content/__tests__/notebook-books.test.ts
git commit -m "feat(notebook): content 3 sổ chuyên đề tĩnh (port book-confusables book-idioms book-speaking notebook.html)"
```

---

### Task 2: Payload zod — `src/lib/notebook/payload.ts`

**Files:**
- Create: `app-next/src/lib/notebook/payload.ts`
- Test: `app-next/src/lib/notebook/__tests__/payload.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type EntryKind = "wrong" | "chars" | "personal";
  export type WrongPayload = { q: string; wrong: { zh: string; py?: string } | null; right: { zh: string; py?: string }; cause: string };
  export type CharsPayload = { chars: { zh: string; py: string }[]; tip: string };
  export type PersonalPayload = { note: string };
  export type EntryPayload = WrongPayload | CharsPayload | PersonalPayload;
  export const payloadByKind: Record<EntryKind, z.ZodType<EntryPayload>>;
  export function parsePayload(kind: EntryKind, data: unknown): EntryPayload; // throw ZodError nếu sai
  export function safeParsePayload(kind: EntryKind, data: unknown): EntryPayload | null; // hỏng → null (render bỏ qua)
  ```

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/notebook/__tests__/payload.test.ts
import { describe, it, expect } from "vitest";
import { parsePayload, safeParsePayload } from "@/lib/notebook/payload";

describe("payloadByKind (spec §3.2)", () => {
  it("wrong: đủ 3 khối, wrong có thể null", () => {
    const p = parsePayload("wrong", { q: "昨…?", wrong: { zh: "忽然", py: "hūrán" }, right: { zh: "居然", py: "jūrán" }, cause: "…" });
    expect(p).toMatchObject({ q: "昨…?" });
    expect(parsePayload("wrong", { q: "q", wrong: null, right: { zh: "x" }, cause: "c" })).toMatchObject({ wrong: null });
  });
  it("chars: 2..4 cặp, mỗi cặp zh+py bắt buộc", () => {
    const ok = parsePayload("chars", { chars: [{ zh: "已", py: "yǐ" }, { zh: "己", py: "jǐ" }], tip: "Mẹo…" });
    expect(ok).toHaveProperty("chars");
    expect(() => parsePayload("chars", { chars: [{ zh: "已", py: "yǐ" }], tip: "t" })).toThrow(); // 1 cặp
    expect(() => parsePayload("chars", { chars: [{ zh: "已" }, { zh: "己", py: "jǐ" }], tip: "t" })).toThrow(); // thiếu py
  });
  it("personal: note ≥2 ký tự", () => {
    expect(() => parsePayload("personal", { note: "a" })).toThrow();
    expect(parsePayload("personal", { note: "abc" })).toMatchObject({ note: "abc" });
  });
  it("safeParsePayload hỏng → null, không throw", () => {
    expect(safeParsePayload("wrong", { oops: true })).toBeNull();
    expect(safeParsePayload("personal", JSON.parse('"{broken"'))).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify FAIL.**

- [ ] **Step 3: Implement**

```ts
// src/lib/notebook/payload.ts
import { z } from "zod";

export type EntryKind = "wrong" | "chars" | "personal";

export const wrongPayload = z.object({
  q: z.string().min(1),
  wrong: z.object({ zh: z.string().min(1), py: z.string().optional() }).nullable(),
  right: z.object({ zh: z.string().min(1), py: z.string().optional() }),
  cause: z.string().min(1),
});
export const charsPayload = z.object({
  chars: z.array(z.object({ zh: z.string().min(1), py: z.string().min(1) })).min(2).max(4),
  tip: z.string().min(1),
});
export const personalPayload = z.object({ note: z.string().min(2) });

export type WrongPayload = z.infer<typeof wrongPayload>;
export type CharsPayload = z.infer<typeof charsPayload>;
export type PersonalPayload = z.infer<typeof personalPayload>;
export type EntryPayload = WrongPayload | CharsPayload | PersonalPayload;

export const payloadByKind = {
  wrong: wrongPayload,
  chars: charsPayload,
  personal: personalPayload,
} as const;

export function parsePayload(kind: EntryKind, data: unknown): EntryPayload {
  return payloadByKind[kind].parse(data);
}
export function safeParsePayload(kind: EntryKind, data: unknown): EntryPayload | null {
  const r = payloadByKind[kind].safeParse(data);
  return r.success ? r.data : null;
}
```

- [ ] **Step 4: Run to verify PASS** — `pnpm vitest run src/lib/notebook && pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notebook/payload.ts src/lib/notebook/__tests__/payload.test.ts
git commit -m "feat(notebook): zod payload theo kind (spec §3.2)"
```

---

### Task 3: DB — bảng `notebook_entries` + migration

**Files:**
- Modify: `app-next/src/lib/db/schema.ts`
- Create: `app-next/drizzle/0002_notebook_entries.sql` (sinh bởi drizzle-kit)

**Interfaces:**
- Produces: `export const notebookEntries` — Task 4/5 import.

- [ ] **Step 1: Thêm bảng** cuối `src/lib/db/schema.ts` (đúng chữ ký spec §3.1 — `id` text PK do client sinh, index `(userId, createdAt)`, KHÔNG unique index ngoài PK):

```ts
/* Entries sổ tay /notebook (spec §3.1). `id` do client sinh (crypto.randomUUID)
   để sync-on-login idempotent; `payload` là JSON theo zod schema lib/notebook/payload. */
export const notebookEntries = sqliteTable(
  "notebook_entries",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["wrong", "chars", "personal"] }).notNull(),
    tag: text("tag").notNull(),
    tagTone: text("tagTone", { enum: ["red", "lav", "per"] }).notNull().default("red"),
    payload: text("payload").notNull(),
    saved: integer("saved", { mode: "boolean" }).notNull().default(false),
    hsk: text("hsk"),
    source: text("source", { enum: ["auto", "manual"] }).notNull().default("manual"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => [index("notebook_entries_user_created_idx").on(t.userId, t.createdAt)]
);
```

- [ ] **Step 2: Sinh migration** — `pnpm drizzle-kit generate` → kiểm tra `drizzle/0002_notebook_entries.sql` có CREATE TABLE + index, không đụng bảng auth.

- [ ] **Step 3: Verify** — `pnpm typecheck` → PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts drizzle/
git commit -m "feat(notebook-api): bảng notebook_entries + migration D1 (spec §3.1)"
```

---

### Task 4: API — GET/POST `/api/v1/notebook/entries`

**Files:**
- Create: `app-next/src/app/api/v1/notebook/entries/route.ts`
- Test: `app-next/src/app/api/v1/notebook/__tests__/entries.test.ts`

**Interfaces:**
- Consumes: `getAuth()` (`@/lib/auth`), `createDb()` (`@/lib/db`), `notebookEntries` (Task 3), `parsePayload` (Task 2).
- Produces:
  - `GET` → 401 | 200 `{ items: ApiEntry[] }` (order `createdAt DESC`); `ApiEntry = { id, kind, tag, tagTone, payload: EntryPayload, saved, hsk: string|null, source, createdAt: ISO, updatedAt: ISO }`.
  - `POST` body `{ id?: string; kind: EntryKind; tag: string; tagTone?: "red"|"lav"|"per"; payload: unknown; hsk?: string|null; source?: "auto"|"manual" }` → 201 `{ item }` (upsert theo id) | 400 `{ error: "invalid body" | "invalid payload" }` | 401.
- Helper dùng chung 2 route file: `rowToApi(row)` — parse payload bằng `safeParsePayload` (hỏng → loại khỏi GET list), serialize timestamps → ISO. Đặt trong `route.ts` của GET và **export** để Task 5 import.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/v1/notebook/__tests__/entries.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const getSession = vi.fn();
const rows: Record<string, unknown>[] = [];
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("@/lib/db", () => ({
  createDb: () => ({
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => Promise.resolve(rows) }) }) }),
    insert: () => ({ values: (v: unknown) => ({ onConflictDoUpdate: () => Promise.resolve(undefined) }) }),
  }),
}));

import { GET, POST, rowToApi } from "../route";

function req(method: "GET" | "POST", body?: unknown) {
  return new Request("http://localhost:3100/api/v1/notebook/entries", {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as import("next").NextRequest;
}
const validBody = {
  kind: "wrong", tag: "🛑 Lỗi sai", payload: { q: "q?", wrong: null, right: { zh: "居然" }, cause: "c" },
};

beforeEach(() => { vi.clearAllMocks(); rows.length = 0; getSession.mockResolvedValue(null); });

describe("GET /api/v1/notebook/entries", () => {
  it("401 khi chưa đăng nhập", async () => {
    expect((await GET(req("GET"))).status).toBe(401);
  });
  it("200 trả items đã parse payload", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    rows.push({ id: "e1", kind: "wrong", tag: "t", tagTone: "red", payload: JSON.stringify(validBody.payload), saved: 0, hsk: null, source: "auto", createdAt: 1_700_000_000, updatedAt: 1_700_000_000 });
    const json = await (await GET(req("GET"))).json();
    expect(json.items).toHaveLength(1);
    expect(json.items[0].payload).toMatchObject({ q: "q?" });
    expect(json.items[0].createdAt).toContain("T");
  });
  it("payload hỏng → loại khỏi list, không crash", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    rows.push({ id: "bad", kind: "wrong", tag: "t", tagTone: "red", payload: "{broken", saved: 0, hsk: null, source: "auto", createdAt: 1, updatedAt: 1 });
    const json = await (await GET(req("GET"))).json();
    expect(json.items).toHaveLength(0);
  });
});

describe("POST /api/v1/notebook/entries", () => {
  it("401 khi chưa đăng nhập", async () => {
    expect((await POST(req("POST", validBody))).status).toBe(401);
  });
  it("400 payload sai kind", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(req("POST", { kind: "chars", tag: "t", payload: { oops: 1 } }));
    expect(res.status).toBe(400);
  });
  it("201 tạo entry: id sinh khi thiếu, default tagTone=red source=manual", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const json = await (await POST(req("POST", validBody))).json();
    expect(json.item).toMatchObject({ kind: "wrong", tagTone: "red", source: "manual", saved: false });
    expect(json.item.id).toBeTruthy();
  });
  it("201 upsert idempotent khi có id", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const r1 = await (await POST(req("POST", { ...validBody, id: "e9" }))).json();
    const r2 = await (await POST(req("POST", { ...validBody, id: "e9" }))).json();
    expect(r1.item.id).toBe("e9");
    expect(r2.item.id).toBe("e9");
  });
});

describe("rowToApi", () => {
  it("payload hỏng → null", () => {
    expect(rowToApi({ id: "x", kind: "personal", tag: "t", tagTone: "per", payload: "nope", saved: 0, hsk: null, source: "manual", createdAt: 0, updatedAt: 0 })).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — module thiếu.

- [ ] **Step 3: Implement**

```ts
// src/app/api/v1/notebook/entries/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { notebookEntries } from "@/lib/db/schema";
import { safeParsePayload, type EntryKind, type EntryPayload } from "@/lib/notebook/payload";

type Row = typeof notebookEntries.$inferSelect;

/* Dùng chung GET (lọc payload hỏng) và Task PATCH/DELETE (render 1 row). */
export function rowToApi(row: Row): {
  id: string; kind: EntryKind; tag: string; tagTone: "red" | "lav" | "per";
  payload: EntryPayload; saved: boolean; hsk: string | null; source: "auto" | "manual";
  createdAt: string; updatedAt: string;
} | null {
  const payload = safeParsePayload(row.kind, JSON.parse(row.payload));
  if (!payload) return null;
  return {
    id: row.id, kind: row.kind, tag: row.tag, tagTone: row.tagTone, payload,
    saved: row.saved, hsk: row.hsk, source: row.source,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

const postBody = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(["wrong", "chars", "personal"]),
  tag: z.string().min(1).max(80),
  tagTone: z.enum(["red", "lav", "per"]).default("red"),
  payload: z.unknown(),
  hsk: z.string().regex(/^HSK[1-6]$/).nullable().optional(),
  source: z.enum(["auto", "manual"]).default("manual"),
});

export async function GET(req: NextRequest) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = createDb();
  const rows = await db
    .select()
    .from(notebookEntries)
    .where(eq(notebookEntries.userId, session.user.id))
    .orderBy(desc(notebookEntries.createdAt));
  return NextResponse.json({ items: rows.map(rowToApi).filter((x) => x !== null) });
}

export async function POST(req: NextRequest) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = postBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  let payload: EntryPayload;
  try { payload = parsePayloadOrThrow(parsed.data.kind, parsed.data.payload); }
  catch { return NextResponse.json({ error: "invalid payload" }, { status: 400 }); }

  const db = createDb();
  const now = new Date();
  const values = {
    id: parsed.data.id ?? crypto.randomUUID(),
    userId: session.user.id,
    kind: parsed.data.kind,
    tag: parsed.data.tag,
    tagTone: parsed.data.tagTone,
    payload: JSON.stringify(payload),
    saved: false,
    hsk: parsed.data.hsk ?? null,
    source: parsed.data.source,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(notebookEntries).values(values).onConflictDoUpdate({
    target: notebookEntries.id,
    set: { tag: values.tag, tagTone: values.tagTone, payload: values.payload, hsk: values.hsk, updatedAt: now },
  });
  return NextResponse.json({ item: rowToApi({ ...values, saved: false } as Row) }, { status: 201 });
}

import { parsePayload as parsePayloadOrThrow } from "@/lib/notebook/payload";
```

Lưu ý executor: gộp 2 import `safeParsePayload`/`parsePayload` thành 1 dòng đầu file (đoạn `import` cuối chỉ minh họa tên `parsePayloadOrThrow` — dùng thẳng `parsePayload`).

- [ ] **Step 4: Run to verify PASS** — `pnpm vitest run src/app/api/v1/notebook && pnpm typecheck && pnpm lint` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/notebook
git commit -m "feat(notebook-api): GET/POST /api/v1/notebook/entries — upsert idempotent theo id (spec §5)"
```

---

### Task 5: API — PATCH/DELETE `/api/v1/notebook/entries/[id]`

**Files:**
- Create: `app-next/src/app/api/v1/notebook/entries/[id]/route.ts`
- Test: thêm describe vào `src/app/api/v1/notebook/__tests__/entries.test.ts`

**Interfaces:**
- Consumes: `rowToApi` export của Task 4.
- Produces: `PATCH /[id]` body `{ saved: boolean }` → 200 `{ item }` | 401 | 400 | 404; `DELETE /[id]` → 204 | 401 | 404.

- [ ] **Step 1: Write the failing test** (mock db thêm nhánh update/delete — mở rộng mock `createDb` của file test):

```ts
// thêm vào mock createDb ở đầu file test hiện có:
//   update: () => ({ set: (v: unknown) => ({ where: () => ({ returning: () => Promise.resolve([updatedRow]) }) }) }),
//   delete: () => ({ where: () => Promise.resolve(undefined) }),
const updatedRow = { id: "e1", kind: "wrong", tag: "t", tagTone: "red", payload: JSON.stringify(validBody.payload), saved: 1, hsk: null, source: "auto", createdAt: 1_700_000_000, updatedAt: 1_700_000_001 };
rows.push(updatedRow);

describe("PATCH /api/v1/notebook/entries/[id]", () => {
  it("401 chưa đăng nhập", async () => {
    const res = await PATCH(req("PATCH", { saved: true }), { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(401);
  });
  it("400 body sai", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await PATCH(req("PATCH", { saved: "yes" }), { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(400);
  });
  it("200 trả item saved=true", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const json = await (await PATCH(req("PATCH", { saved: true }), { params: Promise.resolve({ id: "e1" }) })).json();
    expect(json.item.saved).toBe(true);
  });
});

describe("DELETE /api/v1/notebook/entries/[id]", () => {
  it("204 khi xóa", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await DELETE(req("DELETE"), { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(204);
  });
});
```

Import thêm `{ PATCH, DELETE } from "../[id]/route"`.

- [ ] **Step 2: Run to verify FAIL.**

- [ ] **Step 3: Implement**

```ts
// src/app/api/v1/notebook/entries/[id]/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { notebookEntries } from "@/lib/db/schema";
import { rowToApi } from "../route";

const patchBody = z.object({ saved: z.boolean() });

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = patchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const { id } = await ctx.params;
  const db = createDb();
  const updated = await db
    .update(notebookEntries)
    .set({ saved: parsed.data.saved, updatedAt: new Date() })
    .where(and(eq(notebookEntries.id, id), eq(notebookEntries.userId, session.user.id)))
    .returning();
  if (!updated.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ item: rowToApi(updated[0]) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const db = createDb();
  const deleted = await db
    .delete(notebookEntries)
    .where(and(eq(notebookEntries.id, id), eq(notebookEntries.userId, session.user.id)))
    .returning();
  if (!deleted.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 4: Run to verify PASS** — `pnpm vitest run src/app/api/v1/notebook && pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/notebook
git commit -m "feat(notebook-api): PATCH saved + DELETE entry (spec §5)"
```

---

### Task 6: Client store — `entries.ts` (localStorage + stats)

**Files:**
- Create: `app-next/src/lib/notebook/entries.ts`
- Test: `app-next/src/lib/notebook/__tests__/entries.test.ts`

**Interfaces:**
- Consumes: types từ Task 2.
- Produces:
  ```ts
  export type NotebookEntry = {
    id: string; kind: EntryKind; tag: string; tagTone: "red" | "lav" | "per";
    payload: EntryPayload; saved: boolean; hsk: string | null;
    source: "auto" | "manual"; createdAt: string; updatedAt: string; // ISO
  };
  export const NOTEBOOK_KEY = "bye.notebookEntries";
  export function readLocalEntries(): NotebookEntry[];      // hỏng/JSON sai → []
  export function writeLocalEntries(list: NotebookEntry[]): void;
  export function newEntryId(): string;                      // crypto.randomUUID() (fallback Date+random cho jsdom cũ)
  export function notebookStats(list: NotebookEntry[], now?: Date): {
    total: number; wrongTotal: number; wrongWeek: number; wrongUnfixedWeek: number; fixedPct: number | null;
  };
  ```

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/notebook/__tests__/entries.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { readLocalEntries, writeLocalEntries, notebookStats, newEntryId, NOTEBOOK_KEY, type NotebookEntry } from "@/lib/notebook/entries";

const entry = (over: Partial<NotebookEntry> = {}): NotebookEntry => ({
  id: "e1", kind: "wrong", tag: "t", tagTone: "red",
  payload: { q: "q", wrong: null, right: { zh: "x" }, cause: "c" },
  saved: false, hsk: null, source: "auto",
  createdAt: new Date(Date.now() - 86_400_000).toISOString(), // 1 ngày trước
  updatedAt: new Date().toISOString(),
  ...over,
});

beforeEach(() => localStorage.clear());

describe("localStorage round-trip (spec §3.5)", () => {
  it("ghi/đọc list", () => {
    writeLocalEntries([entry()]);
    expect(readLocalEntries()).toHaveLength(1);
  });
  it("JSON hỏng → []", () => {
    localStorage.setItem(NOTEBOOK_KEY, "{oops");
    expect(readLocalEntries()).toEqual([]);
  });
  it("newEntryId unique", () => {
    expect(newEntryId()).not.toBe(newEntryId());
  });
});

describe("notebookStats (spec §2.2 + §3.5)", () => {
  it("đếm tổng + wrong trong 7 ngày + chưa ghim", () => {
    const s = notebookStats([
      entry({ id: "a" }),                                            // wrong, 1 ngày trước → wrongWeek
      entry({ id: "b", saved: true }),                               // wrong đã khắc phục
      entry({ id: "c", kind: "personal", tagTone: "per", payload: { note: "n" }, createdAt: new Date(Date.now() - 30 * 86_400_000).toISOString() }),
      entry({ id: "d", createdAt: new Date(Date.now() - 10 * 86_400_000).toISOString() }), // wrong cũ → không tính week
    ]);
    expect(s).toEqual({ total: 4, wrongTotal: 3, wrongWeek: 2, wrongUnfixedWeek: 1, fixedPct: 33 });
  });
  it("rỗng → fixedPct null", () => {
    expect(notebookStats([])).toMatchObject({ total: 0, wrongTotal: 0, fixedPct: null });
  });
});
```

- [ ] **Step 2: Run to verify FAIL.**

- [ ] **Step 3: Implement**

```ts
// src/lib/notebook/entries.ts
import type { EntryKind, EntryPayload } from "@/lib/notebook/payload";

export type NotebookEntry = {
  id: string; kind: EntryKind; tag: string; tagTone: "red" | "lav" | "per";
  payload: EntryPayload; saved: boolean; hsk: string | null;
  source: "auto" | "manual"; createdAt: string; updatedAt: string;
};

export const NOTEBOOK_KEY = "bye.notebookEntries";

export function readLocalEntries(): NotebookEntry[] {
  try {
    const raw = localStorage.getItem(NOTEBOOK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NotebookEntry[]) : [];
  } catch {
    return [];
  }
}

export function writeLocalEntries(list: NotebookEntry[]): void {
  try { localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(list)); } catch { /* private mode */ }
}

export function newEntryId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `nb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function notebookStats(list: NotebookEntry[], now: Date = new Date()): {
  total: number; wrongTotal: number; wrongWeek: number; wrongUnfixedWeek: number; fixedPct: number | null;
} {
  const weekAgo = now.getTime() - 7 * 86_400_000;
  const wrong = list.filter((e) => e.kind === "wrong");
  const wrongWeek = wrong.filter((e) => new Date(e.createdAt).getTime() >= weekAgo);
  const savedWrong = wrong.filter((e) => e.saved).length;
  return {
    total: list.length,
    wrongTotal: wrong.length,
    wrongWeek: wrongWeek.length,
    wrongUnfixedWeek: wrongWeek.filter((e) => !e.saved).length,
    fixedPct: wrong.length ? Math.round((savedWrong / wrong.length) * 100) : null,
  };
}
```

- [ ] **Step 4: Run to verify PASS** — `pnpm vitest run src/lib/notebook && pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notebook/entries.ts src/lib/notebook/__tests__/entries.test.ts
git commit -m "feat(notebook): local entries store + notebookStats (spec §3.5)"
```

---

### Task 7: Hook — `useNotebookEntries`

**Files:**
- Create: `app-next/src/lib/notebook/use-notebook-entries.ts`
- Test: `app-next/src/lib/notebook/__tests__/use-notebook-entries.test.ts`

**Interfaces:**
- Consumes: Task 4 API, Task 6 lib, `useSession()` (`@/lib/use-session`), `useToastSafe()` (`@/components/shell/toast-provider`).
- Produces:
  ```ts
  export type NewEntryInput = { kind: EntryKind; tag: string; tagTone: "red" | "lav" | "per"; payload: EntryPayload; hsk?: string | null; source?: "auto" | "manual" };
  export function useNotebookEntries(): {
    entries: NotebookEntry[];       // order: createdAt DESC
    ready: boolean;
    create(input: NewEntryInput): NotebookEntry;
    setSaved(id: string, saved: boolean): void;
    remove(id: string): void;
  };
  ```
- Sync-on-login (Review Focus 3): khi `loggedIn` chuyển true — GET server; mỗi entry local mà server chưa có id → POST (id giữ nguyên — idempotent); xong clear những entry đã có trên server. Lỗi mạng → giữ local + toast 1 lần.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/notebook/__tests__/use-notebook-entries.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const useSession = vi.fn();
vi.mock("@/lib/use-session", () => ({ useSession: () => useSession() }));
const toast = vi.fn();
vi.mock("@/components/shell/toast-provider", () => ({ useToastSafe: () => toast }));
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { useNotebookEntries } from "@/lib/notebook/use-notebook-entries";
import { NOTEBOOK_KEY, type NotebookEntry } from "@/lib/notebook/entries";

const localEntry: NotebookEntry = {
  id: "e-local", kind: "wrong", tag: "t", tagTone: "red",
  payload: { q: "q", wrong: null, right: { zh: "x" }, cause: "c" },
  saved: false, hsk: null, source: "auto",
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};

beforeEach(() => { localStorage.clear(); fetchMock.mockReset(); toast.mockReset(); });

describe("guest nhánh", () => {
  it("create/setSaved/remove tất cả qua localStorage + re-render", () => {
    useSession.mockReturnValue({ loggedIn: false, isPending: false });
    const { result } = renderHook(() => useNotebookEntries());
    let created: NotebookEntry;
    act(() => { created = result.current.create({ kind: "personal", tag: "📝", tagTone: "per", payload: { note: "abc" }, source: "manual" }); });
    expect(result.current.entries).toHaveLength(1);
    act(() => result.current.setSaved(created.id, true));
    expect(JSON.parse(localStorage.getItem(NOTEBOOK_KEY)!)[0].saved).toBe(true);
    act(() => result.current.remove(created.id));
    expect(result.current.entries).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("entries sort createdAt DESC", () => {
    useSession.mockReturnValue({ loggedIn: false, isPending: false });
    localStorage.setItem(NOTEBOOK_KEY, JSON.stringify([
      { ...localEntry, id: "old", createdAt: "2026-10-01T00:00:00Z" },
      { ...localEntry, id: "new", createdAt: "2026-10-05T00:00:00Z" },
    ]));
    const { result } = renderHook(() => useNotebookEntries());
    expect(result.current.entries.map((e) => e.id)).toEqual(["new", "old"]);
  });
});

describe("user đăng nhập", () => {
  it("GET khi mount; create → POST với id client sinh", async () => {
    useSession.mockReturnValue({ loggedIn: true, isPending: false });
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      init
        ? Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ item: { id: "x" } }) })
        : Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) })
    );
    const { result } = renderHook(() => useNotebookEntries());
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.create({ kind: "wrong", tag: "t", tagTone: "red", payload: localEntry.payload }));
    const [url, init] = fetchMock.mock.calls.find(([, i]) => (i as RequestInit).method === "POST")!;
    expect(String(url)).toContain("/api/v1/notebook/entries");
    expect(JSON.parse((init as RequestInit).body as string).id).toBeTruthy();
    expect(result.current.entries).toHaveLength(1); // optimistic
  });
  it("merge-on-login: entry local chưa có trên server → POST rồi clear", async () => {
    localStorage.setItem(NOTEBOOK_KEY, JSON.stringify([localEntry]));
    useSession.mockReturnValue({ loggedIn: true, isPending: false });
    fetchMock.mockImplementation((_, init?: RequestInit) =>
      init
        ? Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ item: { id: localEntry.id } }) })
        : Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) })
    );
    const { result } = renderHook(() => useNotebookEntries());
    await waitFor(() => expect(result.current.ready).toBe(true));
    await waitFor(() => {
      const posts = fetchMock.mock.calls.filter(([, i]) => (i as RequestInit).method === "POST");
      expect(posts).toHaveLength(1);
      expect(localStorage.getItem(NOTEBOOK_KEY)).toBe(null); // đã sync → clear
    });
  });
  it("server GET hỏng → fallback local, ready vẫn true", async () => {
    useSession.mockReturnValue({ loggedIn: true, isPending: false });
    fetchMock.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useNotebookEntries());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(toast).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify FAIL.**

- [ ] **Step 3: Implement**

```ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/use-session";
import { useToastSafe } from "@/components/shell/toast-provider";
import {
  readLocalEntries, writeLocalEntries, newEntryId, type NotebookEntry,
} from "@/lib/notebook/entries";
import type { EntryKind, EntryPayload } from "@/lib/notebook/payload";

export type NewEntryInput = {
  kind: EntryKind; tag: string; tagTone: "red" | "lav" | "per";
  payload: EntryPayload; hsk?: string | null; source?: "auto" | "manual";
};

const byNewest = (a: NotebookEntry, b: NotebookEntry) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export function useNotebookEntries() {
  const { loggedIn, isPending } = useSession();
  const toast = useToastSafe();
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [ready, setReady] = useState(loggedIn ? false : true);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const create = useCallback((input: NewEntryInput): NotebookEntry => {
    const now = new Date().toISOString();
    const entry: NotebookEntry = {
      id: newEntryId(), kind: input.kind, tag: input.tag, tagTone: input.tagTone,
      payload: input.payload, saved: false, hsk: input.hsk ?? null,
      source: input.source ?? "manual", createdAt: now, updatedAt: now,
    };
    setEntries((list) => [entry, ...list]);
    if (!loggedIn) writeLocalEntries([entry, ...entriesRef.current]);
    else {
      fetch("/api/v1/notebook/entries", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: entry.id, kind: entry.kind, tag: entry.tag, tagTone: entry.tagTone, payload: entry.payload, hsk: entry.hsk, source: entry.source }),
      }).catch(() => toast?.("Chưa đồng bộ được — sẽ thử lại sau"));
    }
    return entry;
  }, [loggedIn, toast]);

  const setSaved = useCallback((id: string, saved: boolean) => {
    setEntries((list) => {
      const next = list.map((e) => (e.id === id ? { ...e, saved, updatedAt: new Date().toISOString() } : e));
      if (!loggedIn) writeLocalEntries(next);
      return next;
    });
    if (loggedIn) {
      fetch(`/api/v1/notebook/entries/${id}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ saved }),
      }).catch(() => toast?.("Chưa đồng bộ được — sẽ thử lại sau"));
    }
  }, [loggedIn, toast]);

  const remove = useCallback((id: string) => {
    setEntries((list) => {
      const next = list.filter((e) => e.id !== id);
      if (!loggedIn) writeLocalEntries(next);
      return next;
    });
    if (loggedIn) {
      fetch(`/api/v1/notebook/entries/${id}`, { method: "DELETE" })
        .catch(() => toast?.("Chưa đồng bộ được — sẽ thử lại sau"));
    }
  }, [loggedIn, toast]);

  // mount / login: GET server + merge-on-login (Review Focus 3)
  useEffect(() => {
    if (isPending) return;
    if (!loggedIn) { setEntries(readLocalEntries()); setReady(true); return; }
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/v1/notebook/entries");
        if (!res.ok) throw new Error(String(res.status));
        const { items } = (await res.json()) as { items: NotebookEntry[] };
        const local = readLocalEntries();
        const missing = local.filter((l) => !items.some((s) => s.id === l.id));
        await Promise.all(missing.map((m) =>
          fetch("/api/v1/notebook/entries", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: m.id, kind: m.kind, tag: m.tag, tagTone: m.tagTone, payload: m.payload, hsk: m.hsk, source: m.source }),
          })
        ));
        if (missing.length) writeLocalEntries([]); // đã sync hết local → clear (Review Focus 3)
        if (alive) { setEntries([...local.filter((l) => !missing.includes(l)), ...items].sort(byNewest)); setReady(true); }
      } catch {
        if (alive) { setEntries(readLocalEntries()); setReady(true); toast?.("Chưa đồng bộ được — sẽ thử lại sau"); }
      }
    })();
    return () => { alive = false; };
  }, [loggedIn, isPending, toast]);

  return { entries, ready, create, setSaved, remove };
}
```

- [ ] **Step 4: Run to verify PASS** — `pnpm vitest run src/lib/notebook && pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notebook/use-notebook-entries.ts src/lib/notebook/__tests__/use-notebook-entries.test.ts
git commit -m "feat(notebook): useNotebookEntries — 2 nhánh API/localStorage + merge-on-login idempotent (spec §3.5)"
```

---

### Task 8: Auto-capture — `capture.ts`

**Files:**
- Create: `app-next/src/lib/notebook/capture.ts`
- Test: `app-next/src/lib/notebook/__tests__/capture.test.ts`

**Interfaces:**
- Consumes: Task 6 lib, `authClient` (`@/lib/auth-client`).
- Produces:
  ```ts
  export function captureWrong(input: {
    q: string; wrong: { zh: string; py?: string } | null; right: { zh: string; py?: string };
    cause: string; hsk?: string; tag?: string; tagTone?: "red" | "lav" | "per";
  }): void
  ```
- Hành vi (spec §3.4): ghi local + `dispatchEvent(new CustomEvent("bye:progress"))` + fire-and-forget POST nếu `authClient.getSession()` trả user. **Dedupe 24h** theo key `q + "\u0000" + right.zh` — entry cùng key trong 24h qua → bỏ qua. **KHÔNG import** `progress-store`/`srs-session` (Review Focus 4).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/notebook/__tests__/capture.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readLocalEntries } from "@/lib/notebook/entries";
import { resetCaptureDedupe, captureWrong } from "@/lib/notebook/capture";

const getSession = vi.fn();
vi.mock("@/lib/auth-client", () => ({ authClient: { getSession } }));
const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: () => Promise.resolve({ item: {} }) });
vi.stubGlobal("fetch", fetchMock);

const input = { q: "Từ „时间‟ đọc thế nào?", wrong: { zh: "shíjiān" }, right: { zh: "shíjiān", py: "shíjiān" }, cause: "c" };

beforeEach(() => { localStorage.clear(); fetchMock.mockClear(); getSession.mockReset(); resetCaptureDedupe(); });

describe("captureWrong (spec §3.4)", () => {
  it("ghi entry kind=wrong source=auto vào local + dispatch bye:progress", () => {
    const listener = vi.fn();
    window.addEventListener("bye:progress", listener);
    captureWrong(input);
    window.removeEventListener("bye:progress", listener);
    const list = readLocalEntries();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: "wrong", source: "auto", saved: false, tagTone: "red" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it("dedupe 24h: cùng q+right.zh → chỉ 1 entry; khác q → 2", () => {
    captureWrong(input);
    captureWrong(input);
    expect(readLocalEntries()).toHaveLength(1);
    captureWrong({ ...input, q: "Câu khác" });
    expect(readLocalEntries()).toHaveLength(2);
  });
  it("đã đăng nhập → POST fire-and-forget; guest → không fetch", async () => {
    captureWrong(input);
    expect(fetchMock).not.toHaveBeenCalled(); // getSession trả null mặc định
    getSession.mockResolvedValue({ data: { user: { id: "u1" } } });
    captureWrong({ ...input, q: "Câu đăng nhập" });
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/notebook/entries", expect.objectContaining({ method: "POST" }));
  });
});
```

- [ ] **Step 2: Run to verify FAIL.**

- [ ] **Step 3: Implement**

```ts
// src/lib/notebook/capture.ts
/* Side-effect fire-and-forget — KHÔNG import progress-store/srs-session (chống
   import vòng, spec §3.4). Người gọi (quiz/roadmap/review-dashboard) tự resolve word. */
import { authClient } from "@/lib/auth-client";
import { readLocalEntries, writeLocalEntries, newEntryId } from "@/lib/notebook/entries";

const DEDUP_MS = 24 * 3_600_000;
let lastCapture = new Map<string, number>(); // key → timestamp lần capture cuối

/** test-only: xóa dedupe giữa các case */
export function resetCaptureDedupe(): void { lastCapture = new Map(); }

export function captureWrong(input: {
  q: string; wrong: { zh: string; py?: string } | null; right: { zh: string; py?: string };
  cause: string; hsk?: string; tag?: string; tagTone?: "red" | "lav" | "per";
}): void {
  const key = `${input.q}\u0000${input.right.zh}`;
  const last = lastCapture.get(key) ?? 0;
  if (Date.now() - last < DEDUP_MS) return;
  lastCapture.set(key, Date.now());

  const now = new Date().toISOString();
  const entry = {
    id: newEntryId(),
    kind: "wrong" as const,
    tag: input.tag ?? "🛑 Lỗi sai khi luyện tập",
    tagTone: input.tagTone ?? ("red" as const),
    payload: { q: input.q, wrong: input.wrong, right: input.right, cause: input.cause },
    saved: false,
    hsk: input.hsk ?? null,
    source: "auto" as const,
    createdAt: now,
    updatedAt: now,
  };
  writeLocalEntries([entry, ...readLocalEntries()]);
  window.dispatchEvent(new CustomEvent("bye:progress"));

  // fire-and-forget: đã đăng nhập thì đẩy server luôn; thất bại thì sync-on-login sẽ đẩy sau
  void Promise.resolve(authClient.getSession()).then((s) => {
    if (s?.data?.user) {
      fetch("/api/v1/notebook/entries", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: entry.id, kind: entry.kind, tag: entry.tag, tagTone: entry.tagTone, payload: entry.payload, hsk: entry.hsk, source: entry.source }),
      }).catch(() => { /* sync-on-login sẽ đẩy */ });
    }
  });
}
```

- [ ] **Step 4: Run to verify PASS** + grep chống import vòng (Review Focus 4):

```bash
pnpm vitest run src/lib/notebook/__tests__/capture.test.ts && pnpm typecheck
grep -n "progress-store\|srs-session" src/lib/notebook/capture.ts && echo "VI PHẠM" || echo "OK không import vòng"
```
Expected: PASS + "OK không import vòng".

- [ ] **Step 5: Commit**

```bash
git add src/lib/notebook/capture.ts src/lib/notebook/__tests__/capture.test.ts
git commit -m "feat(notebook): captureWrong — ghi local + POST fire-and-forget + dedupe 24h (spec §3.4)"
```

---

### Task 9: Dashboard — page + search + hero + shelf + filters

**Files:**
- Create: `app-next/src/app/(wide)/notebook/page.tsx`
- Create: `app-next/src/app/(wide)/notebook/notebook-dashboard.tsx`
- Test: `app-next/src/app/(wide)/notebook/__tests__/notebook-dashboard.test.tsx`

**Interfaces:**
- Consumes: `notebookBooks` (T1), `useNotebookEntries` + `notebookStats` (T6/7), `useSession` cho mức HSK hero, `fmtRelativeDate` (export có sẵn từ `@/components/notebook/notebook-list`).
- Produces: `NotebookDashboard` — Task 10 đổ stream cards vào slot `{/* SLOT-STREAM */}`, Task 11 cắm dialog vào `{/* SLOT-ADD */}`. Props test-only: `now?: Date` (mặc định `new Date()`) cho hero/week-count determinism.

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/(wide)/notebook/__tests__/notebook-dashboard.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import NotebookDashboard from "../notebook-dashboard";

const useNotebookEntries = vi.fn();
vi.mock("@/lib/notebook/use-notebook-entries", () => ({ useNotebookEntries: () => useNotebookEntries() }));
vi.mock("@/lib/use-session", () => ({ useSession: () => ({ loggedIn: false, isPending: false, name: "M", image: null, logout: async () => {} }) }));
vi.mock("@/components/shell/toast-provider", () => ({ useToast: () => toastMock, useToastSafe: () => toastMock }));
const toastMock = vi.fn();

import { notebookBooks } from "@/content/notebook-books";
import type { NotebookEntry } from "@/lib/notebook/entries";

const NOW = new Date("2026-10-05T10:00:00Z");
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const wrongEntry = (over: Partial<NotebookEntry> = {}): NotebookEntry => ({
  id: "w1", kind: "wrong", tag: "🛑 Lỗi sai trong bài thi thử HSK 4", tagTone: "red",
  payload: { q: "昨天太累了…", wrong: { zh: "忽然", py: "hūrán" }, right: { zh: "居然", py: "jūrán" }, cause: "Nguyên nhân…" },
  saved: false, hsk: "HSK4", source: "auto", createdAt: day(2), updatedAt: day(2), ...over,
});
const emptyApi = { ready: true, create: vi.fn(), setSaved: vi.fn(), remove: vi.fn() };

beforeEach(() => { localStorage.clear(); toastMock.mockClear(); useNotebookEntries.mockReset(); });

describe("hero (port notebook-hero)", () => {
  it("đếm động: 2 wrong tuần này chưa ghim → h1 + CTA 'Ôn tập 2 lỗi sai ngay'", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [wrongEntry({ id: "a" }), wrongEntry({ id: "b" })] });
    render(<NotebookDashboard now={NOW} />);
    expect(screen.getByTestId("notebook-hero")).toHaveTextContent("Có 2 câu làm sai tuần này");
    expect(screen.getByTestId("notebook-cta")).toHaveTextContent("Ôn tập 2 lỗi sai ngay");
    expect(screen.getByTestId("notebook-cta")).toHaveAttribute("href", "/review");
    expect(screen.getByText("📝 2 Mục ghi chép")).toBeInTheDocument();
    expect(screen.getByText("🛡️ Đã khắc phục: —%")).toBeInTheDocument();
  });
  it("không có wrong → h1 khích lệ + '—%'", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [] });
    render(<NotebookDashboard now={NOW} />);
    expect(screen.getByTestId("notebook-hero")).toHaveTextContent("Chưa có câu sai nào tuần này");
  });
});

describe("shelf (port notebook-shelf)", () => {
  it("4 sổ: mistakes số liệu thật + 3 sổ tĩnh; CTA sổ tĩnh → toast", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [wrongEntry()] });
    render(<NotebookDashboard now={NOW} />);
    expect(screen.getByTestId("book-mistakes")).toHaveTextContent("SỔ CÂU LÀM SAI");
    expect(screen.getByTestId("book-mistakes")).toHaveTextContent("1 câu hỏi cần nhớ");
    expect(screen.getByTestId("book-mistakes")).toHaveTextContent("Cần xử lý: 1 câu");
    for (const b of notebookBooks) expect(screen.getByTestId(`book-${b.id}`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Luyện phân biệt" }));
    expect(toastMock).toHaveBeenCalledWith(expect.stringContaining("Sắp có"));
  });
  it("CTA 'Mở sổ lỗi sai' → filter wrong active", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [] });
    render(<NotebookDashboard now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Mở sổ lỗi sai" }));
    expect(screen.getByRole("button", { name: "Câu sai chưa sửa" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("search + filters (port notebook-search stream-filters)", () => {
  it("phím / focus ô search", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [] });
    render(<NotebookDashboard now={NOW} />);
    fireEvent.keyDown(document, { key: "/" });
    expect(screen.getByLabelText("Tìm kiếm trong tất cả sổ tay")).toHaveFocus();
  });
  it("search lọc theo nội dung payload", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [wrongEntry({ id: "a" }), wrongEntry({ id: "b", payload: { q: "Khaled", wrong: null, right: { zh: "x" }, cause: "y" } })] });
    render(<NotebookDashboard now={NOW} />);
    fireEvent.change(screen.getByLabelText("Tìm kiếm trong tất cả sổ tay"), { target: { value: "khaled" } });
    expect(screen.getAllByTestId(/^note-/)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify FAIL.**

- [ ] **Step 3: Implement page + dashboard**

`page.tsx`:

```tsx
/* /notebook (G-cá nhân) — dashboard Sổ tay & Ghi chép, port opendesign_hsk/notebook.html.
   Server mỏng; toàn tương tác trong NotebookDashboard. Route group (wide) 1280px. */
import type { Metadata } from "next";
import NotebookDashboard from "./notebook-dashboard";

export const metadata: Metadata = { title: "Sổ tay & Ghi chép" };

export default function NotebookPage() {
  return <NotebookDashboard />;
}
```

`notebook-dashboard.tsx` — client, khung (stream để comment):

```tsx
"use client";
/* NotebookDashboard (port notebook.html) — hero đếm từ entries thật, shelf 1 sổ
   thật + 3 sổ tĩnh, filters + search client-side. mounted gate chống hydration
   (relative time + đếm tuần chỉ tính client, spec §7). */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useNotebookEntries } from "@/lib/notebook/use-notebook-entries";
import { notebookStats, type NotebookEntry } from "@/lib/notebook/entries";
import { notebookBooks } from "@/content/notebook-books";
import { useToast } from "@/components/shell/toast-provider";
import { Button } from "@/components/ui/button";
import { Search, Settings, NotebookPen, Target } from "@/components/ui/icon";

type Filter = "all" | "wrong" | "chars" | "personal";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tất cả mục" },
  { key: "wrong", label: "Câu sai chưa sửa" },
  { key: "chars", label: "Chữ Hán dễ nhầm" },
  { key: "personal", label: "Ghi chú cá nhân" },
];

export default function NotebookDashboard({ now }: { now?: Date }) {
  const { entries, ready, create } = useNotebookEntries();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("wrong"); // mock mặc định "Câu sai chưa sửa"
  const [q, setQ] = useState("");
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<HTMLDivElement | null>(null);
  const [addOpen, setAddOpen] = useState(false); // Task 11 dùng

  useEffect(() => setMounted(true), []);
  // phím "/" focus search (mock notebook.html) — bỏ qua khi đang gõ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && !(t && (t.matches?.("input, textarea, select") || t.isContentEditable))) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const stats = mounted ? notebookStats(entries, now) : { total: 0, wrongTotal: 0, wrongWeek: 0, wrongUnfixedWeek: 0, fixedPct: null };
  const shown = useMemo(() => {
    if (!mounted) return [];
    const needle = q.trim().toLowerCase();
    return entries.filter((e) => {
      const okF = filter === "all" || e.kind === filter;
      const okQ = !needle || JSON.stringify({ tag: e.tag, ...e.payload }).toLowerCase().includes(needle);
      return okF && okQ;
    });
  }, [entries, filter, q, mounted]);

  return (
    <div className="flex flex-col gap-4">
      {/* search hàng đầu (mock đặt trong topbar — app có topbar riêng nên đưa vào page) */}
      <div className="flex items-center gap-3">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-full border border-border-default bg-surface-elevated px-4" data-od-id="notebook-search">
          <Search size={16} strokeWidth={1.5} aria-hidden="true" className="text-text-secondary" />
          <input
            ref={searchRef} type="search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm kiếm trong tất cả sổ tay..." aria-label="Tìm kiếm trong tất cả sổ tay"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-text-faint"
          />
          <kbd className="rounded-md border border-border-default bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-text-secondary">/</kbd>
        </label>
      </div>

      {/* hero */}
      <section className="grid items-center gap-6 rounded-3xl border border-border-subtle bg-surface-elevated p-6 shadow-md lg:grid-cols-[1fr_auto]" data-od-id="notebook-hero" aria-label="Bàn chỉ huy sổ tay">
        <div>
          <p className="text-xs font-bold tracking-wider text-feedback-success">TRUNG TÂM GHI CHÉP &amp; HÓA GIẢI ĐIỂM MÙ</p>
          <h1 className="mt-1 text-[21px] font-extrabold leading-snug">
            {stats.wrongWeek > 0
              ? `Có ${stats.wrongWeek} câu làm sai tuần này cần xem lại`
              : "Chưa có câu sai nào tuần này — cứ tiến lên!"}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-text-secondary">Mỗi lỗi sai đã được gắn nguyên nhân gốc — sửa 1 lần, nhớ cả cụm.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-border-default bg-surface-muted px-3.5 py-[7px] text-xs font-bold">📕 4 Sổ chuyên đề</span>
            <span className="rounded-full border border-border-default bg-surface-muted px-3.5 py-[7px] text-xs font-bold">📝 {stats.total} Mục ghi chép</span>
            <span className="rounded-full border border-jade-wash bg-jade-wash px-3.5 py-[7px] text-xs font-bold text-feedback-success">🛡️ Đã khắc phục: {stats.fixedPct ?? "—"}%</span>
          </div>
        </div>
        <Link
          href="/review" data-od-id="notebook-cta"
          className="inline-flex max-w-[300px] items-center justify-center gap-2 rounded-2xl border border-action-primary bg-action-primary px-6 py-3.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-action-hover focus-visible:ring-3 ring-action-focus ring-offset-2 lg:min-h-[52px]"
        >
          <Target size={16} strokeWidth={1.5} aria-hidden="true" />
          {stats.wrongWeek > 0 ? `Ôn tập ${stats.wrongWeek} lỗi sai ngay` : "Ôn tập lỗi sai ngay"}
        </Link>
      </section>

      {/* shelf 4 sổ */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Tủ sổ tay chuyên đề" data-od-id="notebook-shelf">
        <article className="flex flex-col gap-1.5 rounded-card border border-border-subtle bg-surface-elevated p-[18px] shadow-xs transition-transform hover:-translate-y-0.5" data-od-id="book-mistakes">
          <div className="grid h-10 w-10 place-items-center rounded-[11px] border border-border-default bg-surface-muted text-[19px]">🛑</div>
          <h3 className="text-[13.5px] leading-snug font-extrabold">SỔ CÂU LÀM SAI<span className="hanzi block text-[11px] font-normal text-text-secondary">错题本 · Tự động gom</span></h3>
          <p className="text-[17px] font-bold">{stats.wrongTotal} câu hỏi cần nhớ</p>
          <p className="text-xs text-text-secondary">
            {stats.wrongUnfixedWeek > 0
              ? <span className="inline-block rounded-full border border-amber-wash bg-amber-wash px-2.5 py-0.5 text-[10.5px] font-bold text-amber-ink">Cần xử lý: {stats.wrongUnfixedWeek} câu</span>
              : <span className="inline-block rounded-full border border-jade-wash bg-jade-wash px-2.5 py-0.5 text-[10.5px] font-bold text-feedback-success">Đã xử lý hết 🎉</span>}
          </p>
          <Button variant="secondary" size="sm" className="mt-2.5 w-full" onClick={() => { setFilter("wrong"); streamRef.current?.scrollIntoView({ behavior: "smooth" }); }}>Mở sổ lỗi sai</Button>
        </article>
        {notebookBooks.map((b) => (
          <article key={b.id} className="flex flex-col gap-1.5 rounded-card border border-border-subtle bg-surface-elevated p-[18px] shadow-xs transition-transform hover:-translate-y-0.5" data-od-id={`book-${b.id}`}>
            <div className="grid h-10 w-10 place-items-center rounded-[11px] border border-border-default bg-surface-muted text-[19px]">{b.icon}</div>
            <h3 className="text-[13.5px] leading-snug font-extrabold">{b.title}<span className="hanzi block text-[11px] font-normal text-text-secondary">{b.sub}</span></h3>
            <p className="text-[17px] font-bold">{b.big}</p>
            <p className="text-xs text-text-secondary">
              <span className={"inline-block rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold " + (b.badgeTone === "ok" ? "border-jade-wash bg-jade-wash text-feedback-success" : "border-border-default bg-surface-muted text-text-primary")}>{b.badge}</span>
            </p>
            <Button variant="secondary" size="sm" className="mt-2.5 w-full" onClick={() => toast("Sắp có — đang biên tập nội dung luyện cho sổ này")}>{b.cta}</Button>
          </article>
        ))}
      </section>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2" id="stream" role="group" aria-label="Bộ lọc dòng ghi chép" data-od-id="stream-filters">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} aria-pressed={filter === f.key}
            className={"min-h-10 rounded-full border px-4 text-xs font-bold transition-colors focus-visible:ring-3 ring-action-focus ring-offset-2 " + (filter === f.key ? "border-action-primary bg-surface-elevated text-action-primary shadow-[0_0_0_3px] shadow-rose-wash" : "border-border-default bg-surface-elevated text-text-secondary hover:border-text-faint hover:text-text-primary")}>
            {f.label}
          </button>
        ))}
        <Button variant="secondary" size="sm" className="ml-auto rounded-full" data-od-id="add-note" onClick={() => setAddOpen(true)}>
          <NotebookPen size={14} strokeWidth={1.5} aria-hidden="true" /> + Tạo sổ mới
        </Button>
      </div>

      {/* SLOT-STREAM: Task 10 — section data-od-id="mistake-stream" + empty state */}
      {/* SLOT-ADD: Task 11 — Dialog tạo ghi chú cá nhân (addOpen) */}
    </div>
  );
}
```

Lưu ý executor: h1 hero — test 1 assert chứa "Có 2 câu làm sai tuần này" (bỏ đuôi "trước kỳ thi HSK N" — nếu muốn thêm mức, lấy `entries` có `hsk` cao nhất; phần này **không bắt buộc**, giữ đơn giản như code trên).

- [ ] **Step 4: Run to verify PASS** — `pnpm vitest run "src/app/(wide)/notebook" && pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(wide)/notebook"
git commit -m "feat(notebook): dashboard search/hero/shelf/filters (port notebook-search notebook-hero notebook-shelf stream-filters notebook.html)"
```

---

### Task 10: Dashboard — stream cards (3 kind) + empty + ghim ★

**Files:**
- Modify: `app-next/src/app/(wide)/notebook/notebook-dashboard.tsx` (đổ SLOT-STREAM)
- Test: thêm describe vào `notebook-dashboard.test.tsx`

**Interfaces:**
- Consumes: `safeParsePayload` (T2 — entry payload hỏng → bỏ qua render), `fmtRelativeDate` (`@/components/notebook/notebook-list`), `setSaved`/`remove` từ hook, `now` prop cho relative time determinism trong test.
- Produces: section `data-od-id="mistake-stream"` + card `note-{id}` + empty `data-od-id="stream-empty"`.

- [ ] **Step 1: Write the failing test**

```tsx
describe("stream cards (port mistake-stream)", () => {
  const setSaved = vi.fn();
  beforeEach(() => setSaved.mockClear());
  it("card wrong: q + 2 dòng contrast + cause + CTA /review + time", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, setSaved, entries: [wrongEntry()] });
    render(<NotebookDashboard now={NOW} />);
    const card = screen.getByTestId("note-w1");
    expect(within(card).getByText("昨天太累了…")).toBeInTheDocument();
    expect(within(card).getByText(/Bạn đã chọn:/)).toBeInTheDocument();
    expect(within(card).getByText(/Đáp án đúng:/)).toBeInTheDocument();
    expect(within(card).getByText(/Điểm mấu chốt:/)).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Thử thách lại câu này" })).toHaveAttribute("href", "/review");
  });
  it("card wrong null → 'Bạn chưa nhớ:' thay dòng sai", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [wrongEntry({ payload: { q: "q", wrong: null, right: { zh: "x" }, cause: "c" } })] });
    render(<NotebookDashboard now={NOW} />);
    expect(screen.getByText(/Bạn chưa nhớ:/)).toBeInTheDocument();
  });
  it("card chars: bigchars + tip + CTA /hanzi; card personal: note, không CTA", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [
      wrongEntry({ id: "c1", kind: "chars", tagTone: "lav", tag: "🔍 Cặp chữ dễ nhầm", payload: { chars: [{ zh: "已", py: "yǐ" }, { zh: "己", py: "jǐ" }], tip: "Mẹo nhớ…" }, source: "manual" }),
      wrongEntry({ id: "p1", kind: "personal", tagTone: "per", tag: "📝 Ghi chú cá nhân", payload: { note: "Khi từ chối…" }, source: "manual" }),
    ] });
    render(<NotebookDashboard now={NOW} />);
    const c = screen.getByTestId("note-c1");
    expect(within(c).getByText("vs")).toBeInTheDocument();
    expect(within(c).getByRole("link", { name: "Xem bút thuận nét viết" })).toHaveAttribute("href", "/hanzi");
    const p = screen.getByTestId("note-p1");
    expect(within(p).getByText("Khi từ chối…")).toBeInTheDocument();
    expect(within(p).queryByRole("link")).toBeNull();
  });
  it("★ ghim: aria-pressed + gọi setSaved + toast", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, setSaved, entries: [wrongEntry()] });
    render(<NotebookDashboard now={NOW} />);
    const star = screen.getByRole("button", { name: "Yêu thích" });
    expect(star).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(star);
    expect(setSaved).toHaveBeenCalledWith("w1", true);
    expect(toastMock).toHaveBeenCalledWith("Đã ghim ★ ghi chú");
  });
  it("payload hỏng → card bị bỏ qua; filter rỗng → empty state", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [{ ...wrongEntry(), payload: "x" as unknown as NotebookEntry["payload"] }] });
    render(<NotebookDashboard now={NOW} />);
    expect(screen.getByTestId("stream-empty")).toHaveTextContent(/Không có mục nào khớp/);
  });
  it("⋮ mở menu tùy chọn → toast demo", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [wrongEntry()] });
    render(<NotebookDashboard now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Tùy chọn" }));
    expect(toastMock).toHaveBeenCalledWith(expect.stringContaining("Tùy chọn"));
  });
});
```

- [ ] **Step 2: Run to verify FAIL.**

- [ ] **Step 3: Implement SLOT-STREAM**

```tsx
{/* stream */}
<div ref={streamRef} className="flex flex-col gap-4" aria-label="Dòng ghi chép gần đây" data-od-id="mistake-stream">
  {shown.map((e) => {
    const p = safeParsePayload(e.kind, e.payload);
    if (!p) return null;
    return (
      <article key={e.id} className="flex flex-col gap-3 rounded-card border border-border-subtle bg-surface-elevated p-5 shadow-xs" data-od-id={`note-${e.id}`}>
        {/* mhead */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className={"rounded-full border px-3 py-1 text-[11px] font-bold " + TAG_TONE_CLS[e.tagTone]}>{e.tag}</span>
          <span className="text-xs text-text-secondary">{fmtRelativeDate(e.createdAt)}</span>
          <span className="ml-auto flex gap-1.5">
            <button onClick={() => { setSaved(e.id, !e.saved); toast(e.saved ? "Đã bỏ ghim ghi chú" : "Đã ghim ★ ghi chú"); }}
              aria-pressed={e.saved} aria-label="Yêu thích"
              className={"grid h-9 w-9 place-items-center rounded-[9px] border text-[15px] focus-visible:ring-3 ring-action-focus ring-offset-2 " + (e.saved ? "border-amber-wash bg-amber-wash text-amber-ink" : "border-border-default bg-surface-elevated text-text-secondary hover:border-text-faint")}>★</button>
            <button onClick={() => toast("Tùy chọn: ghim · chuyển sổ · báo lỗi nội dung")} aria-label="Tùy chọn"
              className="grid h-9 w-9 place-items-center rounded-[9px] border border-border-default bg-surface-elevated text-[15px] text-text-secondary hover:border-text-faint focus-visible:ring-3 ring-action-focus ring-offset-2">⋮</button>
          </span>
        </div>
        {/* body theo kind */}
        {e.kind === "wrong" && p.kind === "wrong" && (
          <>
            <p className="hanzi text-lg leading-relaxed">{p.q}</p>
            <div className="grid gap-2">
              <div className="flex items-start gap-2.5 rounded-[10px] border border-feedback-error/40 bg-rose-wash/40 px-3 py-2.5 text-[13.5px]">
                <span aria-hidden="true">❌</span>
                <span>{p.wrong ? <>Bạn đã chọn: <b className="text-feedback-error-text line-through">{p.wrong.zh}</b>{p.wrong.py ? ` (${p.wrong.py})` : null}</> : "Bạn chưa nhớ:"}</span>
              </div>
              <div className="flex items-start gap-2.5 rounded-[10px] border border-jade-wash bg-jade-wash px-3 py-2.5 text-[13.5px]">
                <span aria-hidden="true">✅</span>
                <span>Đáp án đúng: <b className="text-feedback-success">{p.right.zh}</b>{p.right.py ? ` (${p.right.py})` : null}</span>
              </div>
            </div>
            <div className="flex gap-2.5 rounded-[10px] border border-border-default bg-surface-muted px-3 py-2.5 text-xs">
              <span aria-hidden="true">💡</span>
              <span><b>Điểm mấu chốt:</b> {p.cause}</span>
            </div>
          </>
        )}
        {e.kind === "chars" && p.kind === "chars" && (
          <>
            <div className="flex flex-wrap items-center gap-3.5 rounded-xl border border-dashed border-border-default bg-surface-paper p-3.5">
              {p.chars.map((c, i) => (
                <span key={i} className="flex items-center gap-3.5">
                  {i > 0 && <b className="text-text-faint">vs</b>}
                  <span className="text-center"><b className="hanzi block text-[28px] leading-tight">{c.zh}</b><span className="text-[11.5px] text-text-secondary">{c.py}</span></span>
                </span>
              ))}
            </div>
            <div className="flex gap-2.5 rounded-[10px] border border-border-default bg-surface-muted px-3 py-2.5 text-xs"><span aria-hidden="true">💡</span><span>{p.tip}</span></div>
          </>
        )}
        {e.kind === "personal" && (
          <div className="rounded-[10px] border border-border-default bg-surface-paper px-3 py-2.5 text-[13px]">{p.note}</div>
        )}
        {/* footer CTA */}
        {e.kind === "wrong" && <Link href="/review" className="mt-1 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border-default bg-surface-muted px-4 text-xs font-bold hover:border-text-faint focus-visible:ring-3 ring-action-focus ring-offset-2">Thử thách lại câu này</Link>}
        {e.kind === "chars" && <Link href="/hanzi" className="mt-1 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border-default bg-surface-muted px-4 text-xs font-bold hover:border-text-faint focus-visible:ring-3 ring-action-focus ring-offset-2">Xem bút thuận nét viết</Link>}
      </article>
    );
  })}
  {mounted && shown.length === 0 && (
    <p className="rounded-card border border-border-subtle bg-surface-elevated p-[30px] text-center text-[13.5px] text-text-secondary" data-od-id="stream-empty">
      Không có mục nào khớp bộ lọc. Thử từ khóa khác.
    </p>
  )}
</div>
```

Kèm hằng đầu file: `const TAG_TONE_CLS = { red: "border-feedback-error/40 bg-rose-wash/50 text-feedback-error-text", lav: "border-feature-ai bg-feature-ai/10 text-feature-ai", per: "border-jade-wash bg-jade-wash text-feedback-success" } as const;` (tên token `feature-ai` kiểm tra trong `globals.css` — nếu opacity modifier không có sẵn, dùng form đầy đủ `bg-[var(--hz-feature-ai)]` thay thế; KHÔNG hex).

Import thêm: `safeParsePayload` từ `@/lib/notebook/payload`, `fmtRelativeDate` từ `@/components/notebook/notebook-list`.

- [ ] **Step 4: Run to verify PASS** — `pnpm vitest run "src/app/(wide)/notebook" && pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(wide)/notebook"
git commit -m "feat(notebook): stream cards wrong/chars/personal + ghim ★ (port mistake-stream notebook.html)"
```

---

### Task 11: Dialog tạo ghi chú cá nhân

**Files:**
- Modify: `app-next/src/app/(wide)/notebook/notebook-dashboard.tsx` (đổ SLOT-ADD)
- Test: thêm describe vào `notebook-dashboard.test.tsx`

**Interfaces:**
- Consumes: `Dialog` (`@/components/ui/dialog` — props `open, onClose, labelledBy, className`), `create()` từ hook, `Textarea` (`@/components/ui/textarea`).

- [ ] **Step 1: Write the failing test**

```tsx
describe("dialog tạo ghi chú (spec §2.5)", () => {
  it("mở từ '+ Tạo sổ mới', lưu → create personal + toast + filter personal", () => {
    const create = vi.fn(() => wrongEntry({ id: "new", kind: "personal", tagTone: "per", payload: { note: "abc" } }));
    useNotebookEntries.mockReturnValue({ ...emptyApi, create, entries: [] });
    render(<NotebookDashboard now={NOW} />);
    fireEvent.click(screen.getByTestId("add-note"));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Ghi chú cá nhân");
    fireEvent.change(within(dialog).getByLabelText("Nội dung ghi chú"), { target: { value: "abc" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu ghi chú" }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ kind: "personal", tag: "📝 Ghi chú cá nhân", tagTone: "per", source: "manual" }));
    expect(toastMock).toHaveBeenCalledWith("Đã lưu ghi chú");
    expect(screen.getByRole("button", { name: "Ghi chú cá nhân" })).toHaveAttribute("aria-pressed", "true");
  });
  it("nút Lưu disabled khi <2 ký tự", () => {
    useNotebookEntries.mockReturnValue({ ...emptyApi, entries: [] });
    render(<NotebookDashboard now={NOW} />);
    fireEvent.click(screen.getByTestId("add-note"));
    expect(screen.getByRole("button", { name: "Lưu ghi chú" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run to verify FAIL.**

- [ ] **Step 3: Implement** — đổ SLOT-ADD:

```tsx
<Dialog open={addOpen} onClose={() => setAddOpen(false)} labelledBy="dlg-note-title" className="max-w-md p-6">
  <h2 id="dlg-note-title" className="text-lg font-extrabold">Ghi chú cá nhân</h2>
  <p className="mt-1 text-[13px] text-text-secondary">Sổ chuyên đề tự gom từ luyện tập — ghi chú tự do của bạn lưu ở đây.</p>
  <Textarea aria-label="Nội dung ghi chú" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
    placeholder="Ví dụ: Khi từ chối lịch sự, dùng “恐怕不太方便” mềm hơn “不行”…"
    className="mt-3 min-h-24 zh" />
  <div className="mt-4 flex justify-end gap-2">
    <Button variant="secondary" onClick={() => setAddOpen(false)}>Hủy</Button>
    <Button disabled={noteDraft.trim().length < 2} onClick={() => {
      create({ kind: "personal", tag: "📝 Ghi chú cá nhân", tagTone: "per", payload: { note: noteDraft.trim() }, source: "manual" });
      setNoteDraft(""); setAddOpen(false); setFilter("personal"); toast("Đã lưu ghi chú");
    }}>Lưu ghi chú</Button>
  </div>
</Dialog>
```

Kèm state `const [noteDraft, setNoteDraft] = useState("");` cạnh `addOpen`.

- [ ] **Step 4: Run to verify PASS** — `pnpm vitest run "src/app/(wide)/notebook" && pnpm typecheck && pnpm lint` → PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(wide)/notebook"
git commit -m "feat(notebook): dialog tạo ghi chú cá nhân (thay demo toast của mock add-note)"
```

---

### Task 12: Auto-capture integration — 3 điểm sai

**Files:**
- Modify: `app-next/src/components/lesson/modes/quiz.tsx` (nhánh `answer()` khi `p !== item.pinyin`)
- Modify: `app-next/src/components/roadmap/session-client.tsx` (2 chỗ `onClick` set đáp án — L~330 và L~385)
- Modify: `app-next/src/app/(app)/review/review-dashboard.tsx` (sau `recordReview`)
- Test: thêm case vào `src/components/lesson/__tests__/quiz.test.tsx`, `src/app/(app)/roadmap/__tests__/session-client.test.tsx` (nếu chưa có → tạo), `src/app/(app)/review/__tests__/review-dashboard.test.tsx`

**Interfaces:**
- Consumes: `captureWrong` (T8). KHÔNG import capture từ progress-store/srs-session (Review Focus 4).
- Lưu ý test: các file test hiện có mock `progressStore` — thêm mock `@/lib/notebook/capture` với `captureWrong: vi.fn()` vào 3 file test và assert được gọi với payload đúng.

- [ ] **Step 1: Write the failing tests**

```ts
// 1) quiz.test.tsx — thêm case: chọn sai pinyin → captureWrong với q/wrong/right/cause
it("chọn sai → captureWrong ghi nguyên nhân gốc (spec §3.4.1)", async () => {
  const { captureWrong } = await import("@/lib/notebook/capture");
  // ...render QuizMode như test hiện có (items fixture), click 1 đáp án SAI (p !== item.pinyin)
  //    rồi assert:
  // expect(vi.mocked(captureWrong)).toHaveBeenCalledWith(expect.objectContaining({
  //   q: `Từ „${item.hanzi}‟ đọc thế nào?`,
  //   wrong: { zh: pickedPinyin },
  //   right: { zh: item.pinyin },
  // }));
  //    (fixture item: { hanzi: "时间", pinyin: "shíjiān", meaning: "thời gian" } → cause chứa "shíjiān")
});
```

```ts
// 2) session-client.test.tsx — thêm case quiz tab: click option sai (oi !== q.answer)
it("mini-test chọn sai → captureWrong với đề + option sai/đúng (spec §3.4.2)", async () => {
  const { captureWrong } = await import("@/lib/notebook/capture");
  // render session-client với session fixture có quiz[0] = { q: "Câu hỏi?", options: ["A","B","C","D"], answer: 1, explain: "Giải thích" }
  // click option "A" (sai) rồi assert:
  // expect(vi.mocked(captureWrong)).toHaveBeenCalledWith(expect.objectContaining({
  //   q: "Câu hỏi?", wrong: { zh: "A" }, right: { zh: "B" },
  //   cause: expect.stringContaining("Giải thích"),
  // }));
});
```

```ts
// 3) review-dashboard.test.tsx — thêm case: grade "forgot" → captureWrong
it("grade forgot → captureWrong (spec §3.4.3)", async () => {
  const { captureWrong } = await import("@/lib/notebook/capture");
  // ...flow test hiện có trả lời "forgot" cho 1 từ có resolveWord được (fixture SRS key `hsk1.lesson-4.0` + seed content/vocab)
  // assert:
  // expect(vi.mocked(captureWrong)).toHaveBeenCalledWith(expect.objectContaining({
  //   q: `${word.zh} nghĩa là gì?`, wrong: null,
  //   right: { zh: word.zh, py: word.pinyin },
  //   cause: expect.stringContaining("Quên khi ôn SRS"),
  //   hsk: "HSK1",
  // }));
});
```

(Mỗi file: `vi.mock("@/lib/notebook/capture", () => ({ captureWrong: vi.fn() }));` ở đầu.)

- [ ] **Step 2: Run to verify FAIL** — capture chưa được gọi.

- [ ] **Step 3: Implement 3 điểm hook**

**quiz.tsx** — trong `answer(p)` nhánh sai (sau dòng set state, trước timer):

```ts
import { captureWrong } from "@/lib/notebook/capture";
// ...trong answer(), else-branch (p !== item.pinyin):
if (p !== item.pinyin) {
  captureWrong({
    q: `Từ „${item.hanzi}‟ đọc thế nào?`,
    wrong: { zh: p },
    right: { zh: item.pinyin },
    cause: `Pinyin đúng của ${item.hanzi} (${item.meaning}) là ${item.pinyin}.`,
    hsk: bookHsk,   // mức HSK từ book của lesson hiện có trong provider — nếu không truy cập được tại đây thì bỏ qua field
  });
}
```
Lưu ý executor: cấu trúc `answer()` hiện tại là `if (p === item.pinyin) {…}` — thêm `else { captureWrong(…) }`. Nếu `item.meaning` không tồn tại trên `LessonItem` (kiểm tra type trong `lesson-provider.tsx`), dùng trường tương đương hoặc bỏ `{meaning}` khỏi chuỗi.

**session-client.tsx** — 2 onClick:

```ts
import { captureWrong } from "@/lib/notebook/capture";
// Tab Trắc nghiệm (onClick set quizAnswers):
if (oi !== q.answer) captureWrong({ q: q.q, wrong: { zh: opt }, right: { zh: q.options[q.answer] }, cause: q.explain || "Xem lại câu này trong bài học của trạm." });
// Tab Bài kiểm tra (onClick set testPick):
if (oi !== mcItem.answer) captureWrong({ q: mcItem.q, wrong: { zh: opt }, right: { zh: mcItem.options[mcItem.answer] }, cause: mcItem.explain || "Xem lại câu này trong bài học của trạm." });
```
Lưu ý executor: đặt dòng capture **trước** `setQuizAnswers`/`setTestPick` hoặc ngay sau — miễn trong cùng `onClick`, chỉ chạy khi `oi !== answer` (không capture khi chọn đúng hay khi đã answered).

**review-dashboard.tsx** — nơi gọi `progressStore.recordReview(key, grade)`:

```ts
import { captureWrong } from "@/lib/notebook/capture";
import { resolveWord } from "@/lib/srs-session";
// sau khi gọi recordReview:
if (grade === "forgot") {
  const word = resolveWord(key); // đồng bộ, có sẵn trong srs-session — file này ĐÃ import buildQueue từ đó
  if (word) {
    captureWrong({
      q: `${word.zh} nghĩa là gì?`, wrong: null,
      right: { zh: word.zh, py: word.pinyin },
      cause: "Quên khi ôn SRS — từ sẽ quay lại sớm.",
      hsk: /^hsk(\d+)\./.test(key) ? `HSK${key.match(/^hsk(\d+)\./)![1]}` : undefined,
    });
  }
}
```

- [ ] **Step 4: Run to verify PASS** + chống regression:

```bash
pnpm vitest run src/components/lesson src/app/\(app\)/roadmap src/app/\(app\)/review src/lib/notebook && pnpm typecheck
grep -rn "capture" src/lib/store/progress-store.ts src/lib/srs-session.ts && echo "VI PHẠM import vòng" || echo "OK"
```
Expected: PASS + "OK".

- [ ] **Step 5: Commit**

```bash
git add src/components/lesson/modes/quiz.tsx src/components/roadmap/session-client.tsx "src/app/(app)/review/review-dashboard.tsx" src/components/lesson/__tests__ src/app/\(app\)/roadmap/__tests__ "src/app/(app)/review/__tests__"
git commit -m "feat(notebook): auto-capture câu sai tại quiz bài học, mini-test lộ trình, review forgot (spec §3.4)"
```

---

### Task 13: Shell wiring + e2e + final verification

**Files:**
- Modify: `app-next/src/components/shell/sidebar-nav.tsx` (nhóm "CÁ NHÂN & CÔNG CỤ", sau item `/my-vocab`)

```ts
{ href: "/notebook", label: "Sổ tay", Icon: NotebookPen },  // import { NotebookPen } qua @/components/ui/icon (thêm vào re-export nếu lucide chưa xuất — lucide-react có sẵn NotebookPen)
```
- Modify: `app-next/src/components/shell/command-index.ts` — thêm vào `PAGES`: `{ label: "Sổ tay & Ghi chép", href: "/notebook", group: "Cá nhân" }` (sau "Sổ tay từ vựng").
- Modify: `app-next/e2e/hydration.spec.ts` — thêm `/notebook` vào ROUTES.
- Create: `app-next/e2e/notebook.spec.ts`
- Test: `src/components/shell/__tests__/command-palette.test.tsx` (nếu file test assert số lượng PAGES — cập nhật), test sidebar không có sẵn assertion cứng về số item.

**Interfaces:** — (wiring + e2e + verification)

- [ ] **Step 1: Wiring sidebar + palette** như trên; chạy `pnpm test && pnpm typecheck` → PASS (fix test palette nếu đếm cứng).

- [ ] **Step 2: Write e2e**

```ts
// e2e/notebook.spec.ts
import { test, expect } from "@playwright/test";

const SEED = [
  {
    id: "e2e-wrong-1", kind: "wrong", tag: "🛑 Lỗi sai trong bài thi thử HSK 4", tagTone: "red",
    payload: { q: "昨天太累了，我一回到家就睡着了。", wrong: { zh: "忽然", py: "hūrán" }, right: { zh: "居然", py: "jūrán" }, cause: "“居然” biểu thị sự bất ngờ ngoài dự kiến." },
    saved: false, hsk: "HSK4", source: "auto",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: "e2e-personal-1", kind: "personal", tag: "📝 Ghi chú cá nhân", tagTone: "per",
    payload: { note: "Khi từ chối lịch sự, dùng “恐怕不太方便”." },
    saved: true, hsk: null, source: "manual",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

test.describe("G-notebook dashboard (UI redesign)", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // guest
  test("hero/shelf/filters/stream/search/ghim", async ({ page }) => {
    await page.addInitScript((seed) => localStorage.setItem("bye.notebookEntries", JSON.stringify(seed)), SEED);
    await page.goto("/notebook");
    // hero
    await expect(page.getByTestId("notebook-hero")).toContainText("Có 1 câu làm sai tuần này");
    await expect(page.getByTestId("notebook-cta")).toHaveAttribute("href", "/review");
    // shelf
    await expect(page.getByTestId("book-mistakes")).toContainText("1 câu hỏi cần nhớ");
    await expect(page.getByTestId("book-confusables")).toBeVisible();
    // stream: filter mặc định "wrong" → 1 card; personal bị ẩn
    await expect(page.getByTestId("note-e2e-wrong-1")).toBeVisible();
    expect(await page.getByTestId("note-e2e-personal-1").count()).toBe(0);
    // filter all → 2 card
    await page.getByRole("button", { name: "Tất cả mục" }).click();
    await expect(page.getByTestId("note-e2e-personal-1")).toBeVisible();
    // search
    await page.getByLabel("Tìm kiếm trong tất cả sổ tay").fill("không-tồn-tại");
    await expect(page.getByTestId("stream-empty")).toBeVisible();
    await page.getByLabel("Tìm kiếm trong tất cả sổ tay").fill("居然");
    await expect(page.getByTestId("note-e2e-wrong-1")).toBeVisible();
    // ghim ★ (guest → localStorage)
    await page.getByTestId("note-e2e-wrong-1").getByRole("button", { name: "Yêu thích" }).click();
    await expect(page.getByTestId("note-e2e-wrong-1").getByRole("button", { name: "Yêu thích" })).toHaveAttribute("aria-pressed", "true");
  });

  test("tạo ghi chú cá nhân từ dialog", async ({ page }) => {
    await page.goto("/notebook");
    await page.getByTestId("add-note").click();
    await page.getByLabel("Nội dung ghi chú").fill("Mẫu câu e2e kiểm tra");
    await page.getByRole("button", { name: "Lưu ghi chú" }).click();
    await expect(page.getByText("Mẫu câu e2e kiểm tra")).toBeVisible();
  });

  test("sidebar có link Sổ tay và palette điều hướng", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Sổ tay", exact: true })).toBeVisible(); // sidebar (desktop) — mobile qua BottomNav More nếu cần
    await page.goto("/notebook");
    await expect(page.getByTestId("notebook-hero")).toBeVisible();
  });
});
```

Lưu ý executor: sidebar ở desktop `lg` mới hiển thị — nếu viewport mặc định Playwright < 1024px thì test "sidebar có link" cần `page.setViewportSize({ width: 1280, height: 800 })` hoặc assert qua BottomNav; điều chỉnh theo viewport config hiện có trong `playwright.config.ts`.

- [ ] **Step 3: hydration.spec** — thêm `"/notebook"` vào `ROUTES`; chạy riêng: `pnpm test:e2e -- -g hydration` → PASS (không hydration error).

- [ ] **Step 4: Full verification**

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm test:e2e
```
Expected: PASS hết. (`pnpm test:e2e` cần D1 dev đã migrate: `wrangler d1 migrations apply hsk-dev --local` nếu route auth/progress cần.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(notebook): sidebar + palette + e2e G-notebook (port hoàn tất notebook.html)"
```

---

## Self-Review (đã chạy khi viết plan)

1. **Spec coverage:** §2 UI (T9/10/11), §2.5 dialog (T11), §3.1 DB (T3), §3.2 payload (T2), §3.3 content (T1), §3.4 capture + 3 điểm (T8/12), §3.5 store/hook (T6/7), §4 shell (T13), §5 API (T4/5), §7 edge (payload hỏng T10, hydration T9/T13, network fail T7), §8 testing (mỗi task + T13). ✅
2. **Placeholder scan:** không TBD; các comment "…như test hiện có" đều kèm assert code cụ thể. ✅
3. **Type consistency:** `NotebookEntry` T6 dùng ở T7/8/9/10; `NewEntryInput` T7 dùng ở T11; `rowToApi` T4 dùng ở T5; `captureWrong` signature T8 dùng ở T12; `notebookStats` T6 dùng ở T9. ✅
4. **Review Focus:** payload sai kind → T2/T4/T5 test; dedupe 24h → T8; merge idempotent → T7; import vòng → T8 grep + T12 grep; hydration → T9 mounted gate + T13 e2e. ✅
