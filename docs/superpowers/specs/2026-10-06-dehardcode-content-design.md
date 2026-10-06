# Dehardcode: content → D1, user data → D1, config tập trung

- **Ngày:** 2026-10-06
- **Trạng thái:** Đã duyệt (brainstorming 2026-10-06)
- **Phạm vi:** `app-next`
- **Liên quan:** `2026-09-30-hsk-nextjs-workers-migration-design.md` (kiến trúc OpenNext + D1), SP2 auth (better-auth, bảng `user`)

## 1. Bối cảnh và vấn đề

App hiện lưu **toàn bộ content học tập** dưới dạng static TS trong `src/content/` (~21 file,
~6.700 dòng): vocab, shadowing, roadmap, hanzi, pinyin, radicals, courses, dictionary,
grammar-points, reading… D1 chỉ có 6 bảng auth + user progress (`user`, `session`, `account`,
`verification`, `shadowing_progress`, `notebook_entries`). Mọi trang content đều SSG từ data
trong code — **đổi 1 từ vựng = sửa code + deploy**.

Phát hiện chính từ audit 2026-10-06:

| Nhóm | Hiện trạng |
|---|---|
| Content trong code | 21 file `src/content/`, không dataset nào có bảng D1 |
| Trùng lặp dữ liệu | `MOCK_ROWS` (notebooks.ts) trùng vocab; `courses`/`books` metadata chồng nhau; chữ 你 có stroke data ở 2 file với 2 hệ tọa độ |
| Dữ liệu user giả | `leaderboard.ts` (10 tên + XP mock), `review.ts` (stats mock cho dashboard) |
| Business rules cứng | `DAILY_GOAL_XP = 20` (home-summary.ts), scoring shadowing, SRS levels |
| Config | `sitemap.ts` fallback `http://localhost:3100`, `robots.ts` fallback `https://byehsk.example`, `auth.ts` fallback `process.env` cho secrets |

## 2. Mục tiêu / Phi mục tiêu

**Mục tiêu:**
1. Content **hay thay đổi** nằm trong D1 — sửa được không cần deploy.
2. Content **tham chiếu tĩnh** (pinyin, radicals…) giữ trong code nhưng đi qua một content
   layer thống nhất, sẵn sàng chuyển D1 sau nếu cần.
3. Dữ liệu user (XP, streak, SRS, stats dashboard, leaderboard) nằm trong D1 theo user,
   thay thế mock.
4. Xóa trùng lặp mock (`MOCK_ROWS`, `leaderboard.ts`, `review.ts`).
5. Fix các điểm config rủi ro (SITE_URL, secrets fallback).

**Phi mục tiêu:**
- Không làm admin UI chỉnh content (chỉnh bằng SQL/seed script là đủ ở giai đoạn này).
- Không đưa pinyin matrix / radicals / soundrules vào D1 — dữ liệu tham chiếu không đổi.
- Không đổi logic học tập (scoring, SRS thuật toán) — chỉ tách hằng số config nếu cần.

## 3. Phương án đã cân nhắc

- **A — Toàn bộ content vào D1:** từ chối. ~21 dataset phải chuyển cùng lúc; gần như mọi
  trang phải bỏ SSG chuyển dynamic (build-time không truy vấn được D1 qua OpenNext); phần
  lớn dữ liệu là tham chiếu tĩnh không có lợi khi đưa vào D1.
- **B — Hybrid + content layer (CHỌN):** chia content theo đặc tính, chuyển từng bước qua
  một content layer trung gian; trang chỉ chuyển SSG → dynamic đúng khi dataset của nó lên D1.
- **C — Chỉ dọn dẹp:** từ chối — không giải quyết "sửa 1 từ phải deploy".

## 4. Kiến trúc

### 4.1 Content layer (`src/lib/content/`)

Một module trung gian duy nhất giữa pages và nguồn dữ liệu:

```
src/lib/content/
  index.ts        — facade: getVocab(book), getCourses(), getShadowing(), ...
  vocab.ts        — implementation: đọc D1
  shadowing.ts    — implementation: đọc D1
  static-pinyin.ts, static-radicals.ts, ... — re-export từ src/content/* (chưa chuyển)
```

Quy tắc:

- **Interface bất đồng bộ ngay từ đầu** (`Promise<T>`) dù dataset vẫn là static — để việc
  đổi nguồn không làm đổi chữ ký mà pages gọi.
