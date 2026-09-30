# 11 — Personal Tools (thống kê · sổ tay · từ điển · hanzi · reading)

- **Ngày:** 2026-09-30 · Thuộc bộ `docs/superpowers/specs/fullstack/` · Phụ thuộc `00-platform-data.md` (canonical)
- **Phạm vi:** feature ID F1–F6 (nhóm Cá nhân hoá), G1 (dictionary + vẽ tra), G2 (hanzi), G3 (reading karaoke TTS).
- **Tham chiếu:**
  - `00-platform-data.md` — schema D1 §3, sync §5, API §6/§8, cache §7, storage §4, migration localStorage §3.5.
  - `2026-09-30-hsk-feature-inventory.md` — F1–F6, G1–G3 + ma trận SP mục 10.
  - Clone specs: `SPEC-17-review-stats.md` + `SPEC-05` §3 (F1), `SPEC-11-progress-stats.md` (F2), `SPEC-12` + `SPEC-18` (F3–F5), `SPEC-05` §4 (F6), `SPEC-09-dictionary-static.md` (G1), `SPEC-03-hanzi.md` + proposal §4.7 (G2), proposal §4.4 + `js/reading.js` (G3).
  - Clone JS: `review.js`, `review-stats.js`, `progress.js`, `notebook.js`, `dictionary.js`, `draw-pad.js`, `draw-modal.js`, `hanzi-writer.js`, `reading.js`, `shell.js` (ProgressStore, mockLogin, speak, stripTones).

## 1. Tổng quan domain

### 1.1 Route Next (App Router)

| Route clone | Route Next | Loại |
|---|---|---|
| `review.html` | `/review` | public, client chart |
| `progress.html` | `/progress` | login-gated (F6) |
| `my-vocab.html` | `/my-vocab` | login-gated (F6) |
| `my-grammar.html` | `/my-grammar` | login-gated (F6) |
| `notebook.html?kind&id` | `/notebook/[kind]/[id]` | login-gated (F6) |
| `dictionary.html` | `/dictionary` | public, `?q=` giữ nguyên |
| `hanzi.html` | `/hanzi` | public |
| `hanzi.html?char=X` | `/hanzi/[char]` | public, SSG/ISR cho chữ có data |
| `reading.html` | `/reading` | public (SP1); account-box gated |

### 1.2 Server component vs client component

- Toàn bộ trang trong domain này có tương tác dày (tabs, canvas, TTS, modal) → **nội dung trang là client component**; chỉ layout, shell nav, metadata SEO và **màn gate 🔒 (F6)** là server component.
- F6: server component đọc session (layout `/(personal)`) — render 🔒 + nút "Đăng nhập" khi chưa login; client KHÔNG tự quyết gate. SP1: gate dựa `nhai.mockLogin` (mock, đọc qua ProgressStore interface); UPG-2: better-auth `get-session` qua cookie.
- Không dùng middleware (theo 00 §2).

### 1.3 Provider chung

- **ProgressStore** (00 §5, SP2 `HybridStore`): mọi ghi SRS/deck/XP/xp_daily-ish đi qua interface này — SP1 là wrapper localStorage, UPG-2 là local-first + outbox + `GET /users/snapshot` / `POST /users/sync`. Các trang F1–F5 chỉ gọi interface, không đụng localStorage trực tiếp (khớp inventory mục 11).
- **useTts()** (A8): wrapper `speechSynthesis` — chọn giọng nữ/nam theo `settings.voice`, warm-up voices, chunk Safari. Dùng ở G1 (🔊 entry/ví dụ), G2 (🔊 phát âm), G3 (karaoke).
- **DrawPad / DrawModal**: component canvas vẽ tay dùng chung (G1 modal "Vẽ chữ để tra", G2 card "Hoặc vẽ chữ Hán") — một implementation, hai điểm mount (chi tiết §G1/§G2).
- **Pinyin utils** (`stripTones`, tách pinyin từng âm): dùng chung G1/G2/G3.

### 1.4 Ranh giới SP1 / UPG-2 / UPG-3 / UPG-5

| Lớp | Phạm vi trong domain này |
|---|---|
| **SP1 (port + mock)** | F1 (counts seeded + deck từ localStorage SRS), F2 (mockLogin → 3 card + heatmap demo seeded, rank `14594 − xp`), F3–F5 (decks/notebooks localStorage + sample cards), F6 (gate mock), G1 (20 entries static, vẽ giả), G2 (chỉ 你 7 nét thật + generic 4 nét), G3 (TTS client + demo doc + dịch giả) |
| **UPG-2 (sync thật)** | F1 đọc `srs_states` thật qua ProgressStore; F2 XP/streak/heatmap từ `xp_daily`, rank từ leaderboard thật; F3–F5 CRUD `decks`/`deck_rows` qua endpoint 00 §8; F6 session better-auth + migration §3.5 |
| **UPG-3 (content thật)** | G1: entries từ điển thật (CC-CEDICT dịch Việt, thay 20 entries demo); G2: dataset nét hanzi-writer/makemeahanzi cho mọi chữ từ R2_DATA |
| **UPG-5** | G1: nhận dạng vẽ tay thật; (G3 sâu hơn thuộc SP5 — xem §G3 ranh giới) |

