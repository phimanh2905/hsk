# 10 — Learning Core (home · course · lesson 7 chế độ · nền tảng · roadmap)

- **Ngày:** 2026-09-30 · Thuộc bộ `docs/superpowers/specs/fullstack/`
- **Tham chiếu (nguồn đã đọc):**
  - `docs/superpowers/specs/fullstack/00-platform-data.md` — hợp đồng canonical (schema §3, sync §5, API §6, cache §7, catalog §8)
  - `docs/superpowers/specs/2026-09-30-hsk-feature-inventory.md` — feature ID + trạng thái
  - `clone/specs/SPEC-01-home-course-leaderboard.md`, `SPEC-02-vocab-lesson.md`, `SPEC-14-lesson-polish.md`, `SPEC-04-radicals-pinyin-soundrules.md`, `SPEC-05-roadmap-review-gated.md`, `SPEC-20-radicals-autoplay-strokes.md`, `SPEC-21-roadmap-session.md`
  - `nhaihsk-clone-proposal.md` §4.1–4.2, §4.6 (site gốc)
  - Nguồn hành vi chi tiết (khi cần): `clone/js/lesson.js`, `lesson-*.js`, `roadmap-session.js`, `js/data/vocab.js`, `js/data/courses.js`
- **Quy tắc ranh giới:** SP1 port đúng hành vi mock hiện có (leaderboard giả vẫn giả, battle Top-10 giả vẫn giả); UPG tách bạch ghi rõ từng mục.

## 1. Tổng quan domain

### 1.1 Sơ đồ route Next (App Router)

| Route | Trang clone | Render |
|---|---|---|
| `/` | index.html | RSC, SSG |
| `/course` | course.html (kệ sách) | RSC, SSG |
| `/course/[book]` (`?skill=`) | course.html (1 khóa) | RSC SSG khung + client list |
| `/lesson/[book]/[page]` | lesson.html | **Client-heavy**: RSC shell + `LessonProvider` client |
| `/lesson/custom/[deckId]` | lesson.html?custom= | client-only, không SSG |
| `/pinyin`, `/pinyin/practice` | pinyin.html, pinyin-practice.html | RSC SSG / client practice |
| `/radicals` | radicals.html | RSC SSG + client deck/modal |
| `/sound-rules` | sound-rules.html | RSC, SSG |
| `/roadmap` | roadmap.html | RSC, SSG (client chép progress %) |
| `/roadmap/pinyin` | roadmap-pinyin.html (stepper + timeline 8 buổi) | RSC SSG + client trạng thái |
| `/roadmap/pinyin/session/[n]` | roadmap-session.html | client (state khoá/4 tab) |

### 1.2 Kiến trúc component/provider

- **Content layer (build-time):** toàn bộ dữ liệu học (`vocab`, `courses`, `radicals`, `pinyin`, `roadmapPinyin`, `soundRules`) là **TS modules dưới `src/content/`**, import trực tiếp trong server component → SSG/ISR (00 §7 dòng "Content TS modules"). Không có endpoint runtime nào trả content. Dữ liệu nguồn là `clone/js/data/*.js` chuyển sang TS typed (kèm zod schema kiểm tra lúc build).
- **`ProgressStore`** (client provider, interface chung của shell — spec chi tiết ở spec Shell/Domain khác): nguồn tiến độ offline (localStorage `nhai.*`), SP1 dùng thuần local; SP2 thêm `HybridStore` sync theo 00 §5. Lesson/course/roadmap chỉ đọc/ghi qua ProgressStore, **không đụng localStorage trực tiếp**.
- **`LessonProvider`** (C1): context state machine cho 7 chế độ; nhận `items[]` từ content module hoặc deck client.
- **`useTts()`** (A8): hook TTS dùng chung cho flashcard, pinyin, radicals, roadmap-session.
- **Ranh giới SP1 vs UPG:**
  - SP1: mọi ghi tiến độ qua localStorage; leaderboard/battle Top-10 dữ liệu cứng; page badge đọc `pageDone` local.
  - UPG-2 (SP2): XP thật `POST /users/xp`, SRS thật `PUT /users/srs`, page-done `POST /users/page-dones`, battle best `PUT /users/battle-best`, roadmap `PUT /users/roadmap-progress` (tất cả đã có ở 00 §8 — không định nghĩa lại).
  - SP3: nội dung thật B3/D5 (thay DEMO data).

---

## 2. Spec từng tính năng

### B1 — Trang chủ

