# 13 — Social · Monetization · AI (SP2 phần social, SP4, SP5)

- **Ngày:** 2026-09-30 · Thuộc bộ `docs/superpowers/specs/fullstack/`
- **Phạm vi:** feature ID **A1b, A5, H1, H2, H4** (mục 1, 8 của feature inventory) + **SP4 Monetization** (trang `/nang-cap`, MoMo/Stripe, redeem FREEHSK, donate) + **SP5 AI & TTS** (A5, G7-Format-AI, TTS server, G1-handwrite, G3-karaoke).
- **Tham chiếu:**
  - Hợp đồng canonical: `fullstack/00-platform-data.md` (§2 auth/delete-account, §3.3 notifications/feedback, §3.4 orders/free_codes/entitlements, §4 KV/R2, §6 rate limit + webhook idempotency, §8 catalog endpoint) — dưới đây gọi là **00 §n**. KHÔNG định nghĩa lại schema/endpoint nào đã có ở đó.
  - Feature inventory: `2026-09-30-hsk-feature-inventory.md` (A1b/A4/A5/H1–H4, ma trận SP mục 10).
  - SPEC clone: `clone/specs/SPEC-01-home-course-leaderboard.md` (§3 leaderboard, §4 feedback), `clone/specs/SPEC-15-misc-gaps.md` (§6 mascot AI kép 🤖+🍅).
  - Code tham khảo: `clone/js/shell.js` (login modal A4, AI widget A5, chuông thông báo A1b), `clone/js/leaderboard.js`, `clone/js/feedback.js`.
  - Site gốc: `nhaihsk-clone-proposal.md` §4.6 (XP +1/câu, BXH top 10 cập nhật 10 phút, Đấu trí tháng), §4.8 (Hỏi AI, donate `/api/v1/users/donate`, notifications), §5 (API surface), `/nang-cap` disallow trong robots; §6.4 anti-devtools — **bỏ** theo 00 §2.

## 1. Tổng quan — ranh giới SP1 → UPG; sơ đồ luồng

### 1.1 Ranh giới SP1 mock → nâng cấp

| Mục | SP1 (port mock) | Nâng cấp |
|---|---|---|
| A1b thông báo | 3 item cứng trong topbar | **UPG-2:** GET `/users/notifications` + `POST /users/notifications/mark`, bảng `notifications`/`notification_reads` (00 §3.3) |
| A4/F6 login | Modal mock `nhai.mockLogin` | **UPG-2:** better-auth (Google + Facebook + email) — spec chính thuộc SP2 domain 10; A5/H1 chỉ phụ thuộc session |
| A5 AI widget | Mascot kép + reply cứng 400ms | **UPG-5:** POST `/ai/chat` SSE streaming |
| H1 leaderboard | 10 hàng cứng trong `leaderboard.js` | **UPG-2:** D1 thật + KV `lb:*` TTL 600s (00 §4, §7) |
| H2 feedback | Lưu `nhai.feedback` local | **UPG-2:** POST `/feedback`, bảng `feedback` (00 §3.3) |
| H4 delete-account | Toast giả | **UPG-2:** request/confirm token + cascade (00 §2, §8) |
| G8 gate in-file | Mã FREEHSK check local | **UPG-4 (SP4):** entitlement thật qua `/codes/redeem` hoặc MoMo/Stripe (chi tiết UI ở domain 12 §G8; SP4 spec phần backend + `/nang-cap`) |
| G7 "Format bằng AI" | Mock chuẩn hoá + toast | **UPG-5 (SP5):** POST `/ai/format-vocab` |
| Donate | Có button "Ủng hộ" (site gốc có API `/users/donate`) | **SP4:** QR + ghi nhận đơn, không entitlement |

### 1.2 Sơ đồ luồng thanh toán (SP4)

```
User → /nang-cap ──chọn gói──► POST /payments/momo/create (hoặc /payments/stripe/checkout)
  server: zod validate → INSERT orders(status='pending', amount, product)
          → gọi provider: MoMo (signature HMAC-SHA256) / Stripe (Checkout Session)
  ◄── {payUrl / qrUrl} hoặc app-to-app deeplink
User ──thanh toán──► MoMo app / Stripe hosted page
Provider ──IPN/webhook──► POST /payments/{momo|stripe}/webhook   [KHÔNG qua auth session]
  server: 1) verify chữ ký (MoMo HMAC / Stripe sig header)
          2) idempotency theo orders.provider_ref UNIQUE — đã paid → trả 200 ngay
          3) UPDATE orders(paid) → UPSERT entitlements(user_id, product)
          4) INSERT notifications(type='payment', title='Nâng cấp thành công…')
User ──redirect về /nang-cap?status=success──► client poll GET /entitlements/me
  (trạng thái chờ: banner "Đang xử lý thanh toán… tự cập nhật trong ~1 phút")
```

### 1.3 Sơ đồ luồng AI (SP5)

