# SPEC-02: Bài học từ vựng — Flashcard + 7 chế độ học (trang quan trọng nhất)

## Route & dữ liệu
- `lesson.html?book=hsk1&page=lesson-1` (bất kỳ book/page nào cũng dùng trang này).
- Dữ liệu: `js/data/vocab.js` — `NHAI_DATA.vocab = { hsk1: { "lesson-1": { title: "Xin chào!", words: [...] }, "lesson-2": {...5 từ mẫu} } }`.
- **Bài 1 HSK1 đủ 13 từ thật** (mỗi từ: `hanzi, pinyin, hanViet (IN HOA), meaning, pos, example: {zh, pinyinPerChar: [{c, py}], vi}`):
  1. 你好 / nǐ hǎo / NHĨ HẢO / Xin chào / Cụm từ / 李明，你好。→ Chào Lý Minh
  2. 王老师 / Wáng lǎoshī / VƯƠNG LÃO SƯ / Cô Vương / Danh từ / 王老师，您好。→ Xin chào cô Vương
  3. 大家 / dàjiā / ĐẠI GIA / Mọi người / Đại từ / 大家好，我是新学生。→ Chào mọi người, tôi là học sinh mới
  4. 好 / hǎo / HẢO / Tốt, khỏe / Tính từ / 老师，您好。→ Xin chào thầy
  5. 学生 / xuésheng / HỌC SINH / Học sinh / Danh từ / 我是这里的学生。→ Tôi là học sinh ở đây
  6. 们 / men / MÔN / Các, những (hậu tố chỉ số nhiều) / Hậu tố / 老师们好。→ Chào các thầy cô
  7. 老师 / lǎoshī / LÃO SƯ / Giáo viên, thầy cô / Danh từ / 王老师，您好。→ Xin chào cô Vương
  8. 您 / nín / NÂM / Ngài, ông, bà (trang trọng) / Đại từ / 您是老师吗 → Ngài là giáo viên phải không
  9. 你们 / nǐmen / NHĨ MÔN / Các bạn / Đại từ / 你们是学生吗 → Các bạn là học sinh phải không
  10. 谢谢 / xièxie / TẠ TẠ / Cảm ơn / Động từ / 老师，谢谢您。→ Thưa thầy, cảm ơn thầy
  11. 不客气 / bú kèqi / BẤT KHÁCH KHÍ / Không có gì, đừng khách sáo / Cụm từ / 谢谢你，不客气。→ Cảm ơn bạn, không có gì
  12. 同学 / tóngxué / ĐỒNG HỌC / Bạn học / Danh từ / 同学们好！→ Chào các bạn học
  13. 再见 / zàijiàn / TÁI KIẾN / Tạm biệt / Động từ / 老师，再见！→ Tạm biệt thầy
  `pinyinPerChar` tách theo ký tự (vd 李 lǐ 明 míng ，你 nǐ 好 hǎo). Bài 2-15: sinh 8-15 từ HSK1 hợp lệ (phủ từ vựng phổ thông).

## Layout
- **Header**: link "← Danh sách bài" (`course.html?book=…&skill=vocab`), "Bài 1", badge "13 từ vựng", `h1` "Xin chào!", "Bài 1 — Từ vựng HSK".
- **Tabs trên cùng**: "Từ vựng" (mặc định) / "Ví dụ" — tab Ví dụ hiện list câu ví dụ của cả bài (zh có pinyin từng chữ + dịch + nút TTS).
- **Cột trái (main, ~2/3)**: khu chế độ học. **Cột phải (sidebar ~1/3, sticky)**: "Chọn chế độ học".

## Chế độ học (mỗi chế độ = 1 state của khu chính; sidebar nút active nền đỏ)
Sidebar 7 nút, mỗi nút: tên + badge — Flashcard, Trắc nghiệm, Gõ từ, Đọc hiểu, Nghe ghép câu, Hanzi Dance (badge "Chưa học"), Đấu trí (badge "Xếp hạng"). Dưới: nút "In file", "Thêm cả bài vào ôn tập". Counter tiến độ "1 / 13" hiện ở khu chính.

### 1. Flashcard (mặc định)
- Thanh điều khiển: toggle chiều "ZH → VI" (bấm đổi thành "VI → ZH"), "Tự động", "Xáo trộn", icon "Cài đặt tự động phát", nút "Phát âm" 🔊 (TTS chữ Hán).
- Thẻ lớn: mặt trước = `h2` chữ Hán to + từ loại; giữa thẻ chữ "Click để lật"; bấm thẻ lật (CSS 3D flip) → pinyin + ÂM HÁN VIỆT + nghĩa tiếng Việt.
- 4 nút điều hướng: "Thẻ trước (←/A)", "Chưa thuộc (↓/X)" (viền đỏ), "Đã thuộc (↑/Z)" (viền xanh), "Thẻ sau (→/D)". Phím tắt keyboard thật: ArrowLeft/a, ArrowDown/x, ArrowUp/z, ArrowRight/d. Đánh dấu đổi màu badge trạng thái trong sidebar.

