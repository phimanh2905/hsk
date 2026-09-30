# 12 — Media & Documents (shadowing · tạo file luyện viết · chứng chỉ)

- **Ngày:** 2026-09-30 · Thuộc bộ `docs/superpowers/specs/fullstack/`
- **Phạm vi:** feature ID **G4, G5, G6, G7, G8, G9** (mục 7 "Công cụ" của feature inventory).
- **Tham chiếu:**
  - Hợp đồng canonical: `fullstack/00-platform-data.md` (§3 schema, §4 R2/KV, §6 API, §7 cache, §8 payments/entitlements/codes) — dưới đây gọi là **00 §n**.
  - Feature inventory: `2026-09-30-hsk-feature-inventory.md` (mục 7, mục 10 ma trận SP).
  - SPEC hành vi clone: `clone/specs/SPEC-06-shadowing.md`, `SPEC-19-shadowing-library.md`, `SPEC-08-create-file.md`, `SPEC-16-create-file-catalog.md` (SPEC-13 đã bị 16 thay thế — bỏ). Khi HTML clone và SPEC lệch nhau, **SPEC thắng**.
  - Code tham khảo: `clone/js/shadowing.js`, `clone/js/shadowing-video.js` (postMessage polling 500ms, fallback TTS, MediaRecorder dòng 446+), `clone/js/create-file.js` (839 dòng, sessionStorage `nhai.cf.state`, mọi key có default), `clone/js/data/templates.js`, `clone/js/data/shadowing.js`, `clone/assets/theme.css` (@media print dòng 85).
  - Bối cảnh site gốc: `nhaihsk-clone-proposal.md` §4.3 (shadowing), §4.5 (GateGrow mã Facebook), §6.4 (PDF, bản quyền video).

## 1. Tổng quan domain

### 1.1 Route Next.js (App Router)

| Route | Loại render | Feature |
|---|---|---|
| `/shadowing` | SSG (thư viện tĩnh) | G4 |
| `/shadowing/[videoId]` | SSG skeleton + client player (generateStaticParams từ content module) | G5 |
| `/create-file` | SSG (catalog 9 mẫu) | G6 |
| `/create-file/[tpl]` | SSG khung + client form/preview | G7, G8 |
| `/certificate-test` | SSG (10 card coming-soon) | G9 |

### 1.2 Client component vs SSG

- **SSG thuần (server component):** `/shadowing`, `/create-file` catalog, `/certificate-test`, header/breadcrumb của `/create-file/[tpl]` — nội dung 100% tĩnh, import build-time từ content module (00 §7 dòng "Content TS modules G6").
- **Client component:** toàn bộ tương tác của G5 (player, dictation, ghi âm), G7 (form 7 nhóm + reducer), G8 (preview renderer + `window.print()` + gate). Preview G8 là render thuần từ state — vẫn nằm trong client component vì phải re-render tức thì theo form.
- Không có trang nào trong domain này cần SSR theo cookie ở SP1; khi UPG-3/UPG-4 bổ sung dữ liệu user (progress, entitlement) thì fetch client-side qua API, **không** chuyển trang sang dynamic.

### 1.3 Ranh giới SP1 (port mock) vs UPG

| Ranh giới | SP1 (port đúng mock) | Nâng cấp |
|---|---|---|
| Thư viện shadowing | Data hardcode trong content module TS: **5 playlist × 4 card = 32 video DEMO** (SPEC-06) — thumbnail là placeholder gradient + chữ Hán mờ, KHÔNG tải ảnh YouTube; chỉ 1 video (`EA3rwvr99Q0`) có phụ đề đầy đủ ≥9 câu | **UPG-3:** thư viện video thật, phụ đề thật đổ vào `R2_DATA shadowing-subs/{videoId}.json` (00 §4), mở rộng số video |
| Gate in file (G8) | Mã `FREEHSK` check local `nhai.fileCode` (mock, không server); badge "Đăng nhập để in" mở login modal mock | **UPG-4:** entitlement thật — `POST /codes/redeem` (free_codes) hoặc mua qua `POST /payments/momo/create` → bảng `entitlements` product `file_print` (00 §3.4, §8) |
| "Format bằng AI" (G7 nhóm 1) | Mock: chuẩn hoá từ data có sẵn + toast | **UPG-5:** `POST /ai/format-vocab` (00 §8) |
| shadowing_progress | Không lưu (clone không lưu) | **UPG-3 (optional):** bảng `shadowing_progress` (00 §3.3) |
| Certificate-test | 10 card "sắp ra mắt" | G9 giữ coming-soon; làm thật = quyết định riêng **sau SP5** |

