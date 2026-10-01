# 00 — Platform & Data: hợp đồng chung (auth · DB · storage · sync · cache · API)

- **Ngày:** 2026-09-30 · Thuộc bộ `docs/superpowers/specs/fullstack/`
- **Vai trò:** Tài liệu **canonical** — mọi spec domain (10–13) PHẢI tham chiếu doc này, KHÔNG định nghĩa lại schema/endpoint/quy tắc cache. Nếu domain cần thứ không có ở đây, thêm vào section "Đề xuất bổ sung" của spec domain đó và đánh dấu `[CẦN DUYỆT]`.
- **Căn cứ:** design tổng thể (`2026-09-30-hsk-nextjs-workers-migration-design.md`), feature inventory (`2026-09-30-hsk-feature-inventory.md`), `nhaihsk-clone-proposal.md` (§5 API gốc, §6.2 data model gốc).

## 1. Platform nhất định

| Lớp | Chọn | Ghi chú |
|---|---|---|
| Framework | Next.js App Router + TS + Tailwind v4 | qua `@opennextjs/cloudflare` |
| DB | **Cloudflare D1 (SQLite)** + Drizzle ORM | SQLite dialect; không Postgres |
| Cache | **Workers KV** + Cache API | Redis không có trên Workers (xem §7) |
| Object | **R2** | TTS audio, hanzi dataset, subtitles |
| Auth | **better-auth** + D1 adapter | Google + Facebook + email/password; Apple BỎ (bịa trong clone) |
| Validation | zod (shared schemas FE/BE) | |
| Id | user id: TEXT (nanoid/generateId của better-auth) | |
| Thời gian | INTEGER epoch ms (SQLite) hoặc TEXT ISO cho `day`/`month` | khai ở từng bảng |

## 2. Auth

- Provider: Google, Facebook, email/password (better-auth built-in). Session = cookie `better-auth.session_token`, lưu bảng sessions của better-auth.
- Check đăng nhập: trong server component/layout (không dùng middleware).
- Trang gate (F6): server render `🔒` khi chưa login — client không tự quyết.
- **Delete-account (H4):** POST request → tạo `deletion_requests` token gửi email → confirm → xoá cascade (xem §3.3) trong transaction + revoke sessions. Khoảng chờ 0 ngày (xoá ngay sau confirm) — đơn giản, đủ chuẩn App Store.
- Anti-devtools/ban IP của site gốc: **không làm** (proposal §6.4 khuyến nghị bỏ).

## 3. D1 Schema (đầy đủ)

Convention: bảng `snake_case`; FK `user_id → users.id ON DELETE CASCADE`; `updated_at` epoch ms ở mọi bảng mutable (sync LWW dựa vào cột này). Drizzle là nguồn chân lý; SQL dưới là spec.

### 3.1 Danh mục & người dùng

```sql
users(id TEXT PK, email TEXT UNIQUE NOT NULL, name TEXT, avatar_url TEXT,
      provider TEXT CHECK(provider IN ('google','facebook','credential')),
      created_at INTEGER NOT NULL, deleted_at INTEGER)
-- sessions, accounts, verification: bảng chuẩn của better-auth, không tự định nghĩa lại

settings(user_id TEXT PK, prefs_json TEXT NOT NULL)   -- sync prefs A3 [UPG-2, optional]
```

### 3.2 Tiến độ học

```sql
srs_states(id INTEGER PK AUTOINCREMENT, user_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('vocab','grammar')),
      item_key TEXT NOT NULL,           -- '<book>.<page>.<index>' hoặc 'deck.<deckId>.<ord>'
      status TEXT NOT NULL CHECK(status IN ('new','learning','learned','known')),
      due_at INTEGER, review_count INTEGER NOT NULL DEFAULT 0,
      last_reviewed_at INTEGER, updated_at INTEGER NOT NULL,
      UNIQUE(user_id, kind, item_key))
-- SRS chu kỳ 21 ngày, 5 phân loại hiển thị (Cần ôn/Mới thêm/Đang học/Mới thuộc/Đã thuộc dài hạn)
-- là suy diễn từ status + due_at + last_reviewed_at — KHÔNG lưu 5 cột riêng.

page_dones(user_id TEXT, book TEXT, page TEXT, skill TEXT NOT NULL DEFAULT 'vocab',
      done_at INTEGER NOT NULL, PRIMARY KEY(user_id, book, page, skill))

xp_daily(user_id TEXT, day TEXT NOT NULL,        -- 'YYYY-MM-DD' (giờ VN +07)
      xp INTEGER NOT NULL DEFAULT 0, answers INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(user_id, day))
-- xp_daily đồng thời là dữ liệu heatmap 12 tháng (F2) và streak — không bảng heat riêng.

roadmap_progress(user_id TEXT, session_n INTEGER NOT NULL, tab TEXT NOT NULL
      CHECK(tab IN ('learn','flash','quiz','test')), done_at INTEGER NOT NULL,
      PRIMARY KEY(user_id, session_n, tab))

battle_best(user_id TEXT, ctx TEXT NOT NULL,     -- '<book>.<page>' | 'global'
      correct INTEGER NOT NULL, time_ms INTEGER NOT NULL, created_at INTEGER NOT NULL,
      PRIMARY KEY(user_id, ctx))

pvp_monthly(user_id TEXT, month TEXT NOT NULL,   -- 'YYYY-MM' — Đấu trí tháng
      score INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id, month))
```