- **Frontend:** route `/`, RSC, SSG. Components: `WelcomeHero`, `FacebookGroupCard`, `BookGrid` (7 card: Nhai HSK 1…7-9, meta số từ/mẫu theo SPEC-01 §1), footer chữ nhỏ. Card = Link sang `/course/[book]`, style nền trắng border 2px shadow neo hover -1px (Tailwind v4, dùng design token theme của shell).
- **"Học tiếp" theo `pageDone`:** phần client nhỏ (`ContinueCard`) đọc ProgressStore `pageDone` → nếu có bài dở, hiện card "Học tiếp: <book> · Bài N" link `/lesson/[book]/[page]`; không có → ẩn. SP1 local; SP2 lấy từ `page_dones` qua snapshot merge (00 §5).
- **Backend:** không (SSG thuần). "Học tiếp" là client-only SP1.
- **DB:** không trực tiếp; SP2 đọc gián tiếp `page_dones` (00 §3.2) qua snapshot.
- **Cache:** SSG, không revalidate (content tĩnh). Phần "Học tiếp" client-side, không cache.
- **AC:**
  1. 7 card khóa đúng tên + meta đúng SPEC-01; link đúng `/course/hsk1`…`/course/hsk79`.
  2. Sau khi hoàn thành 1 bài ở lesson (pageDone), reload `/` hiện card "Học tiếp" đúng bài kế.
  3. Trang render tĩnh (không gọi API nào lúc load).

### B2 — Course: kệ sách + trang khóa

- **Frontend:**
  - `/course`: kệ sách — heading "Bài khoá — Kệ sách" + grid 7 card (thêm số bài). RSC SSG.
  - `/course/[book]`: breadcrumb + badge "Nhai" + `h1` "HSK 1 3.0" + sub 标准教程; **3 pill kỹ năng** "Từ vựng · 词汇 / Ngữ pháp · 语法 / Chữ Hán · 汉字" — `skill` là searchParam; đổi skill client-side (không reload server, chỉ cập nhật URL + list). Danh sách bài: hàng = số thứ tự ô vuông + tên bài + "N từ vựng"; hàng vocab là Link `/lesson/[book]/[page]`; bài ngữ pháp/chữ Hán là button + badge 🔒 mở Login modal (A4).
  - **Tiến độ "x/15 bài" + progress bar:** client component `CourseProgress` đọc `pageDone` từ ProgressStore lọc theo book+skill — SP1 local, SP2 merge từ D1.
  - Nút "Tổng ôn" cuối danh sách → `/review` (SP1). Đích UPG "Tổng ôn toàn khóa" xem §3.2.
- **Backend:** không (content build-time). SP2: badge tiến độ đến từ `GET /users/snapshot`.
- **DB:** `page_dones` (00 §3.2) — chỉ gián tiếp qua ProgressStore.
- **Cache:** SSG cho khung + danh sách bài (content tĩnh); progress client-side không cache. Không cache theo user.
- **AC:**
  1. `?skill=grammar|hanzi` đổi tab đổi danh sách, URL cập nhật; vocab là mặc định.
  2. HSK1 đúng 15 bài tên thật + số từ theo SPEC-01 §2.
  3. Hoàn thành bài ở lesson → về `/course/hsk1` thấy "1/15 bài" và badge hoàn thành trên hàng bài.
  4. Bài grammar/hanzi bấm → mở Login modal, không điều hướng.

### B3 — Data `courses.js` → content modules

- **Frontend:** không UI riêng — là nguồn dữ liệu cho B1/B2/C*/D*. `src/content/courses.ts` (metadata 7 khóa, số bài, số từ) + `src/content/vocab.ts` (`{[book]: {[page]: {title, words[]}}}` với `hanzi, pinyin, hanViet, meaning, pos, example{zh, pinyinPerChar[], vi}` theo SPEC-02). Export type + zod schema; validate lúc build (CI fail nếu thiếu trường).
- **Hiện trạng SP1:** [DEMO] — HSK1 đủ 15 bài vocab tên thật (SPEC-01 §2), bài 1 đủ 13 từ thật (SPEC-02); sách khác genLessons thủ tục "Bài N", 5–10 bài; từ mẫu sinh hợp lệ.
- **Đích SP3 (UPG):** thay nội dung thật — 9.789 từ, 153 bài theo GAP-2; giữ nguyên shape schema nên không phải sửa UI. Grammar/hanzi pages: shape song song (định nghĩa khi làm nội dung thật, SP3).
- **Backend:** không — `GET /books` (00 §8) chỉ là wrap metadata cho client ngoài (nếu cần), app nội bộ import trực tiếp.
- **DB:** không.
- **Cache:** build-time import, SSG/ISR (00 §7). Không runtime fetch.
- **AC:**
  1. `pnpm build` chạy validate zod trên toàn bộ content, fail rõ nếu item thiếu `pinyin`/`meaning`/`example`.
  2. Lesson B1/B2 render từ module, không có fetch network nào cho content.
  3. Shape `words[]` khớp 1:1 `NHAI_DATA.vocab` (test so sánh sample bài 1 HSK1).

### C1 — Lesson state machine (`LessonProvider`)

