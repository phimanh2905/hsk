# HybridStore Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Thực hiện từng task theo đúng thứ tự; không nhảy cóc, không đánh dấu checkbox mà chưa chạy được lệnh verify tương ứng.

**Spec:** /Volumes/samsung512/Code/hsk/docs/superpowers/specs/2026-10-24-hsk15-roadmap-design.md (mục W4.1–W4.4, nguyên tắc kiến trúc §"Nguyên tắc kiến trúc" 1–2)

**Goal:** Tiến độ học multi-device: mọi ghi tiến độ vẫn vào localStorage ngay (localStorage-first), HybridStore đánh dấu dirty và debounce 5s POST `/api/v1/sync` lên D1; pull server về merge **số lấy max, timestamp/xung đột theo `updated_at` (bản mới hơn thắng trường-wise), tombstone `deleted_at` giữ 90 ngày**. Guest thuần local (không gọi mạng); login lần đầu merge-push hai chiều. Thêm server-side gate thật cho /my-vocab, /my-grammar, /progress (bỏ LoginGate client-only làm outer gate ở 3 route này).

**Architecture:**
- **3 domain sync, 1 endpoint:** `srs` (bảng `srs_cards`), `studyDay` (bảng `study_day`), `lessonProgress` (bảng `lesson_progress`). Request/response payload chia theo đúng 3 domain này (chi tiết shape ở "Interfaces Produces" từng task + mục cuối plan).
- **Merge là hàm thuần dùng chung client/server:** module `src/lib/store/sync-merge.ts` không I/O, route D1 và hybrid-store client cùng import → luật merge chỉ viết 1 lần, test 1 chỗ. Đây là điểm phụ thuộc của Wave 5 (SM-2 + review logs) — KHÔNG đổi shape sau khi task 2 commit.
- **HybridStore không đổi call site:** patch (own-property shadow) các method mutate trên singleton `progressStore` (`src/lib/store/progress-store.ts`) để đánh dirty theo domain; component gọi `progressStore.addXp(...)` như cũ không cần sửa. Guest: patch vẫn chạy nhưng dirty set không bao giờ flush (không session).
- **Server chỉ lưu + merge:** thuật toán (SRS, XP) vẫn chạy client; route `/api/v1/sync` chỉ upsert theo luật merge rồi trả về toàn bộ trạng thái server của user để client merge ngược.
- **Server gate:** 3 page chuyển thành async server component, check `getAuth().api.getSession({ headers: await headers() })` (pattern auth như route shadowing), không session → `redirect("/?login=1")`; LoginProvider đọc param `?login=1` mở modal. LoginGate client component giữ nguyên cho `/notebook/[kind]/[id]` (ngoài phạm vi W4.4).

**Tech Stack:** Next.js 16 App Router + TypeScript + Drizzle ORM + Cloudflare D1 (OpenNext), better-auth (session), zod 4, vitest (jsdom, fake timers), Playwright e2e, wrangler d1. **pnpm bắt buộc.**

## Global Constraints (bắt buộc đọc trước khi làm bất kỳ task nào)

1. **pnpm bắt buộc** trong `app-next/`; không dùng npm/yarn. KHÔNG chạy `pnpm build`/`pnpm preview`/`pnpm deploy` — chỉ `pnpm test`, `pnpm typecheck`, `pnpm lint`, `wrangler d1 ...`.
2. **TDD bắt buộc:** mỗi task viết test fail → chạy verify thấy fail → implement → verify pass → commit (conventional commit: `feat(sync): ...`). Cấm placeholder: không TBD/TODO, không "xử lý sau".
3. **API route test gọi handler trực tiếp** theo pattern `app-next/src/app/api/v1/shadowing/__tests__/progress.test.ts`: `vi.mock("@/lib/auth")` + `vi.mock("@/lib/db")`, dựng `Request` cast thành `NextRequest`, import handler từ `route.ts`. KHÔNG start server trong unit test.
4. **Merge rules bất biến (Wave 5/6 phụ thuộc):** (a) counter (`reviewCount`, `xp`, `correct`, `knownCount`) lấy **max** hai phía; (b) `modes` map merge **per-key max**; (c) trường còn lại (`status`, `dueAt`, `lastReviewedAt`, toàn bộ row `studyDay` ngoài counter) lấy của bản có **`updatedAt` lớn hơn**; (d) tombstone `deletedAt` thắng nếu bản ghi còn lại không có tombstone và `updatedAt` của nó **≤** thời điểm xóa — chỉ một ghi mới hơn **sau** lúc xóa mới hồi sinh; (e) purge cứng tombstone sau 90 ngày.
5. **Clock:** mọi `updatedAt`/`deletedAt` là **epoch ms do client sinh** (số nguyên, không phải ISO string, không phải unixepoch giây của D1). Server tin client-side clock, chỉ dùng để so sánh. Cột `study_day.updated_at`… là `integer` ms — KHÔNG dùng `mode: "timestamp"`.
6. **Migration qua wrangler, không drizzle-kit migrate:** sinh SQL bằng `pnpm drizzle-kit generate`, áp bằng `wrangler d1 migrations apply hsk-dev --local` (dev) / `--remote` (dev remote). Prod DB `hsk --remote` chỉ áp lúc deploy — ngoài plan này. Không sửa migration cũ 0000–0004; không seed thêm dữ liệu progress (bảng mới rỗng, dữ liệu đến từ sync).
7. **Không đụng:** `src/lib/stats/review.ts` (thuật toán SRS — Wave 5), `src/lib/notebook/*`, `src/lib/shadowing/*` (pattern giữ nguyên), `src/content/**`.
8. Làm việc từ thư mục `app-next/` cho mọi lệnh pnpm/wrangler.

---

## Task 1: Schema D1 3 bảng progress + Migration 0005 (W4.1)

**Files:**
- Modify: `app-next/src/lib/db/schema.ts` (thêm 3 bảng ở cuối file, sau `contentShadowingSubtitles`)
- Create: `app-next/drizzle/0005_hybrid_store_sync.sql` (sinh bởi `drizzle-kit generate`, KHÔNG viết tay) + `app-next/drizzle/meta/_journal.json`, `app-next/drizzle/meta/0005_snapshot.json` (sinh tự động)