### 3.3 Nội dung người dùng & cộng đồng

```sql
decks(id TEXT PK, user_id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('vocab','grammar')),
      name TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      deleted_at INTEGER)                        -- tombstone cho sync
deck_rows(id TEXT PK, deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      ord INTEGER NOT NULL, hanzi TEXT NOT NULL, pinyin TEXT,
      han_viet TEXT, meaning TEXT, example_zh TEXT)

notifications(id INTEGER PK AUTOINCREMENT, user_id TEXT,   -- NULL = broadcast tất cả
      type TEXT NOT NULL, title TEXT NOT NULL, body TEXT, link TEXT,
      created_at INTEGER NOT NULL)
notification_reads(notification_id INTEGER, user_id TEXT, read_at INTEGER NOT NULL,
      PRIMARY KEY(notification_id, user_id))

feedback(id INTEGER PK AUTOINCREMENT, user_id TEXT, text TEXT NOT NULL,
      page TEXT, user_agent TEXT, status TEXT NOT NULL DEFAULT 'new',
      created_at INTEGER NOT NULL)

error_reports(id INTEGER PK AUTOINCREMENT, user_id TEXT, book TEXT, page TEXT,
      item_index INTEGER, message TEXT, created_at INTEGER NOT NULL)  -- "Báo lỗi" per item [BACKLOG]

deletion_requests(user_id TEXT PK, token TEXT UNIQUE NOT NULL,
      expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)   -- §2 delete-account

reading_docs(id TEXT PK, user_id TEXT NOT NULL, title TEXT, text TEXT NOT NULL,
      audio_url TEXT, sentences_json TEXT,       -- [{zh, pinyin, vi, t0, t1}] karaoke
      questions_json TEXT, created_at INTEGER NOT NULL)          -- [SP5]

shadowing_progress(user_id TEXT, video_id TEXT NOT NULL, percent INTEGER NOT NULL DEFAULT 0,
      plays INTEGER NOT NULL DEFAULT 0, last_at INTEGER NOT NULL,
      PRIMARY KEY(user_id, video_id))            -- [UPG-3, optional]
```

### 3.4 Thanh toán & quyền hạn (SP4)

```sql
orders(id TEXT PK, user_id TEXT NOT NULL,
      provider TEXT NOT NULL CHECK(provider IN ('momo','stripe')),
      product TEXT,                              -- NULL = donate (không cấp entitlement)
      amount_vnd INTEGER NOT NULL, status TEXT NOT NULL
        CHECK(status IN ('pending','paid','failed','refunded')),
      provider_ref TEXT UNIQUE,                  -- idempotency: 1 webhook 1 lần
      payload_json TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)

free_codes(code TEXT PK, note TEXT, max_uses INTEGER NOT NULL DEFAULT 1,
      used_count INTEGER NOT NULL DEFAULT 0, expires_at INTEGER)
code_redemptions(user_id TEXT, code TEXT, redeemed_at INTEGER NOT NULL,
      PRIMARY KEY(user_id, code))

entitlements(user_id TEXT, product TEXT NOT NULL
      CHECK(product IN ('file_print','tts_premium','reading_ai','all')),
      source TEXT NOT NULL CHECK(source IN ('code','momo','stripe')),
      source_id TEXT, granted_at INTEGER NOT NULL, expires_at INTEGER,
      PRIMARY KEY(user_id, product))
-- Gate FREEHSK (G8) → product 'file_print'; source 'code' khi redeem free_codes.
```

### 3.5 Migration localStorage → D1 (chạy 1 lần lúc login đầu tiên)