- **Frontend:** route `/lesson/[book]/[page]` (và `/lesson/custom/[deckId]` cho C10). Server component đọc content → truyền `items[]` vào 1 client component lớn `LessonClient` bọc `LessonProvider`. State machine: `{mode: 'flash'|'quiz'|'typing'|'cloze'|'listen'|'dance'|'battle', index, answered[], knownFlags, timers[]}`; chuyển mode qua sidebar; **cleanup timers/intervals khi unmode/unmount** (yêu cầu shell: timer radicals không dính trang cũ — SOC-20 áp dụng chung). Header: link "← Danh sách bài", badge "Bài N" nền đen (SPEC-14 §6), badge "N từ vựng", `h1` + mascot 🍅 highlight vàng (SPEC-14 §2). Tabs "Từ vựng/Ví dụ" (SPEC-14 §3: 1 hàng controls, counter pill ở giữa).
- **Backend:** không SP1. UPG-2: hoàn thành bài → `POST /users/page-dones` (client gọi qua ProgressStore, outbox §5); XP từng câu → `POST /users/xp`.
- **DB:** `page_dones`, `xp_daily` (gián tiếp).
- **Cache:** khung trang SSG; trạng thái user client-only. `/lesson/custom/*` dynamic.
- **AC:**
  1. 7 mode chuyển được qua sidebar, nút active nền đỏ; counter "1 / N" cập nhật.
  2. Chuyển mode/roời trang không còn interval chạy sót (test: bật autoplay → đổi mode → không còn TTS/tick).
  3. URL deep-link `?mode=quiz` (nếu có) mở đúng mode; reload giữ book/page.

### C2 — Flashcard

- **Frontend:** theo SPEC-02 §1 + polish SPEC-14: controls 1 hàng (ZH→VI toggle, Tự động, Xáo trộn, ⚙ autoplay, 🔊); thẻ 3D flip CSS, mặt sau nền `#f7e9c8`; 4 nút nav NGOÀI card (`‹ Trước` ghost · `✕ Chưa thuộc` đỏ `#c03922` · `✓ Đã thuộc` xanh `#2e7d32` · `Sau ›` ghost, px-8 py-2.5). Keyboard thật: ArrowLeft/a, ArrowDown/x (chưa thuộc), ArrowUp/z (đã thuộc), ArrowRight/d — binding qua hook `useKeyboard`, không đè khi focus input. TTS chữ Hán qua `useTts()`.
- **Backend:** không SP1. Đánh dấu thuộc/chưa thuộc SP1 chỉ đổi badge sidebar; UPG-2: ⭐/trạng thái ghi `PUT /users/srs` qua ProgressStore.
- **DB:** không trực tiếp (`srs_states` khi UPG, qua ProgressStore).
- **Cache:** không (client state).
- **AC:**
  1. Lật thẻ 3D bằng click; đổi chiều ZH→VI ↔ VI→ZH hoạt động.
  2. 4 phím tắt đúng hành vi (kể cả khi Tự động bật).
  3. Xáo trộn đổi thứ tự deck; Tự động phát âm + next theo cấu hình ⚙.
  4. Chưa/Đã thuộc đổi màu badge trong sidebar.

### C3 — Quiz (Trắc nghiệm)

- **Frontend:** toggle "Cài đặt hiển thị đề bài": Cách đọc/Từ vựng/Ý nghĩa; đề = chữ Hán + ÂM HÁN VIỆT + nghĩa; 4 đáp án pinyin (1 đúng + 3 nhiễu lấy từ cùng bài); đúng → viền xanh, sai → viền đỏ + rung; next sau 800ms; nút "Không biết"; nút "Nghe phát âm gợi ý". Mỗi câu đúng: XP +1 (ghi ProgressStore, hiện ⚡ toast) — chốt "câu đúng" = chọn đáp án đúng hoặc "Không biết" thì không cộng.
- **Backend:** không SP1; UPG-2 `POST /users/xp` (+1/câu đúng, cap server theo ngày — 00 §8).
- **DB:** `xp_daily` (gián tiếp).
- **Cache:** không.
- **AC:**
  1. Đáp án nhiễu luôn lấy từ cùng bài (không trùng đáp án đúng).
  2. Đúng +1 XP (kiểm tra counter shell tăng); "Không biết" không cộng XP.
  3. Sai hiện rung + đỏ, 800ms sang câu kế; counter 1/13 đúng.

### C4 — Typing (Gõ từ)

- **Frontend:** toggle đề Cách đọc/Âm Hán/Chữ Hán; hàng ô trống = số âm tiết; input placeholder "Gõ pinyin, số là thanh điệu (ni3 → nǐ)". **Parser pinyin số → dấu:** `ni3→nǐ`, `lv4→lǜ` (map u:v sau j/q/x/y, dấu đặt nguyên âm chính) — port đúng logic `lesson-typing` hiện có, tách thành util thuần `src/lib/pinyinInput.ts` có unit test. "Gợi ý (0/5)" mở dần từng ký tự; "Kiểm tra" chấm (so pinyin đã chuẩn hoá, bỏ qua số/markup); đúng → viền xanh + XP +1 + tự sang thẻ sau.
- **Backend:** không SP1; UPG-2 `POST /users/xp`.
- **DB:** không trực tiếp.
- **Cache:** không.
- **AC:**
  1. `ni3→nǐ`, `lv4→lǜ`, `zhong1→zhōng`, `hao3→hǎo` (unit test parser).
  2. Gợi ý mở tối đa 5 ký tự, counter (k/5) đúng.
  3. Chấm đúng bỏ qua kiểu gõ khác dấu (chấp nhận chuỗi số tương đương).
  4. Đúng cộng XP và tự chuyển.

