# SPEC-11: Trang Tiến độ học /progress (fix GAP-2)

## Bối cảnh
Đối chiếu logged-in: /progress gốc có XP + hạng + streak + 4 thống kê + heatmap 12 tháng. Clone chỉ có 3 card giả.

## Layout (khi đã "đăng nhập" — mockLogin)
1. Header: mascot 🍅 + h1 "Tiến độ học" + sub "Điểm, chuỗi ngày học và lịch học của bạn."
2. **Card "Điểm của bạn"** (full width):
   - Icon ⚡ trong ô vuông vàng; tiêu đề "Điểm của bạn"; số **XP lớn** (từ localStorage `nhai.xp`, mặc định 0).
   - "Mỗi câu trả lời đúng +1 điểm" (muted).
   - Hàng: 🏆 "Dạng xếp hạng" + badge vàng **#14594** (hardcode; khi XP>0 tính `rank = 14594 - xp`).
   - Nút "Xem bảng xếp hạng →" → leaderboard.html.
3. **"Thống kê học tập"** (h2) — grid 4 card:
   - **Chuỗi ngày học** (🔥): số ngày streak + sub "Học hôm nay để bắt đầu chuỗi" — streak từ localStorage `nhai.streak` (mock: mỗi lần vào lesson trả lời đúng +1 nếu là ngày hôm nay).
   - **Từ đã thuộc** (📖): "N" + sub "trên tổng 9789 từ" — đếm thẻ SRS status "known".
   - **Bài hoàn thành** (✅): "N/153" + sub "Xong khi học đủ 2 chế độ" — đếm bài có ≥2 mode đã học (localStorage).
   - **Hôm nay** (🎯): "N câu" + sub "Số câu trả lời đúng trong ngày" — đếm event trong ngày (localStorage `nhai.today`).
4. **Card "Lịch học"**: h "12 tháng gần đây" + **heatmap**: 12 cột tháng (Tháng 11 → Tháng 10), mỗi cột ô nhỏ theo ngày; ô màu theo mức XP trong ngày (0/1-2/3-5/6+ → 4 mức màu đỏ nhạt→đậm); sinh dữ liệu demo cứng nếu localStorage trống.
5. Khi chưa mock-login: giữ màn khoá hiện có (🔒 + nút Đăng nhập).

## Tiêu chí nghiệm thu
- Mock-login → đầy đủ 2 section + heatmap 12 tháng render; số liệu đọc localStorage; mock-logout → màn khoá.
- Heatmap có tooltip "Xp: N" khi hover ô.