| Key `nhai.*` | Đích | Quy tắc merge |
|---|---|---|
| `srs.w.*`, `srs.st.<k>`, `srs.st` (JSON), `srs.t.*`, `srs.g.*`, `srs.new` | `srs_states` | Chuẩn hoá 3 format → item_key; server win nếu `updated_at` mới hơn |
| `pageDone` | `page_dones` | Union |
| `xp`, `today` | bỏ (suy ra từ `xp_daily`) | `xp = Σ xp_daily` |
| `heat` | `xp_daily` | max(local, server) theo day |
| `streak` | suy ra từ `xp_daily` | max |
| `decks`, `notebooks` | `decks` + `deck_rows` | LWW theo `updated_at`; xoá theo tombstone |
| `vocabBook` | `decks` (bộ "Từ điển đã lưu") | Union |
| `battle.best.*` | `battle_best` | max correct, rồi min time_ms |
| `roadmap.pinyin` | `roadmap_progress` | Union |
| `roadmap.learnSeen` | `roadmap_progress` (tab `learn`) | Union |
| `theme`, `voice`, các flag/pref | `settings` | Server win khi rỗng |
| `feedback` | `feedback` | Push rồi xoá local |
| `mockLogin`, `mockName`, `fileCode`, `radAutoplay`, `shadow.*` | mock/`settings`/`free_codes` redeem | fileCode → nợ redeem code FREEHSK ở SP4 |

## 4. Storage ngoài D1

```
R2 bucket R2_TTS:  tts/{provider}/{voice}/{sha1(text|rate|format)}.mp3   -- cache vĩnh viễn
R2 bucket R2_DATA: hanzi-writer/{char}.json        -- dataset nét, lazy load theo chữ [SP3]
                   shadowing-subs/{videoId}.json   -- subtitle track [SP3]
                   reading-audio/{docId}.mp3       -- audio bài đọc [SP5]
KV namespace KV_CACHE:
   lb:{tab}:{period}        → leaderboard snapshot JSON, TTL 600s (khớp gốc 10 phút)
   rl:{ip}:{class}          → counter rate-limit mềm (TTL cửa sổ)
   flags                    → feature flags runtime
```

## 5. Sync protocol (`HybridStore`, SP2)

1. **Local-first:** mọi ghi qua `ProgressStore` → ghi localStorage trước, push vào outbox `nhai.sync.outbox` (mảng op `{entity, key, payload, ts}`).
2. **Flush:** trigger = login, `online` event, `visibilitychange`, throttle 5s; batch ≤50 op; `POST /api/v1/users/sync` — server apply **idempotent** (LWW theo `ts`/`updated_at`).
3. **Pull:** sau login → `GET /api/v1/users/snapshot`; merge theo bảng §3.5; chỉ sau merge mới flush outbox.
4. **Offline:** app dùng được 100% nhờ localStorage; hàng đợi giữ tới khi online (giới hạn 500 op, op cũ nhất gộp theo key).
5. **Xung đột:** XP/page_dones/decks/battle = max/union (commutative, an toàn); srs = LWW; xoá deck = tombstone thắng nếu muộn hơn update. `shadowing_progress` (UPG-3, optional) sync qua outbox cùng `POST /users/sync`: merge = max(percent), sum(plays), max(last_at).

## 6. API conventions

- Base `/api/v1`, cùng domain (Route Handlers Next, chạy trên Worker qua OpenNext).
- Auth: session cookie (better-auth); route public không cần. CSRF theo better-auth.
- Success `200 {data: ...}`; lỗi `{error: {code, message}}` + HTTP status đúng: 401 `UNAUTHENTICATED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 422 `VALIDATION` (zod), 429 `RATE_LIMITED`, 402 `PAYMENT_REQUIRED`, 500 `INTERNAL`.
- Rate limit mềm qua KV `rl:*` theo class: `write` (60/phút/IP), `ai` (20/ngày/user, entitlement tăng), `tts` (200/ngày/user).
- Webhook MoMo/Stripe: idempotent theo `provider_ref`; chữ ký verify trước; KHÔNG nằm sau auth session.
- Mọi write endpoint nhận zod body; thời gian trả về epoch ms.

## 7. Cache — ai cache gì, ở đâu

| Cái | Ở đâu | TTL/luật |
|---|---|---|
| Leaderboard (H1) | KV `lb:*` | 600s, refetch sau đó (khớp gốc 10 phút) |
| TTS audio (A8 server [SP5]) | R2 + Cache API edge | vĩnh viễn (key theo hash nội dung) |
| Hanzi stroke dataset (G2 [SP3]) | R2 + Cache API + browser cache | immutable, `max-age=31536000` |
| Content TS modules (B3, D1–D4, G6) | build-time import, SSG/ISR | không runtime fetch |
| Trang user (F1–F5) | không cache | dynamic, SSR theo cookie |
| API response public (books) | Cache API | 1h + `stale-while-revalidate` |
| Tiến độ client | localStorage (ProgressStore) | nguồn offline, sync §5 |
| **Redis/Upstash** | **không dùng** | KV đủ cho mục đích hiện tại; nếu cần counter nghiêm ngặt (rate-limit phí, SP4) dùng Durable Objects |

## 8. Catalog endpoint (canonical — domain specs chi tiết hoá payload)

```
Auth (better-auth dựng sẵn, prefix /api/v1/auth):
  POST /sign-in/social · /sign-in/email · /sign-up/email · /sign-out · GET /get-session

