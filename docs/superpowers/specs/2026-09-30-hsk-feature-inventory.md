# Feature Inventory — Toàn bộ tính năng UI của clone → lộ trình SP1–SP5

- **Ngày:** 2026-09-30
- **Trạng thái:** Bổ sung cho `2026-09-30-hsk-nextjs-workers-migration-design.md` (design tổng thể)
- **Vai trò:** Kê khai ĐẦY ĐỦ tính năng mà UI `clone/` đang làm, map vào sub-project, và kê khai chỗ mock/demo sẽ được nâng cấp thật.

## 0. Nguồn chuẩn & cách đọc

- **Đặc tả hành vi chi tiết từng trang:** `clone/specs/SPEC-01..21.md` (đã verify khớp site gốc qua 2 vòng computer-use — GAP-ANALYSIS, GAP-ANALYSIS-ROUND2). Khi HTML trong clone và SPEC lệch nhau, **SPEC thắng**.
- **Trạng thái tính năng:**
  - `[PORT]` — port giữ nguyên hành vi (kể cả phần mock) → **SP1**
  - `[UPG-2]`/`[UPG-3]`/`[UPG-4]`/`[UPG-5]` — mock trong clone, nâng cấp thật ở SP2/3/4/5
  - `[DEMO]` — nội dung demo-scale, thay bằng nội dung thật → SP3
  - `[DROP]` — không port
- **Quy tắc ranh giới:** SP1 port đúng hành vi hiện có (leaderboard fake vẫn fake) — không "làm thật" song song trong SP1.

## 1. Shell xuyên suốt (shell.js + theme.css + TEMPLATE)

| ID | Tính năng | Trạng thái |
|---|---|---|
| A1 | Topbar: logo + seal đỏ; XP ⚡ theo `nhai.xp`; chuông thông báo (3 item cứng) | A1a `[PORT]` · A1b thông báo `[UPG-2]` |
| A2 | Nav: Trang chủ, Nền tảng ›, Cá nhân hoá ›, Tra từ điển ›, Shadowing, Bài khoá, Luyện thi chứng chỉ, Tạo file; active state; mobile hamburger + logout | `[PORT]` |
| A3 | Settings modal: theme sáng/tối, giọng TTS nữ/nam, flags chatBubble/selectionLookup, autoplay bộ thủ, prefs shadowing | `[PORT]` |
| A4 | Login modal Google/Apple/email (mock `nhai.mockLogin`) | `[PORT]` mock · `[UPG-2]` thật — dùng **Google + Facebook** (Apple là bịa, bỏ) |
| A5 | Floating AI widget (mascot robot + cà chua "AI", reply cứng 400ms) | `[PORT]` mock · `[UPG-5]` LLM streaming |
| A6 | Toast system + helpers `NHAI.q/toast/speak/stripTones/el/openLogin/isLoggedIn` | `[PORT]` (thành utils/hooks) |
| A7 | Nền giấy kẻ ô, banner Hoàng Sa, mascot cà chua | `[PORT]` |
| A8 | TTS engine `speak()` (nữ/nam regex, zh+vi) — dùng ở ≥6 nơi | `[PORT]` → hook `useTts()` + chunking Safari |
| A9 | Trang 404 (mascot + nút về trang chủ) | `[PORT]` |
| A10 | Selection lookup (chọn chữ → tra nhanh, flag `nhai.selectionLookup`) | `[PORT]` — verify hành vi thật khi port |

## 2. Home & Course

| ID | Tính năng | Trạng thái |
|---|---|---|
| B1 | Home: hero, grid 7 sách (hsk1..6, hsk79), "học tiếp" theo `pageDone` | `[PORT]` |
| B2 | `course?book&skill=vocab\|grammar\|hanzi`: danh sách lesson + badge hoàn thành | `[PORT]` |
| B3 | Data `courses.js`: HSK2–9 genLessons thủ tục | `[DEMO]` SP3 nội dung thật (tổng 9.789 từ, 153 bài theo GAP-2) |

## 3. Lesson engine (lesson.html — 7 chế độ)

