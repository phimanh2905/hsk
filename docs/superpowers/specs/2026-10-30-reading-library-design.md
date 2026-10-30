# Spec: Reading Phase 1 — Thư viện bài đọc theo level + trình đọc mp3 word-timing + quiz evidence

- Ngày: 2026-10-30
- Trạng thái: Approved (owner duyệt 2026-10-30 sau brainstorm RE nhaihsk)
- Phân loại: phân hệ mới trên nền có sẵn (D1 content, ProgressStore, karaoke engine, pipeline Kokoro)

## 1. Bối cảnh

`/reading` hiện là bản port mock: karaoke TTS runtime theo câu, 15 passage hardcode gắn
book/lesson (`src/content/reading-passages.ts`), không có library theo level, không có audio
bản xứ, không lưu progress. RE nhaihsk.com/reading (memory `hsk-reading-competitor-re`) cho thấy
giá trị thật của phân hệ: **library theo level HSK + trình đọc mp3 bản xứ highlight theo từ +
loop câu + seek + quiz có evidence highlight**. Owner duyệt phase 1 gồm: library theo level,
pre-render mp3 + timing ước lượng, MCQ + evidence highlight.

Hướng tham chiếu đối thủ (observed từ code client nhaihsk — không copy code):
tab level + card ngang scroll + load-more + View All; player 1 nguồn audio có word timing,
click chunk → seek, prev/next câu, loop câu, tốc độ, toggle pinyin ruby, toggle dịch câu,
auto-scroll; quiz MCQ reveal evidence gạch chân đúng đoạn văn + scroll tới; progress per
reading `{correct, total, attempts, completedAt}` sync server.

## 2. Non-goals (Phase 1)

- Không làm tab "Bài của tôi" / AI generate (Phase 2).
- Không làm memo/ghi chú theo câu, không làm analysis/clues/tip cho quiz.
- Không nhập bài đọc vào trạm roadmap (roadmap v2 đang chờ duyệt riêng).
- Không đổi engine TTS runtime (`useTts`) dùng ở nơi khác; không đụng pinyin/shadowing audio.
- Không đổi schemaquiz của lesson reading mode (`src/components/lesson/modes/reading.tsx`).

## 3. Nội dung & dữ liệu

### 3.1 Passage mở rộng

- Nguồn: `scripts/content/data/reading/passages-hsk{1..5}.json` (hiện 3/level) → mục tiêu
  **≥6 bài/level** (tổng ≥30) bằng tool `gen-reading.mts` đã có (manual, cần CONTENT_LLM_*).
- Passage mở rộng phải thêm field `evidence` cho questions (xem 3.4). Passage cũ 15 bài giữ
  nguyên, evidence optional.

### 3.2 Bảng D1 `content_readings` (schema.ts, pattern content_*)

| cột | kiểu | ghi chú |
|---|---|---|
| id | text PK | `hsk1-reading-1` |
| level | text | `hsk1`..`hsk5` |
| ord | integer | thứ tự trong level |
| title / titleVi | text | |
| sentences | json | `[{zh, py, vi, durSec, audio}]` — durSec đo ffprobe lúc render; audio = tên file tương đối trong audioDir |
| vocab | json | `[{word, py, vi}]` |
| questions | json | `[{q, qVi, options[], answer, evidence?}]` |
| audioDir | text | `audio/reading/hsk1-reading-1` (đường dẫn public/ tương đối) |
| chars / durationSec | integer | meta cho card |

- Migration `drizzle/` mới bằng `drizzle-kit generate`, apply bằng wrangler (local hsk-dev,
  remote hsk) — KHÔNG `drizzle-kit migrate`.
- Seed: `scripts/seed/gen-reading-seed.mts` (mới, pattern `gen-grammar-seed.mts`) →
  `drizzle/seeds/content-readings.sql`, idempotent INSERT OR REPLACE; JSON column escape `'`
  và encode `;` thành `\u003b` (quy tắc đã cắn 2 lần — xem AGENTS.md).

### 3.3 Audio pre-render

- Script **`scripts/content/render-reading-audio.py`** (mới, base trên
  `render-dialogue-audio.py`): đọc passages-hskN.json → render **1 mp3/câu** 24kHz mono 32k,
  voice `zf_001`, vào `public/audio/reading/{id}/{sent}-{n}.mp3`; đo duration ffprobe và ghi
  lại `durSec` vào output JSON `scripts/content/data/reading/audio-index.json` (committed,
  feed vào seed).
- Timing theo từ: **ước lượng** — trong 1 câu, mỗi ký tự Hán chiếm tỉ lệ
  `len(normalize(câu_char))/durSec` (bỏ dấu câu, số đếm gấp đôi). Chỉ ước lượng trong câu;
  biên giới câu dùng `durSec` thật → loop câu + seek câu chính xác tuyệt đối.
- Budget: ~30 bài × ~10 câu ≈ 300 mp3 ≈ 15–20MB → nằm trong static assets (còn dư ≥150MB).
- QA gate như pinyin: duration 0.3–20s/câu, RMS > -50 dBFS; fail → report + exit ≠ 0.
- CLI: `--dry-run`, `--only <passageId>`, `--force`.
- Player thiếu file mp3 (dev chưa render) → fallback TTS runtime per câu (engine karaoke hiện có).

### 3.4 Quiz evidence

