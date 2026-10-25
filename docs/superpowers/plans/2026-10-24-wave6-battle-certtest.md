# Battle + Leaderboard + Certificate Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Execute tasks EXACTLY in order. Make sure you COMPLETE each task (all checkboxes, tests passing) before moving to the next one. Commit after each task.

**Spec:** /Volumes/samsung512/Code/hsk/docs/superpowers/specs/2026-10-24-hsk15-roadmap-design.md (Wave 6, mục "Công việc" dòng ~106–111)

## Goal

Wave 6 của app học tiếng Trung HSK (`app-next/`), 3 phần:

1. **W6.1 — Mode Đấu trí**: nâng mode battle sẵn có thành scoring thật 150đ (100đ chính xác + 50đ tốc độ ≤2s/câu), timer per câu, chốt tối thiểu 4 từ/bài.
2. **W6.2 — Bảng xếp hạng thật**: bảng D1 `battle_attempts`, API POST attempt + GET leaderboard (per-lesson + monthly), trang `/leaderboard` đổi từ mock sang data thật (giữ UI), client cache 60s.
3. **W6.3 — Luyện thi chứng chỉ**: đề HSK 3.0 JSON (listening/reading/writing, cues start/end cho audio), chấm tự luận thuần (normalize bỏ dấu câu + đếm ký tự Hán), bảng D1 `hsk_exam_results`, render đề demo HSK1 từ content vocab — bỏ toast "sắp ra mắt".

## Architecture

- Next.js 16 App Router + OpenNext Cloudflare Workers; D1 (SQLite) qua drizzle-orm; better-auth session (`getAuth().api.getSession({ headers })`).
- Content vocab nằm trong D1 `content_vocabs`, đọc qua `src/lib/content/vocab.ts` (`getVocabLesson(book, pageId)`), KHÔNG import `src/content/vocab` trực tiếp ở server code.
- Mode battle đã tồn tại: `src/components/lesson/modes/battle.tsx` (13 câu × 5 dạng, timer tổng, lưu best local). Wave 6 TÁI DÙNG `buildBattleQuestions` / `checkTyped` — không viết lại generator câu hỏi.
- Thuật toán thuần (scoring battle, chấm tự luận) là pure function đặt ở `src/lib/battle/`, `src/lib/exam/` → unit test decision table bằng vitest.
- API đặt ở `src/app/api/v1/...`, theo đúng pattern route + test đã có (mock `@/lib/auth` + `@/lib/db`).
- Migration: sửa `src/lib/db/schema.ts` → `pnpm drizzle-kit generate` sinh `drizzle/0006_*.sql` → áp dụng bằng `wrangler d1 migrations apply hsk-dev --local`.
- **Phụ thuộc Wave 3/4 (ghi chú, không block):** audio listening của đề thi chỉ ĐỊNH NGHĨA cấu trúc (`audioUrl?: string`, cues start/end) — khi Wave 3 (Kokoro offline render) có output thì script sinh audio điền vào `audioUrl`; UI player chỉ render khi có `audioUrl`. Điểm học tập (`study_day` của hybrid-store Wave 4) KHÔNG đụng tới trong wave này — battle có bảng riêng.

## Tech Stack

- Next.js 16, React 19, TypeScript strict, Tailwind v4 (design tokens `bg-surface-elevated`, `text-action-primary`, v.v. — xem `src/app/globals.css`).
- drizzle-orm + drizzle-kit (D1), better-auth, zod validate body.
- Test: vitest (`pnpm test`), Playwright (`pnpm test:e2e`). Package manager: **pnpm BẮT BUỘC**.
- KHÔNG chạy `pnpm build` / `pnpm preview` trong quá trình làm. Chỉ `pnpm test`, `pnpm typecheck`, `pnpm lint`, e2e cục bộ khi được yêu cầu ở task cuối.

## Global Constraints

- Tất cả comment/UX copy tiếng Việt, khớp giọng văn hiện có (thân thiện, có emoji trong UI copy là OK, KHÔNG emoji trong code comment).
- Mọi `id` bảng do server sinh (`crypto.randomUUID()`); `userId` luôn reference `user.id` `onDelete: "cascade"`.
- API không đăng nhập → `401 { error: "unauthorized" }`; body sai schema → `400 { error: "invalid_body" }` (khớp pattern `src/app/api/v1/shadowing/progress/`).
- Migration 0005 là của Wave 4 (hybrid-store) — task 1 của plan này kiểm tra: nếu `drizzle/0005_*` chưa tồn tại thì migration của wave này vẫn đặt tên do `drizzle-kit generate` tự sinh (số thứ tự kế tiếp), mọi chỗ ghi "0006" hiểu là "migration kế tiếp sau cùng".
- Pure function KHÔNG import React, KHÔNG import `"use client"` module — để vitest chạy node thuần.
- Không sửa `src/content/leaderboard.ts` (mock giữ nguyên làm fallback), chỉ đổi nguồn dữ liệu của `/leaderboard`.
- Mỗi task kết thúc bằng `pnpm test && pnpm typecheck` sạch + `git commit`.