```
Client (A5 widget / G7 format / TTS / reading)
  → POST /api/v1/ai/chat (Accept: text/event-stream)  |  POST /ai/format-vocab  |  POST /tts
Server Worker:
  1) session auth → check entitlement 'reading_ai'/'all' cho chat premium (rate class 00 §6: ai 20/ngày/user)
  2) rate limit KV rl:{user}:{class} → 429 nếu vượt
  3) chat: dựng messages[] (system prompt VI + lịch sử ≤10 lượt) → gọi provider (AI_PROVIDER_KEY)
     → pipeline SSE: chunk provider → re-emit `data: {"delta":"..."}` → kết thúc `data: [DONE]`
  4) format-vocab: parse JSON từ LLM → zod → [{hanzi,pinyin,han_viet,meaning}] (1 response, không stream)
  5) tts: key = sha1(text|voice|rate) → R2_TTS tts/{provider}/{voice}/{key}.mp3 → hit → trả audioUrl;
     miss → gọi TTS provider → stream ghi R2 → trả audioUrl
```

## 2. Spec từng tính năng

### A1b — Thông báo thật [UPG-2]

- **Frontend:**
  - Topbar giữ chuông thông báo (SP1: 3 item cứng). UPG-2: mở dropdown → `GET /api/v1/users/notifications?limit=20&unread=1` → render danh sách: icon theo `type`, `title` đậm, `body` 1–2 dòng, `link` là `<a>` điều hướng; badge số chưa đọc trên chuông.
  - State: `useNotifications()` — `{items, unread, loading}`; optimistic mark-read khi bấm item (gọi `POST /users/notifications/mark` body `{ids:[...]}` hoặc `{all:true}`); refetch khi mở dropdown (không polling nền, không WebSocket — ngoài scope).
  - Broadcast (`user_id` NULL) hiện cho mọi user đã login; item đã mark của broadcast lưu theo `notification_id` + user.
  - Chưa login → chuông ẩn hoặc mở login modal A4 (giữ hành vi clone).
- **Backend:** 2 endpoint 00 §8: `GET /users/notifications` (auth; JOIN reads → `read:boolean`; sort `created_at` DESC; pagination cursor `created_at,id`); `POST /users/notifications/mark` (zod `{ids?: number[], all?: boolean}`; upsert `notification_reads`; trả `{unread: n}`). Nguồn phát thông báo: hệ thống nội bộ (webhook payment thành công, welcome sau login đầu, thông báo thủ công) — không có push ngoài.
- **DB:** `notifications` + `notification_reads` (00 §3.3) — không thêm cột.
- **Cache/rate limit:** không cache (dynamic theo user). Class `write` cho mark (00 §6).
- **Acceptance criteria:**
  1. User A có 1 broadcast + 1 notification riêng → dropdown hiện đủ 2, badge = số chưa đọc đúng.
  2. Bấm 1 item → optimistic đổi màu đã đọc; sau reload vẫn đã đọc (bảng reads).
  3. Mark `all` trên 2 user khác nhau chỉ ảnh hưởng user đó (broadcast không "đọc hộ" user khác).

### H1 — Leaderboard thật [UPG-2]

- **Frontend:**
  - Route `/leaderboard?tab=xp|battle` giữ nguyên UI theo SPEC-01 §3: 2 tab pill (active nền đỏ), paragraph mô tả "Top 10 học viên chăm nhất — mỗi câu trả lời đúng +1 XP", 10 hàng: hạng 🥇🥈🥉/#4…#10, avatar tròn 2 chữ cái, tên, điểm.
  - SP1: data cứng từ `leaderboard.js` port sang content module. UPG-2: server component fetch snapshot (server-side, không lộ KV ra client) → đổ cùng shape `{tab, rows:[{rank, name, initials, score}]}`; phần còn lại của trang tĩnh.
  - Note "Cách tính điểm" giữ nguyên văn, thêm "Bảng xếp hạng cập nhật tối đa 10 phút một lần" (khớp TTL 600s).
- **Backend:** `GET /api/v1/leaderboard?tab=xp|battle` (00 §8, public):
  - `tab=xp` → tổng XP: `SELECT user_id, SUM(xp) FROM xp_daily GROUP BY user_id ORDER BY SUM DESC LIMIT 10`; hihoà theo **ai đạt trước xếp trước**: tie-break bằng `MIN(day)` đạt điểm đó — đơn giản hoá: sort `score DESC, user_id ASC` và ghi chú [CẦN DUYỆT §3] nếu muốn tie-break chính xác theo thời gian đạt.
  - `tab=battle` → `SELECT user_id, score FROM pvp_monthly WHERE month = <YYYY-MM hiện tại, giờ VN +07> ORDER BY score DESC LIMIT 10`.
  - JOIN users lấy name/avatar (avatar_url → initials fallback 2 chữ cái). Người dùng hiện tại (nếu có session) trả thêm `{me: {rank, score}}` (tìm trong full list; ngoài top 10 vẫn trả rank).
  - Snapshot ghi KV `lb:{tab}:{period}` (period = `all` cho xp, `YYYY-MM` cho battle) TTL 600s (00 §4, §7); rebuild bằng "stale-while-revalidate": hit KV → trả; miss/hết hạn → query D1, ghi KV, trả. Không CRON bắt buộc; CRON rebuild mỗi 10 phút là tối ưu hoá [BACKLOG].
