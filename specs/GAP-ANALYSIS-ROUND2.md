# GAP ANALYSIS — Vòng 2 (duyệt top→bottom + click toàn bộ 15 route)

> Phương pháp: computer-use trên Chrome thật (tài khoản "Softtip" đã đăng nhập), **mỗi trang scroll từ top xuống đáy** và click các nút quan sát được (chỉ đọc, không thao tác làm thay đổi tiến độ thật).
> Vòng 1 chỉ chụp phần đầu trang nên bỏ sót nhiều cấu trúc. Vòng 2 phát hiện 6 nhóm gap mới, nghiêm trọng hơn dự đoán ban đầu.

## Route đã duyệt đầy đủ
`sound-rules` · `radicals` · `pinyin` · `roadmap` · `roadmap/pinyin` · `roadmap/pinyin/session-1` (4 tab) · `review` · `my-vocab` · `my-grammar` · `progress` · `dictionary` · `reading` · `create-file` (+ `create-file/vocab`) · `leaderboard` · `feedback` · `shadowing`

---

## GAP-7 — /create-file: SAI MÔ HÌNH HOÀN TOÀN (nghiêm trọng nhất vòng 2)

**Gốc KHÔNG phải là form nhập liệu ngay.** `/create-file` là **catalog 9 mẫu in**, chia 3 nhóm, mỗi mẫu là một card có tiêu đề + mô tả 1-2 dòng:

| Nhóm | Mẫu | Mô tả |
|---|---|---|
| **Mẫu chữ Hán** | Luyện viết theo thứ tự nét | ô mẫu đánh số nét → từng bước thêm nét |
| | Ô chữ lớn | chữ mẫu ô lớn trái, pinyin + nét + nghĩa trên, hàng tô phải |
| **Mẫu từ vựng** | Luyện viết từ vựng | từ + pinyin + nghĩa + câu ví dụ, pinyin trên từng ô |
| | Bảng tự kiểm tra từ vựng | in sẵn từ — tự điền pinyin/nghĩa, viết lại chữ |
| | Nhìn pinyin viết chữ Hán | in pinyin trên cụm ô trống, mỗi từ một cụm |
| **Đoạn văn & giấy ô** | Chép đoạn văn | mỗi chữ một ô có pinyin phía trên, tô lên chữ mờ |
| | Bài văn dòng kẻ có pinyin | chữ chạy trên dòng kẻ như vở, lùi đầu đoạn |
| | Giấy ô trống | chọn loại ô, số ô/hàng, màu, số trang |
| | Bìa vở luyện chữ | tiêu đề chữ lớn trong ô có pinyin, ô điền lớp + họ tên |

Trên catalog có **banner "Cần mã tải file để in"** + link "Tham gia nhóm để lấy mã".

Bấm vào 1 mẫu → route riêng (vd `/create-file/vocab`), form có **7 nhóm tuỳ chọn** (clone chỉ có ~2):

1. **Từ vựng cần luyện** — 4 từ mẫu (学习 xué xí / 朋友 péng yǒu / 老师 lǎo shī / 工作 gōng zuò), mỗi từ có 3 dòng (chữ / pinyin / Hán Việt IN HOA) + **input sửa nghĩa** + nút xoá từng từ. 3 nút trên: "Hướng dẫn nhập từ vựng" / "Nhập vào danh sách" / **"Format bằng AI"**. Dòng đếm "4 từ sẽ có trong bản in" + "Xóa tất cả".
2. **Trang** — input Tiêu đề, checkbox "Tiêu đề + Họ tên/Ngày".
3. **Loại ô** (radio, chọn 1) — Điền tự (mặc định) / Mễ tự / Ô vuông / Hồi cung / Cửu cung.
4. **Màu ô** (radio) — green / red / blue / **gray (mặc định)**.
5. **Bố cục** — stepper Số ô mỗi hàng (12) · Số hàng tô (1) · Số hàng trống (0) · **slider Số từ mờ 3/12**.
6. **Chữ** — checkbox Khải thư (mặc định) / Hành thư; **radio nguồn nét: 笔顺 CNstrokeorder 永远 (mặc định) / 清风体 永远**; **Kiểu chữ tô** (4 checkbox: Tô mờ ✓, Chữ rỗng, Rỗng nét đứt, Nét đứt mảnh); **slider Độ đậm 30%**; **slider Cỡ chữ 78%**.
7. **Hiển thị** — checkbox Pinyin ✓ · checkbox Nghĩa ✓.
8. Nút "Khôi phục mặc định" + ghi chú "Bấm In rồi chọn Lưu dưới dạng PDF".
9. Header: link "Thư viện mẫu" (quay lại catalog) · badge "1 trang" · nút "🖨 In / Lưu PDF" · sidebar "Mẫu in cùng loại — Đổi mẫu không mất nội dung" (3 link).