- Dataset D1-backed: implementation dùng `createDb()` (src/lib/db/index.ts), chỉ chạy
  server-side. Pages là server components; client components cần data phải qua API route.
- Dataset static: implementation re-export từ `src/content/*` (giữ import client-side trực
  tiếp được cho các trang pinyin/radicals đang dùng data ở client).
- Pages **không import trực tiếp** từ `src/content/*` nữa (trừ module static qua facade).
- Mỗi lần chuyển 1 dataset sang D1 chỉ sửa implementation bên trong facade — pages không đổi.

### 4.2 Schema D1 (content)

Migrations drizzle mới, đặt trước bảng tên `content_*` để tách khỏi bảng auth/user.
Cấu trúc lồng nhau (examples, subtitles…) lưu **cột JSON** — tránh explode quan hệ cho
dữ liệu đọc nhiều/ghi hiếm:

| Bảng | Nguồn | Ghi chú |
|---|---|---|
| `content_vocabs` | vocab.ts | book, lesson, hanzi, pinyin, hanviet, meaning, examples JSON |
| `content_courses` | courses.ts | books + lessons, gộp 2 cấu trúc `courses`/`books` đang chồng lặp thành 1 nguồn |
| `content_shadowing_playlists` | shadowing.ts | metadata playlist |
| `content_shadowing_videos` | shadowing.ts | FK playlist, videoId, title |
| `content_shadowing_subtitles` | shadowing.ts | FK video, sentences JSON |
| `content_roadmap_stations` | roadmap-stations.ts | levelId, order, vocab/grammar JSON |
| `content_reading_docs` | reading.ts | doc JSON |
| `content_dictionary` | dictionary.ts | entry JSON |
| `content_grammar_points` | grammar-points.ts | point JSON |

Index trên các cột truy vấn chính (book, playlist, level). Mỗi dataset có 1 file migration
riêng + 1 file seed SQL riêng để chuyển độc lập.

### 4.3 API content

`/api/v1/content/<dataset>` — GET, trả JSON, shape khớp type hiện có trong `src/content/schema.ts`
(không đổi type client). Dùng cho client components; server components đọc D1 trực tiếp qua
content layer. Cache: response header `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`
(content đổi hiếm).

### 4.4 SSG → dynamic

- Dataset lên D1 ⇒ các trang dùng nó chuyển `export const dynamic = "force-dynamic"`.
  **Không truy vấn D1 trong `generateStaticParams`/build** (bẫy build-time binding đã gặp ở SP2).
- Route động kiểu `lesson/[book]/[page]`: bỏ `generateStaticParams`, chuyển dynamic.
- Nếu sau này cần lại SSG: chụp snapshot D1 ra JSON tại build (việc tương lai, không làm trong
  scope này).

### 4.5 Dữ liệu user (Pha 3)

Bảng generic khớp mô hình key hiện có của `progress-store.ts` (localStorage keys `bye.*`):

```sql
user_progress (
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  key     TEXT NOT NULL,            -- 'bye.xp', 'bye.streak', 'bye.srs.items', ...
  value   TEXT NOT NULL,            -- JSON
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, key)
)
```

- **Nguồn sự thật:** đã đăng nhập ⇒ D1; chưa đăng nhập ⇒ localStorage như hiện tại.
  `progress-store` thêm sync layer: khi login thì push local → D1 (merge theo updated_at),
  khi load thì pull D1 → cache.
- **Leaderboard:** query `SELECT u.name, p.value FROM user_progress p JOIN user u … WHERE key='bye.xp'`
  sắp xếp giảm dần, top 10. API `/api/v1/leaderboard`. Thay `leaderboard.ts`.
- **Dashboard thống kê (review):** API `/api/v1/stats/summary` tổng hợp từ `user_progress`
  của user (cần ôn / đã thuộc / streak / phân bố SRS). Thay `review.ts`.
- `DAILY_GOAL_XP` chuyển vào `src/lib/config.ts` chung.

## 5. Các pha triển khai

### Pha 0 — Fix config + nội dung trùng lặp (nền móng, độc lập)
1. `src/lib/config.ts`: export `SITE_URL` — đọc `NEXT_PUBLIC_SITE_URL`, throw khi thiếu ở
   prod build. `sitemap.ts` và `robots.ts` dùng chung, xóa 2 fallback cứng.
