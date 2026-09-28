# Báo cáo khảo sát & đề xuất Clone — NHAI HSK (nhaihsk.com)

> Ngày khảo sát: 2026-09-28 · Phương pháp: duyệt web bằng trình duyệt tự động + phân tích HTML/bundle JS công khai (robots.txt, sitemap.xml, chunk Next.js)

---

## 1. Tổng quan sản phẩm

**NHAI HSK** là nền tảng học tiếng Trung theo chuẩn **HSK 3.0** dành cho người Việt, mô hình "nhai" = học nhỏ giọt mỗi ngày. Cốt lõi:

- Khóa học từ vựng/ngữ pháp/chữ Hán theo 7 cấp HSK (tổng ~9.789 từ vựng) kèm flashcard + 7 chế độ luyện tập.
- Nền tảng phát âm (Pinyin, 214 bộ thủ, quy tắc chuyển âm Hán-Việt → pinyin).
- Luyện nghe bằng video YouTube thật (shadowing / chép chính tả) chia theo kênh & cấp HSK.
- Công cụ tạo file PDF luyện viết chữ Hán (9 mẫu).
- Tài khoản + gamification (XP, bảng xếp hạng, SRS ôn tập 21 ngày).
- Mô hình cộng đồng: nhóm Facebook làm kênh phân phối (mã tải file nằm trong mô tả nhóm).

## 2. Tech stack phát hiện được

| Thành phần | Công nghệ |
|---|---|
| Framework | **Next.js App Router** (SSG/ISR, `x-nextjs-prerender: 1`) |
| Deploy | **Cloudflare** qua **OpenNext** (`x-opennext: 1`) |
| UI | Tailwind CSS (class kiểu shadcn: `text-muted-foreground`, `rounded-lg`…), font next/font woff2, i18n bằng key (`sidebar.login`, `nav.foundation`) |
| Backend | REST API riêng cùng domain: `/api/v1/...` (Server Actions/Route Handlers) |
| Auth | Có hệ thống user + session (đăng nhập, đồng bộ XP, thông báo, lưu bài) |
| Media | TTS giọng bản xứ (phát âm từ/câu, tạo audio bài đọc), video nhúng YouTube, hình chữ Hán có thứ tự nét (stroke order) |
| Bảo vệ | Anti-devtools: script phát hiện → dialog đếm ngược 2 phút "bạn có 2 phút để tắt DevTools trước khi bị BAN", gọi `/api/v1/devtools` và `/api/v1/ip` (ghi IP) |

## 3. Sơ đồ route đầy đủ (khoảng 30 route)

### Điều hướng chính (navbar)
- `/` — Trang chủ: card 7 khóa học HSK, điểm XP, nút Đăng nhập, banner "Hoàng Sa Trường Sa"
- `/course` — "Kệ sách" danh sách khóa học
- `/course/{hsk1|hsk2|hsk3|hsk4|hsk5|hsk6|hsk7-9}` — Trang khóa học
- `/vocab/{bookSlug}/{pageId}` — Bài học từ vựng (vd `/vocab/hsk1/lesson-1`)
- `/grammar` + `/grammar/...` — Ngữ pháp (tab trong khóa học)
- `/hanzi/...` — Chữ Hán (tab trong khóa học)
- `/shadowing` — Thư viện video; `/shadowing/category/{slug}` — theo kênh; `/shadowing/{videoId}` — trình học 1 video
- `/reading` — Bài đọc AI: dán văn bản → tạo audio + dịch + highlight
- `/certificate-test` — Luyện thi chứng chỉ (HSK 1–9, HSKK sơ/trung/cao — đang "sắp ra mắt")
- `/create-file` — Hub tạo file PDF luyện viết, với 9 mẫu con: `stroke-order`, `big-char`, `vocab`, `vocab-check`, `copy`, `pinyin-lines`, `pinyin-write`, `blank-grid`, `cover`
- `/leaderboard` — Bảng xếp hạng XP tổng + "Đấu trí tháng"
- `/feedback` — Góp ý

