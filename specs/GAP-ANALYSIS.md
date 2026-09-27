# GAP ANALYSIS — Site gốc nhaihsk.com vs clone (computer-use, 2026-09-28)

> Phương pháp: computer-use trên Chrome thật (đã cấp Accessibility + Screen Recording), tài khoản đã đăng nhập ("Softtip") — chỉ quan sát, không thao tác làm thay đổi tiến độ.

## Các trang đã đối chiếu (screenshot + AX tree)
`/` · `/course/hsk1` · `/vocab/hsk1/lesson-1` · `/grammar/hsk1/lesson-1` (skeleton) · `/hanzi/你` · `/my-vocab` · `/progress` · `/review` · `/roadmap` · `/create-file/stroke-order` · `/nang-cap` (404)

## Kết luận: khớp chính
Trang chủ, khóa học, bài học từ vựng, hanzi/你, review, roadmap — nội dung và copy khớp specs SPEC-01..05 (đã đối chiếu key-text 1:1).

## GAP theo màn hình

### GAP-1 — Global Shell (LỚN NHẤT)
- Gốc desktop dùng **sidebar icon dọc trái**: logo "Nhai" trên cùng, các item: Trang chủ, Nền tảng ›, Cá nhân hoá ›, Tra từ điển ›, Shadowing, Bài khoá, Luyện thi chứng chỉ, Tạo file, Cài đặt — item active có nền/viền nổi.
- **Topbar riêng**: logo + seal đỏ bên trái; bên phải: XP ⚡0, chuông Thông báo (popup), avatar Tài khoản (đã login).
- Clone: navbar ngang + dropdown — KHÁC layout desktop.
- Banner Hoàng Sa góc phải trên (không phải trên main), màu cam nhạt.
- Nền giấy kẻ ô mờ (paper grid texture).

### GAP-2 — Trang /progress (Tiến độ học) — nhiều tính năng clone chưa có
- Card "Điểm của bạn": **0 XP** lớn + "Mỗi câu trả lời đúng +1 điểm" + badge "**Dạng xếp hạng #14594**" + link "Xem bảng xếp hạng →".
- "Thống kê học tập" 4 ô: **Chuỗi ngày học** "0 ngày — Học hôm nay để bắt đầu chuỗi" (🔥); **Từ đã thuộc** "0 — trên tổng 9789 từ"; **Bài hoàn thành** "0/153 — Xong khi học đủ 2 chế độ"; **Hôm nay** "0 câu — Số câu trả lời đúng trong ngày".
- **"Lịch học — 12 tháng gần đây"**: heatmap ô ngày theo tháng (Tháng 11 → Tháng 9).

### GAP-3 — /my-vocab (Sổ tay từ vựng) = tính năng TẠO BỘ TỪ VỰNG
- Header: mascot + "Sổ tay từ vựng", sub "Từ tạo bộ từ vựng để học chủ động — nhập từ tài liệu của bạn."
- Nút **"+ Tạo bộ mới"** (top-right + trong empty state).
- Empty state: "Chưa có bộ từ vựng nào — Tạo bộ đầu tiên để nhập từ vựng từ tài liệu của bạn."
- Clone hiện chỉ có màn khoá 🔒 — thiếu hẳn luồng tạo bộ deck.

### GAP-4 — /create-file/* v2 (giàu hơn clone nhiều)
- Preview chứa **SVG thứ tự nét thật**: ô mẫu nét đen hoàn chỉnh → ô kế tiếp nét MỚI tô ĐỎ → hàng chữ mờ để tô; mỗi chữ có dòng meta "NHẤT yī — Một, thứ nhất, khởi đầu…" (pinyin + nghĩa inline).
- **"Chữ Hán cần luyện"**: panel chọn chữ — chip toàn bộ 214 chữ/bộ thủ, "**Chọn chữ theo cấp HSK**", "Xoá tất cả", "**214 chữ sẽ có trong bản in · sửa pinyin / nghĩa**" (edit được pinyin/nghĩa từng chữ!).
- **"Mẫu in cùng loại"**: 2 thumbnail (stroke-order / big-char) — "Đổi mẫu không mất nội dung".
- Nút **"In / Lưu PDF"** trực tiếp + badge số trang ("37 trang").
- Clone: preview tĩnh đơn giản, không có picker/edit/đổi mẫu giữ nội dung.

### GAP-5 — Lesson polish
- Card flashcard: nền vàng nhạt + **watermark bản đồ Việt Nam** mờ; mascot cà chua cạnh tiêu đề bài (highlight vàng).
- Hàng trên: tabs Từ vựng/Ví dụ — counter giữa — controls (ZH→VI/Tự động/Xáo trộn/gear) phải, cùng 1 hàng.
- Nút Trước/Chưa thuộc (đỏ)/Đã thuộc (xanh lá)/Sau nằm NGOÀI card, hàng dưới riêng.

### GAP-6 — Misc
- /review có section **"Chi tiết ôn tập"** (bảng/lưới dưới đáy); số stat có màu (Cần ôn đỏ, Đã thuộc xanh lá).
- Grammar card layout: 2×2 grid card, mỗi card có nút TTS vuông bên phải (nội dung skeleton).
- Trang **404**: mascot cà chua + "404 — Trang bạn tìm không tồn tại hoặc đã bị chuyển." + nút "Về trang chủ".
- Nav pinyin có badge "học kỹ x 99".
- AI mascot góc phải: robot + cà chua kẹp chữ "AI".

## Ưu tiên gap
1. GAP-1 Shell sidebar (ảnh hưởng mọi trang) → SPEC-10
2. GAP-2 Progress → SPEC-11
3. GAP-3 My-vocab decks → SPEC-12
4. GAP-4 Create-file v2 → SPEC-13
5. GAP-5 Lesson polish → SPEC-14
6. GAP-6 Misc → SPEC-15
