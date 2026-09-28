# SPEC-13: Create-file v2 — picker chữ + SVG nét thật + đổi mẫu giữ nội dung (fix GAP-4)

## Bối cảnh
Screenshot gốc `/create-file/stroke-order`: preview có SVG nét thật từng bước (đen → đỏ → mờ), panel "Chữ Hán cần luyện" chọn/sửa chữ, "Mẫu in cùng loại" đổi mẫu không mất nội dung, "In / Lưu PDF" trực tiếp.

## A. Panel "Chữ Hán cần luyện" (cột phải template view)
- Card: h3 "Chữ Hán cần luyện"; khung hiển thị chips mọi chữ đang chọn (chip: chữ + nút ✕ xoá).
- Hàng chip **214 bộ thủ / chữ theo cấp** (scroll ngang, giống screenshot: 一丨丶丿乙亅…); bấm chip → thêm vào danh sách.
- Nút "📂 Chọn chữ theo cấp HSK" → popover pills HSK1-7-9 → bấm cấp chèn danh sách chữ mặc định của cấp (dùng `NHAI_DATA.hanzi.chars`).
- Link đỏ "🗑 Xoá tất cả".
- Dòng "N chữ sẽ có trong bản in · **sửa pinyin / nghĩa**" — bấm mở modal bảng: mỗi chữ 1 hàng (chữ | input pinyin | input nghĩa) — sửa lưu vào state render (không cần persist).
- Input pinyin/nghĩa thay đổi → preview re-render realtime.

## B. Preview v2 (cột trái)
- **stroke-order**: mỗi chữ 1 khối: (a) dòng meta "NHẤT yī — Một, thứ nhất…" (chữ Hán Việt IN HOA + pinyin + nghĩa, từ data đã sửa); (b) **ô SVG lớn nét hoàn chỉnh đen**; (c) 3-5 ô SVG **nét mới tô đỏ** tăng dần (render từ stroke data: các polyline vẽ stroke[0..k], stroke[k] màu đỏ); (d) 2 hàng chữ mờ.
  - Stroke data: dùng `NHAI_DATA.hanzi.strokes[字]` (mảng polyline) — có sẵn cho 你; chữ khác fallback generic 4 nét; 部 thủ 1-6 nét có data nét thật vẽ tay.
- **big-char**: thêm dòng meta như trên + SVG nét trong ô lớn.
- Các template khác giữ nguyên hành vi, nhưng meta dòng dùng data đã sửa.
- Badge "N trang" + header/footer như cũ.

## C. "Mẫu in cùng loại"
- Card bên phải preview (desktop): h3 "Mẫu in cùng loại" + sub "Đổi mẫu không mất nội dung"; 2 thumbnail (stroke-order, big-char) bấm → `?tpl=` đổi nhưng GIỮ danh sách chữ + pinyin/nghĩa đã sửa (state giữ trong sessionStorage `nhai.cf.state`).

## D. In
- Nút **"🖨 In / Lưu PDF"** → window.print() (giữ @media print). Gate mã FREEHSK/mockLogin giữ nguyên.

## Tiêu chí nghiệm thu
- Thêm/xoá chữ realtime; sửa pinyin/nghĩa phản ánh vào preview; SVG stroke-order vẽ đúng thứ tự nét (đen→đỏ→mờ); đổi template giữ nội dung; in ra đúng preview.
