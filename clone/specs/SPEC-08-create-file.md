# SPEC-08: Tạo file luyện viết (`create-file.html` + `?tpl=`)

## 1. Hub (`create-file.html` không có `?tpl`)
- `h1` "Tạo file", sub "生成练习本 — Tạo bản in luyện viết chữ Hán theo thứ tự nét".
- **Callout gate**: "Cần mã tải file để in. Tham gia nhóm Facebook Nhai HSK, mã nằm ở phần mô tả nhóm." + link "Tham gia nhóm để lấy mã" (facebook.com/groups/nhaihsk). (Mô phỏng: input "Nhập mã" + nút "Mở khóa in" — mã `FREEHSK` cho phép bấm In; sai → toast "Mã không đúng. Mã nằm ở mô tả nhóm Facebook".)
- **"Mẫu chữ Hán"** (`h2`) — 2 card:
  - "Luyện viết theo thứ tự nét" → `?tpl=stroke-order` — "Mỗi chữ: ô mẫu đánh số nét → từng bước thêm nét (nét mới tô đỏ) → hàng chữ mờ để tô." + preview thumbnail (bảng ô vuông 永 yǒng 永…).
  - "Ô chữ lớn" → `?tpl=big-char` — "Chữ mẫu ô lớn bên trái, pinyin + thứ tự nét + nghĩa ở trên, hàng tô bên phải."
- **"Mẫu từ vựng"** (`h2`) — 4 card: "Luyện viết từ vựng" (`vocab`) — "Từ + pinyin + nghĩa + câu ví dụ, pinyin trên từng ô, hàng tô theo lượt."; "Kiểm tra từ vựng" (`vocab-check`); "Chép chữ" (`copy`); "Trang bìa" (`cover`).
- **"Mẫu pinyin & ô trống"** (`h2`) — 3 card: "Dòng pinyin" (`pinyin-lines`), "Viết pinyin" (`pinyin-write`), "Ô trống" (`blank-grid`).
- Mỗi card = preview mini (khung A4 thu nhỏ với hàng ô vuông/mẫu chữ) + tên + mô tả.

## 2. Trang template (`?tpl=<tên>`)
- Breadcrumb "← Thư viện mẫu". `h1` tên template. **Form cấu hình bên trái** + **preview A4 bên phải (region "Xem trước bản in")** + header preview: "Họ tên: ____ Ngày: ____" + footer "nhaihsk.com · facebook.com/groups/nhaihsk".
- Form chung: input "Danh sách chữ/từ" (mặc định theo template), số hàng ô (3-6), checkbox "Hiện pinyin", "Hiện nghĩa", số trang hiển thị badge "N trang". Đổi form → preview re-render tức thì.
- **Preview từng template** (render bằng HTML/CSS grid ô vuông, chữ mờ = opacity-25):
  - `stroke-order` (mặc định 永 yuǎn 远 xué 学 xí 习 hàn 汉 zì 字): mỗi chữ 1 khối: ô lớn chữ mẫu + 5 ô nhỏ đánh số nét ①②③ (SVG/text overlay) + 2 hàng ô chữ mờ để tô.
  - `big-char`: mỗi dòng: ô chữ lớn bên trái + pinyin/âm HV/nghĩa trên + 6 ô tô bên phải.
  - `vocab` (dùng từ vựng Bài 1 HSK1 từ `vocab.js`): mỗi khối: từ + (pinyin) + ÂM HV - nghĩa + câu ví dụ + dịch + hàng pinyin trên từng ô (nǐ hǎo…) + 2 hàng ô 你好你 好…
  - `vocab-check`: từ + nghĩa + câu ví dụ, **không** có chữ mẫu, chỉ ô trống (kiểm tra viết).
  - `copy`: hàng chữ mẫu in đậm xen kẽ hàng ô trống.
  - `pinyin-lines`: mỗi dòng có pinyin mờ (nǐ hǎo) trên ô — ô vuông có vạch pinyin, chữ trống.
  - `pinyin-write`: ô vuông trống + dòng kẻ pinyin bên dưới (4 dòng kẻ thanh điệu).
  - `blank-grid`: lưới 12×14 ô vuông trống (kẻ nét đứt chéo giữa ô như giấy tập Trung Quốc).
  - `cover`: trang bìa: "Sổ luyện viết chữ Hán", ô "Họ tên / Lớp / Năm học", logo chữ "练".
  - `radicals` (từ nút ở radicals.html): dùng 214 bộ thủ, mỗi ô: bộ thủ + tên HV.
- Nút "In / Lưu PDF" (gọi `window.print()` với `@media print` ẩn form + chỉ hiện preview) + badge "Đăng nhập để in" nếu chưa mock-login (bấm mở Login modal).

## Tiêu chí nghiệm thu
- 9+1 template có preview đổi được theo form; in ra chỉ thấy preview; gate mã hoạt động (FREEHSK).