**Interfaces:**
- Consumes: `sqliteTable`/`primaryKey`/`uniqueIndex` từ drizzle-orm (đã import sẵn trong schema.ts).
- Produces (tên cột SQL — Wave 5/6 đối chiếu):
  - `srs_cards(user_id TEXT NOT NULL FK→user.id, key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new' ∈ {new,learning,learned,known}, due_at INTEGER NULL, review_count INTEGER NOT NULL DEFAULT 0, last_reviewed_at INTEGER NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER NULL)` + `UNIQUE(user_id, key)`
  - `study_day(user_id TEXT NOT NULL FK, date TEXT NOT NULL (YYYY-MM-DD Asia/Ho_Chi_Minh), xp INTEGER NOT NULL DEFAULT 0, correct INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)` + `PK(user_id, date)`
  - `lesson_progress(user_id TEXT NOT NULL FK, book TEXT NOT NULL, lesson TEXT NOT NULL, modes TEXT NOT NULL DEFAULT '{}' (JSON object), known_count INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL, deleted_at INTEGER NULL)` + `PK(user_id, book, lesson)`

**Steps:**
- [ ] Thêm vào cuối `app-next/src/lib/db/schema.ts` (epoch ms là số nguyên thường, không `mode: "timestamp"` — see Global Constraint 5):

  ```ts
  /* ================= HybridStore sync (spec 2026-10-24 Wave 4) =================
     localStorage-first: client ghi local + debounce POST /api/v1/sync; server chỉ
     lưu + merge. updatedAt/deletedAt là EPOCH MS do client sinh (so sánh clock
    Conflict: counter max, modes per-key max, còn lại bản updatedAt lớn hơn thắng;
     tombstone deleted_at giữ 90 ngày rồi purge (route sync tự dọn). */

  export const srsCards = sqliteTable(
    "srs_cards",
    {
      userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
      key: text("key").notNull(), // SRS item key, vd "hsk1.u1.3"
      status: text("status", { enum: ["new", "learning", "learned", "known"] }).notNull().default("new"),
      dueAt: integer("due_at"), // epoch ms
      reviewCount: integer("review_count").notNull().default(0),
      lastReviewedAt: integer("last_reviewed_at"), // epoch ms
      updatedAt: integer("updated_at").notNull(), // epoch ms — client clock
      deletedAt: integer("deleted_at"), // tombstone epoch ms
    },
    (t) => [uniqueIndex("srs_cards_user_key_uq").on(t.userId, t.key)]
  );

  export const studyDay = sqliteTable(
    "study_day",
    {
      userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
      date: text("date").notNull(), // YYYY-MM-DD theo Asia/Ho_Chi_Minh (vnDayString)
      xp: integer("xp").notNull().default(0),
      correct: integer("correct").notNull().default(0), // Wave 5 ghi vào
      updatedAt: integer("updated_at").notNull(),
    },
    (t) => [primaryKey({ columns: [t.userId, t.date] })]
  );

  export const lessonProgress = sqliteTable(
    "lesson_progress",
    {
      userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
      book: text("book").notNull(), // hsk1..hsk5 hoặc levelId roadmap
      lesson: text("lesson").notNull(), // pageId hoặc stationId
      modes: text("modes", { mode: "json" })
        .$type<Record<string, number>>()
        .notNull()
        .default(sql`'{}'`),
      knownCount: integer("known_count").notNull().default(0),
      updatedAt: integer("updated_at").notNull(),
      deletedAt: integer("deleted_at"),
    },
    (t) => [primaryKey({ columns: [t.userId, t.book, t.lesson] })]
  );
  ```

- [ ] Sinh migration: `cd app-next && pnpm drizzle-kit generate`. Verify file `drizzle/0005_*.sql` sinh ra chứa đúng 3 `CREATE TABLE` + 1 `CREATE UNIQUE INDEX srs_cards_user_key_uq` (2 bảng còn lại dùng composite PK, không index riêng).
- [ ] Verify migration áp sạch local: `pnpm wrangler d1 migrations apply hsk-dev --local` (xem `--local` là DB dev cục bộ; output phải báo áp 1 migration, không lỗi). Sau đó:
  ```bash
  pnpm wrangler d1 execute hsk-dev --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('srs_cards','study_day','lesson_progress')"
  ```
  → phải liệt kê đủ 3 tên.
- [ ] `pnpm typecheck && pnpm test` — xanh (không test mới ở task này; schema là declaration).
- [ ] Commit: `feat(db): add srs_cards, study_day, lesson_progress tables (migration 0005)`.

---

## Task 2: Module merge thuần `sync-merge.ts` (W4.2/W4.3 — luật dùng chung client + server)

**Files:**
- Create: `app-next/src/lib/store/sync-merge.ts`
- Test: `app-next/src/lib/store/__tests__/sync-merge.test.ts`

**Interfaces:**
- Consumes: type `SrsStatus` từ `@/lib/stats/review` (re-export qua `progress-store`, nhưng module này KHÔNG import progress-store — chỉ định nghĩa type riêng để dùng được trên server).
- Produces:
  ```ts
  export type SyncSrsRecord = {
    key: string; status: "new" | "learning" | "learned" | "known";
    dueAt: number | null; reviewCount: number; lastReviewedAt: number | null;
    updatedAt: number; deletedAt: number | null;
  };
  export type SyncStudyDayRecord = { date: string; xp: number; correct: number; updatedAt: number };
  export type SyncLessonRecord = {
    book: string; lesson: string; modes: Record<string, number>;
    knownCount: number; updatedAt: number; deletedAt: number | null;
  };
  export type SyncPayload = { srs: SyncSrsRecord[]; studyDay: SyncStudyDayRecord[]; lessonProgress: SyncLessonRecord[] };
  export function mergeSrs(a: SyncSrsRecord, b: SyncSrsRecord): SyncSrsRecord;
  export function mergeStudyDay(a: SyncStudyDayRecord, b: SyncStudyDayRecord): SyncStudyDayRecord;
  export function mergeLesson(a: SyncLessonRecord, b: SyncLessonRecord): SyncLessonRecord;
  ```