### Nhóm "Nền tảng"
- `/pinyin` — Bảng pinyin 406 âm tiết (thanh mẫu × vận mẫu), bấm nghe; `/pinyin/practice` — bài tập
- `/radicals` — 214 bộ thủ dạng flashcard theo số nét
- `/sound-rules` — Quy tắc chuyển âm Hán-Việt → pinyin (bảng thống kê % tính trên 9.721 chữ)

### Nhóm "Cá nhân hoá"
- `/roadmap` — Lộ trình Pinyin → HSK 7-9 với trạng thái từng chặng; `/roadmap/pinyin` — học theo lộ trình
- `/review` — Tổng ôn SRS 21 ngày (Cần ôn / Mới thêm / Đang học / Mới thuộc / Đã thuộc dài hạn)
- `/my-vocab`, `/my-grammar` — bộ thẻ cá nhân
- `/progress` — Tiến độ/tiêu đề học tập
- `/settings`, `/nang-cap` (nâng cấp — bịDisallow trong robots, có thể là trang trả phí)

### Nhóm "Tra từ điển"
- `/dictionary` — Tra chữ Hán/pinyin/nghĩa Việt + "Vẽ chữ để tra" (handwriting recognition)
- `/hanzi` — Tra Hán tự

### Nhóm "Cộng đồng" (external)
- Facebook group `facebook.com/groups/nhaihsk`, site chị em `nhaikanji.com` (tiếng Nhật), `nhaitopik.com` (tiếng Hàn)
- Khác: `/terms`, `/privacy`, `/delete-account`

## 4. Tính năng chi tiết trọng tâm

### 4.1 Bài học từ vựng (`/vocab/hsk1/lesson-1`) — trái tim của app
- **Danh sách từ**: chữ Hán, pinyin, **âm Hán Việt viết hoa** (vd NHĨ HẢO), nghĩa tiếng Việt, từ loại, câu ví dụ (chữ Hán có pinyin từng ký tự) + bản dịch + nút TTS phát câu.
- **Flashcard lật được**: ZH→VI, chế độ "Tự động" (auto-play phát âm), xáo trộn, phím tắt (←/A, →/D, ↑/Z đã thuộc, ↓/X chưa thuộc).
- **7 chế độ luyện**: Flashcard, Trắc nghiệm, Gõ từ (typing), Đọc hiểu, Nghe ghép câu, Hanzi Dance, **Đấu trí (PvP xếp hạng)**.
- Tiện ích: "In file" (xuất PDF), "Thêm cả bài vào ôn tập", ⭐ thêm từng từ vào SRS, "Báo lỗi" từng mục.

### 4.2 Khóa học (`/course/hsk1`)
- 3 tab kỹ năng: Từ vựng · 词汇 / Ngữ pháp · 语法 / Chữ Hán · 汉字.
- Danh sách bài theo giáo trình 标准教程 HSK (15 bài HSK1 …), mỗi bài hiện số từ vựng, tiến độ cá nhân 0/15 bài, nút **Tổng ôn** toàn khóa.

### 4.3 Shadowing
- Thư viện video YouTube chia theo **kênh/khóa** (DaihuaXiyou 84 bài, 我的爸爸是條龍 111 bài, An Khả Hy 100 bài, Chinese Daily Podcast 79…), mỗi video gắn nhãn cấp HSK, lượt học, thời lượng, thumbnail.
- Trang video (`/shadowing/{id}`): luyện nghe — bắt chước — **chép chính tả** (dictation).

### 4.4 Bài đọc AI (`/reading`)
- Dán văn bản ≤ 3000 ký tự → hệ thống: tạo **audio giọng bản xứ**, dịch câu, highlight chữ theo tiến độ audio (karaoke), sinh câu hỏi & từ vựng; lưu bài vào tài khoản; có bài demo miễn phí.