### C5 — Reading cloze (Đọc hiểu)

- **Frontend:** đề = câu ví dụ bị khuyết `__，您好` + bản dịch hiện sẵn; 4 đáp án = chữ Hán; nút "Câu này bó tay" (bỏ qua, không XP); toggle "Nghĩa"; nút "Nghe câu ví dụ gợi ý" (TTS câu đầy đủ). Chấm như C3 (xanh/đỏ/rung, 800ms), đúng +1 XP.
- **Backend/DB/Cache:** như C3.
- **AC:**
  1. Chỗ trống đúng vị trí từ đang học trong câu ví dụ.
  2. "Bó tay" sang câu kế không cộng XP.
  3. TTS đọc câu gốc (không phải câu khuyết).

### C6 — Listen (Nghe ghép câu)

- **Frontend:** nút "Nghe câu"/"Nghe lại" (TTS câu ví dụ); tốc độ 0.5x/0.8x/1x/1.5x/2x (active đỏ) — map `speechSynthesis.rate`; Safari chunking qua `useTts`. Khu ghép: pool thẻ chữ Hán xáo trộn; bấm thẻ → nhảy lên vùng câu (bấm lại trên vùng câu → trả về pool); "Ghép câu" kiểm tra đúng thứ tự chữ của câu ví dụ; "Gõ lại" reset. Đúng cả câu +1 XP.
- **Backend/DB/Cache:** như C3.
- **AC:**
  1. Đổi tốc độ ảnh hưởng lần phát kế tiếp; "Nghe lại" giữ tốc độ đang chọn.
  2. Ghép sai hiện feedback, giữ nguyên thứ tự để sửa; "Gõ lại" về pool ban đầu.
  3. Ghép đúng thứ tự → xanh + XP.

### C7 — Dance (Hanzi Dance)

- **Frontend:** card tiêu đề "Hanzi Dance" + nút "Bắt đầu"; chọn nhạc 3 pill ("Làng Lá"/"Lãm Làng"/"Nhạc của tôi"); mô tả theo SPEC-02. Khi chơi: hiện chữ Hán + input pinyin (dùng chung parser C4); đúng → emoji 🕺💃 nhảy (CSS animation translateY) + next từ; sai → đứng im. Nhạc = WebAudio oscillator đơn giản (AudioContext tạo khi bấm Bắt đầu, dừng/huỷ khi rời mode — ràng buộc cleanup C1).
- **Backend/DB/Cache:** như C3 (đúng +1 XP).
- **AC:**
  1. Đủ 13 từ lượt chơi; đúng nhảy, sai không.
  2. Rời mode/đổi trang → nhạc dừng hẳn (không oscillator sót).
  3. Input dùng parser như Gõ từ.

### C8 — Battle (Đấu trí)

- **Frontend:** `h2` "Đấu trí" + mô tả 5 dạng trộn (Hán→nghĩa, nghĩa→Hán, Hán→pinyin, điền từ vào câu, gõ pinyin) — 13 câu; timer đếm giây hiển thị; kết quả đúng X/13 + thời gian; **lưu best vào ProgressStore `battle.best.<book>.<page>`** (max correct, rồi min time_ms — quy tắc merge 00 §3.5). Dòng "Đăng nhập để lưu kết quả lên bảng xếp hạng." + nút Đăng nhập (mở modal A4).
- **Hiện trạng SP1:** "Top 10 bài này" = 10 hàng cứng đúng số liệu SPEC-02 §7, hiện cả khi chưa thi. Link "Xem BXH Đấu trí tháng này →" → `/leaderboard?tab=battle`.
- **Đích UPG-2 (SP2):** kết quả thi → `PUT /users/battle-best` (ctx `<book>.<page>`); Top-10 bài này lấy từ server khi có (endpoint xếp hạng per-page thuộc SP2 quyết định — nếu chưa, giữ mock kèm điểm thật của user chèn vào bảng; xem §3.3); BXH tháng dùng `GET /leaderboard?tab=battle` (KV `lb:*` 600s, 00 §7/§8) + `PUT /users/pvp-monthly`.
- **DB:** `battle_best`, `pvp_monthly` (gián tiếp qua 00 §8).
- **Cache:** bảng Top-10 per-page SP1 cứng (client); UPG: KV snapshot theo 00 §7.
- **AC:**
  1. 13 câu trộn đủ 5 dạng; timer chạy đúng giây.
  2. Thi lại nhiều lần, best giữ lượt tốt nhất (nhiều đúng, rồi nhanh hơn).
  3. SP1: Top-10 hiển thị đúng số liệu SPEC-02 cả khi chưa thi.
  4. Nút Đăng nhập mở modal shell (không điều hướng).

### C9 — ⭐ star → SRS