**Steps:**
- [ ] Viết trước `src/lib/store/__tests__/sync-merge.test.ts` với ít nhất các case:
  - `mergeSrs`: bản `updatedAt` lớn hơn thắng `status`/`dueAt`/`lastReviewedAt`; `reviewCount` = max cả hai; tombstone thắng bản sống khi `deletedAt <= updatedAt` của bản sống; bản ghi `updatedAt` mới hơn **sau** tombstone hồi sinh (`deletedAt: null`); input không bị mutate.
  - `mergeStudyDay`: `xp`/`correct` lấy max, `updatedAt` lấy max.
  - `mergeLesson`: `modes` merge per-key max (`{a:1} + {a:3,b:2} → {a:3,b:2}`), `knownCount` max, tombstone như `mergeSrs`.
  - Tính xác định: `mergeSrs(a, b)` deep-equal `mergeSrs(b, a)` với cùng bộ dữ liệu.
- [ ] Chạy `pnpm vitest run src/lib/store/__tests__/sync-merge.test.ts` → FAIL (module chưa tồn tại).
- [ ] Implement `src/lib/store/sync-merge.ts` (thuần, không I/O, không import progress-store):

  ```ts
  /* Luật merge HybridStore (spec 2026-10-24, nguyên tắc 1) — dùng chung client
     (hybrid-store) và server (route /api/v1/sync). Thuần: không I/O, không mutate input.
     - Counter (reviewCount/xp/correct/knownCount): max.
     - modes: per-key max.
     - Trường còn lại: của bản có updatedAt lớn hơn.
     - Tombstone: thắng bản sống khi deletedAt <= updatedAt của bản sống; chỉ ghi
       có updatedAt > updatedAt của bản tombstone mới hồi sinh (deletedAt: null). */

  export type SrsSyncStatus = "new" | "learning" | "learned" | "known";

  export type SyncSrsRecord = {
    key: string;
    status: SrsSyncStatus;
    dueAt: number | null;
    reviewCount: number;
    lastReviewedAt: number | null;
    updatedAt: number;
    deletedAt: number | null;
  };

  export type SyncStudyDayRecord = { date: string; xp: number; correct: number; updatedAt: number };

  export type SyncLessonRecord = {
    book: string;
    lesson: string;
    modes: Record<string, number>;
    knownCount: number;
    updatedAt: number;
    deletedAt: number | null;
  };

  export type SyncPayload = {
    srs: SyncSrsRecord[];
    studyDay: SyncStudyDayRecord[];
    lessonProgress: SyncLessonRecord[];
  };

  /** Tombstone thắng bản sống khi xóa xảy ra tại/sau lần ghi cuối của bản sống. */
  function resolveTombstone(
    winner: { updatedAt: number; deletedAt: number | null },
    loser: { updatedAt: number; deletedAt: number | null }
  ): number | null {
    if (winner.deletedAt != null) return winner.deletedAt;
    if (loser.deletedAt != null && loser.deletedAt <= winner.updatedAt) return loser.deletedAt;
    return null;
  }

  export function mergeSrs(a: SyncSrsRecord, b: SyncSrsRecord): SyncSrsRecord {
    const winner = a.updatedAt >= b.updatedAt ? a : b;
    const loser = a.updatedAt >= b.updatedAt ? b : a;
    return {
      key: winner.key,
      status: winner.status,
      dueAt: winner.dueAt,
      reviewCount: Math.max(a.reviewCount, b.reviewCount),
      lastReviewedAt: winner.lastReviewedAt,
      updatedAt: Math.max(a.updatedAt, b.updatedAt),
      deletedAt: resolveTombstone(winner, loser),
    };
  }

  export function mergeStudyDay(a: SyncStudyDayRecord, b: SyncStudyDayRecord): SyncStudyDayRecord {
    return {
      date: a.date,
      xp: Math.max(a.xp, b.xp),
      correct: Math.max(a.correct, b.correct),
      updatedAt: Math.max(a.updatedAt, b.updatedAt),
    };
  }

  export function mergeLesson(a: SyncLessonRecord, b: SyncLessonRecord): SyncLessonRecord {
    const winner = a.updatedAt >= b.updatedAt ? a : b;
    const loser = a.updatedAt >= b.updatedAt ? b : a;
    const modes: Record<string, number> = { ...a.modes };
    for (const [k, v] of Object.entries(b.modes)) modes[k] = Math.max(modes[k] ?? 0, v);
    return {
      book: winner.book,
      lesson: winner.lesson,
      modes,
      knownCount: Math.max(a.knownCount, b.knownCount),
      updatedAt: Math.max(a.updatedAt, b.updatedAt),
      deletedAt: resolveTombstone(winner, loser),
    };
  }
  ```

- [ ] `pnpm vitest run src/lib/store/__tests__/sync-merge.test.ts` → PASS. `pnpm typecheck` → sạch.
- [ ] Commit: `feat(store): pure sync merge rules (max counters, updatedAt conflict, tombstones)`.

---

## Task 3: API `POST /api/v1/sync` (W4.3)