### 1.4 Nguyên tắc kỹ thuật xuyên suốt

- Player YouTube và preview in là **2 vùng imperative được cô lập trong 1 component có ref mỗi bên** (inventory G5 ghi rõ "giữ imperative, 1 component") — không declarative hoá iframe YouTube, không bọc preview in bằng state React không cần thiết.
- Không dùng Tailwind CDN; `@media print` của clone chuyển vào CSS compiled (xem §2 G8, acceptance in A4).

## 2. Spec từng tính năng

### G4 — Shadowing: thư viện playlist

- **Frontend:**
  - Route `/shadowing` (SSG) + `/shadowing?cat=<slug>` (filter client-side 1 nhóm + breadcrumb "← Tất cả nhóm" — giữ query param như clone; không tách route riêng để tránh sinh trang trùng).
  - Khung theo SPEC-19: mỗi playlist 1 `<section>`: `h2` tên + "(N bài học)", mô tả 1 dòng, link "XEM TẤT CẢ →" (SP1: `href="#"` + toast "Sẽ có sớm"), grid `grid-cols-2 md:grid-cols-4`.
  - Card video theo SPEC-19 §C: thumbnail 16:9 gradient theo index + chữ Hán mờ ở giữa (poster tĩnh, không nhúng YouTube, không fetch ảnh), 3 badge xếp dọc góc phải (lượt xem / HSK pill đỏ / YouTube pill xám), thời lượng góc dưới phải nền đen, `h3` tiêu đề `line-clamp-2`, tên playlist nhỏ xám, pill "Shadowing".
  - Data: content module TS `content/shadowing.ts` export `{ playlists: [...], videos: [{id, title, playlist, hsk, views, duration, viewsSuffix}], subtitles: {videoId: [{n, start, end, parts, pinyin, vi}]} }` — hợp nhất `NHAI_DATA.shadowing` của SPEC-06 (5 nhóm × 4) và SPEC-19 (2 playlist × 5): **SP1 dùng bộ 5 playlist × 4 card = 32 video DEMO của SPEC-06** (bản đầy đủ hơn), tiêu đề song ngữ lấy từ SPEC-19 khi trùng.
  - Components: `<ShadowingLibrary>` (server, SSG), `<PlaylistSection>`, `<VideoCard>` (server).
- **Backend:** SP1 không có. UPG-3: nếu catalog chuyển về server thì thêm endpoint public kiểu `GET /shadowing/catalog` (đề xuất ở §3) — ngoài đó chỉ dùng các endpoint 00 §8 sẵn có.
- **DB:** không có ở SP1. UPG-3 optional: `shadowing_progress(user_id, video_id, percent, plays, last_at)` (00 §3.3) — chỉ khi làm "tiến độ xem".
- **Cache:** content module → build-time import, SSG, không runtime fetch (00 §7). UPG-3: phụ đề `R2_DATA shadowing-subs/{videoId}.json` + Cache API edge (00 §4, §7); nếu thư viện thật quá lớn để SSG toàn bộ thì ISR (00 §7 dòng Content TS modules).
- **Acceptance criteria:**
  1. `/shadowing` render đủ 5 playlist, mỗi section có h2 + số bài + mô tả + "XEM TẤT CẢ" + lưới 4 card (grid 4→2 cột responsive).
  2. Card đúng SPEC-19 §C: 3 badge dọc góc phải + thời lượng góc dưới phải + tiêu đề 2 dòng + pill "Shadowing"; không có request nào tới `i.ytimg.com` (thumbnail placeholder).
  3. `?cat=<slug>` chỉ còn 1 nhóm + breadcrumb quay lại hoạt động; "XEM TẤT CẢ" bấm ra toast "Sẽ có sớm".
  4. Click card → `/shadowing/<videoId>` đúng id; trang video hiển thị đúng title/HSK theo data và mục "Video liên quan" 4 card cùng playlist (SPEC-19 §E).
  5. Trang được prerender tĩnh (HTML có sẵn nội dung khi view-source, không chờ JS).

### G5 — Shadowing-video: player + dictation + MediaRecorder