- **DB:** chỉ đọc `xp_daily`, `pvp_monthly`, `users` (00 §3.1–3.2). Không bảng leaderboard riêng.
- **Cache/rate limit:** KV TTL 600s; page `/leaderboard` có thể SSG-khung + fetch client hoặc SSR nhẹ — chọn **SSR mỗi request với KV snapshot** (rẻ, luôn ≤10 phút cũ). Public API: Cache API 60s tuỳ chọn.
- **Acceptance criteria:**
  1. Có 15 user có XP → trang hiện đúng top 10 giảm dần; tab Đấu trí hiện score tháng hiện tại.
  2. User trả lời đúng +XP xong reload `/leaderboard` trong 10 phút → thứ hạng KHÔNG đổi (KV cache); sau TTL → đổi.
  3. `?tab=battle` tháng mới (đổi `month`) → bảng reset, không lấy điểm tháng cũ.
  4. Không đăng nhập → trang vẫn xem được (public), không có hàng "bạn".

### H2 — Góp ý (feedback) [UPG-2]

- **Frontend:**
  - Route `/feedback` theo SPEC-01 §4: `h1` "Góp ý", textarea, nút "Gửi góp ý". UPG-2: submit → `POST /api/v1/feedback` body `{text}` (zod: 3–2000 ký tự); thành công → toast "Cảm ơn bạn! Góp ý đã được ghi nhận." + xoá draft local (nếu có).
  - Chưa login vẫn gửi được (user_id NULL) — kèm `user_agent` tự server thu và `page` = path hiện tại (tùy chọn từ client, sanitize).
  - Outbox: nếu offline, feedback đợi trong hàng đợi sync (00 §5) — hợp nhất với quy tắc migrate §3.5 ("feedback → push rồi xoá local").
- **Backend:** `POST /feedback` (00 §8): zod `{text, page?}`; INSERT `feedback(user_id từ session hoặc NULL, text, page, user_agent từ header, status='new')`. Rate limit class `write` 60/phút/IP (00 §6). Moderation: **không làm UI admin** — xem trực tiếp bằng SQL/D1 console; nếu cần UI admin → §3 [CẦN DUYỆT].
- **DB:** `feedback` (00 §3.3) — gồm cột `status` mặc định 'new', sẵn sàng cho moderation sau.
- **Cache/rate limit:** không cache; `write` class.
- **Acceptance criteria:**
  1. Gửi khi đã login → row có `user_id`; gửi khi chưa login → `user_id` NULL, vẫn thành công.
  2. Text < 3 ký tự → 422 `VALIDATION`, không INSERT.
  3. Spam 61 request/phút từ 1 IP → request 61 trả 429.

### H4 — Xoá tài khoản (delete-account) [UPG-2]

- **Frontend:**
  - Route `/delete-account` (site gốc có, static) — 2 bước: (1) form xác nhận "Xoá vĩnh viễn toàn bộ dữ liệu…" + checkbox xác nhận; (2) màn "Chúng tôi đã gửi email xác nhận — bấm link trong email để hoàn tất". Đã login mới thấy bước 1; chưa login → login gate.
  - Email chứa link `{origin}/delete-account/confirm?token=...` — trang confirm gọi API rồi hiện "Tài khoản đã xoá." + nút về trang chủ.
- **Backend:** 2 endpoint 00 §8:
  - `POST /users/delete-account/request` (auth): sinh token ngẫu nhiên (≥32 bytes), lưu (bảng `deletion_requests` — xem §3 [CẦN DUYỆT] vì 00 chưa liệt kê) với `expires_at = now + 30 phút`, gửi email (provider email [CẦN DUYỆT §3 — 00 §9 chưa có binding email]). Trả `{sent: true}` — không trả token.
  - `POST /users/delete-account/confirm` body `{token}` (auth session vẫn cần): verify token chưa dùng/hết hạn → trong **1 transaction**: xoá cascade mọi bảng có FK `user_id ON DELETE CASCADE` (00 §3) + set `users.deleted_at` + revoke toàn bộ sessions (00 §2: khoảng chờ 0 ngày) → đánh dấu token used. Trả `{deleted: true}`; client xoá toàn bộ key `nhai.*` localStorage.
- **DB:** bảng chuẩn 00 §3.1–3.4 (cascade) + `deletion_requests` mới [CẦN DUYỆT].
- **Cache/rate limit:** class `write`; KV không cache gì. Token single-use.
- **Acceptance criteria:**
  1. Request → nhận email trong <1 phút; token sai/hết hạn → 422, không xoá gì.
  2. Confirm → login lại bằng Google cũ tạo user MỚI (id khác), tiến độ cũ không còn; `GET /users/me` với session cũ → 401.
  3. Confirm 2 lần cùng token → lần 2 lỗi token đã dùng.
  4. Dữ liệu con (srs_states, decks, orders…) biến mất theo cascade — kiểm tra bằng đếm row trước/sau.

### SP4.1 — Trang nâng cấp `/nang-cap`