---

## Task 1 — Migration: bảng `battle_attempts` + `hsk_exam_results`

**Files:**
- Sửa: `app-next/src/lib/db/schema.ts`
- Sinh ra: `app-next/drizzle/0006_<tên-random>.sql` + `app-next/drizzle/meta/0006_snapshot.json` + sửa `app-next/drizzle/meta/_journal.json` (do drizzle-kit)

**Interfaces (Produces):**
- Drizzle tables: `battleAttempts`, `hskExamResults` export từ `src/lib/db/schema.ts`.

**Steps:**

- [ ] Thêm vào cuối `app-next/src/lib/db/schema.ts` (đặt sau block content datasets, comment tiếng Việt kiểu các bảng hiện có):

```ts
/* ================= Wave 6: Đấu trí + luyện thi ================= */

/* Mỗi lượt chơi Đấu trí trong lesson (W6.2). `score` do client tính
   (100đ chính xác + 50đ tốc độ, max 150) — server chỉ validate khoảng giá trị. */
export const battleAttempts = sqliteTable(
  "battle_attempts",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    bookSlug: text("book_slug").notNull(),
    lessonSlug: text("lesson_slug").notNull(),
    correctCount: integer("correct_count").notNull(),
    totalCount: integer("total_count").notNull(),
    durationMs: integer("duration_ms").notNull(),
    score: integer("score").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => [
    index("battle_attempts_lesson_idx").on(t.bookSlug, t.lessonSlug, t.score),
    index("battle_attempts_month_idx").on(t.createdAt),
    index("battle_attempts_user_idx").on(t.userId, t.createdAt),
  ]
);

/* Kết quả luyện thi chứng chỉ (W6.3). `sections` là JSON breakdown theo
   listening/reading/writing — shape theo type ExamSectionResult ở lib/exam/types. */
export const hskExamResults = sqliteTable(
  "hsk_exam_results",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    level: text("level").notNull(), // "hsk1" ... "hsk6"
    totalScore: integer("total_score").notNull(),
    maxScore: integer("max_score").notNull(),
    sections: text("sections", { mode: "json" })
      .$type<{ section: string; score: number; maxScore: number }[]>()
      .notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => [index("hsk_exam_results_user_idx").on(t.userId, t.createdAt)]
);
```

- [ ] Chạy `cd /Volumes/samsung512/Code/hsk/app-next && pnpm drizzle-kit generate` — kiểm tra file SQL sinh ra có đúng 2 `CREATE TABLE` + các `CREATE INDEX`, tên bảng `battle_attempts`, `hsk_exam_results`, cột snake_case khớp schema.
- [ ] Chạy local: `pnpm exec wrangler d1 migrations apply hsk-dev --local` — phải sạch, không lỗi SQL. (KHÔNG chạy `--remote` — production owner chạy tay.)
- [ ] `pnpm typecheck` sạch.
- [ ] Commit: `git add -A && git commit -m "db: bảng battle_attempts + hsk_exam_results (wave 6)"`

---

## Task 2 — Battle scoring pure function (W6.1 — decision table unit test)

**Files:**
- Tạo: `app-next/src/lib/battle/score.ts`
- Tạo: `app-next/src/lib/battle/__tests__/score.test.ts`

**Interfaces (Produces):**

```ts
/** Điểm Đấu trí: floor(100 × correct/total) + floor(50 × min(1, 2000 / avgMs)),
 *  avgMs = durationMs / total (ms trung bình mỗi câu). Max 150, min 0.
 *  Trả về 0 nếu total <= 0 hoặc durationMs <= 0. Export thuần để test + client dùng. */
export function computeBattleScore(correct: number, total: number, durationMs: number): number;
```

**Steps (TDD — viết test trước, đỏ → xanh):**

- [ ] Viết `src/lib/battle/__tests__/score.test.ts` với decision table **bắt buộc** (viết đủ các case, mỗi case 1 `it`):