**Files:**
- Create: `app-next/src/app/api/v1/sync/route.ts`
- Test: `app-next/src/app/api/v1/sync/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `getAuth` (`src/lib/auth.ts`), `createDb` (`src/lib/db`), `srsCards`/`studyDay`/`lessonProgress` (schema Task 1), merge functions (Task 2), zod.
- Produces (chốt cho Wave 5/6):
  - `POST /api/v1/sync` — auth bắt buộc (401 nếu không session, như route shadowing). Body zod:
    ```ts
    const bodySchema = z.object({
      srs: z.array(z.object({
        key: z.string().min(1).max(200),
        status: z.enum(["new", "learning", "learned", "known"]),
        dueAt: z.number().int().nullable(),
        reviewCount: z.number().int().min(0),
        lastReviewedAt: z.number().int().nullable(),
        updatedAt: z.number().int().positive(),
        deletedAt: z.number().int().nullable(),
      })).max(500).default([]),
      studyDay: z.array(z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        xp: z.number().int().min(0),
        correct: z.number().int().min(0),
        updatedAt: z.number().int().positive(),
      })).max(500).default([]),
      lessonProgress: z.array(z.object({
        book: z.string().min(1).max(100),
        lesson: z.string().min(1).max(200),
        modes: z.record(z.string(), z.number().int().min(0)).default({}),
        knownCount: z.number().int().min(0),
        updatedAt: z.number().int().positive(),
        deletedAt: z.number().int().nullable(),
      })).max(500).default([]),
    });
    ```
  - Merge server-side: SELECT toàn bộ row của user theo từng domain → `mergeSrs/mergeStudyDay/mergeLesson(existing, incoming)` từng cặp (incoming không có existing thì lấy nguyên incoming) → multi-row `insert().values(rows).onConflictDoUpdate()`:
    - `srs_cards` target `[srsCards.userId, srsCards.key]`
    - `study_day` target `[studyDay.userId, studyDay.date]`
    - `lesson_progress` target `[lessonProgress.userId, lessonProgress.book, lessonProgress.lesson]`
  - Purge tombstone: trước khi trả response, `DELETE FROM srs_cards WHERE user_id = ? AND deleted_at IS NOT NULL AND deleted_at < now - 90*24*3600*1000` (tương tự `lesson_progress`). `study_day` không có tombstone.
  - Response 200:
    ```json
    { "serverTime": 1761200000000, "srs": [ /* SyncSrsRecord[] — TOÀN BỘ state server của user */ ], "studyDay": [ /* SyncStudyDayRecord[] */ ], "lessonProgress": [ /* SyncLessonRecord[] */ ] }
    ```
    (`serverTime` = `Date.now()` server, client chỉ dùng để log/offset.)

**Steps:**
- [ ] Viết test `src/app/api/v1/sync/__tests__/route.test.ts` theo đúng pattern `src/app/api/v1/shadowing/__tests__/progress.test.ts` (mock `@/lib/auth` + `@/lib/db`, dựng `Request` cast `NextRequest`, import `POST` từ `../route`). Case bắt buộc:
  1. 401 khi `getSession` trả null.
  2. 400 khi body sai schema (`studyDay[0].date = "2026/10/24"`, hoặc `srs[0].key = ""`).
  3. Merge đúng: existing `srs` server `{ key:"k1", reviewCount: 3, updatedAt: 100 }` + incoming `{ key:"k1", reviewCount: 5, updatedAt: 200 }` → `values` nhận `reviewCount: 5`, `updatedAt: 200`; assert qua `insertChain.values.mock.calls`.
  4. Row mới (server chưa có) upsert nguyên incoming.
  5. Response chứa state server sau merge (mock `selectChain.where` cho lần select thứ hai trả rows đã merge).
  6. Có `deletedAt` quá 90 ngày → assert `deleteChain.where` được gọi (mock `createDb().delete`).
  Cấu trúc mock db: `select()` trả chain mới mỗi lần gọi (dùng `mockReturnValue` theo hàng đợi — `where` lần 1 = existing, lần 2 = final state) vì route select 3 domain + select lại sau upsert.
- [ ] Chạy `pnpm vitest run src/app/api/v1/sync` → FAIL.
- [ ] Implement `src/app/api/v1/sync/route.ts`:

  ```ts
  import type { NextRequest } from "next/server";
  import { NextResponse } from "next/server";
  import { eq, lt, and, isNotNull } from "drizzle-orm";
  import { getAuth } from "@/lib/auth";
  import { createDb } from "@/lib/db";
  import { srsCards, studyDay, lessonProgress } from "@/lib/db/schema";
  import {
    mergeSrs, mergeStudyDay, mergeLesson,
    type SyncSrsRecord, type SyncStudyDayRecord, type SyncLessonRecord,
  } from "@/lib/store/sync-merge";
  import { bodySchema } from "./schema"; // nếu giữ zod inline thì bỏ dòng này — xem bước dưới
  ```

  (Quyết định cuối: **zod inline trong route.ts**, không tách file — bỏ dòng import `bodySchema` ở trên.) Logic chính:

  ```ts
  export async function POST(req: NextRequest) {
    const session = await getAuth().api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const body = parsed.data;
    const db = createDb();
    const userId = session.user.id;
    const now = Date.now();

    // 1) SRS
    const [existingSrs] = [await db.select().from(srsCards).where(eq(srsCards.userId, userId))];
    const srsMap = new Map(existingSrs.map((r) => [r.key, r]));
    const mergedSrs: SyncSrsRecord[] = body.srs.map((inc) => {
      const ex = srsMap.get(inc.key);
      const serverRec: SyncSrsRecord = ex
        ? { key: ex.key, status: ex.status, dueAt: ex.dueAt, reviewCount: ex.reviewCount,
            lastReviewedAt: ex.lastReviewedAt, updatedAt: ex.updatedAt, deletedAt: ex.deletedAt }
        : { ...inc };
      return ex ? mergeSrs(serverRec, inc) : inc;
    });
    if (mergedSrs.length) {
      await db.insert(srsCards).values(
        mergedSrs.map((r) => ({ userId, key: r.key, status: r.status, dueAt: r.dueAt,
          reviewCount: r.reviewCount, lastReviewedAt: r.lastReviewedAt,
          updatedAt: r.updatedAt, deletedAt: r.deletedAt }))
      ).onConflictDoUpdate({
        target: [srsCards.userId, srsCards.key],
        set: { /* set từng cột trừ user_id/key: xem ghi chú */ },
      });
    }
    // 2) studyDay + 3) lessonProgress: cùng cấu trúc (map theo date / book+lesson,
    //    onConflictDoUpdate target composite PK).
    // 4) Purge tombstone >90 ngày:
    await db.delete(srsCards).where(and(
      eq(srsCards.userId, userId), isNotNull(srsCards.deletedAt), lt(srsCards.deletedAt, now - 90 * 24 * 3600 * 1000)));
    await db.delete(lessonProgress).where(and(
      eq(lessonProgress.userId, userId), isNotNull(lessonProgress.deletedAt), lt(lessonProgress.deletedAt, now - 90 * 24 * 3600 * 1000)));
    // 5) Trả về toàn bộ state server của user sau merge (select lại 3 domain).
    const finalSrs = await db.select().from(srsCards).where(eq(srsCards.userId, userId));
    // ... map row DB → SyncSrsRecord (snake→camel), trả kèm studyDay/lessonProgress.
    return NextResponse.json({ serverTime: now, srs: ..., studyDay: ..., lessonProgress: ... });
  }
  ```

  **Ghi chú bắt buộc cho `onConflictDoUpdate.set`:** drizzle không cho set tham chiếu giá trị excluded theo kiểu object đơn giản như merge cột max — với counter max phải dùng `sql\`max(${srsCards.reviewCount}, excluded.review_count)\``. Cụ thể `srs_cards.set`:
  ```ts
  set: {
    status: sql`excluded.status`,
    dueAt: sql`excluded.due_at`,
    reviewCount: sql`max(${srsCards.reviewCount}, excluded.review_count)`,
    lastReviewedAt: sql`excluded.last_reviewed_at`,
    updatedAt: sql`max(${srsCards.updatedAt}, excluded.updated_at)`,
    deletedAt: sql`excluded.deleted_at`,
  }
  ```
  (`study_day.set`: `xp: sql\`max(...)\``, `correct: sql\`max(...)\``, `updatedAt: sql\`max(...)\``; `lesson_progress.set`: `modes: sql\`excluded.modes\``, `knownCount: sql\`max(...)\``, `updatedAt/deletedAt` tương tự.) Vì merge đã tính sẵn giá trị cuối ở bước map, dùng `sql\`excluded.xxx\`` thuần cho mọi cột cũng đúng — **chọn phương án excluded thuần** để route và merge function không trùng logic; giữ `max()` chỉ khi muốn phòng thủ 2 request đồng thời. Chốt: dùng `excluded.*` thuần (merge đã xử lý xung đột).

