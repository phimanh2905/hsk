# SPEC-10: Global Shell v2 — Sidebar dọc + Topbar (fix GAP-1)

## Bối cảnh
Đối chiếu computer-use với site gốc: desktop dùng **sidebar icon dọc trái**, không phải navbar ngang. Clone cần thay shell layout.

## Layout desktop (≥1024px)
- **Sidebar trái cố định** (width ~72px, nền card, border-right 2px):
  - Logo "Nhai" (seal đỏ vuông + chữ) trên cùng, link về index.
  - Items dọc (icon trên, label dưới, text-[10px]): Trang chủ · Nền tảng › · Cá nhân hoá › · Tra từ điển › · Shadowing · Bài khoá · Luyện thi chứng chỉ · Tạo file · Cài đặt.
  - Item active: nền `--nhai-soft` + border nổi (xem screenshot gốc: "Trang chủ"/"Cá nhân hoá" có hộp nền).
  - Nhóm có submenu (Nền tảng/Cá nhân hoá/Tra từ điển): bấm mở **popover bên phải sidebar** liệt kê item con (như dropdown cũ nhưng position: right).
- **Topbar** phía trên main (trong vùng content, không đè sidebar): bên phải: badge XP "⚡ 0 — mỗi câu trả lời đúng +1" · nút chuông Thông báo (popup: danh sách thông báo demo) · avatar tròn (đăng nhập) hoặc nút Đăng nhập.
- **Banner Hoàng Sa**: góc phải trên của vùng content (text-align right, 2 dòng, màu cam nhạt #c0392b/70%), KHÔNG chiếm full-width hàng riêng như clone cũ.
- **Nền giấy kẻ ô**: body có pattern grid mờ (CSS `background-image: linear-gradient` 2 hướng, ô 24px, màu rgba border 0.35).

## Layout mobile (<768px)
- Giữ nguyên hành vi cũ: topbar + nút ☰ mở drawer sidebar trượt (giữ nguyên code cũ, chỉ chuyển CSS class).

## Tương thích
- Tất cả trang hiện có phải hoạt động không đổi (chỉ đổi shell). `NHAI.q/toast/speak/...` giữ nguyên API.
- Nút Đăng nhập mở Login modal như cũ; sau mock-login, avatar tròn 2 chữ cái hiện thay nút Đăng nhập.

## Tiêu chí nghiệm thu
- Desktop: sidebar dọc như mô tả, item active theo trang hiện tại; popover submenu hoạt động; XP/bell/avatar ở topbar.
- Mobile: không vỡ, drawer chạy.
- Không trang nào bị lệch do main chuyển từ max-w-6xl giữa sang vùng content bên phải sidebar.