---

## 2. Spec từng tính năng

### F1 — Review dashboard "Thống kê học tập" (`/review`)

- **Frontend:**
  - Route `/review`, title tag "Ôn tập ngắt quãng | Nhai HSK", H1 "Thống kê học tập". Client component duy nhất `ReviewDashboard` với state `domain: 'vocab' | 'grammar'` (2 tab active viền đỏ; đổi tab chỉ đổi text empty + link, giữ layout — SPEC-17).
  - **6 ô đếm** (grid 6→3→2 cột): Cần ôn (đỏ) · Mới thêm (xám) · Đang học (xanh dương) · Mới thuộc < 21 ngày (xanh lá) · Đã thuộc dài hạn (xanh lá đậm) · Tổng đã học qua (đỏ chính).
  - **Cách suy diễn 5 phân loại SRS (chu kỳ 21 ngày) từ `srs_states`** — KHÔNG lưu 5 cột riêng (00 §3.2); lọc theo `kind = domain`, `now = Date.now()`, `D = 21 ngày`:
    - *Tổng đã học qua* = `COUNT(*)` của kind.
    - *Mới thêm* = `status = 'new'` (tương đương `review_count = 0`).
    - *Đang học* = `status = 'learning'`.
    - *Cần ôn* = `status = 'learning'` **hoặc** (`due_at IS NOT NULL AND due_at <= now`) — khớp clone: learning luôn tính là due.
    - *Mới thuộc (< 21 ngày)* = `status IN ('learned','known') AND last_reviewed_at >= now − D`.
    - *Đã thuộc (dài hạn)* = `status IN ('learned','known') AND (last_reviewed_at < now − D OR last_reviewed_at IS NULL)`.
  - SP1: các số này đếm từ key `nhai.srs.w.* / .g.*` + `nhai.srs.st.<k>` + `nhai.srs.t.<k>` qua ProgressStore (thuật toán `computeStats` của `review.js`); nếu trống hiển thị **counts seeded** từ data module (12/34/8/41/96/191) để thấy bố cục — đúng hành vi `[PORT]`.
  - **Section "Bộ thẻ đang trống"**: khi deck rỗng — text + link đổi theo tab (vocab: "Vào kệ sách →" → `/course`; grammar: "Vào mục ngữ pháp →"). Khi có thẻ: thay bằng nút "Bắt đầu ôn tập (N thẻ)".
  - **Section "Chi tiết ôn tập"**: 5 ô nhỏ (Streak · Hôm nay · Tuần này · TB/ngày · TB/thẻ) + **bar chart 7 ngày** (nhãn `T3 T4 T5 T6 T7 CN T2`, cuộn ngược từ hôm nay; cột hôm nay màu chính) + **donut 4 lát** (Quên rồi/Khó/Tốt/Dễ) + legend "N (X%)" + chân "Tổng: N lượt · Tháng này: M lượt".
  - **Công thức donut largest-remainder** (tổng % luôn đúng 100):
    1. `raw[i] = count[i] / total × 100`; `floor[i] = ⌊raw[i]⌋`; `left = 100 − Σfloor`.
    2. Sắp giảm dần theo phần lẻ `raw[i] − floor[i]`, cộng `+1` vào `left` phần tử đầu (quay vòng nếu `left > số lát`).
    3. SVG viewBox `0 0 42 42`, xoay −90°, `r = 15.9155` (chu vi ≈ 100 nên dasharray dùng % trực tiếp): lát i có `stroke-dasharray = (frac_i × C − 1.5) (C − frac_i × C + 1.5)`, `stroke-dashoffset = −(Σ frac_0..i−1) × C`; `−1.5` tạo khe hở giữa các lát; `C = 2π × 15.9155`.
  - SP1: last7/dist/total seeded `[3,5,0,8,12,4,0]`, `{forgot:8, hard:5, good:14, easy:3}`.