- **Frontend:** route `/shadowing/[videoId]` — SSG khung (title, badge HSK, breadcrumb "‹ Shadowing", video liên quan) + **1 client component duy nhất** `<ShadowingPlayer>` chứa toàn bộ logic imperative (port gần nguyên vẹn `shadowing-video.js`, 480 dòng).
  - **YouTube iframe qua postMessage — giữ imperative:** render iframe `https://www.youtube-nocookie.com/embed/<id>?enablejsapi=1` bằng ref; gửi lệnh JSON `{event, info, args}` qua `iframe.contentWindow.postMessage(..., 'https://www.youtube-nocookie.com')`; lắng nghe `window.message` + **polling 500ms** để đồng bộ vị trí phát (theo cách clone, không dùng YT IFrame API SDK). Command: `playVideo/pauseVideo/seekTo` theo `subtitle[i].start/end`. KHÔNG declarative hoá, KHÔNG đưa playback state vào React state ngoài 1 slice hiển thị (câu hiện tại) cập nhật theo polling.
  - **Fallback TTS:** nếu iframe không load trong 4s (offline/chặn) → overlay "Video YouTube — cần kết nối mạng" + tự chuyển mode "Dùng TTS đọc câu" (speechSynthesis từng câu zh, qua hook `useTts()` A8).
  - Thanh công cụ: 2 nút mode "Bắt chước phát âm" / "Nghe - Viết chính tả" (active đỏ); "Ẩn video" (collapse iframe, phát tiếp bằng TTS); dialog "Phím tắt" (Space play/pause, ← → câu trước/sau, R lặp lại — keydown trên document, bỏ qua khi đang focus input).
  - Điều khiển câu: "⏮ Câu trước" / "🔁 Lặp lại" / ▶/⏸ (nút to) / "⏭ Câu sau" / toggle "Tự ngắt câu" / "Bản dịch" / "Pinyin" / tốc độ (0.5/0.8/1/1.5/2 — postMessage `setPlaybackRate`) / dialog "Cài đặt" (font size transcript, tự cuộn).
  - BẢN CHÉP: hàng nút toggle Pinyin/Trans/Ẩn; câu đánh số #1 #2 là button — text zh chia span con bấm được, pinyin + dịch theo toggle, nút "Báo lỗi" → toast (SP1 mock; UPG-2 có thể nối `POST /error-reports` 00 §8 — ngoài phạm vi, ghi nhận). Câu đang phát: nền vàng nhạt + tự cuộn vào view (`scrollIntoView` theo setting).
  - **Dictation:** ô input lớn "Gõ những gì bạn nghe được (chữ Hán hoặc pinyin)" + nút "Nghe câu này" 🔊 (seekTo start câu) + "Kiểm tra" — so với câu hiện tại bỏ qua dấu cách/dấu thanh (chuẩn hoá pinyin như clone); đúng → ✅ xanh; sai → highlight chữ sai đỏ + hiện đáp án; nút "Bỏ qua câu này".
  - **Ghi âm MediaRecorder:** mode phát âm có nút "🔁 Ghi âm của bạn" — `getUserMedia({audio:true})` + `MediaRecorder` (guard `navigator.mediaDevices && window.MediaRecorder`, từ chối im lặng); nút record đỏ/stop; playback list tạm (blob URL). **Cleanup bắt buộc:** unmount component phải `rec.stop()` + `stream.getTracks().forEach(t => t.stop())` + thu hồi blob URL — không rò mic sau khi rời trang.
  - Subtitle data: SP1 import từ content module (chỉ `EA3rwvr99Q0` ≥9 câu theo SPEC-06, video khác 5–8 câu mẫu). UPG-3: fetch `R2_DATA shadowing-subs/{videoId}.json` client-side, giữ shape `{n, start, end, parts:[{zh}], pinyin, vi}`.