**Clone hiện tại**: `create-file.html` là form đơn, không có catalog, không có 5 loại ô/4 màu ô/2 nguồn nét/2 slider/3 nút AI.

→ **SPEC-16**

---

## GAP-8 — /review KHÔNG phải trang ôn tập, mà là "Thống kê học tập" (SRS dashboard)

Clone đang xây `/review` như một trang chơi ôn tập. Gốc thực tế:

- H1 **"Thống kê học tập"** (title tag "Ôn tập ngắt quãng"), sub "Theo dõi tiến độ và kế hoạch ôn tập của bạn — ôn đủ chu kỳ 2…".
- **2 tab: `Từ vựng` | `Ngữ pháp`** (đổi tab chỉ đổi nhãn nhóm rỗng + text/link rỗng, bố cục giữ nguyên).
- **6 ô đếm** (mỗi ô: số lớn + nhãn dưới): Cần ôn · Mới thêm · Đang học · Mới thuộc (< 21 ngày) · Đã thuộc (dài hạn) · Tổng đã học qua.
- Section **"Bộ thẻ đang trống"** — "Bấm nút ⭐ cạnh mỗi từ trong bài học để thêm từ vào bộ thẻ ôn." + link "Vào kệ sách" (bản Ngữ pháp: "Bấm nút ⭐ trên mẫu ngữ pháp…" + link "Vào mục ngữ pháp").
- Section **"Chi tiết ôn tập"**:
  - 5 ô: Streak (0 ngày) · Hôm nay (0 lượt) · Tuần này (0 lượt) · TB/ngày (0 lượt) · TB/thẻ (0 giây).
  - **"7 ngày gần nhất"** — mini bar chart nhãn T3 T4 T5 T6 T7 CN T2.
  - **"Phân bổ đánh giá (N lượt)"** — biểu đồ tròn 4 mức: Quên rồi / Khó / Tốt / Dễ, mỗi mức "N (X%)".
  - Chân bảng "Tổng: 0 lượt · Tháng này: 0 lượt".

→ **SPEC-17**

---

## GAP-9 — /my-grammar và /my-vocab là HAI SỔ TAY song song (không phải trang "của tôi")

Cùng một khuôn trang, chỉ khác 3 từ:

| | /my-vocab | /my-grammar |
|---|---|---|
| H1 | Sổ tay từ vựng | Sổ tay ngữ pháp |
| sub | "Tự tạo bộ từ vựng để học chủ động — nhập từ tài liệu của bạn…" | "Tự ghi chú các mẫu ngữ pháp quan trọng — sắp xếp theo chủ đề…" |
| nút | **Tạo bộ mới** | **Tạo sổ tay mới** |
| empty | "Chưa có bộ từ vựng nào / Tạo bộ đầu tiên để nhập từ vựng từ tài liệu của bạn." | "Chưa có sổ tay ngữ pháp nào / Tạo sổ tay đầu tiên để ghi chú các mẫu ngữ pháp của bạn." |

Modal "Tạo sổ tay ngữ pháp mới" chỉ có **1 textfield + Huỷ / Tạo (disabled khi rỗng) + ✕**.

Clone `my-grammar.html` đang là trang "My Grammar" khác hẳn bản chất. Cần dựng lại theo khuôn trên.

→ **SPEC-18**

---

## GAP-10 — Route /shadowing: THƯ VIỆN VIDEO nhóm theo playlist (clone chỉ có 1 trang video đơn)

Gốc `/shadowing` = "**Shadowing & Chép chính tả**" — trang index, mỗi **playlist** là 1 section `h2 "<Tên> (<N> bài học)"` + sub mô tả + link "XEM TẤT CẢ", bên dưới là lưới **card video**: thumbnail 16:9 có overlay badge đếm (397 / 75 / 29 / 11) + badge "HSK3" + badge "YouTube" + thời lượng, tiêu đề (bilingual) + tên playlist + loại "Shadowing".

2 playlist đã thấy: **DaihuaXiyou 呆話西遊 (84 bài học)**, **我的爸爸是條龍 (111 bài học)**. Card cũng gắn **h3 = tiêu đề video** ở dưới (mô tả dài 2 dòng) — cấu trúc anchor 3 tầng.