- **Backend:** UPG-2: chỉ đọc qua `GET /users/snapshot` + `GET /users/srs` (00 §8) qua ProgressStore — KHÔNG thêm endpoint mới cho F1. SP1: client-only.
- **DB:** `srs_states` (00 §3.2) — trường dùng: `kind, status, due_at, review_count, last_reviewed_at`.
- **Cache:** không cache — dữ liệu tiến độ theo cookie (00 §7 dòng "Trang user"). SP1 static shell vẫn SSG được vì data client-side.
- **Acceptance criteria:**
  1. Đủ 6 ô với màu đúng theo bảng SPEC-17; đổi tab vocab↔grammar không rebuild layout, chỉ đổi text empty + số liệu.
  2. SP1: star 1 từ trong lesson → về `/review` số "Mới thêm"/"Tổng" tăng đúng; xoá localStorage → thấy counts seeded (không phải 0 trần trụi) đúng như bản clone.
  3. UPG-2: thẻ `status='learned'` với `last_reviewed_at` 20 ngày trước rơi vào "Mới thuộc", 22 ngày trước rơi vào "Đã thuộc dài hạn" (test biên 21 ngày).
  4. Donut với dist bất kỳ cho tổng legend đúng 100%; case 1 lát đơn → 100%.
  5. Bar chart: cột hôm nay luôn vị trí cuối, màu khác các cột khác.

### F2 — Progress "Tiến độ học" (`/progress`)

- **Frontend:**
  - Route `/progress`. Chưa login (F6) → màn 🔒 server render: "Tiến độ học của bạn sẽ được đồng bộ sau khi đăng nhập." + nút mở Login modal.
  - **Card "Điểm của bạn"** (full width): icon ⚡, XP lớn, sub "Mỗi câu trả lời đúng +1 điểm", badge 🏆 xếp hạng, nút "Xem bảng xếp hạng →" (`/leaderboard`).
    - SP1: XP từ ProgressStore (`nhai.xp`), rank mock `14594 − xp` (XP>0) hoặc hardcode #14594.
    - UPG-2: XP = `Σ xp_daily.xp`; rank = vị trí user trong snapshot leaderboard XP (H1, KV `lb:*`) — không tính công thức giả nữa.
  - **Grid 4 thống kê**:
    - 🔥 **Chuỗi ngày học** — *streak rule (UPG-2)*: đếm số ngày liên tiếp có `xp_daily.xp > 0`, đi lùi từ ngày hiện tại theo **giờ VN +07** (`day = 'YYYY-MM-DD'`); chuỗi còn sống nếu ngày gần nhất là hôm nay hoặc hôm qua; hôm nay chưa có XP nhưng hôm qua có → streak vẫn giữ, chỉ hiện nhắc "Học hôm nay để bắt đầu chuỗi". SP1: `nhai.streak` mock (mỗi lần trả lời đúng trong lesson của hôm nay +1).
    - 📖 **Từ đã thuộc** — `COUNT(srs_states WHERE kind='vocab' AND status IN ('learned','known'))`, sub "trên tổng 9789 từ".
    - ✅ **Bài hoàn thành** — `N/153`: đếm số cặp `(book, page)` trong `page_dones` có **≥ 2 dòng** (2 skill/mode) — suy diễn "học đủ 2 chế độ" không cần cột mới; tổng 153 lấy từ metadata sách (B3).
    - 🎯 **Hôm nay** — `N câu`: `xp_daily.answers` của day hiện tại (giờ VN). SP1: `nhai.today`.
  - **Card "Lịch học" — heatmap 12 tháng từ `xp_daily`**: 12 cột tháng (lùi từ tháng hiện tại), mỗi ô 10×10px một ngày, tooltip "Tháng M ngày D: Xp N".
    - **Mức màu theo XP/ngày**: 0 → nền viền; 1–2 → đỏ nhạt `#f5b7ae`; 3–5 → `#d9534f`; ≥6 → `#a83232` (4 mức, giữ đúng threshold của `progress.js`).
    - UPG-2: source duy nhất là `xp_daily` (00 §3.2 — "xp_daily đồng thời là dữ liệu heatmap, không bảng heat riêng"); cần query range `day >= tháng_hiện_tại − 11` → lấy qua `snapshot` hoặc thêm field vào `/users/me` (xem §3 Đề xuất).
    - SP1: giữ demo seeded `mulberry32(20251021)` (45% ngày 0, …) trộn với `nhai.heat` thật nếu có — đúng hành vi clone.
- **Backend:** UPG-2 đọc từ `GET /users/me` (counters: xp, streak, today) + `GET /users/snapshot` (xp_daily, srs_states, page_dones). Không endpoint mới bắt buộc.
- **DB:** `xp_daily`, `srs_states`, `page_dones` (00 §3.2).
- **Cache:** trang user dynamic, không cache (00 §7). SP1 static.
- **Acceptance criteria:**
  1. Mock-logout → 🔒; mock-login → đủ 2 section + heatmap render 12 cột đủ số ngày/tháng thực (28–31).
  2. Heatmap hover ô → tooltip "Xp: N" đúng giá trị ô đó.
  3. UPG-2: ghi XP hôm qua + hôm nay → streak = 2; không ghi hôm nay và hôm qua → streak về 0; chỉ thiếu hôm nay (có hôm qua) → streak giữ.
  4. Bài có 1 dòng `page_dones` KHÔNG đếm; thêm dòng thứ 2 → đếm +1.
  5. Rank badge đổi theo snapshot leaderboard, không còn công thức `14594 − xp`.

