# Reading Phase 2 — "Bài của tôi" (AI generate + lưu + quota) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dán văn bản tiếng Trung → AI sinh bài đọc hoàn chỉnh (dịch + từ vựng + quiz evidence) → lưu server, tab "Bài của tôi" trong /reading, rename/delete, quota 3 bài/ngày/user, sync qua HybridStore.

**Architecture:** Route `/api/v1/reading/*` auth bằng session better-auth; helper LLM server-side mới (`src/lib/server/llm.ts` — Workers không import được code từ scripts/); draft lưu D1 `reading_drafts` + mirror localStorage; audio phát bằng fallback TTS của player Phase 1 (không pre-render).

**Tech Stack:** như Phase 1 + server LLM (env CONTENT_LLM_*).

**Spec:** `docs/superpowers/specs/2026-10-30-reading-ai-mine-design.md`
**Phụ thuộc:** Phase 1 (player fallback path, library shell, sync pattern) — chỉ thực thi sau khi Phase 1 merge.

## Global Constraints

- Giống Phase 1 (pnpm, migration qua wrangler, seed rule, Hanzi tokens, test xanh trước commit).
- LLM env: `CONTENT_LLM_BASE_URL/KEY/MODEL` (đọc từ getPlatformProxy env hoặc process.env — cẩn thận gotcha: `.env.local` KHÔNG vào `getCloudflareContext()` ở dev, phải fallback `process.env`).
- Không gọi `askAi` client cho generate JSON lớn — mọi logic LLM ở server route.
- TZ quota cố định `Asia/Ho_Chi_Minh` tính server-side.

---

### Task 1: Server LLM helper + JSON contract + validate

**Files:**
- Create: `src/lib/server/llm.ts`, `src/lib/server/reading-generate.ts`
- Test: `src/lib/server/__tests__/reading-generate.test.ts`

**Interfaces:**
- Produces: `generateReading(text: string): Promise<DraftDoc>`; `type DraftDoc = { sentences: { zh: string; py: string; vi: string }[]; vocab: { word: string; py: string; vi: string }[]; questions: { q: string; qVi: string; options: string[]; answer: number; evidence: { si: number; s: number; e: number }[] }[] }`; `validateDraftDoc(raw: unknown, text: string): DraftDoc` (throw `DraftValidationError` với message tiếng Việt thân thiện); `chatJson(messages, opts): Promise<unknown>`.
- Env fallback: `READING_FAKE_LLM=1` → trả doc giả từ text (tách câu, 3 câu hỏi cố định) — dùng cho dev/test/e2e không cần LLM thật.

- [ ] **Step 1: Test validate (fail):** sentences zh/py/vi cùng độ dài; options ≥2; 0 ≤ answer < len; evidence `0 ≤ s < e ≤ len(sentence.zh)` và `si` trong range; text rỗng/nhiều hơn 3000 → throw; Hán ratio < 0.3 → throw message "Văn bản chưa đủ tiếng Trung"; `READING_FAKE_LLM` path trả doc khớp câu của text.
- [ ] **Step 2: implement `chatJson`** — fetch `{baseUrl}/chat/completions` với `response_format: { type: "json_object" }`, temperature 0.3, parse `choices[0].message.content` → JSON; retry ≤3 khi validate fail (append error message vào messages); prompt system cố định (tiếng Trung theo level không rõ → giữ nguyên văn bản, dịch tiếng Việt tự nhiên).
- [ ] **Step 3: PASS → Commit** `feat(reading): server LLM + draft validation`

### Task 2: Schema `reading_drafts` + `reading_usage` + migration

**Files:**
- Modify: `src/lib/db/schema.ts`
- Test: (type-level, gộp vào Task 3 API test)

**Chi tiết:** đúng shape spec §4.1 (`reading_drafts` + `reading_usage`, index user, PK (userId, day) cho usage).

- [ ] **Step 1: thêm tables; Step 2: `pnpm drizzle-kit generate` + apply hsk-dev; Step 3: typecheck; Commit** `feat(reading): draft + usage schema`

### Task 3: API routes generate/drafts/quota

**Files:**
- Create: `src/app/api/v1/reading/generate/route.ts`, `src/app/api/v1/reading/drafts/route.ts`, `src/app/api/v1/reading/drafts/[id]/route.ts`, `src/app/api/v1/reading/quota/route.ts`
- Test: `src/app/api/v1/reading/__tests__/generate.test.ts` (mock auth + LLM qua vi.mock module)

**Chi tiết:**
- Auth helper: copy pattern notebook route (`getAuth()` từ `@/lib/auth` — xem route notebook hiện có); 401 khi guest.
- Quota: `day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(now)` ("YYYY-MM-DD"); limit const `READING_DAILY_LIMIT = 3` (export từ `src/lib/server/reading-quota.ts` để test). Generate: check count ≥ limit → 429 `{ error, nextAt }`; generate thành công → upsert count+1.
- `id = "rd_" + crypto.randomUUID().slice(0, 12)`; `createdAt/updatedAt` epoch ms từ client? — KHÔNG: server `Date.now()` (per-user dữ liệu server-first; sync mirror dùng updatedAt server trả về).
- PATCH rename: title trim ≤255; DELETE: `deletedAt = Date.now()` (tombstone).
- Test cases: guest 401; generate ok → 200 + row + usage 1; fail LLM → 500 + usage 0; 429 sau 3; PATCH/DELETE tombstone; quota GET đúng shape `{used, limit, nextAt}`.