Clone có `shadowing.html` + `shadowing-video.html` nhưng thiếu hẳn trang index thư viện.

→ **SPEC-19**

---

## GAP-11 — /radicals: modal tự động phát thẻ + 7 quy tắc viết nét (clone chỉ có deck)

1. Nút ⚙ (cài đặt deck) mở modal **"Tự động phát thẻ"**:
   - select "Thời gian lật thẻ" (3 giây)
   - select "Thời gian sang thẻ mới" (2 giây)
   - toggle "Nghe từ vựng"
   - select "Số lần nghe lại" (1 lần)
   - nút **Huỷ / Bắt đầu**
2. Cuối trang, dưới deck, là section **"Quy tắc thứ tự nét"** gồm **7 quy tắc** (1. Trước–sau 2. Trên–dưới 3. Trái–phải 4. Ngoài–trong 5. Chạm–cắt 6. Đóng trước–mở sau 7. Viết nét cuối), mỗi quy tắc có **hoạt ảnh GIF minh hoạ** (父/月/固/小/区/夫/女).
3. Cuối cùng là ô lưu ý: **3 nét cuối (辶 廴 ㄑ…) luôn viết sau cùng** + hàng chữ mẫu 3 nét đó.

Mặt sau thẻ bộ thủ có: ô chữ lớn + **trình phát nét thật (hanzipen/make me a hanzi)** + pinyin + Hán Việt + nghĩa — mỗi Hán trong nghĩa là link mở `/hanzi/<char>`.

→ **SPEC-20**

---

## GAP-12 — /roadmap/pinyin/session-N: trình chạy buổi học 4 tab + khoá tuần tự

- `/roadmap/pinyin` = timeline **zigzag 8 buổi** dọc trang, xen kẽ trái/phải, mỗi buổi là một node tròn + card; cuối cùng marker "🚩 8 buổi · Hoàn thành chặng".
- Buổi chưa mở khoá hiện 🔒 + **tooltip**: "Buổi chưa mở khoá 🔒 — Hoàn thành Bài kiểm tra của Buổi 1 để mở Buổi 3".
- Bấm buổi 1 → trang riêng với **4 tab**: `Học ✓` · `Flashcard` · `Trắc nghiệm` · `Bài kiểm tra`.
  - Tab Học: phần lý thuyết về 4 thanh ngang (ā á ǎ à) + bảng mẫu tự + ví dụ.
  - Tab Trắc nghiệm: 2 câu hỏi kèm 4 đáp án.
  - Tab Bài kiểm tra: 2 câu hỏi, 1 trắc nghiệm 1 tự luận.
- Mỗi buổi có mô tả riêng (buổi 1 "4 thanh cơ bản", buổi 2 "Thanh biến đổi"…).

Clone có `roadmap-pinyin.html` nhưng chưa có trang buổi học với 4 tab + cơ chế khoá.

→ **SPEC-21**

---

## Tóm tắt gap vòng 2 và spec tương ứng

| Gap | Trang | Mức độ | Spec |
|---|---|---|---|
| GAP-7 | /create-file (catalog + form 7 nhóm tuỳ chọn) | 🔴 SAI MÔ HÌNH | SPEC-16 |
| GAP-8 | /review → "Thống kê học tập" | 🔴 SAI MÔ HÌNH | SPEC-17 |
| GAP-9 | /my-grammar + /my-vocab (2 sổ tay) | 🔴 SAI MÔ HÌNH | SPEC-18 |
| GAP-10 | /shadowing (thư viện playlist) | 🟠 THIẾU TRANG | SPEC-19 |
| GAP-11 | /radicals (autoplay modal + 7 quy tắc nét) | 🟠 THIẾU TÍNH NĂNG | SPEC-20 |
| GAP-12 | /roadmap/pinyin/session-N (4 tab + khoá) | 🟠 THIẾU TÍNH NĂNG | SPEC-21 |

## Gap vòng 1 vẫn còn hiệu lực (chưa implement)
GAP-1 shell sidebar → SPEC-10 · GAP-2 progress → SPEC-11 · GAP-3 my-vocab decks → SPEC-12 · GAP-4 create-file v2 → SPEC-13 · GAP-5 lesson polish → SPEC-14 · GAP-6 misc → SPEC-15

> Lưu ý: **SPEC-13 (create-file v2) bị SPEC-16 thay thế** — cấu trúc form đúng là catalog + form 7 nhóm, không phải form 2 nhóm như SPEC-13 giả định.