### 2. Trắc nghiệm
- Toggle "Cài đặt hiển thị đề bài": Cách đọc / Từ vựng / Ý nghĩa (đề hiện: chữ Hán + ÂM HÁN VIỆT + nghĩa).
- Đề + 4 nút đáp án pinyin (1 đúng 3 nhiễu lấy từ cùng bài); đáp án đúng → viền xanh, sai → viền đỏ + rung, rồi tự hiện câu tiếp sau 800ms. Nút "Không biết". Nút "Nghe phát âm gợi ý" + caption "Bí quá thì nghe". Counter "1 / 13".

### 3. Gõ từ
- Toggle đề: Cách đọc / Âm Hán / Chữ Hán. Đề: chữ Hán + nghĩa + hàng ô trống "_ _ _ _ _" (số ô = số ký tự pinyin âm tiết).
- Input placeholder "Gõ pinyin, số là thanh điệu (ni3 → nǐ)"; parser: `ni3 → nǐ, lv4 → lǜ` (map u:v sau j/q/x/y, thanh điệu đặt đúng nguyên âm chính).
- Nút "Gợi ý (0/5)" mở dần từng ký tự; "Kiểm tra" chấm điểm; đúng → viền xanh tự sang thẻ sau.

### 4. Đọc hiểu
- Đề: câu ví dụ bị khuyết "__，您好" + bản dịch tiếng Việt hiện sẵn; 4 đáp án = chữ Hán; nút "Câu này bó tay" (bỏ qua); toggle "Nghĩa"; nút "Nghe câu ví dụ gợi ý".

### 5. Nghe ghép câu
- Nút "Nghe câu" (TTS câu ví dụ) / "Nghe lại"; tốc độ: 0.5x / 0.8x / 1x / 1.5x / 2x (active nền đỏ) — dùng `speechSynthesis.rate`.
- Khu ghép: pool thẻ chữ Hán xáo trộn; bấm thẻ → nhảy lên vùng câu; "Ghép câu" kiểm tra (đúng thứ tự chữ của câu ví dụ); "Gõ lại" reset.

### 6. Hanzi Dance
- Card giữa: tiêu đề "Hanzi Dance", nút "Bắt đầu"; chọn nhạc: "Làng Lá" / "Lãm Làng" / "Nhạc của tôi" (pill, active đỏ); mô tả "Gõ đúng cách đọc của từ → nhân vật của bạn nhảy; sai thì đứng im. Lượt này có 13 từ trong bài."
- Khi chơi: hiện chữ Hán + input pinyin (cùng parser với Gõ từ); dùng emoji 🕺💃 nhảy (CSS animation translateY) khi đúng; nhạc = WebAudio oscillator đơn giản hoặc bỏ qua tiếng.

### 7. Đấu trí (PvP)
- `h2` "Đấu trí" + mô tả: "Trả lời 13 câu — trộn ngẫu nhiên 5 dạng: chữ Hán → nghĩa, nghĩa → chữ Hán, chữ Hán → pinyin, điền từ vào câu và gõ pinyin. Ai đúng nhiều và nhanh nhất sẽ đứng đầu bảng xếp hạng của bài này. Thi lại bao nhiêu lần cũng được — bảng chỉ tính lượt tốt nhất của bạn."
- Dòng "Đăng nhập để lưu kết quả lên bảng xếp hạng." + nút Đăng nhập (mở modal shell).
- Nút "Bắt đầu thi" → chạy 13 câu trộn 5 dạng (timer đếm giây hiển thị); kết thúc → màn kết quả (đúng X/13, thời gian) + lưu best vào localStorage.
- **"Top 10 bài này"** (hiện cả khi chưa thi): 🥇 Thùy Trâm 13/13 0:25.9, 🥈 Vân Anh Ngô 13/13 0:26.1, 🥉 vân anh ngô 13/13 0:27.3, #4 Nha 13/13 0:27.6, #5 Linh Trần 13/13 0:28.1, #6 Diễm Kiều 13/13 0:29.3, #7 Ngọc Phạm 13/13 0:30.4, #8 Hoa Nguyen 13/13 0:31.6, #9 Thang Nguyen 13/13 0:34.3, #10 Ngọc Lê 13/13 0:34.4. Link "Xem BXH Đấu trí tháng này →" → `leaderboard.html?tab=battle`.

## Danh sách từ (cuối trang, luôn hiện)
List đánh số "1."…: chữ Hán + từ loại + pinyin + ÂM HÁN VIỆT + nghĩa + câu ví dụ (zh, pinyin từng chữ có màu muted, dịch "→ …") + 3 nút icon mỗi mục: "Báo lỗi" (toast), "Thêm vào bộ thẻ ôn tập" (⭐ đổi vàng, toast "Đã thêm vào ôn tập"), "Phát âm từ" 🔊.

## Tiêu chí nghiệm thu
- Đủ 7 chế độ chuyển được qua sidebar; flashcard lật + phím tắt chạy; trắc nghiệm/gõ từ chấm đúng; nghe ghép câu ghép được; đấu trí thi + top 10 đúng số liệu; counter cập nhật; không lỗi console.