2. `auth.ts`: bỏ fallback `process.env` cho `BETTER_AUTH_SECRET`/`GOOGLE_CLIENT_ID`/
   `GOOGLE_CLIENT_SECRET` khi `NODE_ENV === "production"` (local dev vẫn đọc .env.local).
3. `notebooks.ts`: `MOCK_ROWS` thay bằng đúng 12 từ đó nhưng pinyin/hán-việt/meaning lấy
   chuẩn từ `content/vocab.ts` (xóa drift giữa 3 file; id/tên/count/updatedAt của sample
   giữ nguyên, hành vi render không đổi).
4. `soundrules.ts`: `toneColors` hex cứng → CSS token của theme.

### Pha 1 — Content layer + vocab + shadowing (dataset đau nhất)
1. Dựng `src/lib/content/` facade (mục 4.1), trỏ facade về `src/content/*` cũ cho toàn bộ
   dataset — pages đổi sang facade, hành vi không đổi.
2. Migration D1 + seed cho `content_vocabs` (từ vocab.ts).
3. Migration + seed cho 3 bảng shadowing (playlists/videos/subtitles).
4. Implementation D1 trong facade; 2 dataset này chuyển server-side; trang
   `/course`, `/lesson/[book]/[page]`, `/shadowing/*` chuyển dynamic.
5. API `/api/v1/content/vocab`, `/api/v1/content/shadowing` cho client components.

### Pha 2 — Các dataset còn lại
`courses`, `roadmap-stations`, `reading`, `dictionary`, `grammar-points` lần lượt qua
cùng quy trình: migration + seed → implementation D1 → trang chuyển dynamic. Gộp
`courses`/`books` thành 1 nguồn. Stroke data 你 trùng ở `hanzi.ts`/`hanzi-strokes.ts`:
chọn 1 hệ tọa độ, file kia reference lại.

### Pha 3 — User data + xóa mock
1. Migration `user_progress` + sync layer trong `progress-store` (login = nguồn sự thật D1).
2. API `/api/v1/leaderboard`, `/api/v1/stats/summary`; trang leaderboard + dashboard
   thống kê đọc data thật; xóa `leaderboard.ts`, `review.ts`.
3. `DAILY_GOAL_XP` về `src/lib/config.ts`.

## 6. Xử lý lỗi

- Content layer: thiếu row/dataset trong D1 → throw error rõ (`ContentNotFoundError`)
  kèm tên dataset; trang render error boundary thay vì trang trắng.
- API content: 404 khi dataset/param không tồn tại; 500 có log khi DB lỗi.
- Sync `user_progress`: xung đột merge theo `updated_at` mới hơn thắng; sync lỗi không
  chặn UI (fail silent + retry lần sau).
- Seed script: idempotent (`INSERT OR REPLACE` theo key/unique index).

## 7. Testing

- **Vitest:** facade content layer (mock D1 binding), API content routes, sync layer của
  progress-store (merge logic), `SITE_URL` fail-fast.
- **Quy tắc port 1:1:** sau seed, so khớp output facade D1 với data static gốc (test so
  shape/count giữa 2 nguồn trong lúc chuyển).
- **Playwright e2e:** smoke các trang đã chuyển dynamic (`/course/hsk1`, `/lesson/hsk1/1`,
  `/shadowing`, leaderboard) chạy trên `wrangler dev` với D1 local đã seed.
- Typecheck + lint sạch trước mỗi pha merge.

## 8. Rủi ro và lưu ý

| Rủi ro | Giảm thiểu |
|---|---|
| Quên chuyển 1 trang sang dynamic ⇒ build fail hoặc data cũ | Chuyển trang cùng commit với implementation D1 của dataset đó; e2e chặn |
| D1 local mỗi máy một DB | Seed script chạy được bằng 1 lệnh, ghi vào README bước seed |
| Client components đang import content trực tiếp | Audit import khi dựng facade; dataset D1 buộc qua API |
| `user_progress` generic chậm dần nếu query phức tạp | Chấp nhận — khối lượng user data nhỏ; tách bảng riêng khi có dấu hiệu |
| Secrets prod thiếu sau khi bỏ fallback | Kiểm tra wrangler secretlist trước deploy (đã có sẵn trên prod) |