- **Frontend:** trong "Danh sách từ" cuối trang (luôn hiện): mỗi mục có 3 nút icon — "Báo lỗi" (toast SP1), "Thêm vào bộ thẻ ôn tập" ⭐ (đổi vàng khi đã thêm, toast "Đã thêm vào ôn tập"), "Phát âm từ" 🔊. Bấm ⭐ → ProgressStore thêm item SRS kind `vocab`, item_key `<book>.<page>.<index>`, status `new`, `due_at` = now (chu kỳ 21 ngày do SRS engine quyết; **không lưu 5 cột** — 5 phân loại hiển thị suy diễn từ `status` + `due_at` + `last_reviewed_at`, 00 §3.2). Gộp 3 format key cũ của clone thành 1 chuẩn item_key khi migrate (00 §3.5).
- **Backend:** SP1 local. UPG-2: op vào outbox → `PUT /users/srs` batch (00 §8, idempotent LWW).
- **DB:** `srs_states` (00 §3.2).
- **Cache:** không (tiến độ client).
- **AC:**
  1. ⭐ vàng persist qua reload; bấm lại bỏ vàng (toggle ra khỏi bộ).
  2. `/review` đếm "Mới thêm" tăng đúng sau khi ⭐ (kết nối với review — spec domain khác chỉ kiểm tra联动).
  3. item_key đúng chuẩn `<book>.<page>.<index>`.

### C10 — Học deck tự tạo

- **Frontend:** route `/lesson/custom/[deckId]` — cùng `LessonClient`/7 chế độ nhưng `items[]` lấy từ ProgressStore `decks[deckId]` (kèm `deck_rows` theo `ord`) thay vì content module; badge "Bài 1" thay bằng tên deck; không ghi `page_dones` (deck không thuộc book/page). Chế độ dùng ví dụ câu (`example`) fallback rỗng → các mode cần câu ví dụ (C5/C6) tự sinh câu đơn giản từ hanzi+nghĩa hoặc ẩn bớt (giữ hành vi clone hiện có).
- **Backend:** SP1 local; UPG-2 decks CRUD đã có ở 00 §8 (`/users/decks`…).
- **DB:** `decks` + `deck_rows` (gián tiếp).
- **Cache:** dynamic, không cache.
- **AC:**
  1. Deck rỗng/không tồn tại → empty state + link về my-vocab.
  2. 7 chế độ chạy với item deck (pinyin/hán việt/nghĩa map đúng trường `deck_rows`).
  3. Không tạo `page_dones` khi học deck.

### C11 — Lesson polish (visual)

- **Frontend:** các chỉnh SPEC-14 giữ nguyên khi port: (1) watermark SVG bản đồ Việt Nam inline opacity 0.08 đỏ nhạt, absolute giữa-trái card, pointer-events none (file `public/assets/vietnam-map.svg` hoặc path inline); (2) mascot 🍅 44px trước `h1`, title nền highlight `#f5d76e`/50 rounded; (3) hàng controls gộp 1 hàng [tabs]—[counter pill giữa]—[flash controls], responsive wrap; (4) 4 nút nav ngoài card, màu đỏ/xanh đúng mã, ghost 2 bên; (5) mặt sau thẻ `#f7e9c8`, pill từ loại dưới chữ Hán; (6) badge "Bài N" nền đen chữ trắng.
- **Backend/DB/Cache:** không.
- **AC:** visual khớp SPEC-14 đủ 6 điểm; mọi phím tắt/mode vẫn chạy sau khi polish (regression C1–C9).

### D1 — Bảng Pinyin

- **Frontend:** route `/pinyin`, RSC SSG render bảng từ `src/content/pinyin.ts` (`initials` 22, `finals` 37, `valid[initial][final]`, `examples`). Filter pills thanh mẫu ("Tất cả", "Ø", b…h — active đỏ) lọc 1 hàng — client component nhỏ. Ma trận: header = 37 vận mẫu, cột đầu = thanh mẫu; ô hợp lệ ~405 âm có dấu chuẩn (Ø hàng: yi/ya/wu/yu…), ô không tồn tại = "·" muted. Bấm ô → **popup dialog**: âm to + 4 nút phát 4 thanh (ā á ǎ à, TTS `useTts`) + từ ví dụ; đóng X/Escape/backdrop. Link "Học theo lộ trình" → `/roadmap/pinyin`; "Bài tập" → `/pinyin/practice`.
- **Backend:** không. TTS client-side (server TTS là SP5).
- **DB:** không.
- **Cache:** SSG (content tĩnh, 00 §7).
- **AC:**
  1. Đúng 405 âm hợp lệ (test count trên data), ô sai = "·".
  2. Filter chọn 1 thanh mẫu chỉ hiện hàng đó; "Tất cả" trả về đầy đủ.
  3. Popup phát được 4 thanh; Escape/backdrop đóng.

### D2 — Pinyin Practice