- [ ] `pnpm vitest run src/app/api/v1/sync` → PASS. `pnpm typecheck` → sạch.
- [ ] Commit: `feat(api): POST /api/v1/sync batch upsert with server-side merge`.

---

## Task 4: HybridStore client — dirty set, debounce 5s, merge-push login (W4.2)

**Files:**
- Create: `app-next/src/lib/store/hybrid-store.ts`
- Test: `app-next/src/lib/store/__tests__/hybrid-store.test.ts`

**Interfaces:**
- Consumes: `progressStore` singleton + `ProgressStoreApi` (`src/lib/store/progress-store.ts`), merge functions (Task 2), `useSession`/`authClient` (`src/lib/auth-client.ts`), `SyncPayload` types.
- Produces (API HybridStore — Wave 5/6 gọi vào đây):
  ```ts
  export type SyncDomain = "srs" | "studyDay" | "lessonProgress";
  /** Patch các method mutate của progressStore singleton + đăng ký session watcher.
      Idempotent (gọi nhiều lần vẫn 1 lần). Trả về cleanup cho test. */
  export function initHybridStore(): () => void;
  /** Đánh dirty thủ công (dùng khi code ngoài ProgressStore đổi data, ví dụ Wave 5). */
  export function hybridMarkDirty(domain: SyncDomain): void;
  /** Flush ngay toàn bộ dirty domain (dùng trước beforeunload / khi login). */
  export function hybridSyncNow(): Promise<void>;
  /** Merge-push 2 chiều lần đầu đăng nhập: POST toàn bộ local state (kể cả không dirty)
      → response server merge ngược vào local. Gọi 1 lần per lần login. */
  export function hybridMergeOnLogin(): Promise<void>;
  ```
  Key localStorage mới (do hybrid-store quản lý):
  - `bye.sync.tombstones` = `JSON { srs: Record<key, deletedAtMs>, lessonProgress: Record<"book/lesson", deletedAtMs> }`
  - `bye.sync.dirty` = `JSON { srs?: 1, studyDay?: 1, lessonProgress?: 1 }` (persist để reload trang không mất dirty)

**Steps:**
- [ ] Viết test `src/lib/store/__tests__/hybrid-store.test.ts` (jsdom localStorage + `vi.useFakeTimers()`, mock `fetch` global và mock `@/lib/auth-client` để giả lập `authClient.useSession` — dùng pattern `useSession` mock như `login-gate.test.tsx` nếu cần RTL; phần logic thuần thì test trực tiếp). Case bắt buộc:
  1. Sau `initHybridStore()`, gọi `progressStore.addXp(5)` → `bye.sync.dirty` chứa `studyDay`; sau `vi.advanceTimersByTime(4999)` chưa fetch; qua 5000ms → `fetch` gọi đúng `/api/v1/sync` POST.
  2. `toggleSrs("hsk1.a.1")` → dirty `srs`; toggle lần nữa (bỏ thẻ) → tombstone ghi vào `bye.sync.tombstones.srs["hsk1.a.1"]`, payload srs record cho key đó mang `deletedAt`.
  3. Payload compute đúng: `xp` lấy từ `bye.heat` (per-day map của `getHeat()`), srs từ `getAllSrs()`, lesson từ `listPageDone()` + `getStationProgress()`; `correct: 0` (Wave 5 mới ghi).
  4. Response server merge ngược: mock fetch trả srs record `updatedAt` lớn hơn local → local `bye.srs.items` cập nhật theo server; record server có `deletedAt` mới hơn → key bị xóa khỏi local + ghi tombstone.
  5. Guest (session null): dirty tích tụ nhưng **không bao giờ** fetch, kể cả advance 1 phút.
  6. Login transition (session null → user): `hybridMergeOnLogin` POST **toàn bộ** local state (kể cả domain không dirty) rồi clear dirty; fetch fail → dirty giữ nguyên, không crash.
  7. Debounce gom đợt: 5 lần mutate liên tiếp trong 1s → chỉ 1 fetch sau 5s.