- **Backend:** SP1 không có (dictation chấm client, báo lỗi toast). UPG-3: phụ đề R2 + (optional) `shadowing_progress` sync qua `POST /users/sync` (00 §5) hoặc endpoint riêng — quyết định ở §3.
- **DB:** không có SP1; `shadowing_progress` (00 §3.3) optional UPG-3.
- **Cache:** SP1: phụ đề nằm trong bundle SSG. UPG-3: `shadowing-subs/*` ở R2 + Cache API + browser cache dài hạn (00 §7); progress client = localStorage qua ProgressStore (00 §5).
- **Acceptance criteria:**
  1. Mode đổi được; câu active highlight vàng + bấm câu nhảy câu (seekTo đúng `start`); ⏮/⏭/🔁/tốc độ hoạt động qua postMessage (verify bằng log message khi test có mạng).
  2. Offline/chặn YouTube 4s → overlay hiện + fallback TTS đọc câu, mọi nút câu vẫn hoạt động.
  3. Dictation: gõ đúng (bỏ dấu cách/thanh) → ✅; sai → chữ sai đỏ + đáp án; "Bỏ qua" chuyển câu.
  4. Ghi âm: cấp quyền → record/stop/playback; từ chối quyền → im lặng không lỗi; rời trang trong lúc ghi → mic tắt (kiem tra đèn indicator).
  5. Phím tắt Space/←/→/R hoạt động, không kích hoạt khi đang gõ ô dictation.
  6. Video liên quan = 4 card cùng playlist; breadcrumb "‹ Shadowing" về `/shadowing`.

### G6 — Create-file: catalog 9 mẫu

- **Frontend:** route `/create-file` (SSG) — theo SPEC-16 §A (thay SPEC-08 mục 1):
  - Header: H1 "Tạo file" + badge "生成练习本" + sub "— Tạo bản in luyện viết chữ Hán theo thứ tự nét".
  - Banner vàng nhạt: "Cần mã tải file để in. Tham gia nhóm Facebook Nhai HSK, mã nằm ở phần mô tả nhóm." + link đỏ "Tham gia nhóm để lấy mã" → facebook.com/groups/nhaihsk.
  - 3 section (h2 + lưới card): **Mẫu chữ Hán** (Luyện viết theo thứ tự nét `stroke-order`, Ô chữ lớn `big-char`); **Mẫu từ vựng** (Luyện viết từ vựng `vocab`, Bảng tự kiểm tra từ vựng `vocab-check`, Nhìn pinyin viết chữ Hán `pinyin-write`); **Đoạn văn & giấy ô** (Chép đoạn văn `copy`, Bài văn dòng kẻ có pinyin `pinyin-lines`, Giấy ô trống `blank-grid`, Bìa vở luyện chữ `cover`).
  - Card: ảnh minh hoạ **SVG inline tĩnh** (vẽ đúng ý mẫu: ô vuông/nét đỏ/dòng kẻ/ô pinyin — không cần pixel-perfect, không ảnh ngoài) + `h3` + mô tả 1–2 dòng mờ. Click → `/create-file/<tpl>`.
  - Components: `<CatalogPage>` (server), `<TemplateCard>` (server, nhận SVG con theo template). SVG minh hoạ đặt trong content module `content/create-file/templates.ts` cùng metadata (id, tên, mô tả, nhóm, mô tả dài) — port của `templates.js`.
- **Backend:** không có (toàn bộ tĩnh).
- **DB:** không có. UPG-4 (nếu catalog cần đếm lượt dùng) → không bắt buộc; bỏ qua.
- **Cache:** build-time import + SSG (00 §7 dòng G6); không runtime fetch.
- **Acceptance criteria:**
  1. `/create-file` mặc định ra catalog **đúng 9 mẫu / 3 nhóm**, mỗi nhóm đủ card theo SPEC-16 §A.
  2. Banner gate + link Facebook nhóm hiển thị đúng trên cả catalog.
  3. 9 SVG minh hoạ render inline (không request ảnh ngoài), mỗi card mô tả khớp SPEC-08/16.
  4. Click mỗi card → `/create-file/<tpl-id>` đúng template; breadcrumb "‹ Thư viện mẫu" về catalog.
  5. Catalog prerender tĩnh.

### G7 — Create-file: form 7 nhóm tuỳ chọn

