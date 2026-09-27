# SPEC-07: Bài đọc AI (`reading.html`) + Luyện thi chứng chỉ (`certificate-test.html`)

## 1. `reading.html`
- `h1` "Bài khoá", mô tả: "Dán một đoạn văn hoặc bài báo tiếng Trung — hệ thống tạo audio giọng bản xứ kèm bản dịch, audio đọc tới đâu chữ sáng tới đó để bạn luyện đọc theo kiểu shadowing."
- **Sidebar trái (complementary, ~1/3)**:
  - `h2` "Bài demo", mô tả "Xem trước kết quả: audio đọc chuẩn, bấm từng câu, bản dịch, câu hỏi & từ vựng — miễn phí, không tốn lượt."
  - List 1 button: "一个人的生活 — Cuộc sống một mình — 2:29 · 654 ký tự" → mở chế độ xem bài demo (dưới).
  - `h2` "Bài của bạn", mô tả "Bài đã tạo được lưu vào tài khoản — mở lại trên mọi thiết bị, không tốn lượt."
  - Trạng thái chưa đăng nhập: "Đăng nhập để lưu bài đã tạo và mở lại mọi lúc." (nút mở Login modal).
- **Khu chính**:
  - Callout "Phương pháp đọc hiểu hiệu quả nhất (6 bước với 1 bài)" (icon 💡, collapse được).
  - Textarea lớn placeholder "Dán một đoạn đọc ngắn, đoạn văn hoặc bài báo tiếng Trung (tối đa 3000 ký tự) vào đây…" + counter "0/3000" cập nhật realtime + nút "Dùng văn bản mẫu" (điền 1 đoạn ~300 chữ Hán có sẵn) + nút chính "Tạo bài đọc".
  - Bấm "Tạo bài đọc": nếu trống → toast lỗi; nếu có → **hiển thị kết quả ngay lập tức (giả lập AI)**:
    - Header bài: tiêu đề tự lấy dòng đầu, "N câu · X ký tự", nút "🔊 Phát cả bài" (TTS), "Dịch", "Pinyin", tốc độ.
    - **Karaoke**: mỗi câu 1 dòng — chữ Hán tách span từng ký tự; bấm "▶" câu đó → TTS câu, **ký tự đang đọc highlight nền vàng tuần tự** (ước lượng thời gian = chia đều TTS duration hoặc `onboundary`); toggle bản dịch từng câu (dịch hardcode cho văn bản mẫu; văn bản user dán = hiện "(bản dịch demo — tính năng AI cần backend)" ở các câu ngoài mẫu).
    - **"Câu hỏi & Từ vựng"** (chỉ cho văn bản mẫu): 3 câu hỏi trắc nghiệm + list 5 từ vựng (word + pinyin + nghĩa + ⭐).
- Dữ liệu: `js/data/reading.js` — `sampleText` (~300 ký tự tiếng Trung tự viết về cuộc sống), `demoDoc` = bài "一个人的生活" tách ~12 câu với pinyin + bản dịch + 5 từ vựng + 3 câu hỏi (nội dung tự biên soạn hợp lý).

## 2. `certificate-test.html`
- Breadcrumb "Trang chủ" + dòng "10 chứng chỉ — bộ đề mở dần theo từng chứng chỉ".
- `h1` "Luyện thi chứng chỉ", sub "考试对策 — Luyện thi HSK và các chứng chỉ tiếng Trung".
- **"HSK 1–9 — Chuẩn HSK 3.0"** (`h2`), mô tả "Chuẩn năng lực Hán ngữ quốc tế 2021 “ba bậc chín cấp”: sơ đẳng 1–3, trung đẳng 4–6, cao đẳng 7–9" — grid card 7 cái: logo vuông "H1"…"7-9" (nền đỏ nhạt) + `h3` tên + dòng tiếng Trung + mô tả + badge "Sắp ra mắt":
  - HSK 1 — 汉语水平考试 一级 — "500 từ, 300 chữ Hán — nhập môn: chào hỏi, giới thiệu bản thân, sinh hoạt cơ bản."
  - HSK 2 — 二级 — "1.272 từ, 600 chữ Hán — hội thoại đơn giản về đời sống hằng ngày."
  - HSK 3 — 三级 — "2.245 từ, 900 chữ Hán — hoàn thành bậc sơ đẳng, tự tin với chủ đề quen thuộc."
  - HSK 4 — 四级 — "3.245 từ, 1.200 chữ Hán — mở đầu bậc trung đẳng, trao đổi học tập và công việc."
  - HSK 5 — 五级 — "4.316 từ, 1.500 chữ Hán — đọc báo, xem phim, thảo luận có chiều sâu."
  - HSK 6 — 六级 — "5.456 từ, 1.800 chữ Hán — hoàn thành bậc trung đẳng, diễn đạt thành thạo."
  - HSK 7–9 — 七至九级 — "11.092 từ, 3.000 chữ Hán — bậc cao đẳng: một bài thi chung xếp cấp 7/8/9, đủ 5 kỹ năng nghe nói đọc viết dịch."
- **"HSKK — Kỳ thi nói"** (`h2`), mô tả "Kỳ thi nói riêng 3 cấp (sơ – trung – cao) — thường đăng ký kèm HSK để chứng minh kỹ năng nói" — grid 3 card K1/K2/K3:
  - HSKK Sơ cấp — 初级 — "Hỏi đáp và kể chuyện ngắn với vốn từ nền tảng — phù hợp trình độ HSK 1–2."
  - HSKK Trung cấp — 中级 — "Nghe rồi thuật lại, miêu tả tranh, trả lời câu hỏi — phù hợp trình độ HSK 3–4."
  - HSKK Cao cấp — 高级 — "Thuật lại đoạn dài, đọc thành tiếng, trình bày quan điểm — phù hợp trình độ HSK 5–6."
- Card "Sắp ra mắt": cursor default, bấm → toast "Chứng chỉ này sắp ra mắt — hãy quay lại sau nhé!".

## Tiêu chí nghiệm thu
- Reading: counter 3000, nút mẫu điền text, "Tạo bài đọc" render karaoke + TTS highlight chạy; demo mở được. Certificate: đủ 10 card đúng số liệu + toast.