| ID | Tính năng | Trạng thái |
|---|---|---|
| C1 | State machine: header tiến độ, chuyển chế độ, cleanup timers | `[PORT]` → `LessonProvider` |
| C2 | Flashcard: 3D flip, ZH→VI/VI→ZH, tự động, xáo trộn, keyboard, TTS | `[PORT]` |
| C3 | Quiz: 4-option pinyin MCQ, chấm điểm, +XP | `[PORT]` |
| C4 | Typing: gõ pinyin số (`ni3`→`nǐ`), 5 gợi ý | `[PORT]` |
| C5 | Reading cloze: điền từ vào chỗ trống | `[PORT]` |
| C6 | Listen: TTS ghép câu, tốc độ 0.5x–2x | `[PORT]` |
| C7 | Dance: game gõ chữ + nhạc WebAudio | `[PORT]` |
| C8 | Battle: 13 câu, timer, Top-10 giả, best score `nhai.battle.best.*` | `[PORT]` mock · Top-10 `[UPG-2]` |
| C9 | ⭐ star → SRS (`nhai.srs.*`, 3 format key) | `[PORT]` qua `ProgressStore` (gộp 3 format) |
| C10 | Học deck tự tạo `?custom=deckId` | `[PORT]` |
| C11 | Polish: watermark bản đồ VN, mascot, tabs Từ vựng/Ví dụ, controls 1 hàng, nút ngoài card | `[PORT]` |

## 4. Nền tảng (public/SEO)

| ID | Tính năng | Trạng thái |
|---|---|---|
| D1 | pinyin: matrix 22×37, 405 syllable hợp lệ, filter pills, popup chi tiết, TTS | `[PORT]` |
| D2 | pinyin-practice: 10 câu xoay vòng, nghe→chọn syllable/thanh | `[PORT]` |
| D3 | radicals: 214 bộ thủ (deck + grid theo số nét) + modal tự động phát (select tốc độ lật/đổi thẻ, nghe từ, số lần nghe) + 7 quy tắc thứ tự nét GIF + note 3 nét cuối; chữ trong nghĩa → link `/hanzi/<char>` | `[PORT]` |
| D4 | sound-rules: bảng thanh điệu, sandhi, 5 câu luyện | `[PORT]` |
| D5 | Metadata SEO + sitemap cho nhóm public | `[PORT]` khung · `[UPG-3]` đầy đủ |

## 5. Roadmap

| ID | Tính năng | Trạng thái |
|---|---|---|
| E1 | roadmap.html: tổng quan các chặng | `[PORT]` |
| E2 | roadmap-pinyin: timeline 6 bước | `[PORT]` |
| E3 | roadmap-session: zigzag 8 buổi + khoá tuần tự + tooltip 🔒; 4 tab Học/Flashcard/Trắc nghiệm/Bài kiểm tra; mở khoá qua Bài kiểm tra (`nhai.roadmap.pinyin`) | `[PORT]` |

## 6. Cá nhân hoá (gate login)

| ID | Tính năng | Trạng thái |
|---|---|---|
| F1 | review: 6 ô đếm SRS + section "Bộ thẻ đang trống" + chi tiết ôn tập (5 ô: streak/hôm nay/tuần/TB ngày/TB thẻ + 7-day bars + donut 4 mức Quên rồi/Khó/Tốt/Dễ); tabs Từ vựng/Ngữ pháp | `[PORT]` (data seeded) · `[UPG-2]` thật từ SRS |
| F2 | progress: card XP + badge xếp hạng, streak, hôm nay, heatmap 12 tháng `nhai.heat` | `[PORT]` · xếp hạng `[UPG-2]` |
| F3 | my-vocab: danh sách bộ từ vựng, "+ Tạo bộ mới", empty state | `[PORT]` |
| F4 | my-grammar: sổ tay ngữ pháp song song (khuôn chung, khác 3 nhãn) | `[PORT]` |
| F5 | notebook?kind&id: CRUD rows (hanzi/pinyin/hán việt/nghĩa) `nhai.decks`/`nhai.notebooks` | `[PORT]` |
| F6 | Login gate 🔒 khi chưa đăng nhập | `[PORT]` mock · `[UPG-2]` session thật |

## 7. Công cụ