- **Frontend:** route `/create-file/[tpl]` (SSG khung theo `generateStaticParams` 9 tpl) + client component `<CreateFileForm>` cột phải + `<A4Preview>` cột trái (renderer của G8 dùng chung).
  - Tầng 1: link "‹ Thư viện mẫu" · H1 tên mẫu · mô tả · badge "N trang" (tính động theo state) · nút đỏ "🖨 In / Lưu PDF" (hành vi gate ở G8).
  - **Form 7 nhóm** (SPEC-16 §B, mỗi nhóm 1 card):
    1. *Từ vựng cần luyện* (tpl ∈ vocab, vocab-check, pinyin-write): "Hướng dẫn nhập từ vựng" (modal), "Nhập vào danh sách" (modal textarea, mỗi dòng `hanzi pinyin nghĩa`), **"Format bằng AI"** (SP1 mock: chuẩn hoá từ data, toast "Đã format N từ"; UPG-5: `POST /ai/format-vocab`); danh sách từ: chữ Hán lớn / pinyin + Hán Việt IN HOA / input nghĩa sửa được / nút xoá hover; dòng "N từ sẽ có trong bản in" + "Xóa tất cả".
    2. *Trang*: input "Tiêu đề" + checkbox "Tiêu đề + Họ tên/Ngày" (checked).
    3. *Loại ô* (radio): Điền tự ✓ · Mễ tự · Ô vuông · Hồi cung · Cửu cung — đổi → preview đổi shape ô.
    4. *Màu ô* (radio): green · red · blue · gray ✓.
    5. *Bố cục*: 3 stepper Số ô mỗi hàng (12) / Số hàng tô (1) / Số hàng trống (0) + slider "Số từ mờ" 3/12.
    6. *Chữ*: checkbox Khải thư ✓ / Hành thư · radio Nguồn nét `笔顺 CNstrokeorder 永远` ✓ / `清风体 永远` · checkbox "Kiểu chữ tô": Tô mờ ✓ / Chữ rỗng / Rỗng nét đứt / Nét đứt mảnh · slider "Độ đậm" 30% · slider "Cỡ chữ" 78%.
    7. *Hiển thị*: checkbox Pinyin ✓ · Nghĩa ✓.
  - Chân form: "Khôi phục mặc định" + ghi chú "Bấm In rồi chọn 'Lưu dưới dạng PDF'…".
  - "Mẫu in cùng loại": card dưới cột phải, link các mẫu cùng nhóm; đổi `tpl` **giữ nguyên state** (SPEC-16 §C).
  - **State → reducer (thay sessionStorage trực tiếp):** mọi tuỳ chọn gom thành 1 state shape `{tpl, chars[], title, nameDate, cellType, cellColor, perRow, fillRows, blankRows, faintCount, script, strokeSource, traceStyle[], opacity, fontSize, showPinyin, showMeaning}` — đủ **18 nhóm key** của clone; quản bằng `useReducer` (port logic merge-default của `create-file.js`), persist vào `sessionStorage` key `nhai.cf.state` qua helper của `ProgressStore`/storage interface (không gọi sessionStorage rải rác trong component). Vào catalog (`/create-file`) reset CF trong bộ nhớ nhưng **không ghi đè** sessionStorage đã lưu (khớp hành vi create-file.js dòng 832). Đổi tpl trong form = dispatch action đổi `tpl`, giữ phần còn lại.
  - Chars mặc định theo template (port `templates.js`: `stroke-order` = 永 yuǎn 远 xué 学 xí 习 hàn 汉 zì 字; `vocab` = từ vựng Bài 1 HSK1 từ content vocab).
- **Backend:** SP1 không có. UPG-5: `POST /ai/format-vocab` (00 §8) cho nút "Format bằng AI" — body zod `{text}`, trả `{chars:[{hanzi,pinyin,hv,meaning}]}`; rate-limit class `ai` (00 §6).
- **DB:** không có ở SP1/UPG-4 (state là phiên dùng, không lưu server; nếu tương lai muốn "lưu cấu hình" → đề xuất riêng ở §3, không tự thêm bảng).
- **Cache:** không cache (trang có tương tác); khung SSG tĩnh. Metadata từ content module build-time (00 §7).
- **Acceptance criteria:**
  1. Form có đủ 7 nhóm với mặc định khớp gốc: Điền tự, gray, 12/1/0, 3/12, Khải thư, CNstrokeorder, Tô mờ, 30%, 78%, Pinyin+Nghĩa.
  2. Đổi bất kỳ tuỳ chọn nào → preview cập nhật ngay (không reload); badge "N trang" tính đúng khi đổi số hàng/ô.
  3. Sửa nghĩa / xoá từ / "Nhập vào danh sách" → preview cập nhật ngay; "Format bằng AI" mock ra toast "Đã format N từ".
  4. Đổi mẫu "cùng loại" → state giữ nguyên; refresh trang → state khôi phục từ `nhai.cf.state`; vào catalog rồi quay lại → vẫn giữ state cũ.
  5. "Khôi phục mặc định" trả đúng bộ default template hiện tại.