- **Frontend:**
  - Route `/nang-cap` — site gốc có route này và disallow trong robots (proposal §4.1): thêm `noindex` metadata + dòng `Disallow: /nang-cap` trong `robots.ts`. SSG khung + client phần trạng thái entitlement.
  - Nội dung: hero "Nâng cấp Nhai HSK", bảng so sánh Free vs từng gói (xem §2 SP4.2), nút "Mua bằng MoMo" (mặc định, VN) và "Thanh toán quốc tế (Stripe)"; khu "Có mã giảm giá?" → input code → `POST /codes/redeem`.
  - State: load `GET /entitlements/me` → hiện badge "Đã kích hoạt: …" + ngày hết hạn nếu có; sau khi thanh toán redirect về `?status=success|cancel` → banner "Đang xử lý thanh toán… tự cập nhật trong ~1 phút" + poll `GET /entitlements/me` mỗi 10s tối đa 12 lần (webhook đến trước thì dừng sớm).
  - Donate: section "Ủng hộ Nhai HSK" cuối trang — QR ngân hàng (ảnh tĩnh) + nút "Đã ủng hộ? Ghi danh sách cảm ơn" (xem SP4.4).
- **Backend:** không endpoint mới — dùng `GET /entitlements/me`, `POST /payments/*`, `POST /codes/redeem` (00 §8).
- **DB:** không.
- **Cache/rate limit:** `GET /entitlements/me` không cache (per-user, dynamic); trang SSG phần tĩnh.
- **Acceptance criteria:**
  1. `/nang-cap` trả header `X-Robots-Tag: noindex` (hoặc meta robots) và xuất hiện trong robots.txt disallow.
  2. User có entitlement `all` → trang hiện "Bản đầy đủ đã kích hoạt", ẩn nút mua gói tương ứng.
  3. Redirect về `?status=success` trước khi webhook đến → sau ≤12 lần poll banner đổi thành "Đã kích hoạt" (hoặc user reload sau 1 phút thấy đúng).

### SP4.2 — Gói sản phẩm & entitlements

- **Frontend:** bảng gói đề xuất (map 1-1 `products` enum 00 §3.4, KHÔNG thêm enum):

| Gói (hiển thị) | `product` | Nội dung | Giá VND đề xuất [CẦN DUYỆT] |
|---|---|---|---|
| In file luyện viết | `file_print` | Mở gate in/Lưu PDF ở `/create-file` (G8) | 99.000₫/năm |
| Giọng đọc cao cấp | `tts_premium` | TTS server chất lượng cao, giọng nam+nữ, tốc độ tuỳ ý, hạn mức TTS tăng | 99.000₫/năm |
| AI đọc & trợ lý | `reading_ai` | "Hỏi AI" không giới hạn hơn + Bài đọc AI (G3, reading_docs) | 149.000₫/năm |
| Bản đầy đủ | `all` | Cả 3 trên | 249.000₫/năm |

- Quy tắc ưu tiên khi check quyền: `all` bao hàm mọi product; helper server-side `hasEntitlement(userId, product)` = tồn tại row `(user_id, product)` hoặc `(user_id,'all')` với `expires_at` NULL hoặc > now. Redeem `FREEHSK` → product `file_print`, source `code` (00 §3.4 chú thích).
- **Backend:** `GET /entitlements/me` (auth) → `{entitlements: [{product, expires_at, source}]}`. Upsert entitlement khi: webhook paid (SP4.3), redeem code (SP4.5). Trùng mua lại cùng product → **gia hạn**: `expires_at` mới = max(now, expires cũ) + thời hạn gói.
- **DB:** `entitlements` (00 §3.4) — PK(user_id, product) nghĩa 1 user tối đa 1 row/product; `source` giữ nguồn gần nhất, `source_id` = orders.id hoặc code.
- **Cache/rate limit:** không cache entitlements (phải realtime cho gate).
- **Acceptance criteria:**
  1. User có `all` → mọi gate (in file, TTS premium, AI) mở mà không cần row riêng.
  2. Mua `file_print` khi còn hạn 6 tháng → expires được cộng dồn, không ghi đè mất 6 tháng cũ.
  3. `expires_at` quá hạn → `GET /entitlements/me` không trả product đó, gate đóng lại.

### SP4.3 — Luồng MoMo & Stripe (create → webhook → entitlement)