- `ReadingQuestion` thêm `evidence?: { si: number; s: number; e: number }[]` — mảng đoạn
  (sentence index, char start/end trong câu, khớp text zh không normalize). Generator
  `gen-reading.mts` + validate cập nhật: evidence bắt buộc với passage mới (check 0 ≤ s < e ≤
  len(sentence)), optional với 15 bài cũ.
- Trên UI: sau khi chọn đáp án, các đoạn evidence được highlight (bg-main-hi/60 + underline)
  và auto-scroll tới đoạn đầu tiên.

## 4. Kiến trúc client

### 4.1 Data client & API

- `src/lib/content/readings-client.ts` (mới, pattern `vocab-client.ts`): `loadReadings():
  Promise<ReadingDoc[]>` fetch `/api/v1/content/readings`, promise cache module-level.
- API `src/app/api/v1/content/readings/route.ts` (mới, pattern vocab route):
  `getReadings()` server-only đọc D1 (pattern `src/lib/content/shadowing.ts`), Cache-Control
  CDN 1h.
- Type `ReadingDoc` khai báo ở `src/lib/content/readings.ts` (server) — shape khớp
  content_readings; client chỉ type-import.

### 4.2 Player — `src/components/reading/reading-player.tsx` + `use-reading-player.ts`

- Hook `useReadingPlayer(sentences: PlayerSentence[])` với `PlayerSentence = {zh, py, vi,
  audio: string | null, durSec: number}`:
  - state: `playing`, `curIdx`, `charPos {row, char}`, `rate`, `loopSentence`, `curTime`,
    `duration` (tổng durSec).
  - Nguồn audio: nếu `audio` có file → dùng `new Audio()` per câu,preload câu kế; hết câu →
    sang câu kế hoặc replay nếu loopSentence; thiếu file → fallback karaoke TTS hiện có
    (`useKaraoke` wrap lại bên trong hook, cùng interface).
  - Timing: rAF/timer vẽ charPos từ `elapsedInSentence / durSec × sentenceCharLen`;
    biên câu nhảy theo câu (không highlight xuyên dấu câu).
  - Controls: play/pause, prev/next câu, loop câu toggle, speed 0.5/0.75/1/1.25/1.5 (rate
    áp cả audio element lẫn TTS fallback), seek slider map global time → câu+offset,
    click câu/cụm → seek, toggle pinyin, toggle dịch (dịch hiện dưới từng câu), auto-scroll
    câu hiện tại vào viewport.
- Component `ReadingPlayer` render bài + toolbar sticky (giống shadowing player về visual
  ngôn ngữ Hanzi: border-2, rounded-base, shadow-shadow, không hard-code màu).

### 4.3 Library UI — viết lại `src/app/(app)/reading/page.tsx` + `reading-client.tsx`

- Layout mới: header (mascot read_hdr3_300.png đã có) + **tab level** (Tất cả/HSD 1..5) +
  mỗi level một section: hàng card ngang scroll (snap-x, mũi tên trái/phải hiện khi tràn),
  card = thumbnail speckle + title zh + titleVi + meta (duration · chars) + badge Done.
  Nút "Xem tất cả" → `?level=hskN` lọc 1 level dạng grid (back về list đầy đủ).
- Card và player cùng trang (open bài → thay view trong trang, URL `/reading/{id}` dùng
  client-state + `?reading=` param cho deep-link; KHÔNG tạo route mới — giữ 1 route `/reading`
  như hiện tại để tránh đụng routegroup).
- Panel: Từ vựng (vocab có sẵn) và Quiz bên dưới bài.
- Đề xuất phương pháp 6 bước (Callout hiện có) giữ lại.

### 4.4 Progress & sync

- `progress-store`: domain mới `readingProgress` — key `nhai.reading.progress`,
  `Record<string, {correct: number; total: number; attempts: number; completedAt: string}>`,
  API `getReadingProgress() / saveReadingProgress(id, correct, total)` (attempts++ và giữ
  max correct như đối thủ).
- XP: lần **đầu tiên** đạt ≥60% câu đúng → `addXp(total * 10)`, các lần sau không cộng.
- Sync: domain thứ 5 `readingProgress` vào HybridStore PATCHES + `sync-merge.ts`
  (`SyncReadingRecord`, merge per-key theo updatedAt — pattern lessonProgress) + bảng D1
  `reading_progress` (userId, readingId PK, correct, total, attempts, completed_at,
  updated_at) + route `/api/v1/sync` nhận thêm domain (pattern có sẵn).

## 5. Testing

- Unit (vitest jsdom): timing ước lượng (character weight), hook player (play/next/loop/rate
  với audio stub), evidence highlight range, readings-client cache, seed generator test
  (scripts/__tests__), sync-merge readingProgress.
- e2e (playwright): mở /reading → thấy tab level + card → mở bài 1 → player phát (mock audio)
  → trả lời quiz → badge Done + progress ghi.
- QA case list kèm plan Phase 1, chạy control-browser ở bước cuối.

## 6. Rủi ro

- gen-reading cần LLM env → task chạy manual, có thể giảm mục tiêu còn 3+3 bài/level nếu LLM
  không khả dụng (ngưỡng ship: ≥4 bài/level).
- Static assets file count: +300 mp3 + pinyin pipeline → vẫn dưới 20k.