### G8 — Create-file: preview A4 + in PDF + gate FREEHSK

- **Frontend:** `<A4Preview>` — renderer client port của `create-file.js`:
  - Preview từng template theo SPEC-08 §2 / SPEC-16 §D: `stroke-order`/`big-char` (meta Hán Việt IN HOA + pinyin + nghĩa; ô SVG nét hoàn chỉnh + ô bước nét ①②③ nét mới tô đỏ; hàng mờ) — **nguồn nét chọn ở nhóm 6**, và các mẫu còn lại (ô vẽ theo loại ô + màu ô, số cột = perRow, hàng tô/trống theo bố cục, faintCount chữ đầu tô mờ, opacity/fontSize theo slider). `blank-grid`: lưới 12×14 nét đứt chéo. `cover`: bìa "Sổ luyện viết chữ Hán" + Họ tên/Lớp/Năm học + logo "练". Header preview "Họ tên: ____ Ngày: ____", footer "nhaihsk.com · facebook.com/groups/nhaihsk".
  - **In/Lưu PDF:** `window.print()` — giữ nguyên cơ chế clone. `@media print` của clone (`[data-shell], .no-print { display:none }`, body trắng, `.print-area` bỏ shadow — theme.css:85) chuyển thành global CSS compiled Tailwind v4 (file CSS app, dùng biến thể `print:` hoặc block `@media print` thuần — giữ selector semantic `data-shell`/`no-print`/`print-area` để hành vi in không đổi). Chỉ in cột trái + header (form, topbar, footer site ẩn).
  - **Gate (SP1 mock đúng clone):** nút "In / Lưu PDF" — nếu chưa có mã: input "Nhập mã" + "Mở khóa in"; mã `FREEHSK` → set `nhai.fileCode` (localStorage qua ProgressStore) + mở khoá; sai → toast "Mã không đúng. Mã nằm ở mô tả nhóm Facebook". Badge "Đăng nhập để in" khi chưa mock-login → mở Login modal. Catalog hiện callout gate (G6).
  - **Gate (UPG-4 thật):** kiểm tra `GET /entitlements/me` (00 §8) có product `file_print`; nếu chưa: modal gate 2 lối — **redeem code** `POST /codes/redeem` (mã trong mô tả nhóm Facebook, giữ growth hack §4.5 proposal; server ghi `code_redemptions` + cấp `entitlements` source `code`) hoặc **mua** `POST /payments/momo/create` → redirect MoMo, webhook xác nhận (00 §6, idempotent `provider_ref`). Migrate key: `nhai.fileCode` cũ → nợ redeem code ở SP4 (00 §3.5 dòng cuối). UI gate mock ở SP1 phải giữ nguyên shape để UPG-4 chỉ thay logic check, không đổi layout.
- **Backend:** SP1 không có. UPG-4: `GET /entitlements/me`, `POST /codes/redeem`, `POST /payments/momo/create|webhook` (đã canonical 00 §8 — không định nghĩa lại; payload chi tiết hoá ở spec SP4).
- **DB:** UPG-4: `free_codes`, `code_redemptions`, `entitlements` (product `file_print`), `orders` — 00 §3.4. SP1 không bảng nào.
- **Cache:** không cache trang; entitlement fetch client mỗi lần mở gate (không KV). Cache API chỉ áp dụng quy tắc chung 00 §7.
- **Acceptance criteria:**
  1. Preview A4 render đúng từng template (9 mẫu) theo cấu hình; đổi loại ô/màu ô/số từ mờ/độ đậm/cỡ chữ → preview đổi tức thì.
  2. **Bản in A4 giống clone sau khi chuyển compiled Tailwind:** in preview của `blank-grid` (12×14 ô nét đứt chéo) và `stroke-order` (bước nét đỏ) ra PDF bằng "Save as PDF" → so ảnh chụp bản in của clone cùng cấu hình: khổ A4, lưới ô, độ mờ chữ, header/footer khớp; form + topbar không xuất hiện trên bản in.
  3. Gate SP1: sai mã → toast đúng nội dung; đúng `FREEHSK` → mở khoá in, `nhai.fileCode` được lưu; reload vẫn khoá mở; "Đăng nhập để in" mở login modal khi chưa mock-login.
  4. Đếm trang (badge "N trang") khớp số trang preview thực tế khi đổi perRow/fillRows/blankRows.
  5. (UPG-4) Sau redeem code hợp lệ → `entitlements` có `file_print`, nút In mở khoá không cần reload; code hết lượt/hết hạn → lỗi `FORBIDDEN`/`VALIDATION` đúng 00 §6.