| correct | total | durationMs | kỳ vọng | lý do |
|---|---|---|---|---|
| 13 | 13 | 26_000 | **150** | avg đúng 2s/câu → bonus full (biên đúng budget) |
| 13 | 13 | 12_999 | **150** | nhanh hơn 2s/câu — bonus không vượt 50 (clamp) |
| 13 | 13 | 26_001 | **149** | chậm hơn biên 1ms → mất 1đ tốc độ |
| 0 | 13 | 30_000 | **0** | 0 câu đúng |
| 13 | 13 | 65_000 | **100** | chậm hẳn (5s/câu) → chỉ điểm chính xác |
| 7 | 13 | 39_000 | **86** | floor(100×7/13)=53 + floor(50×min(1, 26000/39000))=floor(33.33)=33 → 53+33=86 (đã tính tay — ghi đúng vào test) |
| 1 | 0 | 0 | **0** | guard chia 0 |
| 5 | 5 | 4_000 | **150** | bài 5 câu, avg 800ms — công thức không phụ thuộc số câu |

  (Chú ý: dòng 7/13/39s — implementer phải tự tính kỳ vọng bằng công thức rồi ghi số đúng vào test; testcase trên ghi sẵn 86 đã tính tay.)
- [ ] Chạy `pnpm test -- src/lib/battle` — đỏ (chưa có module).
- [ ] Viết `src/lib/battle/score.ts`:

```ts
/* Scoring Đấu trí (W6.1, spec Wave 6 — port từ RE đối thủ):
   điểm = floor(100 × correct/total) + floor(50 × min(1, 2s / avg_ms_per_câu)),
   max 150/bài. Pure function — KHÔNG import React. */

const ACCURACY_MAX = 100;
const SPEED_MAX = 50;
const SPEED_BUDGET_MS = 2_000;

export function computeBattleScore(correct: number, total: number, durationMs: number): number {
  if (total <= 0 || durationMs <= 0) return 0;
  const clamped = Math.max(0, Math.min(correct, total));
  const accuracy = Math.floor((ACCURACY_MAX * clamped) / total);
  const avgMs = durationMs / total;
  const speed = Math.floor(SPEED_MAX * Math.min(1, SPEED_BUDGET_MS / avgMs));
  return accuracy + speed;
}
```

- [ ] `pnpm test -- src/lib/battle` xanh toàn bộ decision table.
- [ ] `pnpm typecheck` sạch.
- [ ] Commit: `git commit -am "battle: computeBattleScore 150đ + decision table test"`

---

## Task 3 — Nâng mode battle UI: min 4 từ, timer per câu, hiển thị điểm (W6.1)

**Files:**
- Sửa: `app-next/src/components/lesson/modes/battle.tsx`
- Sửa (nếu cần test mount sẵn có): `app-next/src/components/lesson/__tests__/` (tìm file test battle hiện có bằng `grep -rln "battle" app-next/src/components/lesson --include="*.test.*"`; nếu chưa có file test component cho battle thì tạo `battle.test.tsx` cùng thư mục `__tests__` của lesson, render qua `@testing-library/react` như các test component khác trong repo — xem `app-next/src/app/__tests__/` để lấy pattern setup).

**Interfaces (Consumes):** `useLesson()` → `{ items: LessonItem[]; book: string; page: string }`; `progressStore.getBattleBest/saveBattleBest`; `computeBattleScore` (Task 2).

**Steps:**

- [ ] **Min 4 từ:** trong `BattleMode` màn intro — nếu `items.length < 4` render thay thế: `<p>` "Bài này cần ít nhất 4 từ để chơi Đấu trí — hãy học Flashcard trước nhé." + không có nút "Bắt đầu thi" (disabled hoặc ẩn). Không lỗi khi items rỗng.
- [ ] **Timer per câu:** thêm state `qStartRef = useRef(0)`; set `qStartRef.current = Date.now()` mỗi khi `pos` đổi (trong `beginBattle` và trong `setTimeout` chuyển câu của `settle`); không thay đổi logic timer tổng `elapsedSec` (giữ nguyên hiển thị).
- [ ] **Thu thập thời gian:** thêm state `timesMs: number[]` — trong `settle` push `Date.now() - qStartRef.current` trước khi tính câu kế tiếp; reset `[]` trong `beginBattle`.
- [ ] **Điểm kết quả:** trong `finishBattle` tính `const score = computeBattleScore(finalCorrect, questions.length, timeMs)` — đặt vào `setResult({ correct, timeMs, isRecord, score })`; cập nhật type state tương ứng. Màn done hiển thị thêm hàng: `<p>Điểm: <span data-score>{score}</span>/150</p>` (style khớp các dòng hiện có: `text-lg mt-1`, span `font-extrabold text-action-primary`).
- [ ] Copy intro: đổi "Trả lời 13 câu" → "Trả lời 13 câu — điểm tối đa 150 (100đ chính xác + 50đ trả lời nhanh ≤2 giây/câu)". (Số câu vẫn là `TOTAL_QUESTIONS` — không hardcode "13" ở copy mới, dùng template string.)
- [ ] Unit test (nếu repo dùng testing-library cho components — kiểm tra trước; nếu repo chưa có setup jsdom cho lesson components thì bỏ bước này và chỉ chạy typecheck, ghi chú vào commit message). Trường hợp có: test `items.length < 4` không render nút bắt đầu.
- [ ] `pnpm test && pnpm typecheck && pnpm lint` sạch.
- [ ] Commit: `git commit -am "battle: scoring 150đ, timer per câu, tối thiểu 4 từ (W6.1)"`