- **Frontend:** route `/pinyin/practice`, client component. 10 câu xoay vòng luân phiên 2 dạng: (a) TTS phát âm → chọn 1/4 âm viết; (b) hiện âm → chọn 1/4 thanh điệu (¯ ´ ˇ `). Sinh câu random runtime từ content pinyin (seeded random để replay được nếu muốn — không bắt buộc). Chấm điểm + counter; kết quả "Đúng X/10" + nút "Làm lại" (reset state).
- **Backend:** không SP1; UPG-2 nếu tính XP thật thì `POST /users/xp` (+1/câu đúng, cùng quy tắc C3).
- **DB:** không trực tiếp.
- **Cache:** không.
- **AC:**
  1. 10 câu đủ 2 dạng xen kẽ; đáp án sai→đỏ, đúng→xanh.
  2. Kết quả + "Làm lại" reset hoàn toàn (câu mới).
  3. TTS câu dạng (a) phát đúng syllable.

### D3 — Radicals (214 bộ thủ) + modal autoplay + quy tắc nét

- **Frontend:** route `/radicals`. RSC SSG render từ `src/content/radicals.ts` (214 bộ `{i, char, hanViet, meaning, strokes}`).
  - **Deck flashcard** (pattern C2 viết gọn): counter "1 / 214", "Tự động", "Xáo trộn", ⚙, 🔊; thẻ mặt trước chữ bộ thủ, mặt sau tên Hán Việt + nghĩa; 4 nút nav + phím tắt ←/A ↓/X ↑/Z →/D. Bấm thẻ grid → deck nhảy tới thẻ đó.
  - **Grid theo số nét:** nhóm "1 nét (6 bộ)", "2 nét (25 bộ)"…; thẻ: chữ to + Hán Việt + "#số thứ tự" + mô tả ngắn, grid 4 cột.
  - **Modal "Tự động phát thẻ"** (SPEC-20): ⚙ mở modal 4 control — select lật thẻ `2/3/5/10s` (mặc định 3), select sang thẻ mới `1/2/3s` (mặc định 2), toggle "Nghe từ vựng" (OFF), select "Số lần nghe lại" `1/2/3` (mặc định 1, **disabled khi toggle tắt**). "Bắt đầu" → chế độ autoplay: mỗi `flipMs` lật, `nextMs` sang thẻ; bật nghe → TTS khi lật, lặp `repeat` lần cách 400ms; badge "Tự động" → nút dừng ⏸; timer gắn lifecycle provider (cleanup khi rời trang).
  - **7 quy tắc thứ tự nét** (dưới deck): 7 card lưới 2 cột, đúng bảng tên/ví dụ (爸 月 们 国 区 夫 女), ô minh hoạ SVG tĩnh font hệ thống 40px; + card vàng "⏳ Ba nét cuối luôn viết sau cùng" với 3 ô 辶 廴 ㄑ (SPEC-20 §C).
  - Nút "Tạo file luyện viết (214 bộ)" → `/create-file?tpl=radicals` (domain Công cụ).
  - Chữ Hán xuất hiện trong nghĩa → Link `/hanzi/<char>` (domain Tra từ điển — chỉ đặt link, không spec trang đó ở đây).
- **Backend:** không SP1. UPG-2: ⭐/trạng thái bộ thủ (nếu thêm SRS cho radicals) đi `srs_states` kind mới hoặc để ngoài phạm vi — SP1 không ghi SRS cho radicals (giữ hành vi clone); autoplay prefs (`radAutoplay`) → `settings.prefs_json` khi UPG-2 (00 §3.1/§3.5).
- **DB:** không trực tiếp (settings khi UPG).
- **Cache:** SSG content; grid/deck client state không cache.
- **AC:**
  1. Đủ 214 bộ, nhóm đúng số nét (test count theo `strokes`).
  2. Modal mở đúng 4 mặc định 3s/2s/tắt/1; "Số lần nghe lại" disabled khi toggle tắt.
  3. Autoplay đúng nhịp lật/chuyển; ⏸ dừng; rời trang huỷ timer.
  4. 7 card quy tắc + card nét cuối đúng chữ ví dụ.

### D4 — Sound rules

- **Frontend:** route `/sound-rules`, RSC SSG từ `src/content/soundRules.ts`. Sections: (1) "Bảng thanh điệu" table 3 cột với 6 hàng đúng số liệu % (ngang/sắc/nặng/huyền/hỏi-ngã) kèm bar %; (2) "Quy tắc âm đầu" 8–10 quy tắc, mỗi cái 2–3 ví dụ; (3) "Quy tắc âm cuối & vần" 6–8 quy tắc; (4) "Bài tập áp dụng" — 5 câu trắc nghiệm đoán pinyin từ Hán Việt (client component: chọn → hiện đúng/sai + giải thích). Note "tỉ lệ tính trên 9721 chữ Hán…".
- **Backend:** không. DB: không. Cache: SSG.
- **AC:**
  1. Bảng % đúng số liệu SPEC-04 §4.
  2. 5 câu bài tập chấm đúng + hiện giải thích.
  3. Trang SSG, không fetch runtime.

### D5 — Metadata SEO + sitemap nhóm public

- **Frontend:** `generateMetadata` cho mọi route public trong domain này: title/template, description tiếng Việt, OpenGraph (og:image mascot), canonical. Dynamic metadata cho `/course/[book]` (tên khóa) và `/lesson/[book]/[page]` (tên bài — render từ content module, build-time). `app/sitemap.ts` liệt kê: `/`, `/course`, 7× `/course/[book]`, `/pinyin`, `/pinyin/practice`, `/radicals`, `/sound-rules`, `/roadmap`, `/roadmap/pinyin`; KHÔNG đưa trang lesson/custom và trang user vào. `robots.ts` theo design tổng thể.
- **Hiện trạng SP1:** khung metadata + sitemap tĩnh. **Đích UPG-3 (SP3):** metadata đầy đủ theo nội dung thật (B3), có thể thêm JSON-LD Course/LearningResource.
- **Backend/DB:** không. **Cache:** metadata tĩnh đi cùng SSG.
- **AC:**
  1. Mỗi route public có title + description + canonical riêng, không trùng template mặc định.
  2. `/sitemap.xml` chứa đúng danh sách trên; không chứa trang gated.
  3. `/lesson/hsk1/lesson-1` có title chứa "Xin chào!".

### E1 — Roadmap tổng quan

- **Frontend:** route `/roadmap`, RSC SSG khung. Badge "🚧 Tính năng đang phát triển". Card "Hành trình của bạn 🚩": "Bạn đang ở: 拼音 · Bảng chữ cái Pinyin" + nút "Tiếp tục học" → `/roadmap/pinyin` + "N% toàn lộ trình" (progress bar; % client tính từ `roadmap_progress` — SP1: sessions đã done / tổng; hiện trạng clone = 0%). Timeline dọc 6 chặng: marker tròn (拼音/1级/2级/3级/4–6级/7–9级) + card (tên, cấp độ, mô tả, tag kỹ năng, "Chưa bắt đầu", "Vào học") — bấm chặng → `/course/[book]` tương ứng. Card "Tổng ôn" → `/review` với mô tả SRS 21 ngày (SPEC-05 §1). Đoạn kết "Đích đến: HSK 7–9…".
- **Backend:** không SP1; UPG-2 % chặng từ `roadmap_progress`/`page_dones` qua snapshot.
- **DB:** gián tiếp `roadmap_progress` (00 §3.2).
- **Cache:** SSG khung; % client-side.
- **AC:** 6 chặng + card Tổng ôn đúng nội dung SPEC-05; mọi link đúng; % phản ánh số buổi pinyin đã xong.

### E2 — Roadmap Pinyin (stepper 6 bước + timeline 8 buổi)

- **Frontend:** route `/roadmap/pinyin`, hỗ trợ `?step=1..6` (mặc định 1). Stepper 6 bước ngang (Thanh mẫu / Vận mẫu đơn / Vận mẫu ghép / Thanh điệu / Quy tắc đọc / Tổng ôn pinyin) — bước hiện tại nền đỏ, link `?step=n`; nút "← Bước trước"/"Bước sau →". Nội dung 6 bước từ `src/content/roadmapPinyin.ts` (SPEC-05 §2: bảng 23 phụ âm + 🔊, vận mẫu đơn/ghép, 4 thanh mā má mǎ mà + diagram, quy tắc i→yi/u→wu/ü→yu + dấu, bước 6 link `/pinyin/practice` + `/pinyin`).
  - **Timeline 8 buổi** (SPEC-21 §A): dưới/thay phần stepper theo layout gốc — 8 node dọc xen kẽ trái/phải (translateX ±3rem desktop, 1 cột mobile); node = vòng 56px (số buổi hoặc 🔒) + đường nối dọc; card: tên buổi, thời lượng, mô tả, trạng thái. Trạng thái suy ra từ ProgressStore `roadmap.pinyin`: `done` (vòng xanh ✓), `current` (vòng đỏ viền đậm + badge "Bạn đang ở đây"), `locked` (xám 🔒 + tooltip CSS hover: "Hoàn thành Bài kiểm tra của Buổi N-1 để mở Buổi N"). Buổi 1 mở sẵn; buổi N mở khi buổi N-1 `done`. Click node mở → `/roadmap/pinyin/session/[n]`. Cuối: marker "🚩 8 buổi · Hoàn thành chặng" + "Bạn mới học N/8 buổi".
  - Data 8 buổi từ content module `{n, title, minutes, desc, learn[], cards[], quiz[], test[]}` (SPEC-21 §C — hardcode đủ nội dung thật).
- **Backend:** SP1 local; UPG-2 `PUT /users/roadmap-progress` + merge từ snapshot (map `roadmap.pinyin` → bảng `roadmap_progress`, 00 §3.5).
- **DB:** `roadmap_progress` (gián tiếp).
- **Cache:** SSG content; trạng thái client.
- **AC:**
  1. Stepper 6 bước điều hướng được, deep-link `?step=4` mở đúng bước.
  2. Node 2–8 🔒 khi chưa làm kiểm tra buổi trước; tooltip đúng số buổi.
  3. Làm xong kiểm tra buổi 1 → quay lại timeline thấy buổi 2 chuyển từ 🔒 sang `current`.
  4. Trạng thái persist qua reload (localStorage SP1).

### E3 — Roadmap Session (trang buổi, 4 tab)

- **Frontend:** route `/roadmap/pinyin/session/[n]`, client component (cần state khoá/tab/điểm). Header: link "‹ Lộ trình pinyin", `h2` "Buổi N — <tên>", progress bar mỏng. **4 tab pill** (active viền đỏ): Học (✓ nếu xong) · Flashcard · Trắc nghiệm · Bài kiểm tra (🔒 nếu buổi trước chưa done).
  - **Học:** card lý thuyết của buổi (vd buổi 1: 4 ô thanh ā/á/ǎ/à với tên + ví dụ 妈/麻/马/骂 + 🔊) + bảng "Tự nhận biết" + nút "Đã đọc xong, sang Flashcard →".
  - **Flashcard:** tái sử dụng engine C2 với `cards[]` của buổi (6 thẻ), đếm x/N, Đã thuộc/Chưa thuộc.
  - **Trắc nghiệm:** 2 câu `quiz[]` (4 nút), hiện "Đúng x/2" + "Làm lại" sau khi hết.
  - **Bài kiểm tra:** 1 trắc nghiệm + 1 tự luận (input pinyin, so khớp parser C4 khi "Nộp bài"); điểm 2 câu; nút "Hoàn thành buổi N →" bật khi ≥1/2; bấm → ghi done vào ProgressStore `roadmap.pinyin` (UPG-2: `PUT /users/roadmap-progress`, tab `test`) → quay timeline, mở khoá buổi N+1.
- **Backend:** SP1 local; UPG-2 như trên. **DB:** `roadmap_progress`. **Cache:** không (dynamic, trạng thái user).
- **AC:**
  1. 4 tab đúng thứ tự; tab Bài kiểm tra khóa khi điều kiện chưa đạt.
  2. Trắc nghiệm chấm + "Làm lại" reset.
  3. Kiểm tra: nút hoàn thành chỉ bật ≥1/2; bấm xong buổi đánh dấu done, persist reload.
  4. Tự luận so khớp chấp nhận input số thanh (parser chung).

---

## 3. Đề xuất bổ sung [CẦN DUYỆT]

Các item dưới đây vượt ra ngoài 00 (hoặc cần chốt thêm tham số) — site gốc có theo proposal §4.1–4.2 nhưng clone chưa có/hơi бухt:

### 3.1 [CẦN DUYỆT] — "In file" từ lesson (SP4 / BACKLOG)

- Nút "In file" ở sidebar lesson (proposal §4.1: xuất PDF luyện viết cho cả bài). Clone hiện có nút nhưng chưa có hành vi spec.
- **Đề xuất:** tái sử dụng engine create-file (G6–G8): link sang `/create-file?tpl=vocab-lesson&book=<book>&page=<page>` — mẫu "từ vựng có pinyin + nghĩa + câu ví dụ" prefill từ content module bài đó. Gate in/PDF theo G8: SP1 mock, SP4 entitlement `file_print` (`FREEHSK` code / MoMo/Stripe — 00 §3.4).
- Không cần endpoint mới. **Phê duyệt cần:** chốt route/query này có nằm trong spec Công cụ (spec G) hay không — ghi nhận tại đây để không mất.

### 3.2 [CẦN DUYỆT] — "Thêm cả bài vào ôn tập" (SP1 có thể làm, UPG cần lưu ý batch)

- Nút sidebar lesson (proposal §4.1): thêm **tất cả từ của bài** vào SRS.
- **Đề xuất:** SP1 — 1 op ProgressStore dạng batch add (toast "Đã thêm N từ"); items đã có trong bộ thì bỏ qua (idempotent theo `item_key`).
- UPG-2: op gộp thành **1 op batch** trong outbox (không N op riêng) để không phình giới hạn 500 op / batch ≤50 của 00 §5; server nhận qua `PUT /users/srs` (đã hỗ trợ batch — 00 §8). Cần duyệt: xác nhận `PUT /users/srs` chấp nhận ≥50 item/lần gọi cho trường hợp này (bài lớn nhất hiện ~28 từ — an toàn, nhưng chốt contract).

### 3.3 [CẦN DUYỆT] — "Tổng ôn" toàn khóa từ course (UPG-2, cần filter trên GET /users/srs)

- Proposal §4.2: nút "Tổng ôn" ở `/course/[book]` là **Tổng ôn toàn khóa** (khác `/review` tổng quát). Clone hiện chỉ link `/review` chung.
- **Đề xuất:** giữ nút ở course, UPG-2 đích = `/review?book=<book>` — trang review lọc thẻ theo prefix `item_key = '<book>.'`.
- **Cần duyệt:** bổ sung tham số filter cho `GET /users/srs` (00 §8): `GET /users/srs?kind=vocab&book=hsk1` — chỉ là filter phía server trên `item_key LIKE 'hsk1.%'`, không thêm bảng/endpoint mới. Nếu không duyệt, client tự lọc sau khi nhận list đầy đủ (chấp nhận được với số lượng item hiện tại).

### 3.4 [BACKLOG] — "Báo lỗi" per item từ lesson

- Nút "Báo lỗi" trong Danh sách từ (SPEC-02): SP1 chỉ toast. Đích thật: `POST /error-reports` + bảng `error_reports` — **đã có sẵn trong 00 §3.3/§8 với trạng thái [BACKLOG]**, không định nghĩa lại. Chỉ ghi nhận điểm UI đặt nút để spec sau không bỏ sót.