### 4.5 Tạo file luyện viết (`/create-file/*`)
- 9 mẫu PDF: thứ tự nét (nét mới tô đỏ), ô chữ lớn, từ vựng có pinyin+nghĩa+câu ví dụ, kiểm tra từ vựng, chép chữ, dòng pinyin, viết pinyin, ô trống, trang bìa.
- **GateGrow** bằng mã tải file (mã nằm trong mô tả nhóm Facebook) → growth hack thu hút thành viên nhóm.

### 4.6 Gamification & cá nhân hoá
- XP +1 mỗi câu đúng (flashcard/trắc nghiệm/luyện tập), đồng bộ khi đăng nhập; bảng xếp hạng top 10 cập nhật 10 phút/lần.
- SRS chu kỳ 21 ngày với 5 trạng thái thẻ; thống kê học tập.
- Điểm "Đấu trí" theo tháng (PvP quiz theo tháng).

### 4.7 Phân tích Hán tự (`/hanzi`)
- **Trang chính**: ô tra chữ Hán/từ, **bảng vẽ tay chữ Hán** (handwriting recognition, có nút Xoá nét cuối/Xoá hết), duyệt chữ theo cấp HSK 1–7-9 và 214 bộ thủ; mỗi sách hiển thị "247 chữ Hán mới".
- **Trang chi tiết `/hanzi/{char}`** (vd `/hanzi/你`):
  - Animation **thứ tự nét** kiểu hanzi-writer (nút: Xem lại thứ tự nét, Hiển thị hạt mũi tên, Thu phóng vừa khít) + TTS phát âm.
  - Dữ liệu chữ: âm Hán Việt (kèm biến âm "còn đọc"), ý nghĩa chi tiết, pinyin, cấp độ HSK, số nét, bộ thủ (link tới trang chữ của bộ thủ), **cấu tạo từ** (các thành phần, link từng thành phần), loại chữ (Tượng hình/Hình thanh/Hội ý…).
  - Sidebar: "Từ vựng trong sách" (link ngược về bài học) và "Từ vựng thực chiến" (từ điển mở rộng — dạng CC-CEDICT dịch Việt, link sang `/dictionary?q=`).

### 4.8 Khác
- "Hỏi AI" (floating button — trợ lý AI), "Ủng hộ Nhai HSK" (donate, API `/api/v1/users/donate`), "Nhắn tin" (chat/hộp thư), hệ thống thông báo (`/api/v1/users/notifications`), banner khẳng định chủ quyền Hoàng Sa–Trường Sa, footer quảng cáo site chị em.

## 5. API surface nhìn thấy được

```
/api/v1/devtools                          — check chống devtools
/api/v1/ip                                — ghi nhận IP
/api/v1/books                             — metadata khóa học
/api/v1/vocab/books/$                     — dữ liệu từ vựng theo sách
/api/v1/users/content                     — nội dung người dùng
/api/v1/users/page                        — trang người dùng
/api/v1/users/notifications (+/mark)      — thông báo
/api/v1/users/donate                      — ủng hộ
```
(các route SRS/progress/xếp hạng chắc chắn tồn tại thêm nhưng nằm trong bundle không public)

## 6. Đề xuất kiến trúc Clone

### 6.1 Stack đề nghị (tương đương, dễ tuyển người)
| Lớp | Đề xuất |
|---|---|
| Frontend + SSR | **Next.js 14+ (App Router) + TypeScript + Tailwind + shadcn/ui** — y hệt đối thủ, tận dụng SSG cho nội dung khóa học |
| Backend | Next.js Route Handlers `/api/v1/*` hoặc tách **Hono/FastAPI**; ORM **Drizzle/Prisma** |
| Database | **PostgreSQL** (Supabase/Neon) — bảng dữ liệu chủ yếu là nội dung tĩnh + tiến độ user |
| Auth | **Supabase Auth / Better-Auth** (Google + Facebook login) |
| TTS | Edge TTS / Azure Speech (giọng tiếng Trung bản xứ, chi phí thấp) |
| Chữ Hán | CSDL **hanzi-writer** (stroke order SVG) + **Hanzi Writer** component; dữ liệu pinyin/âm Hán Việt từ CSDL mở (Unihan, Cedict) + tự biên tập nghĩa tiếng Việt |
| Video | YouTube Data API + IFrame Player API (không lưu video) |
| File PDF | Render HTML → PDF bằng client-side (jsPDF/react-pdf) hoặc Puppeteer trên server |
| Deploy | Cloudflare Workers + OpenNext (như gốc) hoặc Vercel |