### F3 — My-vocab "Sổ tay từ vựng" (`/my-vocab`)

- **Frontend:**
  - Route `/my-vocab`, gate F6. Dùng **khuôn chung NotebookList** với `kind='vocab'` (SPEC-18 là spec hành vi hiện hành — notebook.js đã thay bản SPEC-12): H1 "Sổ tay từ vựng" + mascot 🍅 + sub "Tự tạo bộ từ vựng để học chủ động…" + nút chính **"+ Tạo bộ mới"** góc phải.
  - Empty state: icon 📕 + "Chưa có bộ từ vựng nào" + sub + nút CTA thứ hai.
  - Grid card: tên (link `/notebook/vocab/[id]`) + "N từ" + "Sửa <ngày tương đối: Hôm nay/Hôm qua/N ngày trước>" + menu ⋯ (Mở / Sửa tên / Xoá với `confirm()`). **Sample cards luôn render sau items user tạo** (badge "Sổ mẫu", không có menu): 3 bộ mẫu theo SPEC-18 (128/64/45 từ).
  - Modal tạo/sửa tên: 1 textfield duy nhất, nút "Tạo" disabled khi rỗng, Enter = submit, toast "Đã tạo <tên>".
  - SP1 lưu ProgressStore key `nhai.decks` — mảng `[{id, name, rows, updatedAt}]` giữ nguyên shape để migration §3.5 đọc được.
  - (Nhập dán loạt từ theo SPEC-12 — parser "hanzi [tab] pinyin [nghĩa]" — xếp backlog, xem §3.)
- **Backend:** UPG-2: `GET/POST /users/decks?kind=vocab`, `PUT/DELETE /users/decks/:id` (00 §8); tạo/sửa tên local-first rồi sync LWW theo `updated_at`.
- **DB:** `decks(kind='vocab')`, đếm rows qua `deck_rows` (00 §3.3).
- **Cache:** không cache (trang user).
- **Acceptance criteria:**
  1. H1/sub/cta/empty đúng chuỗi SPEC-18 vocab; samples luôn hiện dưới items thật.
  2. Tạo bộ tên rỗng → nút disabled; tạo hợp lệ → prepend + toast + persist qua reload (SP1 localStorage, UPG-2 sync về D1).
  3. Sửa tên / Xoá (confirm) hoạt động; xoá ở UPG-2 là tombstone `deleted_at`, thắng nếu muộn hơn update (00 §5).
  4. Sample card không có menu ⋯, bấm vào vẫn mở được chi tiết.

### F4 — My-grammar "Sổ tay ngữ pháp" (`/my-grammar`)

- **Frontend:** cùng **khuôn chung NotebookList** với `kind='grammar'` — chỉ khác 3 nhãn qua config (SPEC-18): H1 "Sổ tay ngữ pháp", sub "Tự ghi chú các mẫu ngữ pháp quan trọng…", cta "Tạo sổ tay mới", empty "Chưa có sổ tay ngữ pháp nào", modalTitle "Tạo sổ tay ngữ pháp mới"; **2 sample** ("Mẫu câu gọi thoại — 12 mẫu", "Ngữ pháp hay sai — 8 mẫu"). Không được còn bất kỳ nội dung "My Grammar" nào của bản cũ.
- **Backend:** như F3 với `kind='grammar'`.
- **DB:** `decks(kind='grammar')` + `deck_rows` (`meaning` = nghĩa mẫu câu; `hanzi` = mẫu câu). SP1: `nhai.notebooks`.
- **Cache:** không cache.
- **Acceptance criteria:**
  1. Hai route `/my-vocab` + `/my-grammar` dùng đúng 1 template component, chỉ khác qua config object — không copy code.
  2. Đủ 2 sample grammar với badge "Sổ mẫu"; CRUD như F3.
  3. Bộ grammar tạo mới học được bằng flashcard đơn giản (khuôn C10 — tham chiếu domain lesson, không spec lại ở đây).

### F5 — Notebook CRUD (`/notebook/[kind]/[id]`)

- **Frontend:**
  - Route `/notebook/[kind]/[id]` (kind = vocab|grammar), gate F6. Header: link "← Sổ tay từ vựng/ ngữ pháp" + H1 tên bộ + nút **"＋ Thêm từ"**.
  - Bảng 4 cột: Chữ / Pinyin / Hán Việt / Nghĩa — border-t mỗi dòng, overflow-x trên mobile.
  - **CRUD đầy đủ (UPG-2)**: thêm/sửa/xoá row qua modal form 4 ô (validate: hanzi bắt buộc, còn lại optional); xoá row confirm. SP1: nút "＋ Thêm từ" toast "sắp có (demo)" và chỉ đọc rows mẫu — port đúng hiện trạng.
  - Fallback rows: rows user > rows sample theo id > 12 dòng mẫu của sample đầu (giữ logic `notebook.js`).
  - Set `document.title = <tên bộ> | Nhai HSK`.
