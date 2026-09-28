# SPEC-17: /review → "Thống kê học tập" (SRS dashboard, thay thế trang "chơi ôn tập")

## Bối cảnh
Vòng 2 cho thấy `/review` ở site gốc là **trang thống kê ôn tập (spaced repetition dashboard)**, không phải trang chơi quiz. Title tag là "Ôn tập ngắt quãng". Chi tiết: `GAP-ANALYSIS-ROUND2.md` GAP-8.

## A. Khung trang
- `<title>Ôn tập ngắt quãng | Nhai HSK`, H1 **"Thống kê học tập"**, sub "Theo dõi tiến độ và kế hoạch ôn tập của bạn — ôn đủ chu kỳ 2 lần là thành thạo."
- Ngay dưới H1: **2 tab** `Từ vựng` | `Ngữ pháp` — trạng thái `active` viền đỏ, tab bấm được, đổi tab đổi `data-domain` (giữ layout, chỉ đổi nhãn nhóm rỗng + câu mô tả + link).

## B. Nhóm 6 ô đếm
Grid 6 cột (3 cột trên tablet, 2 trên mobile), mỗi ô: số lớn 28px đậm + nhãn nhỏ dưới.
| Ô | Số | Nhãn | Màu số |
|---|---|---|---|
| 1 | 0 | Cần ôn | đỏ |
| 2 | 0 | Mới thêm | xám |
| 3 | 0 | Đang học | xanh dương |
| 4 | 0 | Mới thuộc (< 21 ngày) | xanh lá |
| 5 | 0 | Đã thuộc (dài hạn) | xanh lá đậm |
| 6 | 0 | Tổng đã học qua | đỏ chính (--nhai-main) |

Dữ liệu hardcode mẫu (để nhìn thấy bố cục thật): Cần ôn 12 · Mới thêm 34 · Đang học 8 · Mới thuộc 41 · Đã thuộc 96 · Tổng 191.

## C. Section "Bộ thẻ đang trống"
Card trung tâm, `h2`, text phụ đổi theo tab:
- Từ vựng: "Bấm nút ⭐ cạnh mỗi từ trong bài học để thêm từ vào bộ thẻ ôn." + link đỏ "Vào kệ sách →"
- Ngữ pháp: "Bấm nút ⭐ trên mẫu ngữ pháp để thêm vào bộ thẻ ôn tập." + link đỏ "Vào mục ngữ pháp →"

## D. Section "Chi tiết ôn tập"
1. **Grid 5 ô nhỏ**: Streak (🔥 0 ngày) · Hôm nay (0 lượt) · Tuần này (0 lượt) · TB / ngày (0 lượt) · TB / thẻ (0 giây). Số lớn, nhãn nhỏ xám.
2. **"7 ngày gần nhất"** — bar chart 7 cột, nhãn dưới `T3 T4 T5 T6 T7 CN T2` (thứ tự Từ 3 hôm nay đến thứ 2 tuần sau, tức cuộn ngược 7 ngày). Chiều cao cột tỉ lệ `todayCount`. Màu cột: hôm nay `--nhai-main`, ngày khác `--nhai-soft`.
3. **"Phân bổ đánh giá (N lượt)"** — biểu đồ tròn SVG (donut) 4 lát: Quên rồi (đỏ) · Khó (cam) · Tốt (xanh lá) · Dễ (xanh dương). Bên cạnh là legend 4 dòng, mỗi dòng: chấm màu + nhãn + "N (X%)".
4. Chân bảng: "Tổng: N lượt · Tháng này: M lượt".

Dữ liệu mẫu: 7 ngày `[3, 5, 0, 8, 12, 4, 0]`, phân bổ `Quên rồi 8 / Khó 5 / Tốt 14 / Dễ 3`, tổng 30, tháng này 30.

## E. Khi bộ thẻ KHÔNG rỗng
Ảnh chụp gốc chỉ thấy empty state. Giữ empty state làm mặc định; nếu `NHAI.srs` có dữ liệu thì thay empty state bằng nút lớn "Bắt đầu ôn tập (N thẻ)" dẫn `review-play.html`.

## Tiêu chí nghiệm thu
- H1 khớp "Thống kê học tập", title tag "Ôn tập ngắt quãng".
- 2 tab đổi nội dung rỗng + text mô tả, giữ nguyên layout.
- Đủ 6 ô đếm với màu số đúng; đủ 5 ô TB; bar 7 ngày có nhãn đúng thứ tự; donut 4 lát + legend % ; chân bảng tổng.
- Không còn form "bắt đầu ôn tập" cũ ở top trang.