### 6.2 Data model tối thiểu
```
books(id, slug, level, title_zh, title_vi, total_pages)
pages(id, book_id, order, title_zh, title_vi)               -- "bài"
vocab(id, book_id, page_id, order, hanzi, pinyin, hanviet,
      meaning_vi, pos, example_zh, example_pinyin, example_vi, audio_url)
grammar_pages(id, book_id, page_id, order, content_json)
users(id, name, avatar, xp, ...)
user_vocab_progress(user_id, vocab_id, status, srs_due_at, srs_stage)
user_page_progress(user_id, page_id, skill, percent)
xp_events(user_id, amount, source, created_at)
pvp_scores(user_id, month, score)
shadowing_videos(id, yt_id, category, hsk_level, duration, title, learn_count)
reading_docs(id, user_id, text, audio_url, translation_json)
review_cards(id, user_id, type, front, back, due_at, stage)
notifications(id, user_id, title, body, read_at)
```

### 6.3 Lộ trình triển khai 5 giai đoạn
1. **Giai đoạn 1 — Nội dung + Flashcard (mét đất quan trọng nhất):** nhập dữ liệu HSK 1–3 (từ vựng + ví dụ + âm Hán Việt), trang khóa học, trang bài học với flashcard + trắc nghiệm + gõ từ + TTS. Chưa cần auth.
2. **Giai đoạn 2 — Tài khoản + gamification:** đăng nhập Google/Facebook, XP, SRS 21 ngày, `/my-vocab`, `/review`, bảng xếp hạng.
3. **Giai đoạn 3 — Nền tảng phát âm:** bảng Pinyin 406 âm + bài tập, 214 bộ thủ (hanzi-writer), quy tắc chuyển âm, từ điển tra + vẽ chữ để tra (hiring recognition API hoặc Tesseract/MODEL handwriting).
4. **Giai đoạn 4 — Shadowing + Bài đọc AI:** thư viện YouTube theo kênh, chế độ chép chính tả; trang `/reading` dùng TTS + dịch máy (tự host hoặc API) + karaoke highlight.
5. **Giai đoạn 5 — Đơn giản hoá nghi thức:** tạo file PDF 9 mẫu (mã tải file = growth hack), Đấu trí PvP, luyện thi chứng chỉ, Hỏi AI, donate/nâng cấp.

### 6.4 Điểm cần lưu ý khi clone
- **Không sao chép nội dung có bản quyền**: nghĩa từ vựng do đội Nhai biên tập — cần tự biên soạn bộ nghĩa tiếng Việt; video shadowing là nhúng YouTube (an toàn tương đối) nhưng nên xin phép chủ kênh.
- **Anti-devtools / ban IP**: site gốc khá nhạy cảm với tự động hóa — khi clone, cân nhắc không cần cơ chế này, còn khi khảo sát tiếp site gốc nên dùng thao tác tay.
- **Bài học là dữ liệu tĩnh → prerender**: toàn bộ `/vocab/...`, `/course/...` nên render tĩnh để load nhanh + SEO, chỉ tiến độ cá nhân là client-side.
- **Phát âm TTS có thể cache** ở CDN theo từ (chỉ vài nghìn file audio, sinh 1 lần) — tiết kiệm chi phí lớn.

---

*Báo cáo tạo tự động từ phiên khảo sát trình duyệt + phân tích bundle. File tạm: /tmp/nhai-layout.js, /tmp/vocab-page.js.*
