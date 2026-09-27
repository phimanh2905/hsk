# SPEC-05: Lộ trình (`roadmap.html`, `roadmap-pinyin.html`) + Tổng ôn (`review.html`) + Trang login-gated

## 1. `roadmap.html`
- `h1` "Lộ trình" + badge "🚧 Tính năng đang phát triển" + mô tả "Một con đường liền mạch từ bảng Pinyin đến HSK 7–9. Đã có nền tảng? Vào thẳng chặng bạn muốn — không cần học lại từ đầu."
- **"Hành trình của bạn 🚩"**: "Bạn đang ở: 拼音 · Bảng chữ cái Pinyin" + nút link "Tiếp tục học" → `roadmap-pinyin.html` + "0% toàn lộ trình" (progress bar).
- **Timeline dọc** 6 chặng, mỗi chặng có marker tròn (拼音 / 1级 / 2级 / 3级 / 4–6级 / 7–9级) + card button:
  - HSK tên + cấp độ (Sơ cấp/Trung cấp/Cao cấp) + mô tả + tag kỹ năng + "Chưa bắt đầu" + "Vào học":
    - HSK 1 Sơ cấp — "500 từ vựng đầu tiên, mẫu câu cơ bản, chào hỏi và giao tiếp đời thường." — tags: Từ vựng, Ngữ pháp.
    - HSK 2 Sơ cấp — "Mở rộng vốn từ, ngữ pháp sơ cấp và hội thoại tình huống hằng ngày." — Từ vựng, Ngữ pháp, Nghe hiểu.
    - HSK 3 Sơ cấp — "Hoàn thiện sơ cấp: đọc đoạn văn ngắn, kể chuyện và diễn đạt ý kiến đơn giản." — Từ vựng, Ngữ pháp, Luyện đề.
    - HSK 4–6 Trung cấp — "Trung cấp: đọc hiểu bài dài, ngữ pháp nâng cao và luyện đề theo cấp độ." — Từ vựng, Ngữ pháp, Luyện đề.
    - HSK 7–9 Cao cấp — "Cao cấp: văn bản học thuật, chuyên ngành và chiến lược thi thật." — Từ vựng, Nghe hiểu, Luyện đề.
  - Bấm chặng → link tương ứng (`course.html?book=hsk1`…, HSK4-6 → `course.html?book=hsk4`).
- **Card "Tổng ôn"** (link `review.html`): "Ôn tập ngắt quãng (SRS) từ vựng & ngữ pháp đã học — thêm thẻ bằng nút ⭐ trong bài, đến hạn là vào ôn." — tags Từ vựng, Ngữ pháp.
- Cuối: "Đích đến: HSK 7–9 — đọc hiểu văn bản học thuật, báo chí chuyên sâu và giao tiếp thành thạo như người bản ngữ."

## 2. `roadmap-pinyin.html` (hỗ trợ `?step=1..6`, mặc định 1)
- `h1` "Bảng chữ cái Pinyin — Học theo lộ trình"; stepper 6 bước ngang: 1 Thanh mẫu / 2 Vận mẫu đơn / 3 Vận mẫu ghép / 4 Thanh điệu / 5 Quy tắc đọc / 6 Tổng ôn pinyin — bước hiện tại nền đỏ, link `?step=n`.
- Nội dung từng bước (hardcode trong `js/data/roadmapPinyin.js`):
  1. Thanh mẫu: bảng 23 phụ âm đầu (grid card chữ to + nút 🔊) + đoạn lý thuyết ngắn.
  2. Vận mẫu đơn: a o e i u ü + ý nghĩa từng âm.
  3. Vận mẫu ghép: ai ei ao ou… + bảng ghép.
  4. Thanh điệu: 4 thanh (mā má mǎ mà) + diagram hướng mũi tên + mô tả từng thanh.
  5. Quy tắc đọc: i→yi, u→wu, ü→yu, quy tắc dấu (i bỏ chấm, dấu trên a/o/e) — list quy tắc + ví dụ.
  6. Tổng ôn: nút "Làm bài tập pinyin" → `pinyin-practice.html` + "Xem lại bảng" → `pinyin.html`.
- Mỗi bước có nút "← Bước trước" / "Bước sau →".

## 3. `review.html` — Tổng ôn / Thống kê học tập
- `h1` "Thống kê học tập", mô tả "Theo dõi tiến độ và kế hoạch ôn tập của bạn — ôn đủ chu kỳ 21 ngày, kiến thức sẽ được nạp vào trí nhớ dài hạn."
- 2 tab: "Từ vựng" / "Ngữ pháp" (active đỏ).
- **6 ô thống kê** (grid 3×2): Cần ôn 0, Mới thêm 0, Đang học 0, Mới thuộc (< 21 ngày) 0, Đã thuộc (dài hạn) 0, Tổng đã học qua 0 — số lấy từ localStorage `nhai.srs` (shell chuẩn hoá: mỗi lần bấm ⭐ ở lesson tăng "Mới thêm"); nếu trống = 0.
- **Trạng thái rỗng**: `h2` "Bộ thẻ đang trống", "Bấm nút ⭐ cạnh mỗi từ trong bài học để thêm từ vào bộ thẻ ôn tập." + link "Vào kệ sách" (`course.html`).
- Nếu có thẻ trong localStorage: list thẻ cần ôn (word + nghĩa + nút "Đã thuộc"/"Chưa thuộc" cập nhật counter).

## 4. Trang login-gated: `my-vocab.html`, `my-grammar.html`, `progress.html`
- Chung pattern: header trang riêng + **màn khoá**: icon 🔒 to, `h2` "Đăng nhập để xem" — my-vocab: "Sổ tay từ vựng của bạn sẽ xuất hiện ở đây sau khi đăng nhập."; my-grammar: "Sổ tay ngữ pháp…"; progress: "Tiến độ học của bạn sẽ được đồng bộ sau khi đăng nhập." + nút "Đăng nhập" (mở Login modal shell).
- `progress.html` thêm khi "đăng nhập giả lập" (localStorage `nhai.mockLogin=1` sau khi bấm Đăng nhập trong modal): hiện 3 card tiến độ giả (HSK 1: 2/15 bài, pinyin 0/406 âm, bộ thủ 0/214) + nút "Đăng xuất (demo)".

## Tiêu chí nghiệm thu
- Stepper 6 bước pinyin điều hướng được; review đọc được counter từ localStorage; 3 trang gated có nút mở đúng modal; link từ roadmap đúng.
