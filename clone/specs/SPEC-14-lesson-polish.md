# SPEC-14: Lesson polish — visual theo site gốc (fix GAP-5)

## Các chỉnh trên lesson.html (giữ nguyên logic/logic-state hiện có)
1. **Watermark bản đồ Việt Nam**: card flashcard + vùng main có hình bản đồ Việt Nam mờ phía sau (SVG outline Việt Nam inline, opacity 0.08, màu đỏ nhạt, position absolute giữa-trái card, pointer-events none). Tạo 1 file `assets/vietnam-map.svg` (outline đơn giản) hoặc vẽ path polygon gần đúng.
2. **Mascot cà chua cạnh tiêu đề**: img/emoji 🍅 (hoặc mascot SVG tròn) size 44px đứng trước h1 "Xin chào!", title có nền highlight vàng nhạt (`bg-[#f5d76e]/50 rounded px-2`).
3. **Hàng điều khiển trên**: gộp 1 hàng: [tabs Từ vựng | Ví dụ] — [counter 1/13 pill ở GIỮA] — [ZH→VI | Tự động | Xáo trộn | ⚙] (responsive: wrap).
4. **Nút nav flashcard** nằm NGOÀI card (hàng riêng dưới card, full-width flex justify-center): `‹ Trước` (ghost) · `✕ Chưa thuộc` (nền đỏ #c03922 chữ trắng) · `✓ Đã thuộc` (nền xanh lá #2e7d32 chữ trắng) · `Sau ›` (ghost). Kích thước lớn (px-8 py-2.5), giữ phím tắt.
5. Mặt sau thẻ: nền vàng nhạt hơn (#f7e9c8) như gốc; chữ Hán to giữa card với "Cụm từ" pill dưới.
6. Bài học header: badge "Bài 1" nền đen chữ trắng (không đỏ) + "13 từ vựng" pill thường — theo screenshot gốc.

## Tiêu chí nghiệm thu
- Visual khớp screenshot gốc: watermark, mascot, hàng controls, 4 nút nav màu đỏ/xanh ngoài card; mọi phím tắt/mode vẫn chạy.