- **Frontend:** nút mua → `POST /payments/momo/create` (hoặc `/payments/stripe/checkout`) body `{product}` → nhận `{payUrl}` (MoMo: redirect hoặc app-to-app deeplink do MoMo trả) / `{checkoutUrl}` (Stripe) → `location.href`. Cancel/quay lại → `?status=cancel` hiện "Bạn đã huỷ thanh toán." Không xử lý kết quả thanh toán ở client — **client chỉ poll entitlements** (an toàn: không tin client).
- **Backend:**
  - **Create (auth bắt buộc):** zod `{product: enum}`; tra bảng giá server-side (không nhận amount từ client); INSERT `orders(id, user_id, provider, amount_vnd, status='pending', payload_json={product})`; gọi provider:
    - **MoMo:** tạo payment qua MoMo AIO API với `orderId = orders.id`, `orderInfo`, `redirectUrl` (`/nang-cap?status=...`), `ipnUrl` = webhook; ký HMAC-SHA256 theo MoMo spec (PARTNER_CODE/ACCESS_KEY/SECRET_KEY — 00 §9). Trả `payUrl` + `deeplink`.
    - **Stripe:** tạo Checkout Session (`mode:'payment'`, `client_reference_id = orders.id`, metadata `{userId, product}`, `success_url`, `cancel_url`) bằng `STRIPE_SECRET_KEY`. Trả `checkoutUrl`.
  - **Webhook (KHÔNG auth session — 00 §6):**
    - MoMo: verify signature HMAC trên toàn bộ payload bằng `SECRET_KEY`; sai → 403. Map `orderId` → `orders.id`; `provider_ref = MoMo transId` (UNIQUE). Stripe: verify `Stripe-Signature` bằng `WEBHOOK_SECRET` (tmut + HMAC); lấy event `checkout.session.completed`; `provider_ref = session.id`.
    - **Idempotency:** nếu `provider_ref` đã tồn tại (UNIQUE constraint) hoặc order đã `paid` → trả 200 ngay, không làm gì (2 webhook trùng → chỉ 1 entitlement).
    - Kết quả thất bại/huỷ (`cancel`, `failed`) → UPDATE orders `failed` (vẫn idempotent).
    - Paid → transaction: UPDATE orders `paid` + `provider_ref` + UPSERT entitlements (SP4.2) + INSERT notification "Nâng cấp thành công" (A1b).
  - Chữ ký là **bước bắt buộc trước khi đọc payload kinh doanh**; amount cũng verify khớp orders.amount_vnd trước khi grant.
- **DB:** `orders` (00 §3.4) — `provider_ref UNIQUE` là khoá idempotency; `payload_json` lưu product + raw event rút gọn phục vụ đối soát.
- **Cache/rate limit:** webhook không rate limit theo user (provider gọi), nhưng chặn replay bởi idempotency; create thuộc class `write`.
- **Acceptance criteria:**
  1. Gửi 2 webhook trùng `provider_ref` → chỉ 1 row entitlement, 1 order `paid`, cả 2 request trả 200.
  2. Webhook chữ ký sai → 403, không đổi trạng thái order.
  3. Webhook paid đến trước user redirect về → user thấy "Đã kích hoạt" ngay lần poll đầu.
  4. Tamper amount ở request create (client gửi amount thấp) → server bỏ qua, dùng giá server-side.

### SP4.4 — Donate (ủng hộ)

- **Frontend:** section ở `/nang-cap` + button "Ủng hộ Nhai HSK" trong footer/topbar (site gốc §4.8). QR ngân hàng tĩnh + số tài khoản copy-able; nút "Ghi vào danh sách cảm ơn" mở form nhỏ: tên hiển thị + số tiền + lời nhắn → `POST /payments/donate` (xem [CẦN DUYỆT] — 00 §8 chưa có endpoint donate dù proposal §5 có `/users/donate`). Không có trạng thái "đã thanh toán" tự động — quy trình: user chuyển khoản thủ công, admin đối soát.
- **Backend:** `POST /payments/donate` (auth): INSERT `orders(provider='momo', amount_vnd, status='pending', payload_json={type:'donate', name, message})` — **không entitlement, không webhook**; admin xác nhận thủ công → đổi status `paid` qua SQL. Danh sách cảm ơn công khai: `GET /payments/donate/list` (public, chỉ row `paid`, ẩn thông tin nhạy cảm) [CẦN DUYỆT].
- **DB:** tái dùng `orders` (00 §3.4) — `provider` enum không có giá trị 'donate' nên dùng 'momo' + marker trong payload_json (lựa chọn ít sát nhất schema; phương án sạch hơn là thêm giá trị enum — [CẦN DUYỆT §3]).
- **Cache/rate limit:** `GET /payments/donate/list` → Cache API 5 phút; POST class `write`.
- **Acceptance criteria:**
  1. Ghi cảm ơn khi chưa login → 401.
  2. Row donate chưa xác nhận không xuất hiện trong danh sách công khai.
  3. Donate không tạo entitlement (check `GET /entitlements/me` không đổi).

### SP4.5 — Redeem mã FREEHSK (G8 gate)

- **Frontend:** input mã ở `/nang-cap` VÀ tại gate in-file của `/create-file` (G8, chi tiết UI thuộc domain 12): submit → `POST /codes/redeem` body `{code}` → thành công: toast "Đã kích hoạt bản in file" + entitlement cập nhật; lỗi → toast theo `error.code` (`INVALID_CODE` / `CODE_EXPIRED` / `CODE_EXHAUSTED` / `ALREADY_REDEEMED`).
  - Migration §3.5: local `nhai.fileCode` cũ → sau login, nếu chưa redeem, client nudge 1 lần "Bạn có mã tải file — kích hoạt lại" (không tự redeem — cần ý người dùng).