- [ ] Chạy `pnpm vitest run src/lib/store/__tests__/hybrid-store.test.ts` → FAIL.
- [ ] Implement `src/lib/store/hybrid-store.ts`. Khung bắt buộc (điền đủ theo test — KHÔNG lược bớt nhánh lỗi):

  ```ts
  "use client";
  /* HybridStore — bọc ProgressStore (spec 2026-10-24 Wave 4). localStorage-first:
     mọi ghi vẫn vào ProgressStore ngay; module này patch các method mutate trên
     singleton progressStore (own-property shadow prototype) để đánh dirty + debounce
     5s POST /api/v1/sync. Guest thuần local (dirty tích tụ, không fetch). Login lần
     đầu: merge-push 2 chiều. Response merge ngược bằng luật sync-merge (số max,
     timestamp theo updatedAt, tombstone deleted_at). */

  import { authClient } from "@/lib/auth-client";
  import { progressStore } from "./progress-store";
  import { mergeSrs, mergeStudyDay, mergeLesson,
    type SyncPayload, type SyncSrsRecord, type SyncStudyDayRecord, type SyncLessonRecord } from "./sync-merge";

  export type SyncDomain = "srs" | "studyDay" | "lessonProgress";
  const DIRTY_KEY = "bye.sync.dirty";
  const TOMBSTONE_KEY = "bye.sync.tombstones";
  const DEBOUNCE_MS = 5000;
  const TOMBSTONE_TTL_MS = 90 * 24 * 3600 * 1000;

  /* Method → domain: chỉ những method ghi data thuộc 3 bảng sync. setWordNote/
     toggleWordStar... nằm ngoài phạm vi Wave 4 (wordMeta chưa có bảng) — KHÔNG patch. */
  const PATCHES: Array<[keyof typeof progressStore, SyncDomain]> = [
    ["toggleSrs", "srs"], ["addSrsBatch", "srs"], ["recordReview", "srs"], ["migrateLegacySrs", "srs"],
    ["addXp", "studyDay"],
    ["markPageDone", "lessonProgress"], ["setStationProgress", "lessonProgress"],
  ];

  let inited = false;
  const dirty = new Set<SyncDomain>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let loggedIn = false;

  function markDirty(d: SyncDomain) { dirty.add(d); persistDirty(); schedule(); }
  function schedule() {
    if (!loggedIn || dirty.size === 0) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; void flush(); }, DEBOUNCE_MS);
  }

  /* ---- snapshot local → payload (chỉ domain dirty) ---- */
  function computePayload(): SyncPayload {
    const tombs = readTombstones();
    const srs: SyncSrsRecord[] = dirty.has("srs")
      ? progressStore.getAllSrs().map((it) => ({
          key: it.key, status: it.status, dueAt: it.dueAt, reviewCount: it.reviewCount,
          lastReviewedAt: it.lastReviewedAt, updatedAt: it.updatedAt,
          deletedAt: tombs.srs[it.key] ?? null,
        })).concat(Object.entries(tombs.srs).filter(([k]) => !progressStore.getSrs(k)).map(([key, deletedAt]) =>
          // item đã xóa local (không còn trong getAllSrs) — gửi tombstone đứng yên
          { key, status: "new", dueAt: null, reviewCount: 0, lastReviewedAt: null, updatedAt: deletedAt, deletedAt }
        ))
      : [];
    const studyDay: SyncStudyDayRecord[] = dirty.has("studyDay")
      ? Object.entries(progressStore.getHeat() ?? {}).map(([date, xp]) => ({ date, xp, correct: 0, updatedAt: Date.now() }))
      : [];
    const lessonProgress: SyncLessonRecord[] = [];
    if (dirty.has("lessonProgress")) {
      for (const bp of progressStore.listPageDone()) {
        const [book, lesson] = bp.split("/");
        lessonProgress.push({ book, lesson, modes: {}, knownCount: countKnown(book, lesson), updatedAt: Date.now(), deletedAt: null });
      }
      // station progress: mỗi (levelId, stationId) → 1 row, modes = { pct, stars }
      // (đọc trực tiếp localStorage "bye.roadmap.stations.v1" — progressStore chỉ expose theo levelId;
      //  liệt kê levelId từ Object.keys của JSON)
      const all = readJSON<Record<string, Record<string, { pct: number; stars: 0 | 1 | 2 | 3 }>>>("bye.roadmap.stations.v1", {});
      for (const [book, stations] of Object.entries(all)) {
        for (const [lesson, rec] of Object.entries(stations)) {
          lessonProgress.push({ book, lesson, modes: { pct: rec.pct, stars: rec.stars }, knownCount: 0, updatedAt: Date.now(), deletedAt: tombs.lessonProgress[`${book}/${lesson}`] ?? null });
        }
      }
    }
    return { srs, studyDay, lessonProgress };
  }

  async function flush(): Promise<void> {
    if (!loggedIn || dirty.size === 0) return;
    const domains = [...dirty];
    const payload = computePayload();
    try {
      const res = await fetch("/api/v1/sync", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(payload), keepalive: true,
      });
      if (!res.ok) throw new Error(String(res.status));
      const server = (await res.json()) as SyncPayload & { serverTime: number };
      applyServerPayload(server);
      for (const d of domains) dirty.delete(d);
      persistDirty();
    } catch {
      schedule(); // giữ dirty, thử lại sau 5s nữa
    }
  }

  /* ---- merge ngược server → local (ghi TRỰC TIẾP localStorage, KHÔNG qua
         method patched để không tái đánh dirty vòng lặp) ---- */
  function applyServerPayload(server: SyncPayload): void { /* merge từng domain bằng mergeSrs/... so với local, ghi bye.srs.items / bye.heat / bye.pageDone / bye.roadmap.stations.v1, tombstone mới hơn → xóa local item + ghi tombstone */ }

  export function initHybridStore(): () => void {
    if (inited) return () => {};
    inited = true;
    for (const [method, domain] of PATCHES) {
      const original = (progressStore[method] as (...a: unknown[]) => unknown).bind(progressStore);
      (progressStore as Record<string, unknown>)[method] = (...args: unknown[]) => {
        const out = original(...args);
        if (method === "toggleSrs" && !(progressStore as unknown as { getSrs(k: string): unknown }).getSrs(args[0] as string)) {
          recordTombstone("srs", args[0] as string); // toggle OFF → tombstone
        }
        markDirty(domain);
        return out;
      };
    }
    restoreDirty();
    // session watcher: authClient.useSession là hook — dùng $session signal hoặc
    // authClient.getSession() poll nhẹ sau mỗi flush fail; chuẩn nhất: đăng ký qua
    // useSession trong provider (Task 5) gọi hybridOnAuthChange(loggedIn: boolean).
    return () => {};
  }

  /** Provider (Task 5) gọi mỗi khi state session đổi. */
  export function hybridOnAuthChange(nextLoggedIn: boolean): void {
    if (nextLoggedIn && !loggedIn) { loggedIn = true; void hybridMergeOnLogin(); }
    else if (!nextLoggedIn) { loggedIn = false; if (timer) { clearTimeout(timer); timer = null; } }
    else loggedIn = nextLoggedIn;
  }

  export async function hybridMergeOnLogin(): Promise<void> {
    dirty.add("srs"); dirty.add("studyDay"); dirty.add("lessonProgress"); // push toàn bộ 2 chiều
    await flush();
  }
  export function hybridMarkDirty(d: SyncDomain): void { markDirty(d); }
  export function hybridSyncNow(): Promise<void> { return flush(); }
  ```

  Lưu ý implement: `readJSON`/`writeJSON` viết cục bộ trong file (copy pattern `progress-store.ts` với try/catch); `countKnown(book, lesson)` đếm `getAllSrs()` có `key` bắt đầu `${book}.${lesson}.` và `status === "known"`. `beforeunload`/`visibilitychange` → `void hybridSyncNow()` (đăng ký trong `initHybridStore`, dọn trong cleanup).