---

## Task 4 — API battle: POST attempts + GET leaderboard (W6.2)

**Files:**
- Tạo: `app-next/src/app/api/v1/battle/attempts/route.ts`
- Tạo: `app-next/src/app/api/v1/battle/leaderboard/route.ts`
- Tạo: `app-next/src/app/api/v1/battle/__tests__/attempts.test.ts`
- Tạo: `app-next/src/app/api/v1/battle/__tests__/leaderboard.test.ts`

**Interfaces (Produces):**

- `POST /api/v1/battle/attempts` — body `{ book: string; page: string; correctCount: number; totalCount: number; durationMs: number; score: number }` (zod: book/page nonempty string ≤64; counts int 0–999, `totalCount ≥ 4`, `correctCount ≤ totalCount`; durationMs int 1–3_600_000; score int 0–150). Response `200 { id, rank: number }` — `rank` = hạng của attempt này trong leaderboard per-lesson vừa tính (đếm số user có best score cao hơn). `401` khi chưa đăng nhập, `400` body sai.
- `GET /api/v1/battle/leaderboard?scope=lesson&book=<book>&page=<page>` → `{ items: { name: string; score: number; correct: number; total: number; durationMs: number; createdAt: string }[] }` — top 10 **best attempt mỗi user** (score max, hòa thì durationMs min), sắp giảm dần.
- `GET /api/v1/battle/leaderboard?scope=month` → `{ items: { name: string; totalScore: number; bestScore: number; lessonsPlayed: number }[] }` — trong tháng hiện tại (UTC): best attempt của mỗi user×lesson (score max, hòa durationMs min) → `totalScore` = tổng các best, `bestScore` = max, `lessonsPlayed` = số lesson có attempt. Top 10 giảm theo totalScore.

**Steps (TDD — mock `@/lib/auth` + `@/lib/db` như `src/app/api/v1/shadowing/__tests__/progress.test.ts`):**

- [ ] Viết `attempts.test.ts`: (1) `401` khi không session; (2) `400` khi `totalCount: 3` (< 4); (3) `400` khi `score: 200`; (4) `200` happy path — assert `insert.values` nhận object có `id` là string, `userId` từ session, `bookSlug`/`lessonSlug` map đúng từ `book`/`page`; (5) `rank` trả về = số hàng select đếm + 1 (mock select trả `[{ n: 4 }]` → `rank: 5`).
- [ ] Viết `leaderboard.test.ts`: (1) `400` khi thiếu scope/book/page không hợp lệ; (2) `scope=lesson` trả items map đúng shape; (3) `scope=month` không cần book/page; (4) leaderboard GET là **public** (không 401 guest — ai cũng xem được BXH).
- [ ] Chạy đỏ: `pnpm test -- src/app/api/v1/battle`.
- [ ] Viết `src/app/api/v1/battle/attempts/route.ts` — khung:

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { battleAttempts } from "@/lib/db/schema";

const bodySchema = z.object({
  book: z.string().min(1).max(64),
  page: z.string().min(1).max(64),
  correctCount: z.number().int().min(0).max(999),
  totalCount: z.number().int().min(4).max(999),
  durationMs: z.number().int().min(1).max(3_600_000),
  score: z.number().int().min(0).max(150),
});