- **Backend:** `POST /codes/redeem` (auth): zod `{code: string}` (normalize trim/uppercase); transaction:
  1. SELECT `free_codes` FOR UPDATE; không tồn tại → `INVALID_CODE`; `expires_at` quá hạn → `CODE_EXPIRED`; `used_count ≥ max_uses` → `CODE_EXHAUSTED`.
  2. Check `code_redemptions(user_id, code)` đã có → `ALREADY_REDEEMED` (mỗi user 1 lần/code).
  3. INSERT redemption + UPDATE `used_count = used_count + 1` + UPSERT entitlements (product map theo note/code config, mặc định `file_print`, source `code`, `source_id = code`, `expires_at` NULL = vĩnh viễn).
- **DB:** `free_codes` + `code_redemptions` + `entitlements` (00 §3.4).
- **Cache/rate limit:** class `write`; mã "hot" (FREEHSK dùng chung) → chống race bắt buộc bằng transaction + UPDATE có điều kiện `WHERE used_count < max_uses` (atomic, không lệ thuộc SELECT-FOR-UPDATE vì D1).
- **Acceptance criteria:**
  1. 2 user redeem đồng thời mã còn đúng 1 lượt → đúng 1 thành công, 1 nhận `CODE_EXHAUSTED` (test race).
  2. 1 user redeem 2 lần cùng mã → lần 2 `ALREADY_REDEEMED`, `used_count` chỉ +1.
  3. Redeem thành công → gate in file ở `/create-file` mở ngay không cần reload trang (client refetch entitlements).

### SP5.1 — AI chat widget A5 + POST /ai/chat (SSE) [UPG-5]

- **Frontend:**
  - Floating widget giữ mascot kép 🤖+🍅 (SPEC-15 §6) góc phải; bấm mở panel chat: header "Hỏi AI", khu tin nhắn (user phải/ai trái), input + nút gửi, nút xoá hội thoại (local). SP1: reply cứng chọn ngẫu nhiên sau 400ms (port đúng).
  - UPG-5: gửi `POST /api/v1/ai/chat` body `{messages: [{role, content}], context?}` với `fetch` + đọc stream SSE; render từng delta vào bong bóng AI (markdown tối thiểu: xuống dòng + code block). Chưa login → mở login modal; hết hạn mức → trả 402/429 → hiện thông báo kèm link `/nang-cap`.
  - State hội thoại giữ local (localStorage `nhai.ai.history`, ≤10 lượt gửi lên); không lưu server ở SP5 (đơn giản) [BACKLOG nếu muốn lưu].
- **Backend:** `POST /ai/chat` (00 §8, SSE stream):
  1. Auth session; rate limit class `ai` (20/ngày/user, 00 §6) — đếm KV `rl:ai:{userId}:{date}`; free user 20/ngày; entitlement `reading_ai`/`all` → tăng (đề xuất 100/ngày, [CẦN DUYỆT]).
  2. Zod: messages 1–10 lượt, mỗi content ≤2000 ký tự.
  3. System prompt tiếng Việt: "Bạn là trợ lý học tiếng Trung của Nhai HSK… giải thích pinyin, thanh điệu, Hán Việt, ngữ pháp HSK… trả lời ngắn gọn bằng tiếng Việt…" (+ khối ngắn mô tả app để AI biết ngữ cảnh).
  4. Gọi provider qua `AI_PROVIDER_KEY` (OpenAI-compatible chat completions, stream:true — provider cụ thể cấu hình runtime, không hardcode tên nhà cung cấp).
  5. SSE pipeline: re-emit `data: {"delta": "..."}` từng chunk; lỗi provider giữa stream → emit `data: {"error": {...}}` rồi `data: [DONE]`; header `Content-Type: text/event-stream`, không buffer.
- **DB:** không (không lưu hội thoại).
- **Cache/rate limit:** class `ai`; không cache response (mỗi hội thoại khác nhau).
- **Acceptance criteria:**
  1. Câu trả lời hiện dần theo stream (không chờ full text) — đo được ≥3 delta events cho 1 câu dài.
  2. Lần gọi thứ 21 trong ngày (free) → 429 với message hướng dẫn nâng cấp; user có `all` → gọi thứ 21 vẫn OK.
  3. Ngắt kết nối giữa stream (client abort) → Worker huỷ request provider (không tính thêm token phí lặp).
  4. Chưa login → 401, widget mở login modal.

### SP5.2 — Format bằng AI (G7) — POST /ai/format-vocab

- **Frontend:** nút "Format bằng AI" ở nhóm 1 của create-file (domain 12 §G7): mở modal/popup "Dán danh sách từ" (text thô, mỗi dòng 1 từ hoặc định dạng tự do) → gọi API → hiện bảng kết quả edit-able (hanzi/pinyin/hán việt/nghĩa, tối đa ~50 dòng) → "Dùng kết quả" đổ vào form (state `nhai.cf.state`). Loading state + error toast.
- **Backend:** `POST /ai/format-vocab` (00 §8, response JSON thường, không stream):
  1. Auth; rate limit class `ai` (cùng ngân sách 20/ngày — hoặc ngân sách riêng nhỏ hơn, [CẦN DUYỆT]).
  2. Zod `{text: string ≤5000 ký tự}`.
  3. Prompt: "Tách thành danh sách từ vựng… trả JSON thuần [{hanzi, pinyin (có dấu thanh), han_viet, meaning (tiếng Việt)}]…"; gọi LLM không stream; parse + zod validate từng row; row thiếu field bắt buộc → bỏ row; >50 row → cắt.
  4. Trả `{data: {rows: [{hanzi, pinyin, han_viet, meaning}]}}` — shape khớp `deck_rows` (00 §3.3) để client đổ thẳng vào G7.
