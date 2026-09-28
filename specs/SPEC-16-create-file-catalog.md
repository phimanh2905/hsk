# SPEC-16: Create-file = catalog 9 mẫu in + form 7 nhóm tuỳ chọn (thay thế SPEC-13)

## Bối cảnh
Vòng 2 duyệt `/create-file` (scroll tới đáy) cho thấy trang gốc **không phải form nhập liệu** mà là **catalog 9 mẫu in**; bấm vào 1 mẫu mới sang trang form riêng với 7 nhóm tuỳ chọn. Chi tiết đầy đủ trong `GAP-ANALYSIS-ROUND2.md` GAP-7.

## A. Trang catalog — `create-file.html?view=catalog` (mặc định)
- Header: H1 "Tạo file", badge song ngữ "生成练习本", sub "— Tạo bản in luyện viết chữ Hán theo thứ tự nét".
- **Banner**: nền vàng nhạt, text "Cần mã tải file để in. Tham gia nhóm Facebook Nhai HSK, mã n…" + link đỏ "Tham gia nhóm để lấy mã".
- 3 section, mỗi section = `h2` nhóm + lưới card:
  - **Mẫu chữ Hán**: "Luyện viết theo thứ tự nét" (card ảnh: ô mẫu đánh số nét → từng bước thêm nét, nét mới tô đỏ), "Ô chữ lớn".
  - **Mẫu từ vựng**: "Luyện viết từ vựng", "Bảng tự kiểm tra từ vựng", "Nhìn pinyin viết chữ Hán".
  - **Đoạn văn & giấy ô**: "Chép đoạn văn", "Bài văn dòng kẻ có pinyin", "Giấy ô trống", "Bìa vở luyện chữ".
- Mỗi card: ảnh minh hoạ (SVG tĩnh vẽ tay, không dùng ảnh ngoài) + `h3` tên + mô tả 1-2 dòng mờ. Click card → `create-file.html?tpl=<id>`.
- Ảnh minh hoạ: dùng SVG inline đơn giản vẽ đúng ý nghĩa từng mẫu (ô vuông/ô tô/nét đỏ/dòng kẻ/ô pinyin). Không cần pixel-perfect.

## B. Trang form — `create-file.html?tpl=<id>`
Tầng 1 (header): link "‹ Thư viện mẫu" · H1 = tên mẫu · mô tả · badge "N trang" (tính động) · nút đỏ "🖨 In / Lưu PDF" (giữ gate FREEHSK/mockLogin).
Tầng 2 (2 cột desktop, dọc trên mobile):
- **Cột trái = preview** (giữ nguyên renderer hiện có, bổ sung meta pinyin/nghĩa lấy từ state).
- **Cột phải = form 7 nhóm** (mỗi nhóm 1 card, h3 + control):

1. **Từ vựng cần luyện** (`tpl` ∈ vocab, vocab-check, pinyin-write)
   - 3 nút hàng trên: "Hướng dẫn nhập từ vựng" (mở modal hướng dẫn) · "Nhập vào danh sách" (modal textarea, mỗi dòng "hanzi pinyin nghĩa") · **"Format bằng AI"** (mock: chuẩn hoá pinyin/nghĩa từ `NHAI_DATA`, toast "Đã format N từ").
   - Danh sách từ, mỗi từ 1 row: cột 1 chữ Hán lớn · cột 2 pinyin + Hán Việt IN HOA · cột 3 **input nghĩa (sửa được)** · nút xoá (chỉ hiện khi hover).
   - Dòng dưới: "**N từ sẽ có trong bản in**" + link "Xóa tất cả".
2. **Trang** — input text "Tiêu đề" + checkbox "Tiêu đề + Họ tên/Ngày" (checked).
3. **Loại ô** (radio, 1 chọn) — Điền tự ✓ · Mễ tự · Ô vuông · Hồi cung · Cửu cung. Đổi loại → preview đổi shape ô.
4. **Màu ô** (radio) — green · red · blue · **gray ✓**.
5. **Bố cục** — 3 stepper (−/giá trị/+): Số ô mỗi hàng (12) · Số hàng tô (1) · Số hàng trống (0) + **slider "Số từ mờ" 3/12**.
6. **Chữ** — checkbox group Khải thư ✓ / Hành thư · **radio "Nguồn nét"**: `笔顺 CNstrokeorder 永远` ✓ / `清风体 永远` · **checkbox group "Kiểu chữ tô"**: Tô mờ ✓ / Chữ rỗng / Rỗng nét đứt / Nét đứt mảnh · **slider "Độ đậm" 30%** · **slider "Cỡ chữ" 78%**.
7. **Hiển thị** — checkbox Pinyin ✓ · checkbox Nghĩa ✓.

Chân form: nút phụ "Khôi phục mặc định" + ghi chú nhỏ "Bấm In rồi chọn 'Lưu dưới dạng PDF' trong hộp thoại của trình duyệt."

## C. "Mẫu in cùng loại"
Card dưới cột phải: h3 + sub "Đổi mẫu không mất nội dung", danh sách link các mẫu cùng nhóm. Click → đổi `?tpl=` **giữ nguyên state** (sessionStorage `nhai.cf.state`).

## D. Preview (giữ từ SPEC-13)
- `stroke-order` / `big-char`: khối mỗi chữ gồm dòng meta (Hán Việt IN HOA + pinyin + nghĩa) + ô SVG nét đen hoàn chỉnh + các ô bước nét (nét mới tô đỏ) + hàng chữ mờ. Nguồn nét chọn ở nhóm 6.
- Các mẫu còn lại: ô vẽ theo **loại ô** + **màu ô** đã chọn, số cột = "Số ô mỗi hàng", số hàng tô/trống theo bố cục, `số từ mờ` chữ đầu được tô mờ, cỡ chữ/độ đậm theo slider.
- `@media print` chỉ in cột trái + header.

## E. State
`nhai.cf.state` (sessionStorage): `{tpl, chars:[{hanzi,pinyin,hv,meaning}], title, nameDate, cellType, cellColor, perRow, fillRows, blankRows, faintCount, script, strokeSource, traceStyle[], opacity, fontSize, showPinyin, showMeaning}`.

## Tiêu chí nghiệm thu
- `/create-file` mặc định ra catalog 9 mẫu, click mẫu sang form đúng mẫu.
- Form có đủ 7 nhóm tuỳ chọn với mặc định khớp gốc (Điền tự, gray, 12, 1, 0, 3/12, Khải thư, CNstrokeorder, Tô mờ, 30%, 78%, Pinyin+Nghĩa).
- Đổi bất kỳ tuỳ chọn nào → preview cập nhật ngay.
- Sửa nghĩa / thêm-xoá từ → preview cập nhật ngay.
- Đổi mẫu cùng loại → không mất state; tải lại trang vẫn giữ (sessionStorage).
- In/PDF chỉ ra preview.