export async function POST(req: NextRequest) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  if (parsed.data.correctCount > parsed.data.totalCount)
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const db = createDb();
  const id = crypto.randomUUID();
  await db.insert(battleAttempts).values({ id, userId: session.user.id, ...parsed.data,
    bookSlug: parsed.data.book, lessonSlug: parsed.data.page });
  // rank = số user có best-score per-lesson cao hơn attempt này, +1
  const bestRows = await db.all<{ n: number }>(sql`...`);
  return NextResponse.json({ id, rank: Number(bestRows[0]?.n ?? 0) + 1 });
}
```

  Viết SQL rank bằng raw `sql` template (best attempt mỗi user trong lesson: `GROUP BY user_id` lấy `MAX(score)` — đếm số best > score vừa insert). Vì drizzle-kit raw query qua D1 dùng `db.all(sql\`...\`)` — kiểm tra pattern raw query đang có trong repo (`grep -rn "db.all\|db.run" app-next/src`) và dùng khớp; nếu chưa có, `db.all` của drizzle D1 session là chuẩn.
- [ ] Viết `leaderboard/route.ts`: scope `lesson` — raw SQL:

```sql
SELECT u.name, b.score, b.correct_count AS correct, b.total_count AS total,
       b.duration_ms AS durationMs, b.created_at AS createdAt
FROM battle_attempts b JOIN user u ON u.id = b.user_id
WHERE b.book_slug = ?1 AND b.lesson_slug = ?2
  AND b.id = (SELECT b2.id FROM battle_attempts b2
              WHERE b2.user_id = b.user_id AND b2.book_slug = b.book_slug AND b2.lesson_slug = b.lesson_slug
              ORDER BY b2.score DESC, b2.duration_ms ASC, b2.created_at ASC LIMIT 1)
ORDER BY b.score DESC, b.duration_ms ASC LIMIT 10;
```

  scope `month` — best per user×lesson trong tháng (`created_at >= unixepoch('start of month')`), rồi gộp trong JS thành `totalScore/bestScore/lessonsPlayed`, sort giảm `totalScore`, cắt 10. Chuẩn hoá `createdAt` thành ISO string.
- [ ] `pnpm test -- src/app/api/v1/battle` xanh; `pnpm typecheck` sạch.
- [ ] Commit: `git commit -am "api: POST battle attempts + GET leaderboard lesson/month (W6.2)"`

---

## Task 5 — Trang `/leaderboard` ăn data thật + cache 60s (W6.2)

**Files:**
- Sửa: `app-next/src/app/leaderboard/page.tsx`
- Tạo: `app-next/src/lib/battle/leaderboard-client.ts`
- Sửa: `app-next/src/content/__tests__/leaderboard.test.ts` CHỈ khi test cũ assert mock được page dùng trực tiếp (đọc kỹ test hiện có trước khi sửa — mock `src/content/leaderboard.ts` giữ nguyên, chỉ page đổi nguồn).

**Interfaces (Consumes):** 2 shape GET của Task 4. **Produces:** `fetchBattleLeaderboard(scope, opts): Promise<...>` với cache in-memory 60s (module-level `Map` + timestamp; hit trong 60s → trả luôn không fetch).

**Steps:**

- [ ] Viết `src/lib/battle/leaderboard-client.ts`:

```ts
/* Client gọi /api/v1/battle/leaderboard — cache 60s per key (W6.2). */
type CacheEntry = { at: number; data: unknown };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

export async function fetchBattleLeaderboard(
  scope: "lesson" | "month",
  opts: { book?: string; page?: string } = {}
): Promise<unknown> {
  const key = scope + JSON.stringify(opts);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const qs = new URLSearchParams({ scope, ...(opts.book ? { book: opts.book } : {}), ...(opts.page ? { page: opts.page } : {}) });
  const res = await fetch(`/api/v1/battle/leaderboard?${qs}`);
  if (!res.ok) throw new Error("leaderboard_failed");
  const data = await res.json();
  cache.set(key, { at: Date.now(), data });
  return data;
}
export function clearLeaderboardCache(): void { cache.clear(); }
```

  (Export `clearLeaderboardCache` để POST attempt xong gọi — bảng cập nhật ngay cho chính mình.)
- [ ] Sửa `src/app/leaderboard/page.tsx`: giữ nguyên UI `Row`/`Chip`/tab + mount-gate. Tab "Đấu trí tháng": `useEffect` gọi `fetchBattleLeaderboard("month")`, state `monthRows`; render map `{name, totalScore}` vào `Row` (`rightText={String(r.totalScore)}`, `rightSub={r.lessonsPlayed + " bài"}`). Loading: skeleton `<li>` 3 hàng đơn giản; lỗi: hàng "Chưa tải được bảng xếp hạng — thử lại sau." Guest vẫn xem được (GET public). Tab "XP tổng" **giữ nguyên mock** (`leaderboardData.xp`) — XP thật chưa có trong wave này, thêm comment ghi chú.
- [ ] Per-lesson BXH: trang nhận `?book=&page=` (đọc thêm trong `useEffect` mount-gate hiện có); khi có cả hai → hiện tab thứ ba "Bài này" gọi `scope=lesson`. Không có param → không hiện tab.
- [ ] `pnpm test && pnpm typecheck` sạch (sửa test mock cũ nếu nó import page).
- [ ] Commit: `git commit -am "leaderboard: data thật từ API + cache 60s, giữ UI (W6.2)"`

---

## Task 6 — Nối battle → API + e2e một ván (W6.1+W6.2)

**Files:**
- Sửa: `app-next/src/components/lesson/modes/battle.tsx`
- Tạo: `app-next/e2e/battle.spec.ts`

**Interfaces (Consumes):** `POST /api/v1/battle/attempts` (Task 4), `clearLeaderboardCache` (Task 5), `useLoginModal` (đã có trong file).

**Steps:**

- [ ] Trong `finishBattle` (sau `setResult`): nếu **đã đăng nhập** (check qua session — cách repo đang dùng: `grep -rn "authClient\|useSession" app-next/src/components/shell/login-modal.tsx` và dùng cùng nguồn) → `fetch("/api/v1/battle/attempts", { method: "POST", ... body { book, page, correctCount, totalCount, durationMs, score } })`; xong gọi `clearLeaderboardCache()`. Bọc try/catch im lặng (fail không phá UI kết quả); đang gửi → disable nút "Thi lại" hoặc hiện "Đang lưu..." nhỏ. Chưa đăng nhập → giữ nút "Đăng nhập" hiện có, không fetch.
- [ ] Body map đúng: `book` = `book` từ `useLesson()`, `page` = `page`, `totalCount` = `questions.length`, `durationMs` = `timeMs`, `score` = `computeBattleScore(...)`.
- [ ] Viết `e2e/battle.spec.ts` theo pattern `app-next/e2e/learning-flow.spec.ts` (đọc trước để lấy helper login/seed session — repo có cách fake session cho e2e, dùng lại): vào 1 lesson có ≥4 từ → chọn mode Đấu trí → trả lời hết 13 câu (click `[data-answer="true"]` khi có, else `[data-bskip]`) → assert `[data-score]` hiện số 0–150 → mở `/leaderboard?tab=battle` → assert dòng leaderboard có tên user test + `rightText` là số.
- [ ] Chạy: `pnpm test && pnpm typecheck`. E2e: `pnpm test:e2e -- e2e/battle.spec.ts` (cần dev server theo `playwright.config.ts` — nếu config không tự start server thì đọc config, chạy `pnpm dev` nền rồi chạy e2e; KHÔNG chạy build).
- [ ] Commit: `git commit -am "battle: lưu attempt lên server sau ván đấu + e2e 1 ván (W6.1/6.2)"`

---

## Task 7 — Exam types + generator đề HSK1 từ content vocab (W6.3)

**Files:**
- Tạo: `app-next/src/lib/exam/types.ts`
- Tạo: `app-next/src/lib/exam/generate.ts`
- Tạo: `app-next/src/lib/exam/__tests__/generate.test.ts`

**Interfaces (Produces):**

```ts
// types.ts
export type ExamSectionKind = "listening" | "reading" | "writing";
export type ExamQuestion =
  | { kind: "choice"; cue: string; audio?: { audioUrl: string; start: number; end: number }; prompt: string; options: string[]; answer: string }
  | { kind: "cloze"; audio?: { audioUrl: string; start: number; end: number }; sentenceWithBlank: string; options: string[]; answer: string }
  | { kind: "free"; prompt: string; sampleAnswer: string }; // tự luận — chấm normalize
export type ExamSection = { kind: ExamSectionKind; title: string; questions: ExamQuestion[] };
export type Exam = { level: string; title: string; sections: ExamSection[] };
export type ExamSectionResult = { section: ExamSectionKind; score: number; maxScore: number };
```

- `generateExam(words: VocabWord[], level: string): Exam` — pure. **Cấu trúc đề demo HSK1** từ vocab (mỗi section ≥5 câu, đủ từ thì đủ câu; thiếu từ → cắt bớt, không crash):
  - `listening`: câu choice "nghe từ X — chọn pinyin đúng" (audio cues `start/end` định nghĩa cấu trúc; **KHÔNG set `audio`** — Wave 3 Kokoro render offline sẽ điền `audioUrl` sau, UI phải render được khi thiếu).
  - `reading`: han2vi choice + cloze điền từ vào `example.zh` (dùng `blanked`-style — tự viết trong `generate.ts`, không import từ `.tsx`).
  - `writing`: 2 câu `free` — "Viết lại câu sau bằng chữ Hán: <example.vi>" với `sampleAnswer` = `example.zh`.
- **Steps:** test trước (decision table nhỏ: đề đủ sections; thiếu audio vẫn valid; cloze `__` đúng vị trí hanzi; options luôn 4 phần tử trừ khi vocab < 4 từ → 3) → chạy đỏ → implement → xanh.
- [ ] `pnpm test -- src/lib/exam` xanh; `pnpm typecheck` sạch.
- [ ] Commit: `git commit -am "exam: types + generator đề demo HSK1 từ vocab (W6.3)"`

---

## Task 8 — Chấm tự luận pure function (W6.3 — decision table unit test)

**Files:**
- Tạo: `app-next/src/lib/exam/grade.ts`
- Tạo: `app-next/src/lib/exam/__tests__/grade.test.ts`

**Interfaces (Produces):**

```ts
/** Chuẩn hoá: trim + bỏ mọi ký tự trong regex
 *  [\s，。？！、：；""''（）()「」《》…,.?!:;'"] (khoảng trắng + dấu câu Trung/Việt/Anh). */
export function normalizeAnswer(s: string): string;

/** Đếm số ký tự Hán [\u3400-\u9fff] trong chuỗi. */
export function countHanChars(s: string): number;

/** Chấm tự luận: đúng khi normalize(input) === normalize(sample) && countHanChars(input) >= countHanChars(sample).
 *  Trả { correct, hanCount } — hanCount = số chữ Hán user viết (để hiện feedback). */
export function gradeFreeAnswer(input: string, sample: string): { correct: boolean; hanCount: number };
```

**Steps (TDD — decision table bắt buộc):**

- [ ] Viết test trước, các case **bắt buộc**:
  - `normalizeAnswer("你好，世界！")` → `"你好世界"`;
  - `normalizeAnswer(" 你好 。 ")` → `"你好"`;
  - `normalizeAnswer("x,y; z")` → `"xyz"` (dấu câu ASCII);
  - `normalizeAnswer("“你好”")` → `"你好"` (dấu ngoặc kép cong U+201C/201D);
  - `countHanChars("你好abc")` → 2; `countHanChars("")` → 0;
  - `gradeFreeAnswer("你好，世界！", "你好世界！")` → `{ correct: true, hanCount: 4 }`;
  - `gradeFreeAnswer("你好", "你好世界")` → `correct: false` (thiếu chữ);
  - `gradeFreeAnswer("abc", "你好")` → `correct: false, hanCount: 0`.
- [ ] Implement `grade.ts` (regex theo đúng spec trên, dùng `String.raw` hoặc escape cẩn thận dấu `'` trong regex).
- [ ] `pnpm test -- src/lib/exam` xanh; `pnpm typecheck` sạch.
- [ ] Commit: `git commit -am "exam: chấm tự luận normalize + đếm chữ Hán (W6.3)"`

---

## Task 9 — API exam results + trang thi HSK1 (W6.3)

**Files:**
- Tạo: `app-next/src/app/api/v1/exam/results/route.ts` (POST + GET)
- Tạo: `app-next/src/app/api/v1/exam/__tests__/results.test.ts`
- Sửa: `app-next/src/app/(app)/certificate-test/page.tsx`
- Sửa: `app-next/src/app/(app)/certificate-test/card.tsx`
- Tạo: `app-next/src/app/(app)/certificate-test/[level]/page.tsx` (server component)
- Tạo: `app-next/src/app/(app)/certificate-test/[level]/exam-runner.tsx` (client)
- Tạo: `app-next/e2e/cert-hsk1.spec.ts`

**Interfaces (Consumes):** `getVocabLesson("hsk1", ...)` (Task 7 đầu vào — đọc `src/lib/content/vocab.ts` để biết `getVocab()` trả `VocabData = Record<book, Record<pageId, VocabLesson>>`; đề demo gộp tất cả pages của book `hsk1`), `generateExam`, `gradeFreeAnswer`.

**Produces:**
- `POST /api/v1/exam/results` — body `{ level: string (zod enum hsk1..hsk6), totalScore: int ≥0, maxScore: int >0, sections: [{ section, score, maxScore }] }` → `200 { id }`; `401/400` như Task 4.
- `GET /api/v1/exam/results?level=hsk1` → `{ items: [{ id, totalScore, maxScore, sections, createdAt }] }` của user hiện tại, mới nhất trước.

**Steps:**

- [ ] TDD API: viết `results.test.ts` theo pattern Task 4 (401; 400 khi `level: "hsk99"`; 400 khi `sections` rỗng; POST happy path assert `insert.values` có `id` + `userId`; GET trả items map shape đúng). Chạy đỏ → implement route → xanh.
- [ ] `[level]/page.tsx` (server): `params: Promise<{ level: string }>` (Next 16 — await); chỉ nhận `hsk1` hiện tại, level khác → `notFound()`. Gộp vocab: `const data = await getVocab(); const words = Object.values(data["hsk1"] ?? {}).flatMap((l) => l.words);` → `const exam = generateExam(words, "hsk1")` → render `<ExamRunner exam={exam} />`.
- [ ] `exam-runner.tsx` (client): theo section chạy tuần tự; câu `choice`/`cloze` → chọn option; câu `free` → textarea + dùng `gradeFreeAnswer` chấm khi nộp; nếu câu có `audio` → render `<audio controls src>` (không có `audio` → hiện dòng "Audio sẽ có ở bản cập nhật tiếp theo" italic nhỏ — phụ thuộc Wave 3). Kết thúc: POST kết quả (nếu đã đăng nhập — cùng check session như Task 6; guest chỉ xem điểm, không POST), hiện tổng điểm + breakdown per section + nút "Thi lại".
- [ ] Sửa `card.tsx`: bỏ toast "sắp ra mắt" — `CertificateCardItem` nhận thêm prop optional `href?: string`; có `href` → chuyển thành `Link` (style giữ nguyên, đổi `<span>Sắp ra mắt</span>` thành `<span>Làm bài thi demo</span>`); không có → giữ button + toast cũ. Sửa `page.tsx`: card HSK 1 truyền `href="/certificate-test/hsk1"`; các card khác giữ toast.
- [ ] E2E `cert-hsk1.spec.ts`: mở `/certificate-test` → card HSK1 → vào đề → trả lời hết (chọn option đầu, tự luận dán `sampleAnswer` lấy từ prompt data-testids) → thấy tổng điểm. Đánh dấu `test.skip` nếu e2e cần session POST — phần guest là chính.
- [ ] `pnpm test && pnpm typecheck && pnpm lint` sạch; chạy `pnpm test:e2e -- e2e/cert-hsk1.spec.ts`.
- [ ] Commit: `git commit -am "exam: API kết quả + trang thi demo HSK1, bỏ toast coming-soon (W6.3)"`

---

## Task 10 — Self-review + dọn dẹp

**Files:** mọi file đã tạo/sửa.

**Steps:**

- [ ] Chạy toàn bộ: `pnpm test && pnpm typecheck && pnpm lint` — sạch.
- [ ] Đối chiếu acceptance của wave: (1) e2e đấu trí 1 ván + leaderboard hiển thị attempt thật — `e2e/battle.spec.ts` đúng yêu cầu; (2) unit test scoring biên: 2s đúng budget (150), 0 đúng (0), chậm (100) — có trong `score.test.ts`; (3) chấm tự luận normalize + đếm ký tự — `grade.test.ts`.
- [ ] Rà lại danh sách lệch so với đề bài spec, ghi vào cuối plan phần "Lệch đã biết" (xem bên dưới — cập nhật nếu phát hiện thêm khi implement).
- [ ] Không commit file rác (`drizzle/meta` cũ — chỉ commit đúng snapshot/journal của migration mới). `git status` sạch.
- [ ] Commit cuối (nếu còn file chưa commit): `git commit -am "wave 6: dọn dẹp + self-review"`

---

## Lệch đã biết so với đề bài ban đầu

1. **`battle.tsx` đã tồn tại** (đề bài nói "Đấu trí ghép 5 dạng từ các generator" như thể viết mới): mode đã có sẵn 13 câu × 5 dạng tái dùng logic flash/quiz/typing. Wave này NÂNG CẤP (scoring 150đ, timer per câu, min 4 từ, nối API) chứ không tạo mode mới — Task 3/6.
2. **Top-10 trong battle.tsx là dữ liệu cứng riêng** (khác mock `content/leaderboard.ts`): để nguyên ở Task 3, chỉ thay bằng data thật qua API khi Task 6 nối xong (optional — nếu thời gian, thêm fetch BXH per-lesson vào màn intro dùng `fetchBattleLeaderboard("lesson", { book, page })`).
3. **Migration 0005 (Wave 4) chưa thấy trong `drizzle/`** tại thời điểm viết plan — số thứ tự migration thực tế do `drizzle-kit generate` quyết định; mọi tham chiếu "0006" trong plan đọc là "migration kế tiếp".
4. **Audio listening cert** chỉ cấu trúc (`audio?: { audioUrl, start, end }`) — render nội dung đề phụ thuộc output render offline của Wave 3 (Kokoro); UI có nhánh hiển thị khi thiếu audio.
5. **Tab "XP tổng" của `/leaderboard` giữ mock** — XP tổng chưa có nguồn thật trong phạm vi wave này (spec W6.2 chỉ yêu cầu battle thật).