- **Backend:** UPG-2: `POST/PUT/DELETE /users/decks/:id/rows[/:rowId]` (00 §8), payload zod `{hanzi, pinyin?, han_viet?, meaning?}`.
- **DB:** `deck_rows(ord, hanzi, pinyin, han_viet, meaning)` — `ord` giữ thứ tự chèn (insert = max(ord)+1).
- **Cache:** không cache.
- **Acceptance criteria:**
  1. `?kind` quyết định cả config lẫn storage — repo grammar đọc đúng `decks(kind='grammar')` (bug round-1 của clone đã fix, phải giữ fix).
  2. UPG-2: thêm 5 rows → bảng hiện đủ, thứ tự đúng theo `ord`; reload (offline) vẫn thấy nhờ local-first.
  3. Row thiếu hanzi → 422 `VALIDATION` (00 §6), UI hiện lỗi inline.
  4. SP1: demo toast khi bấm "＋ Thêm từ" (không fake bảng editable).

### F6 — Login gate 🔒 (dùng chung)

- **Frontend:**
  - Pattern server-side cho `/progress`, `/my-vocab`, `/my-grammar`, `/notebook/*` (và account-box của `/reading`): chưa login → card trung tâm: 🔒 lớn (text-6xl) + H2 "Đăng nhập để xem" + sub **đổi theo trang** (my-vocab: "Sổ tay từ vựng của bạn sẽ xuất hiện ở đây sau khi đăng nhập."; my-grammar: "…sổ tay ngữ pháp…"; progress: "Tiến độ học của bạn sẽ được đồng bộ sau khi đăng nhập.") + nút "Đăng nhập" mở Login modal shell (A4).
  - SP1: trạng thái = `nhai.mockLogin === '1'` qua ProgressStore; login modal demo set key + re-render (bắt event như `progress.js` làm, không reload trang).
  - UPG-2: server component check better-auth session trong layout group `/(personal)`; login thật qua `POST /api/v1/auth/sign-in/*` (00 §8); sau login đầu tiên chạy migration localStorage → D1 theo 00 §3.5 rồi mới render dữ liệu thật.
- **Backend:** không endpoint riêng — dùng auth dựng sẵn 00 §8 + `GET /users/me`.
- **DB:** bảng `users`/`sessions` của better-auth.
- **Cache:** không cache — quyết định gate theo cookie, SSR.
- **Acceptance criteria:**
  1. Mỗi trang gated có đúng sub text riêng; nút mở đúng Login modal (không điều hướng khỏi trang).
  2. SP1: login mock → trang hiện nội dung demo ngay; logout mock → 🔒.
  3. UPG-2: chưa có session cookie → server trả HTML có 🔒 (không flash nội dung rồi mới ẩn).
  4. Login thật lần đầu: không mất dữ liệu local — migration §3.5 chạy trước khi flush outbox (00 §5.3).

### G1 — Dictionary "Tra từ điển" + modal vẽ chữ (`/dictionary`)

- **Frontend:**
  - Route `/dictionary` (public). Search bar: input lớn placeholder "Chữ Hán, pinyin hoặc nghĩa tiếng Việt… (vd: 学习, xuexi, học)" + nút "Tra từ" (disabled khi rỗng) + nút xoá (hiện khi có text) + nút "Vẽ chữ để tra".
  - `?q=` cập nhật bằng `history.replaceState` — F5 giữ kết quả (server component đọc `searchParams` cho SEO, kết quả render client).
  - **Chuẩn hoá query**: nếu là pinyin → `stripTones` (NFD bỏ dấu + ü→v); tìm theo: CJK → substring `hanzi`; pinyin → substring trên pinyin không dấu (có/không khoảng cách); else → substring nghĩa tiếng Việt lowercase (thuật toán `search()` của `dictionary.js`).
  - Không query → "Gợi ý tra nhanh": 学习 / 你好 / 时间 / 老师 / 学生 (pill bấm được).
  - **Entry card**: chữ Hán to + pinyin từng âm + "(Phồn thể: …)" + 🔊; nghĩa chính + badge từ loại + badge HSK + nút "⭐ Thêm vào sổ tay" (đổi vàng + toast; đã có → toast "Từ này đã có…"); "Xem từng chữ:" link từng chữ → `/hanzi/[char]`; nghĩa đánh số 1. 2.; "Ví dụ": câu zh + pinyin từng chữ màu muted + dịch + 🔊.
  - Không thấy → "Không tìm thấy “xyz”. Thử chữ Hán, pinyin không dấu hoặc nghĩa tiếng Việt."
  - **Modal vẽ để tra (DrawModal)**: canvas 280×280 DPR-aware, grid 4×4 mờ, placeholder "Vẽ chữ Hán vào đây", pointer events (mouse+touch, `setPointerCapture`), nút "↩ Xoá nét cuối" / "✕ Xoá hết" disabled khi trống, nét chạm nhanh = chấm. SP1: "Tra chữ này" giả lập → trả 你 → tự điền + search. UPG-5: gọi API nhận dạng vẽ thật (xem §3).
  - **"Thêm vào sổ tay"**: SP1 ghi `nhai.vocabBook` `[{hanzi, pinyin, vi}]`; UPG-2 map sang **deck mặc định "Từ điển đã lưu"** (`decks` kind vocab — quy ước migration 00 §3.5 dòng `vocabBook`), endpoint `POST /users/decks/:id/rows`.