User & sync (SP2):
  GET  /users/me                     → profile, entitlements, counters (xp, streak, today,
                                       rank, heat365 — 365 ngày cho heatmap F2)
  GET  /users/snapshot               → toàn bộ tiến độ cho merge §5
  POST /users/sync                   → outbox batch, idempotent
  GET  /users/srs?book=&kind=        → list; ?book= lọc prefix item_key ("Tổng ôn" toàn khóa)
  PUT  /users/srs                    → batch upsert, tối đa 200 item/lần ("Thêm cả bài vào ôn tập")
  POST /users/page-dones             → đánh dấu hoàn thành bài
  POST /users/xp                     → +XP (cap server theo ngày, chống nhâm)
  PUT  /users/roadmap-progress       → done tab/session
  GET/PUT /users/battle-best · PUT /users/pvp-monthly
  GET/POST /users/decks · PUT/DELETE /users/decks/:id · POST/PUT/DELETE /users/decks/:id/rows[/:rowId]
  PUT  /users/settings
  GET  /users/notifications · POST /users/notifications/mark
  POST /users/delete-account/request · POST /users/delete-account/confirm

Công khai:
  GET  /books                        → metadata 7 sách (wrap của content module)
  GET  /leaderboard?tab=xp|battle    → qua KV snapshot §7
  POST /feedback
  POST /error-reports                 [BACKLOG]
  GET  /devtools · /ip               → stub 204 (giữ shape gốc, không ban)

Thanh toán (SP4):
  POST /payments/momo/create · POST /payments/momo/webhook
  POST /payments/stripe/checkout · POST /payments/stripe/webhook
  GET  /entitlements/me · POST /codes/redeem

AI & TTS (SP5):
  POST /ai/chat                      → SSE stream (widget A5, Format bằng AI G7)
  POST /ai/format-vocab              → parse text → rows deck
  POST /ai/handwrite                 → nhận dạng vẽ tay G1 [UPG-5, provider-backed]
  POST /tts                          → {audioUrl} hoặc redirect R2; cache §7
  GET  /shadowing/catalog            → chỉ khi thư viện >200 video [UPG-3, optional];
                                       dưới ngưỡng đó content module build-time là đủ
```

Cron: refresh KV `lb:*` leaderboard bằng wrangler `triggers.crons` (mỗi 10 phút) — trước cron fire, request đọc KV snapshot cũ là chấp nhận được.

## 9. Bindings (wrangler.jsonc)

```
DB (D1) · R2_TTS (R2) · R2_DATA (R2) · KV_CACHE (KV)
AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, FACEBOOK_CLIENT_ID/SECRET
MOMO_PARTNER_CODE/ACCESS_KEY/SECRET_KEY, STRIPE_SECRET_KEY/WEBHOOK_SECRET
TTS_PROVIDER_KEY, AI_PROVIDER_KEY
```

## 10. Testing platform

- Migration §3.5: unit test với fixture localStorage thật của clone (cả 3 format SRS).
- Sync §5: test xung đột (cùng item 2 máy, offline 500 op, tombstone vs update).
- Webhook: test idempotency + chữ ký sai → 403.
- Leaderboard: test TTL KV + tính toán rank đúng tại boundary ngày.

## Phụ lục — Amendments sau review domain specs (2026-09-30)

Các mục `[CẦN DUYỆT]` kỹ thuật từ spec 10–13 đã được hợp nhất vào các section trên:

1. `deletion_requests` — bổ sung định nghĩa bảng (§3.3, trước đó chỉ nêu ở §2).
2. `orders.product` nullable — donate = order đã trả tiền không cấp entitlement (§3.4).
3. `shadowing_progress` sync qua outbox `POST /users/sync` (§5).
4. `GET /users/me` trả thêm `rank` + `heat365`; `GET /users/srs?book=` lọc prefix item_key; `PUT /users/srs` nhận tối đa 200 item (§8).
5. `POST /ai/handwrite` (G1, UPG-5) + `GET /shadowing/catalog` (chỉ khi >200 video) vào catalog (§8).
6. Cron refresh KV leaderboard qua `triggers.crons` (§8).
7. Binding `EMAIL_API_KEY` cho email xác nhận delete-account (§9).

Còn lại là **quyết định kinh doanh cần owner chốt** (không chặn SP1–SP2): bảng giá VND các gói SP4, hạn mức AI/ngày cụ thể (đang đề xuất 20/ngày/user), mức giá TTS provider.
