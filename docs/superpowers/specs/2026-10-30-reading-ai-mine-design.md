# Spec: Reading Phase 2 — "Bài của tôi": AI tạo bài đọc + lưu/sync + quota

- Ngày: 2026-10-30
- Trạng thái: Approved (owner duyệt 2026-10-30); phụ thuộc Phase 1 (player, progress, library shell)
- Phân loại: subsystem mới (API generate + bảng D1 per-user + tab Mine)

## 1. Bối cảnh

Phase 1 giao library theo level. Đối thủ có nửa thứ hai: người học dán văn bản tiếng Trung,
AI sinh bài đọc hoàn chỉnh (dịch + từ vựng + quiz) kèm audio, lưu lại mở lại mọi lúc. App-next
hiện có ô dán text + `askAi` tạo bài nhưng **không lưu** — bài biến mất sau khi rời trang.

Phạm vi Phase 2 (đã duyệt): tạo bài AI + tab "Bài của tôi" + lưu server (sync local mirror) +
quota theo ngày. Gate thành **đã đăng nhập + quota ngày** (app chưa có membership; khi ra
membership sẽ lồng quota vào gói — ngoài scope).

## 2. Non-goals

- Không sinh audio tĩnh cho bài AI (không pre-render) — phát bằng Kokoro runtime per câu
  (engine karaoke hiện có) qua player Phase 1 fallback path.
- Không gate thanh toán/membership, không AI analysis/clues/tip, không memo.
- Không cho sửa nội dung bài AI (chỉ rename/delete).
- Không chạm pipeline LLM trong `scripts/content/` (đó là tool offline, khác đường runtime).

## 3. Luồng nghiệp vụ

1. User ở tab **Bài của tôi** → nút "Tạo bài đọc" → textarea dán văn bản (100–3000 ký tự,
   tỉ lệ chữ Hán ≥30% sau normalize) → bấm Tạo.
2. Chưa đăng nhập → mở LoginModal (pattern có sẵn). Đã đăng nhập:
   - Server kiểm quota ngày (mặc định **3 bài/ngày/user**, theo Asia/Ho_Chi_Minh date string).
     Hết quota → 429 + message "hết lượt hôm nay, quay lại sau X".
   - Gọi LLM sinh **1 JSON duy nhất** (không gọi client `askAi` cho JSON lớn): title (zh, ≤40
     ký tự lấy từ dòng đầu), sentences[] ({zh, py, vi}), vocab[] (5–10 mục {word, py, vi}),
     questions[] (3–5 MCQ {q, qVi, options[4], answer, evidence}). Validate nghiêm: zh/py/vi
     cùng độ dài câu, options ≥2, answer in range, evidence trong range; fail → retry ≤3 lần
     rồi báo lỗi chung.
3. Lưu: row `reading_drafts` (server) + mirror localStorage qua ProgressStore → mở ngay player
   Phase 1 (audio = null → TTS fallback), badge "Đã lưu" hiển thị.
4. Danh sách Mine: card title + meta (chars · ngày) + rename (inline, ≤255 ký tự) + delete
   (confirm dialog pattern `ConfirmDialog` có sẵn). Mở bài → player như library.
5. Offline/guest device: Mine list đọc từ localStorage mirror; sync qua HybridStore domain
   mới khi login.

## 4. Dữ liệu & API

### 4.1 Bảng D1

```ts
export const readingDrafts = sqliteTable("reading_drafts", {
  id: text("id").primaryKey(),          // rd_{nanoid 12}
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  textZh: text("text_zh").notNull(),
  doc: text("doc", { mode: "json" }).$type<DraftDoc>().notNull(),
  // DraftDoc = { sentences: {zh,py,vi}[]; vocab: {word,py,vi}[]; questions: ReadingQuestion[] }
  chars: integer("chars").notNull(),
  createdAt: integer("created_at").notNull(), // epoch ms client
  updatedAt: integer("updated_at").notNull(),
  deletedAt: integer("deleted_at"),           // tombstone 90 ngày (pattern sync)
}, (t) => [index("reading_drafts_user_idx").on(t.userId)]);

export const readingUsage = sqliteTable("reading_usage", {
  userId: text("user_id").notNull(),
  day: text("day").notNull(),        // "YYYY-MM-DD" theo Asia/Ho_Chi_Minh
  count: integer("count").notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.day] })]);
```

### 4.2 API routes (auth better-auth session, pattern `/api/v1/notebook`)

| route | method | hành vi |
|---|---|---|
| `/api/v1/reading/generate` | POST | body `{text}`; auth + quota check + tăng usage; LLM → validate → insert draft → trả `{draft, remaining}` |
| `/api/v1/reading/drafts` | GET | list drafts user (không tombstone), sort updatedAt desc |
| `/api/v1/reading/drafts/[id]` | PATCH | rename `{title}`; DELETE → tombstone `deletedAt` |
| `/api/v1/reading/quota` | GET | `{used, limit, nextAt}` cho UI hiển thị lượt |

- LLM key: đọc từ env server (`CONTENT_LLM_*` fallback `AI_*`) — dùng helper chat-json
  tương tự `scripts/content/src/llm.ts` nhưng copy vào `src/lib/server/llm.ts` (code trên
  Workers không import được từ scripts). Temperature thấp, max tokens đủ cho 3000 ký tự.
- Quota: upsert `reading_usage` count+1 trong cùng transaction-like sequence sau khi
  generate THÀNH CÔNG (fail generate không trừ lượt).

### 4.3 Client

- `src/lib/store/progress-store.ts`: domain `readingDrafts` mới — key `nhai.reading.drafts2`
  (bỏ key `bye.reading.drafts` cũ của text-draft: xóa method `getReadingDrafts/
  saveReadingDraft` và test tương ứng — draft text thuần bị thay bởi draft-doc hoàn chỉnh).
  API: `getReadingDrafts(): SavedReading[]`, `upsertReadingDraft(d)`, `removeReadingDraft(id)`.
- HybridStore: domain thứ 6 `readingDrafts` (PATCHES + tombstone) + sync-merge `mergeReadingDrafts`
  (per-id updatedAt thắng, deletedAt tombstone).
- Tab Mine trong `/reading` (Phase 1 shell): list + textarea tạo + quota chip "còn N lượt"
  (fetch `/api/v1/reading/quota` khi logged in, ẩn khi guest).
- Player mở bài Mine: sentences không có `audio`/`durSec` → fallback TTS, ẩn seek slider
  (không có timing), giữ loop câu + speed + pinyin + dịch.

## 5. Testing

- Unit: validate generate JSON (mọi rule), quota (day boundary, TZ), draft store CRUD,
  merge tombstone, player fallback path với `durSec: 0`.
- API test (vitest, mock LLM + mock auth session): generate thành công → row + usage+1;
  fail LLM → không trừ lượt; 429 khi hết quota; PATCH/DELETE tombstone.
- e2e: dev-login → tạo bài từ sample text → bài xuất hiện Mine → mở player → rename → delete.
- QA case list kèm plan, chạy control-browser bước cuối.

## 6. Rủi ro

- LLM trả JSON lệch schema → validate + retry ≤3 + lỗi thân thiện; sample text có sẵn để test
  không cần LLM thật (mock qua env `READING_FAKE_LLM=1` chỉ ở dev/test).
- Workers CPU time cho validate JSON lớn là vô năm (parse thuần) — không lo.
- Quota theo TZ: quy ước `Asia/Ho_Chi_Minh` server-side (new Date().toLocaleDateString với
  timeZone cố định) — client không tự tính quota.