- **DB:** không (chỉ trả dữ liệu; client lưu vào deck qua `/users/decks` khi người dùng lưu form).
- **Cache/rate limit:** class `ai`; có thể cache theo `sha1(text)` vào KV TTL 1 ngày để giống nhau không gọi LLM lại (tuỳ chọn).
- **Acceptance criteria:**
  1. Dán "你好 nǐ hǎo chào bạn\n谢谢" → nhận ≥2 row JSON đúng 4 field, pinyin có dấu thanh.
  2. Text 5001 ký tự → 422; response >50 row → bị cắt còn 50 và client hiển thị cảnh báo.
  3. LLM trả JSON lỗi/không parse được → 502 `INTERNAL` với message thân thiện, không crash UI.

### SP5.3 — TTS server — POST /tts

- **Frontend:** hook `useTts()` (A8) chuyển từ Web Speech API sang server TTS theo chế độ settings (giọng nữ/nam, tốc độ): gọi `POST /api/v1/tts` body `{text, voice: 'female'|'male', rate?}` → nhận `{audioUrl}` → `new Audio(url).play()`. Fallback Web Speech nếu API lỗi (giữ hành vi Safari chunking của clone). Chunking câu dài làm ở client (giữ logic hiện có), mỗi chunk 1 request.
- **Backend:** `POST /tts` (00 §8):
  1. Auth (yêu cầu login để chống lạm dụng; khách chưa login dùng Web Speech fallback client-side); rate limit class `tts` 200/ngày/user (00 §6).
  2. Key cache: `key = sha1(text | voice | rate | format=mp3)`; path R2 `tts/{provider}/{voice}/{key}.mp3` (00 §4).
  3. R2 head hit → trả `{audioUrl: /api/v1/tts/{key}.mp3}` hoặc redirect GET phục vụ từ R2/Cache API edge (cache vĩnh viễn, `max-age=31536000`).
  4. Miss → gọi TTS provider (`TTS_PROVIDER_KEY`, giọng zh-CN nữ/nam, tốc độ theo rate) → ghi object vào R2 (đồng thời hoặc put sau khi buffer) → trả audioUrl.
  5. Text ≤300 ký tự/request; validate không rỗng.
- **DB:** không.
- **Cache/rate limit:** R2 vĩnh viễn + Cache API edge (00 §7); KV không dùng cho audio.
- **Acceptance criteria:**
  1. Gọi 2 lần cùng text/voice/rate → lần 2 không gọi provider (đo bằng số request outbound hoặc log), audioUrl như nhau.
  2. File audio phục vụ qua edge có header cache dài hạn; đổi 1 ký tự trong text → file khác.
  3. Request thứ 201 trong ngày → 429.

### SP5.4 — Handwrite recognition (G1 — đánh giá phương án)

- **Frontend:** modal "Vẽ chữ để tra" ở `/dictionary` + bảng vẽ tay `/hanzi` (G1/G2): canvas nét → gọi API nhận dạng → list ứng viên → bấm chọn tra.
- **Đánh giá phương án (bảng):**

| Phương án | Ưu | Nhược | Kết luận |
|---|---|---|---|
| API bên thứ 3 (Google Input Tools handwriting / Hanzi Writer API-like) | Độ chính xác cao nhất, không tốn công training | Không có SLA chính thức; chi phí; phụ thuộc ngoài Cloudflare; rủi ro chặn | Phương án B dự phòng |
| **Workers AI (Cloudflare)** | Cùng nền tảng, không key ngoài, không network egress; có model vision/handwriting | Model Hán tự handwriting riêng không có sẵn — cần chuyển ảnh canvas → model OCR/vision, độ chính xác với chữ viết tay trung bình chưa chắc | **Chọn: thử nghiệm trước** (đánh giá bằng bộ ~50 nét thật; nếu độ chính xác top-3 < 80% → chuyển B) |
| Tự host model (TensorFlow.js + model open-source như hanzi lookup reconocedor) | Chạy client, 0 chi phí server, offline | Bundle model ~vài MB; độ chính xác tuỳ model; bảo trì | Phương án C nếu Workers AI fail |

- **Backend (nếu server):** `POST /ai/handwrite` (mới — [CẦN DUYỆT §3], 00 §8 chưa có): body `{strokes: [[x,y,...]]}` hoặc `{image: base64}` → `{candidates: ["你","们",...]}` (≤8 ứng viên); rate limit class `ai`. Nếu phương án C (client model) → **không cần endpoint**.
- **DB:** không. **Cache:** có thể cache theo hash chuỗi điểm nét (tuỳ chọn).
- **Acceptance criteria:**
  1. Vẽ đúng 你 → ứng viên "你" nằm trong top-3.
  2. Canvas rỗng → 422, không gọi model.
  3. (Nếu chọn C) modal dùng được offline, không có request network nào khi vẽ.
  - Quyết định cuối sau đo lường — ghi kết quả vào đây trước khi làm SP5.