### G9 — Certificate-test: coming-soon

- **Frontend:** route `/certificate-test` (SSG): trang "Luyện thi chứng chỉ" với **10 card "sắp ra mắt"** (các cấp/chứng chỉ HSK theo clone — port nguyên danh sách, mỗi card: tên, mô tả ngắn, badge/overlay "Sắp ra mắt", không bấm được hoặc bấm toast "Sẽ có sớm"). Không có form, không state client ngoài toast.
- **Backend:** không có. Không thiết kế endpoint — làm thật là quyết định riêng **sau SP5** (inventory G9), sẽ có spec riêng khi đó.
- **DB:** không có.
- **Cache:** SSG build-time (00 §7 content modules).
- **Acceptance criteria:**
  1. Render đúng 10 card coming-soon khớp clone (tên + thứ tự + badge).
  2. Không có nút hành động thật; tương tác duy nhất là toast "Sẽ có sớm" (nếu clone có).
  3. Trang prerender tĩnh; có metadata SEO title/description.

## 3. Đề xuất bổ sung [CẦN DUYỆT]

1. **Sinh PDF server-side — đề xuất KHÔNG làm, giữ client print như clone.** Puppeteer/Chromium không chạy trên Cloudflare Workers; các alternative server (`@react-pdf/renderer`, `pdf-lib`, `jsPDF` ở server) đều phải dựng lại toàn bộ renderer ô vuông/nét chữ SVG của clone với rủi ro lệch bản in, trong khi `window.print()` + "Lưu dưới dạng PDF" của trình duyệt đã cho bản in đúng 100% preview (chính là acceptance của G8). Đề xuất: **SP1–SP5 giữ client print**; nếu sau này cần "tải file PDF chuẩn" (vd gửi file qua email, mobile in khó) thì cân nhắc `pdf-lib` dựng vector riêng như một sub-project mới — ngoài phạm vi spec này.
2. **Video mới thêm vào thư viện ở đâu?** Đề xuất **content module TS (`content/shadowing.ts`) làm nguồn chân lý đến hết UPG-3**: review/git-friendly, build-time SSG, không cần bảng DB hay admin UI; metadata video + phụ đề json push lên `R2_DATA shadowing-subs/` bằng script build/upload. Chỉ khi nhu cầu "thêm video không cần deploy" xuất hiện (nhiều người nhập liệu) mới chuyển sang bảng D1 (`shadowing_videos`, `shadowing_playlists`) + admin — ghi nhận đây là quyết định mở của UPG-3, chưa định nghĩa schema.
3. **Catalog shadowing thật (UPG-3) cần endpoint public nếu số video lớn:** `GET /api/v1/shadowing/catalog` (Cache API 1h + SWR, khớp luật API public 00 §7) thay vì import cả nghìn video vào bundle. Nếu giữ <200 video thì không cần — SSG tiếp. Cần duyệt ngưỡng số lượng trước khi làm UPG-3.
4. **Lưu `shadowing_progress` (UPG-3 optional):** đề xuất đi qua `POST /users/sync` outbox (entity mới `shadowing_progress`) thay vì endpoint riêng — tận dụng protocol 00 §5, không thêm endpoint. Cần duyệt để 00 bổ sung entity này vào danh sách merge khi quyết định làm.
5. **"Báo lỗi" trong transcript G5:** hiện toast mock; đề xuất khi UPG-2 nối sẵn `POST /error-reports` (00 §8, đã canonical) với payload `{video_id, sentence_n, message}` — chi tiết hoá ở spec SP2, không cần bảng mới.
6. **Lưu cấu hình form create-file theo user:** clone không có; nếu muốn (mục DB của G7 ghi nhận) sẽ là bảng mới ngoài 00 §3 — **chỉ làm nếu có yêu cầu thực tế**, đề xuất hoãn, không đưa vào SP nào.