- [ ] **Steps: test fail → implement → PASS → Commit** `feat(reading): /api/v1/reading routes`

### Task 4: ProgressStore `readingDrafts` (thay text-draft cũ)

**Files:**
- Modify: `src/lib/store/progress-store.ts`
- Test: sửa `progress-store-reading-drafts.test.ts` → `progress-store-reading-saved.test.ts`

**Chi tiết:**
- `type SavedReading = { id: string; title: string; textZh: string; doc: DraftDoc; chars: number; createdAt: number; updatedAt: number; deletedAt?: number }`; key `nhai.reading.drafts2`.
- API: `getReadingDrafts(): SavedReading[]` (lọc tombstone), `upsertReadingDraft(d: SavedReading)`, `removeReadingDraft(id)` (đặt deletedAt, giữ 90 ngày).
- **Xóa** type `ReadingDraft` + 2 method cũ + dùng chỗ cũ (reading-client Phase 1 không còn dùng).
- [ ] **Steps: sửa test fail → implement → PASS (toàn bộ `pnpm test`) → Commit** `feat(reading): saved drafts store`

### Task 5: Sync domain `readingDrafts`

**Files:**
- Modify: `src/lib/store/sync-merge.ts`, `src/lib/store/hybrid-store.ts`, `src/app/api/v1/sync/route.ts`, `src/lib/db/schema.ts` nếu cần mapping
- Test: `src/lib/store/__tests__/sync-merge.test.ts` thêm case

**Chi tiết:** `SyncDraftRecord = SavedReading` (shape trừ doc json); merge per-id updatedAt thắng, tombstone thắng khi `deletedAt >= updatedAt` của bản sống (dùng `resolveTombstone` hiện có — thêm domain vào tombstone map); PATCHES `["upsertReadingDraft", ["readingDrafts"]]`, `["removeReadingDraft", ["readingDrafts"]]`; route sync ghi vào `reading_drafts` (upsert theo id, tombstone purge 90 ngày pattern có sẵn).

- [ ] **Steps: test fail → implement → PASS → Commit** `feat(reading): sync domain readingDrafts`

### Task 6: Tab Mine UI

**Files:**
- Modify: `src/app/(app)/reading/reading-client.tsx` (thêm tab Mine cạnh tab level: `Bài khoá | Bài của tôi`; state `?tab=mine`)
- Create: `src/app/(app)/reading/mine-panel.tsx`
- Test: `src/app/(app)/reading/__tests__/mine-panel.test.tsx`

**UI:**
- Panel Mine: chip quota (guest ẩn; logged in fetch `/api/v1/reading/quota` → "Còn N/3 lượt hôm nay"); textarea (maxlength 3000, đếm ký tự) + nút "Tạo bài đọc" (validate client 100–3000 + Hán ratio ≥0.3 → toast lỗi trước khi gọi API); nút disabled khi pending (spinner).
- Danh sách drafts (store, merge với server list khi login — server list thắng theo updatedAt): card title + meta (chars · ngày) + rename inline (pattern `_` component Phase 1 của đối thủ: input Enter save / Esc cancel) + delete (ConfirmDialog).
- Bấm card → `openId` tương tự library; player với sentences không audio → ẩn seek (fallback TTS).
- Tạo thành công → toast "Đã lưu vào Bài của tôi", mở luôn bài mới, quota chip giảm.

- [ ] **Step 1: Test fail — cases:** guest bấm Tạo → LoginModal mở; validate ratio fail → toast không gọi fetch; mock fetch 200 → store có draft + mở player; rename Enter → updatedAt mới; delete → tombstone (store giữ, UI ẩn).
- [ ] **Step 2–4: implement → PASS. Step 5: `pnpm test` toàn bộ. Commit** `feat(reading): tab Bài của tôi`

### Task 7: e2e + verification cuối

**Files:**
- Create: `e2e/reading-mine.spec.ts`

**Cases (dev-login QA route, READING_FAKE_LLM=1):** login → Mine → dán sample → tạo → draft xuất hiện + mở player; quota chip 2/3; rename; delete → biến mất; reload → còn (store).

- [ ] **Step 1: viết; Step 2: `pnpm test:e2e` PASS; Step 3: `pnpm typecheck && pnpm lint && pnpm test` xanh; Commit** `test(reading): e2e mine`
- [ ] **Step 4: LƯU Ý deploy:** migrate remote `hsk --remote` + set env CONTENT_LLM_* qua `wrangler secret put` (owner).