- **Backend:** SP1/UPG-3 client-only trên dataset static (build-time import, SSG — 00 §7 "Content TS modules"). UPG-3 dataset lớn (CC-CEDICT) → tách file index + chunk theo chữ đầu, fetch lazy; nếu cần tìm server-side thì mới đề xuất endpoint (xem §3).
- **DB:** không có (trừ deck "Từ điển đã lưu" ở UPG-2).
- **Cache:** dataset static: build-time import + browser cache; SP1 không API. Trang `/dictionary` (không `?q=`) có thể SSG.
- **Acceptance criteria:**
  1. 3 kiểu search đúng: `学习` (CJK), `xuexi`/`xuéxí` (pinyin → cùng kết quả), `học` (nghĩa Việt).
  2. `?q=xuexi` F5 giữ nguyên kết quả; nút xoá dọn cả URL về `/dictionary`.
  3. Entry 学习 đủ 5 kết quả; mỗi entry có phồn thể + link từng chữ về `/hanzi/[char]`.
  4. Thêm 1 từ vào sổ tay 2 lần → lần 2 toast trùng; từ xuất hiện trong deck "Từ điển đã lưu" (UPG-2) / `nhai.vocabBook` (SP1) và review/progress đọc được tổng.
  5. Modal vẽ: vẽ ≥1 nét → gợi ý hiện; undo/clear hoạt động; submit → tra 你.

### G2 — Hanzi: phân tích + chi tiết + canvas + stroke animation (`/hanzi`, `/hanzi/[char]`)

- **Frontend:**
  - **Màn 1 `/hanzi`**: H1 "Phân tích Hán tự"; card "Tìm chữ Hán" (input + autocomplete theo chữ/pinyin không dấu); card "Hoặc vẽ chữ Hán" (**DrawPad** dùng chung G1 — canvas 280, grid 4×4, gợi ý giả 你/好/学 khi có nét, bấm → `/hanzi/[char]`); "Khám phá chữ Hán theo cấp độ": pills HSK 1…7-9 + 214 Bộ thủ (→ `/radicals`), chọn pill hiện "247 chữ Hán mới trong cuốn này" + 3 nút Flashcard / Luyện viết / Tạo file + lưới chữ 8 cột link `/hanzi/[char]`.
  - **Màn 2 `/hanzi/[char]`** (proposal §4.7): sidebar trái lặp card tìm + vẽ; trung tâm: khung chữ ~260px + 4 nút (Xem lại thứ tự nét / Hạt mũi tên toggle / Chữ chứa chữ này / Thu phóng vừa khít) + H1 "你 - NHĨ" + 🔊 + link "→ Quy tắc chuyển âm"; metadata: Âm Hán Việt (alt "còn đọc"), Ý nghĩa, Pinyin, Cấp độ (badge), Số nét, Bộ thủ (link `/hanzi/亻`), Cấu tạo từ (link từng thành phần), Loại chữ (badge viền); sidebar phải: "Từ vựng trong sách" (word + pinyin + Hán Việt + nghĩa + badge HSK + 🔊 + link lesson) và "Từ vựng thực chiến" (link `/dictionary?q=<word>`); cuối: "Chữ sau 好 →".
  - **Stroke animation (SVG)**: mỗi nét là polyline toạ độ 0–100, `pathLength=1` + `stroke-dasharray:1` + animate `stroke-dashoffset 1→0` bằng rAF, **DUR 420ms/nét, GAP 90ms**, easeInOutQuad — giữ đúng tham số `hanzi-writer.js`. Mũi tên = `<marker>` gắn `marker-end`; zoom-fit = tính bbox của các nét rồi đặt lại `viewBox` (+pad 6).
  - SP1: chỉ **你 có 7 nét thật** (data hardcode), chữ khác dùng generic 4 nét khung 口; `[UPG-3]` thay bằng dataset thật (xuống đây).
