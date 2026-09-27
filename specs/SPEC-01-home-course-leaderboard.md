# SPEC-01: Trang chủ + Khóa học + Bảng xếp hạng

## 1. Trang chủ (`index.html`, route `/`)
Layout dọc trong `main` (max-w-3xl, căn giữa):
1. **Chào mừng**: `h1` "Chào bạn 👋", paragraph "Tiếp tục hành trình từ vựng tiếng Trung của bạn — mỗi ngày một chút là đủ."
2. **Card nhóm Facebook**: text "Vào nhóm học cùng mọi người nhé:" + link "Nhai tiếng Trung mỗi ngày" (https://www.facebook.com/groups/nhaihsk).
3. **Section "HSK 3.0"** (`h2`, sub "Bản cải tiến"): grid card 7 khóa học, mỗi card là link sang `course.html?book=<slug>`:
   | Tên | Meta |
   |---|---|
   | Nhai HSK 1 | 333 từ vựng · 41 mẫu |
   | Nhai HSK 2 | 213 từ vựng · 45 mẫu |
   | Nhai HSK 3 | 483 từ vựng · 63 mẫu |
   | Nhai HSK 4 | 972 từ vựng |
   | Nhai HSK 5 | 1059 từ vựng |
   | Nhai HSK 6 | 1123 từ vựng |
   | Nhai HSK 7-9 | 5606 từ vựng |
   Card: nền trắng, border 2px, shadow neo, hover translate -1px.
4. Dưới cùng: dòng chữ nhỏ "Nhai tiếng Trung mỗi ngày — facebook.com/groups/nhaihsk".

## 2. Kệ sách + trang khóa học (`course.html`, route `/course` và `/course/{book}`)
- **Không có `?book=`**: hiện heading "Bài khoá — Kệ sách" + grid 7 card như trang chủ (thêm số bài: HSK1 = 15 bài…).
- **Có `?book=`** (mặc định `hsk1`, `skill` mặc định `vocab`), dữ liệu từ `js/data/courses.js`:
  - Breadcrumb "Trang chủ" + badge "Nhai" + tên "HSK 1" + "15 bài".
  - `h1` "HSK 1 3.0", sub "标准教程 HSK 1 · 3.0".
  - **Tab kỹ năng** 3 nút pill: "Từ vựng · 词汇" / "Ngữ pháp · 语法" / "Chữ Hán · 汉字" — active = nền đỏ chữ trắng; bấm đổi `skill` trong URL và re-render danh sách.
  - **Tiến độ học**: "0/15 bài", thanh progress 0%.
  - **Danh sách bài** (từ `NHAI_DATA.courses.hsk1.pages`): mỗi hàng = số thứ tự trong ô vuông + tên bài tiếng Việt (vd "Xin chào!") + "13 từ vựng"; hàng có `pageId` là link sang `lesson.html?book=hsk1&page=lesson-1`, các bài ngữ pháp/chữ Hán là button + badge khóa "🔒" (login-gated, bấm mở Login modal).
  - **Dữ liệu mẫu bắt buộc**: `hsk1` đủ 15 bài vocab (tên thật theo giáo trình 标准教程: 1 Xin chào! (13 từ), 2 Tôi tên là NhaiHSK (15), 3 Tôi là người Việt Nam (22), 4 Tôi có hai đứa con (21), 5 Hôm nay tôi nghỉ (22), 6 Số điện thoại của bạn là bao nhiêu? (23), 7 Tôi tan làm lúc 6 rưỡi tối (27), 8 Bố tôi cũng làm việc ở bệnh viện (27), 9 Sáng mai tôi học ở trường (23), 10 Táo ở đây rẻ thật! (23), 11 Tôi đang học đại học (25), 12 Hôm qua tuyết rơi (24), 13 Cho tôi một cốc trà (20), 14 Tôi đã xem một bộ phim (28), 15 Hẹn gặp ở sân bay! (20)); mỗi sách khác tạo 5-10 bài tên tự hợp lệ.
  - Nút "Tổng ôn" cuối danh sách → `review.html`.
- **Sách khác**: `hsk2` 45 bài, `hsk3` 63 bài… sinh tên bài dạng "Bài N" + meta "≈N từ vựng"; `hsk7-9` 30 bài.

## 3. Bảng xếp hạng (`leaderboard.html`, route `/leaderboard`)
- `h1` "Bảng xếp hạng"; 2 nút tab: "XP tổng" / "Đấu trí tháng" (active = nền đỏ; đổi `?tab=`).
- Paragraph mô tả: "Top 10 học viên chăm nhất — mỗi câu trả lời đúng +1 XP."
- Danh sách 10 hàng: hạng (🥇🥈🥉 hoặc #4…#10), avatar tròn 2 chữ cái, tên, điểm. Dữ liệu cứng trong `js/data/leaderboard.js`:
  XP tổng: Khánh Linh Trần 5850, My Phan 7915, TÔI VÀ EM 4977, Quỳnh Ngọc (Wuynhh) 4838, Boi thy Huynh 4523, Ngọc Nguyễn 4153, Vân Anh Ngô 3675, Đạt Nguyễn Thành 3591, Thi Yen 3397, Giao Trần Quỳnh 3235 (sắp theo điểm giảm dần, My Phan đầu).
  Đấu trí tháng: tự sinh 10 hàng điểm 12/15…9/15 kèm thời gian.
- Note: `?tab=battle` là đích của link "Xem BXH Đấu trí tháng này →" từ trang Đấu trí.
- **"Cách tính điểm"**: "XP = mỗi câu trả lời đúng ở các chế độ Flashcard, Trắc nghiệm và các bài luyện tập (mỗi câu +1). Điểm được đồng bộ khi bạn đăng nhập." + "Bảng xếp hạng cập nhật tối đa 10 phút một lần. Khi bằng điểm, ai đạt trước xếp trước."

## 4. Góp ý (`feedback.html`) + trang tĩnh
- `h1` "Góp ý", textarea "Cảm nhận của bạn giúp Nhai HSK tốt hơn…", nút "Gửi góp ý" (bấm hiện toast "Cảm ơn bạn! Góp ý đã được ghi nhận." — localStorage).
- `terms.html`/`privacy.html`: h1 + 4-5 đoạn văn mẫu điều khoản bằng tiếng Việt.

## Tiêu chí nghiệm thu
- 7 card khóa đúng số liệu; tab skill đổi được danh sách; leaderboard đổi tab được; mọi link đúng sơ đồ route SPEC-00.