- [ ] `pnpm vitest run src/lib/store/__tests__/hybrid-store.test.ts` → PASS. `pnpm typecheck` → sạch. `pnpm vitest run` toàn repo → không test cũ nào vỡ (patch không đổi hành vi local).
- [ ] Commit: `feat(store): hybrid-store dirty tracking + debounced sync + login merge-push`.

---

## Task 5: Mount HybridStore vào app (provider + auth change hook)

**Files:**
- Create: `app-next/src/components/shell/hybrid-sync-provider.tsx`
- Modify: `app-next/src/app/layout.tsx` (mount provider bên trong `LoginProvider`, cạnh `ToastProvider` — line ~41–55)

**Interfaces:**
- Consumes: `initHybridStore`, `hybridOnAuthChange` (Task 4); `useSession` (`src/lib/use-session.ts`).
- Produces: component `<HybridSyncProvider />` (không render UI, chỉ effect) — mọi trang client tự hưởng sync, không cần gọi gì.

**Steps:**
- [ ] Viết component:

  ```tsx
  "use client";
  /* Mount 1 lần ở root layout: kích hoạt HybridStore và đẩy trạng thái session
     vào máy sync (login → merge-push 2 chiều; logout → ngừng flush). */
  import { useEffect } from "react";
  import { useSession } from "@/lib/use-session";
  import { initHybridStore, hybridOnAuthChange } from "@/lib/store/hybrid-store";

  export function HybridSyncProvider() {
    const { loggedIn, isPending } = useSession();
    useEffect(() => { return initHybridStore(); }, []);
    useEffect(() => { if (!isPending) hybridOnAuthChange(loggedIn); }, [loggedIn, isPending]);
    return null;
  }
  ```

  Thêm `<HybridSyncProvider />` vào `src/app/layout.tsx` ngay sau `<LoginProvider>` mở (trước `{children}`), import ở đầu file.
- [ ] Thêm test RTL nhỏ `src/components/shell/__tests__/hybrid-sync-provider.test.tsx`: mock `@/lib/store/hybrid-store` (vi.fn cho 2 hàm), mock `@/lib/use-session`; assert `initHybridStore` gọi 1 lần (StrictMode-safe) và `hybridOnAuthChange(true)` được gọi khi session đổi sang logged-in, không gọi khi `isPending`.
- [ ] `pnpm vitest run src/components/shell && pnpm typecheck` → PASS. `pnpm test` toàn repo xanh.
- [ ] Commit: `feat(app): mount HybridSyncProvider to root layout`.

---

## Task 6: Server-side gate thật cho /my-vocab, /my-grammar, /progress (W4.4)

**Files:**
- Modify: `app-next/src/app/(wide)/my-vocab/page.tsx` (toàn file, hiện 16 dòng)
- Modify: `app-next/src/app/(wide)/my-grammar/page.tsx` (toàn file, hiện 12 dòng)
- Modify: `app-next/src/app/(app)/progress/page.tsx` (toàn file, hiện 9 dòng)
- Modify: `app-next/src/components/shell/login-modal.tsx` (thêm effect đọc `?login=1` — chỉ phần đăng ký auto-open, giữ nguyên phần còn lại)
- Test: modify `app-next/src/components/personal/__tests__/login-gate.test.tsx` nếu e2e/unit gate phụ thuộc; check `app-next/e2e/personal-tools.spec.ts` các case gate
- Modify: `app-next/src/components/personal/login-gate.tsx` — KHÔNG xóa (notebook vẫn dùng), chỉ thêm comment ghi rõ 3 route đã chuyển server gate

**Interfaces:**
- Consumes: `getAuth` (`src/lib/auth.ts`), `headers` từ `next/headers`, `redirect` từ `next/navigation`, `useLoginModal`/`openLogin` hiện có của login-modal.
- Produces: 3 page là async server component; không session → `redirect("/?login=1")`; có session → render client root như cũ. URL `/?login=1` → LoginModal tự mở (UX thay cho Card lock client cũ).