### SP5.5 — Karaoke forced-alignment cho reading (G3) — nice-to-have

- **Frontend:** `/reading`: highlight theo từ khi phát audio — dùng `sentences_json` có sẵn `[{zh, pinyin, vi, t0, t1}]` (00 §3.3 `reading_docs`) để highlight câu; mức **word-level** là nice-to-have.
- **Đánh giá:** forced-alignment thật (MFA/aeneas) phải chạy batch build-time (không chạy trên Workers — CPU nặng): pipeline sinh `t0/t1` mỗi câu khi tạo `reading_docs`, lưu `R2_DATA reading-audio/{docId}.mp3` + sentences_json. Word-level cần alignment chi tiết hơn → chi phí pipeline cao, lợi ích UX thấp → **có thể bỏ**; chỉ làm level câu (t0/t1 mỗi câu) là đủ cho G3 UPG-5.
- **Backend:** không endpoint runtime (audio + timing là data tĩnh theo docId, serving qua R2 + Cache API). Việc tạo reading_docs (AI dịch + TTS + timing) là **quy trình nội bộ script** [BACKLOG — làm tool riêng, không vào app].
- **DB:** `reading_docs` (00 §3.3) — đã có đủ cột.
- **Cache:** R2_DATA `reading-audio/*` + Cache API (00 §4).
- **Acceptance criteria:**
  1. Phát audio → câu hiện tại highlight đúng theo t0/t1, chuyển câu mượt.
  2. Doc chưa có audio → trang reading fallback TTS client như G3 bản PORT (không vỡ UI).

## 3. Đề xuất bổ sung [CẦN DUYỆT]

| # | Đề xuất | Lý do vượt 00 |
|---|---|---|
| 1 | Bảng giá VND cụ thể (SP4.2) + thời hạn gói 1 năm | 00 chỉ định nghĩa enum products, không có giá/thời hạn |
| 2 | Bảng `deletion_requests(token TEXT PK, user_id, expires_at, used)` | 00 §2/§8 mô tả luồng token nhưng §3 chưa khai bảng |
| 3 | Binding email service (vd Resend/MailChannels qua Workers) + biến `EMAIL_API_KEY` trong wrangler.jsonc | 00 §9 chưa có binding email mà H4 bắt buộc gửi email |
| 4 | Endpoints `POST /payments/donate` + `GET /payments/donate/list`; phương án tái dùng `orders.provider='momo'` + marker payload (hoặc thêm enum 'donate' — cần sửa 00) | Proposal §5 có `/users/donate`; 00 §8 chưa liệt kê |
| 5 | Endpoint `POST /ai/handwrite` (SP5.4, nếu chọn server-side) | 00 §8 chưa có |
| 6 | Hạn mức `ai` cho user có entitlement: 100/ngày (free 20/ngày theo 00 §6) | 00 ghi "entitlement tăng" nhưng chưa định số |
| 7 | Format-vocab dùng ngân sách riêng 10/ngày (tách khỏi chat 20/ngày) hoặc dùng chung — chọn 1 | 00 chỉ có class `ai` chung |
| 8 | Tie-break leaderboard XP theo thời gian đạt điểm (cần lưu `first_reach_at` hoặc sort phụ theo `MIN(day)`) | Khớp câu "ai đạt trước xếp trước" của site gốc nhưng 00 chưa có cột |
| 9 | Admin moderation UI cho `feedback`/`error_reports` (endpoint `GET /admin/feedback`, auth role admin) | H2 kê "endpoint + moderation"; hiện chỉ đọc qua D1 console; error_reports đã [BACKLOG] |
| 10 | CRON rebuild KV leaderboard mỗi 10 phút (tuỳ chọn tối ưu) | 00 để TTL-refetch là đủ |

**[BACKLOG] (không làm trong SP2/4/5):** error_reports + moderation (00 §3.3, §8), anti-devtools/ban IP (00 §2 — bỏ theo proposal §6.4), lưu lịch sử hội thoại AI server-side, CRON leaderboard, admin UI (mục 9).

## 4. Kiểm chứng chéo với 00

- Mọi endpoint dùng đúng catalog 00 §8 (trừ mục [CẦN DUYỆT] 4, 5).
- Mọi bảng dùng đúng 00 §3.3–3.4; không thêm cột/sửa enum ngoài phương án donate (mục 4).
- Rate limit đúng 00 §6 (`write`, `ai`, `tts`); webhook đúng quy tắc verify-chữ-ký + idempotency `provider_ref`.
- Cache: KV `lb:*` TTL 600s (00 §4/§7), R2 TTS vĩnh viễn, no-cache entitlements/notifications.
- Test platform 00 §10: webhook idempotency + chữ ký sai → 403; leaderboard TTL + boundary tháng — cover ở acceptance criteria trên.