- **Backend:** SP1 client-only trên data module `hanzi` (SSG). **UPG-3 — vì sao dataset nét lazy từ R2_DATA (00 §4):** dataset makemeahanzi/hanzi-writer có ~9.500 chữ JSON nét (~vài chục MB tổng) — không thể bundle vào build (phình JS + thời gian build) và không hợp lưu D1 (read-only, truy vấn luôn theo đúng 1 chữ); nên lưu R2 `hanzi-writer/{char}.json`, **lazy load theo chữ user đang xem** (một request vài KB), qua route handler proxy để không lộ binding, kèm `Cache-Control: public, max-age=31536000, immutable` (00 §7) — file nét bất biến, browser + Cache API edge giữ vĩnh viễn, lần 2 vào là 0 request về origin.
- **DB:** không — content bất biến ngoài D1 (00 §4 R2_DATA).
- **Cache:** dataset nét immutable R2 + Cache API + browser (00 §7); trang `/hanzi` static; `/hanzi/[char]` SSG/ISR cho chữ có metadata, metadata chữ vẫn từ content module build-time.
- **Acceptance criteria:**
  1. Tìm/vẽ/autocomplete → sang được `/hanzi/[char]`; mọi link composition/radical/"chữ sau" hoạt động.
  2. Animation 你 chạy đủ 7 nét tuần tự (mỗi nét ~420ms + gap 90ms); toggle mũi tên hiện marker; zoom-fit đổi viewBox đúng bbox.
  3. Canvas: vẽ → gợi ý 你/好/学 hiện; undo/clear disabled đúng trạng thái.
  4. UPG-3: mở `/hanzi/学` fetch 1 JSON nét từ R2 qua proxy, header immutable; offline lần 2 vẫn render (browser cache).
  5. 214 Bộ thủ pill → `/radicals` (domain D3, không spec lại).

### G3 — Reading karaoke TTS (`/reading`)

- **Frontend:**
  - Route `/reading` (public). Sidebar: bài demo ("一个人的生活 — Cuộc sống một mình — 2:29 · 654 ký tự") + **account-box** (chưa login: "Đăng nhập để lưu bài đã tạo…" + nút login; đã login: "Chưa có bài nào được lưu — … (demo)" — SP1; UPG: list `reading_docs` của user).
  - Textarea ≤ **3000 ký tự** (counter N/3000, cắt tại 3000) + callout thu gọn + nút "Điền văn bản mẫu" + nút "Tạo bài đọc".
  - **Cách sinh câu hỏi reading TTS (karaoke pipeline)** — client-side ở SP1:
    1. Cắt title: nếu ≥2 dòng và dòng đầu ≤20 ký tự → dòng đầu là title.
    2. **Tách câu** bằng regex giữ dấu câu cuối: `/[^。！？!?…；;]+[。！？!?…；;]*/g`, trim, bỏ rỗng.
    3. Mỗi câu `{zh, py, vi}`: tra bản dịch từ sentence-map của demoDoc (khớp nguyên câu); không khớp → vi = "(bản dịch demo — tính năng AI cần backend)", py = null.
    4. Render từng câu thành row: nút ▶ + câu zh tách thành **span từng ký tự** (`.zh-char`) + dòng pinyin (toggle pill "Pinyin") + dòng dịch (toggle "Dịch") + select tốc độ 0.7×/1×/1.3×; nút "🔊 Phát cả bài" nối chuỗi từ câu 0.
    5. **Karaoke phát 1 câu**: `SpeechSynthesisUtterance(zh)`, `lang='zh-CN'`, `rate` theo select, giọng theo `useTts()` (nữ/nam từ settings). Highlight theo ký tự: ưu tiên **`onboundary`** (`e.charIndex`) — có boundary thì tắt timer fallback; nếu không có boundary/lỗi TTS → **timer chia đều 260ms/ký tự ÷ rate**; sau ký tự cuối chờ `onend` với **grace timeout 2500ms chống treo**; `onend` → clear highlight → nối câu tiếp (chain) hoặc dừng. Token `gen++` huỷ mọi timer/utterance cũ khi đổi câu/dừng (mutation-safe).
    6. Text mẫu đủ khớp demoDoc → hiện thêm "Câu hỏi & Từ vựng": MCQ (A/B/C/D, đúng → viền đỏ + toast "Chính xác! 🎉") + list từ vựng (word + pinyin + nghĩa + ⭐ demo).
  - **Ranh giới:** SP1 đúng bản client TTS + dịch giả (`[PORT]`). Đích UPG (SP5, proposal §4.4): dịch câu + audio giọng bản xứ qua `POST /ai/*` + `POST /tts` (audio cache R2 `reading-audio/{docId}.mp3` vĩnh viễn), lưu bài → bảng `reading_docs` (`sentences_json` karaoke `[{zh, pinyin, vi, t0, t1}]`, `questions_json`) — 00 §3.3; khi có `t0/t1` thật, highlight chuyển từ timer/boundary sang timeline audio. Chi tiết AI thuộc spec SP5 — ở đây chỉ khoá shape dữ liệu.
