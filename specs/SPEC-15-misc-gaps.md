# SPEC-15: Misc gaps — review chi tiết, grammar card, badge pinyin, 404 mascot

## 1. Review "Chi tiết ôn tập"
- /review thêm section "Chi tiết ôn tập" (h2) dưới empty/list: grid 4 card skeleton-style khi trống (khung viền + thanh xám — như screenshot gốc); khi có thẻ: bảng hàng thẻ (chữ | pinyin | nghĩa | hạn ôn | nút Đã thuộc/Chưa thuộc).

## 2. Màu số stat
- /review + /progress: "Cần ôn" số màu đỏ; "Đã thuộc (dài hạn)" số màu xanh lá; còn lại màu ink.

## 3. Grammar card layout (course.html tab Ngữ pháp)
- Danh sách bài ngữ pháp render dạng **grid 2 cột card**: mỗi card: tiêu đề bài + 2 dòng nội dung placeholder + nút TTS vuông bên phải; vẫn khoá 🔒 khi chưa mock-login (giữ hành vi, chỉ đổi bố cục).

## 4. Badge "học kỹ" trên sidebar/nav pinyin
- Item pinyin (shell sidebar + drawer) có badge nhỏ "học kỹ ×99" (viền đỏ, text-[9px]) — hardcode.

## 5. Trang 404 chuẩn
- Tạo `404.html`: card giữa: mascot 🍅 Thinking (emoji 🤔 trong khung) + h1 "404" + "Trang bạn tìm không tồn tại hoặc đã bị chuyển." + nút "Về trang chủ" → index.html. Áp cho mọi route không hợp lệ (các page.js fallback hiện redirect — chuyển sang hiển thị nội dung 404 inline nếu dễ, tối thiểu có file 404.html).

## 6. AI mascot góc phải
- Floating "Hỏi AI": thay emoji 🤖 đơn bằng cụm 2 mascot (🤖 + 🍅) nhỏ kẹp nhau (2 span absolute) — visual giống gốc; không đổi logic.

## Tiêu chí nghiệm thu
- review có "Chi tiết ôn tập"; stat màu đúng; course tab ngữ pháp 2 cột; badge ×99 hiện ở item pinyin; 404.html mở được; mascot kép góc phải.