| ID | Tính năng | Trạng thái |
|---|---|---|
| G1 | dictionary: tìm theo chữ Hán / pinyin không thanh / chuỗi Nhập Việt; `?q=`; modal vẽ-tìm-kiếm | `[PORT]` (20 entries) · entries `[UPG-3]` · nhận dạng vẽ `[UPG-5]` |
| G2 | hanzi?char: phân tích chữ, canvas tập viết, animation thứ tự nét (chỉ 你 có 7 nét thật) | `[PORT]` · dataset nét `[UPG-3]` (hanzi-writer/makemeahanzi) |
| G3 | reading: karaoke TTS highlight theo chữ, tự dán đoạn văn, giọng/tốc độ | `[PORT]` |
| G4 | shadowing: thư viện playlist (đếm bài, badge HSK/YouTube/thời lượng) | `[PORT]` (32 video DEMO) · `[UPG-3]` thư viện thật |
| G5 | shadowing-video: YouTube nocookie qua postMessage, tốc độ, loop đoạn, chép chính tả, autoscroll transcript, MediaRecorder tự ghi | `[PORT]` (giữ imperative, 1 component) |
| G6 | create-file: catalog 9 mẫu / 3 nhóm, banner "cần mã để in", thumbnail SVG | `[PORT]` |
| G7 | create-file form 7 nhóm: 4 từ mẫu + sửa nghĩa/xoá + nút "Format bằng AI"; tiêu đề; 5 loại ô; 4 màu ô; bố cục stepper + slider từ mờ; Khải/Hành thư + 2 nguồn nét + 4 kiểu tô + slider đậm/cỡ; hiện pinyin/nghĩa; khôi phục mặc định; state sessionStorage 18 keys | `[PORT]` · "Format bằng AI" `[UPG-5]` |
| G8 | create-file: preview A4 SVG, in/Lưu PDF `window.print()`, đếm trang, gate mã FREEHSK | `[PORT]` mock · gate `[UPG-4]` entitlement (MoMo/Stripe) |
| G9 | certificate-test: 10 card "sắp ra mắt" | `[PORT]` coming-soon · làm thật = quyết định riêng sau SP5 |

## 8. Social & pháp lý

| ID | Tính năng | Trạng thái |
|---|---|---|
| H1 | leaderboard?tab=xp\|battle (bảng giả) | `[PORT]` mock · `[UPG-2]` D1 thật |
| H2 | feedback: form lưu `nhai.feedback` local | `[PORT]` mock · `[UPG-2]` endpoint + moderation |
| H3 | terms, privacy (static) | `[PORT]` |
| H4 | delete-account: toast giả | `[PORT]` mock · `[UPG-2]` cascade + email xác nhận |

## 9. Không port

| Item | Lý do |
|---|---|
| `js/my-pages.js` (339 dòng) | Dead code — không HTML nào tham chiếu (my-vocab/my-grammar/progress dùng notebook.js/progress.js) |
| Tailwind browser CDN, `<script>` defer thủ công, `window.NHAI_DATA` | Thay bằng compiled Tailwind + ES modules + import build-time |

## 10. Ma trận bao phủ SP

- **SP1 (port):** mọi `[PORT]` = A1a–A10, B1–B2, C1–C11, D1–D4, E1–E3, F1–F6 (bản mock), G1–G9 (bản mock), H1–H4 (bản mock), A9. **Điều kiện xong: 27 trang nội dung + 404 chạy đủ tính năng `[PORT]` trên Next, deploy Workers xanh, không còn Tailwind CDN.**
- **SP2:** A1b, A4, F6, H1, H2, H4 + `HybridStore`/D1.
- **SP3:** B3, D5, G1-entries, G2-dataset, G4-thư viện thật.
- **SP4:** G8-gate, donate.
- **SP5:** A5, G7-Format-AI, G1-nhận dạng vẽ, G9, TTS server.

## 11. Kiểm chứng độ phủ

- 29 file HTML = 27 trang nội dung + `TEMPLATE.html` + `404.html` — từng trang xuất hiện ≥1 feature ID ở mục 1–8.
- 37 module JS: mọi file thuộc 1 nhóm trên (shell → 1; lesson.* → 3; data/* → nội dung của nhóm tương ứng; my-pages.js → mục 9).
- Toàn bộ key `nhai.*` (khoảng 29 key, gồm cả sessionStorage `nhai.cf.state` của create-file) được tiếp nhận qua `ProgressStore`/providers — không còn truy cập localStorage trực tiếp ngoài interface.