- **Backend:** SP1: client-only (speechSynthesis trình duyệt). SP5: `POST /ai/chat`, `POST /tts` (00 §8) — tham chiếu, không định nghĩa lại.
- **DB:** SP1 không; SP5 `reading_docs` (00 §3.3, đã đánh dấu [SP5]).
- **Cache:** SP1 không cache (TTS client). SP5: audio R2 + Cache API edge vĩnh viễn theo hash nội dung (00 §7).
- **Acceptance criteria:**
  1. Dán văn bản mẫu → "Tạo bài đọc" render đúng số câu theo regex tách câu (câu giữ dấu câu cuối); title tự nhận khi dòng đầu ≤20 ký tự.
  2. Phát 1 câu: ký tự highlight tuần tự chạy theo rate (0.7× chậm hơn 1× thấy rõ); có `onboundary` thì highlight bám TTS chứ không chạy timer.
  3. "Phát cả bài" nối chuỗi câu 0→N, nút đổi "⏹ Dừng"; bấm dừng giữa chừng huỷ TTS + highlight sạch (không rò timer).
  4. Toggle Pinyin/Dịch hoạt động độc lập; bản dịch câu không khớp demoDoc hiện đúng text "(bản dịch demo…)".
  5. Browser không có speechSynthesis → vẫn karaoke bằng timer (không treo UI).

---

## 3. Đề xuất bổ sung [CẦN DUYỆT]

1. **Nhận dạng vẽ tay thật (G1, UPG-5 + proposal §4.7)** — ngoài 00 hiện chưa có endpoint nhận dạng. Đề xuất: `POST /api/v1/hanzi/recognize` body `{strokes: number[][][]}` (toạ độ 0–100 đã chuẩn hoá của DrawPad) → `{candidates: ["你","好",…]}`; backend dùng thư viện nhận dạng chạy trên Worker (ví dụ tensorflow.js model nhỏ) hoặc service ngoài; rate-limit class `ai` (20/ngày/user, 00 §6). **Xếp SP5 (UPG-5).** Trước đó SP1/UPG-3 giữ gợi ý giả theo SPEC-03/09.
2. **"Từ vựng thực chiến CC-CEDICT" cho `/hanzi/{char}` (proposal §4.7)** — list từ rộng chứa chữ đó, dịch Việt. Không nằm trong data module hiện tại. Đề xuất: build-time precompute index "chữ → các entry CC-CEDICT chứa chữ" kèm dataset G2 (UPG-3), render client từ chunk index lazy; **không thêm endpoint**. Xếp **SP3** (chạy cùng UPG-3 dataset nét + entries G1). Nếu index quá lớn cho bundle → mới cân nhắc `GET /api/v1/hanzi/{char}/vocab` + Cache API 1h.
3. **Field heatmap cho `/users/me`** — F2 cần `xp_daily` 12 tháng; nếu lấy toàn bộ qua `snapshot` thì nặng khi trang chỉ cần heatmap. Đề xuất thêm vào response `GET /users/me` một field `heat: {"YYYY-MM-DD": n}` (chỉ 365 ngày gần nhất, tính server-side, không thêm bảng). Nếu giữ chuẩn 00 (không sửa endpoint) → lấy qua `snapshot` và chấp nhận payload lớn hơn. **Cần chọn 1 — khuyến nghị field `heat`.**
4. **Nhập dán loạt từ cho deck (SPEC-12)** — parser "hanzi [tab] pinyin [nghĩa]" + toast "Đã nhập N từ hợp lệ" hiện chưa có trong khuôn SPEC-18 đang port. Đây là tính năng thật của site gốc, nên làm ở **UPG-2** (modal "Tạo bộ mới" 2 bước: tên → textarea dán) khi đã có `POST /users/decks/:id/rows`. Xếp **SP2 backlog** — quyết định có đưa vào SP2 hay không cần duyệt.
5. **Deck mặc định "Từ điển đã lưu"** — quy ước migration 00 §3.5 ánh xạ `vocabBook → decks` nhưng chưa chỉ định deck nào là đích. Đề xuất: khi migration chạy mà chưa có deck này, tự tạo `decks {name: "Từ điển đã lưu", kind: 'vocab'}` (không xoá được qua UI hoặc xoá sẽ tự tái tạo). Cần duyệt để ghi vào spec migration.