**Steps:**
- [ ] Viết mới 3 page, cùng mẫu (thay phần root tương ứng):

  ```tsx
  // src/app/(wide)/my-vocab/page.tsx
  /* W4.4 — server gate thật: check session ở server component, bỏ LoginGate
     client-only làm outer gate (spec 2026-10-24 Wave 4). */
  import type { Metadata } from "next";
  import { headers } from "next/headers";
  import { redirect } from "next/navigation";
  import { getAuth } from "@/lib/auth";
  import MyVocabRoot from "@/components/my-vocab/my-vocab-root";

  export const metadata: Metadata = { title: "Sổ tay từ vựng" };

  export default async function MyVocabPage() {
    const session = await getAuth().api.getSession({ headers: await headers() });
    if (!session) redirect("/?login=1");
    return <MyVocabRoot />;
  }
  ```

  Tương tự `my-grammar/page.tsx` (`metadata` giữ "Sổ tay ngữ pháp", root `MyGrammarRoot`) và `progress/page.tsx` (metadata "Tiến độ học", root `ProgressClient` — import tương đối `./progress-client`).
- [ ] Auto-open modal: trong `src/components/shell/login-modal.tsx`, trong component Provider hiện có (nơi định nghĩa state `open` + `openLogin`), thêm:
  ```ts
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("login") === "1") openLogin();
    // chỉ chạy 1 lần khi mount — giữ URL sạch để reload không mở lại
  }, []);
  ```
  (chạy 1 lần duy nhất; đọc `window.location.search` chứ không dùng `useSearchParams` để tránh ép toàn layout dynamic).
- [ ] Verify unit: `pnpm typecheck`. Kiểm tra test/e2e gate cũ: chạy `pnpm test`; mở `e2e/personal-tools.spec.ts` (và `notebook.spec.ts`) — sửa các case vào 3 route khi chưa login từ "thấy Card Đăng nhập" → "bị redirect về / và modal mở" (Playwright: `await expect(page).toHaveURL(/\?login=1/)` + modal visible). KHÔNG chạy playwright ở bước này (chạy ở Task 7).
- [ ] `pnpm test` toàn repo → xanh. Commit: `feat(app): server-side auth gate for my-vocab, my-grammar, progress`.

---

## Task 7: E2E 2-session + migration remote sạch + verify tổng

**Files:**
- Create: `app-next/e2e/hybrid-sync.spec.ts`

**Interfaces:**
- Consumes: app dev server (Playwright config hiện có `playwright.config.ts`), 2 browser context độc lập, route `/api/v1/sync`.
- Produces: spec e2e chứng minh acceptance: guest học → login → session 2 thấy dữ liệu, không mất dữ liệu.

**Steps:**
- [ ] Viết `e2e/hybrid-sync.spec.ts`:
  1. **Context A (guest):** vào trang học (dùng route có `progressStore.addXp`, ví dụ `/` hoặc `/progress` nếu flow hiện có trong e2e khác — tái dùng helper của `e2e/learning-flow.spec.ts` nếu có), thực hiện hành động cộng XP + thêm SRS item. Đăng ký user (flow đăng nhập thật của app — google OAuth không chạy được e2e: dùng cơ chế test hiện có; nếu chỉ có OAuth, thêm credentials provider flags trong test như các spec auth hiện có; kiểm tra cách `e2e/notebook.spec.ts` giả lập đăng nhập và dùng lại nguyên si).
  2. Đợi >5s (debounce) hoặc đợi response `/api/v1/sync` (page.waitForResponse).
  3. **Context B:** đăng nhập cùng user → vào `/my-vocab` hoặc `/progress` thấy dữ liệu context A (assert số XP / item SRS khớp).
  4. Chỉnh data ở context B → context A reload thấy merge (max không mất mốc).
- [ ] Áp migration DB dev remote: `pnpm wrangler d1 migrations apply hsk-dev --remote` → sạch, không lỗi. Verify: `pnpm wrangler d1 execute hsk-dev --remote --command "SELECT name FROM sqlite_master WHERE name IN ('srs_cards','study_day','lesson_progress')"` → đủ 3.
- [ ] Chạy verify tổng: `pnpm test && pnpm typecheck && pnpm lint && pnpm test:e2e` → toàn xanh (e2e cần `pnpm dev` đang chạy theo config playwright hiện có).
- [ ] Kiểm thủ công 1 lần trên dev: `pnpm dev` → guest học → login → mở tab ẩn danh đăng nhập cùng user → dữ liệu hiện.
- [ ] Commit: `test(e2e): hybrid sync two-session no-data-loss scenario`.

---

## Self-review (đã check khi viết plan)

- **Interface Wave 5/6 phụ thuộc** chốt ở: Task 1 (tên cột 3 bảng), Task 2 (type `SyncSrsRecord`/`SyncStudyDayRecord`/`SyncLessonRecord` + 3 hàm merge), Task 3 (shape request/response `/api/v1/sync`), Task 4 (API `hybrid-store.ts` + key `bye.sync.*`). Wave 5 (`study_day.correct`, review logs) ghi qua `hybridMarkDirty("studyDay")` — không cần đổi bảng.
- **Mọi task có lệnh verify chạy được** (vitest/typecheck/wrangler d1 execute), test route theo đúng pattern mock `progress.test.ts`, không placeholder.
- **Rủi ro đã xử lý:** loop dirty (apply server ghi trực tiếp localStorage, không qua method patched); tombstone 2 chiều (local toggleSrs OFF ghi `bye.sync.tombstones`, server tombstone purge 90 ngày ở route); clock client (Constraint 5); payload cap 500/domain (zod `.max(500)`, phần dư giữ dirty — flush lần sau); StrictMode (init idempotent + provider test).
- **Đúng 2 pattern sync sẵn có:** guest local / login merge-push / fetch fail → fallback local + giữ dirty (như use-notebook-entries, use-shadowing-progress); toast lỗi KHÔNG thêm cho sync nền (sync thầm lặng, retry vô hình — khác 2 hook kia vì sync là nền liên tục, không phải hành động người dùng).
