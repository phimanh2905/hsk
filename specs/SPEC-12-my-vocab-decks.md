# SPEC-12: Sổ tay từ vựng v2 — tạo bộ deck riêng (fix GAP-3)

## Bối cảnh
/my-vocab gốc (logged-in) = tính năng **tạo bộ từ vựng từ tài liệu của bạn** với nút "+ Tạo bộ mới". Clone chỉ có màn khoá.

## Màn chính (mock-login)
1. Header: mascot 📒 + h1 "Sổ tay từ vựng" + sub "Từ tạo bộ từ vựng để học chủ động — nhập từ tài liệu của bạn." + nút chính **"+ Tạo bộ mới"** (góc phải).
2. **Empty state** (không có deck): card lớn icon 📒 vàng, h2 "Chưa có bộ từ vựng nào", sub "Tạo bộ đầu tiên để nhập từ vựng từ tài liệu của bạn.", nút "+ Tạo bộ mới".
3. **Modal "Tạo bộ mới"**: input "Tên bộ" (vd: "Từ vựng giáo trình 2"); textarea lớn "Dán danh sách từ — mỗi dòng một từ, định dạng: chữ Hán [tab/space] pinyin [tab/space] nghĩa" (vd dòng: `时间 shíjiān thời gian`); nút "Nhập từ" + "Huỷ". Parser: tách dòng → cột; dòng không hợp lệ bỏ qua, đếm "Đã nhập N từ hợp lệ".
4. **Danh sách deck** (khi có): grid card mỗi deck: tên + số từ + 3 nút: "Học" (→ lesson.html?custom=<deckId> — dùng engine flashcard sẵn có với data từ deck), "Sửa" (mở modal thêm dòng), "Xoá" (confirm → xoá). Lưu localStorage `nhai.decks`.
5. **Học deck tùy chỉnh**: lesson.js đọc `?custom=<deckId>` → nạp words từ deck (map về schema {hanzi, pinyin, meaning, pos:"—", example rỗng}), ẩn nút "Thêm cả bài vào ôn tập" nếu không có ví dụ; các chế độ hoạt động bình thường (quiz/typing dùng meaning+pinyin).

## my-grammar (đối xứng)
- Cùng pattern: "Sổ tay ngữ pháp" + "Tạo bộ mới" + nhập "mẫu câu [tab] nghĩa" — deck học bằng flashcard đơn giản. Lưu `nhai.grammarDecks`.

## Tiêu chí nghiệm thu
- Tạo deck 5 từ → hiện card deck → "Học" mở flashcard với đúng 5 từ → Đấu trí/quiz dùng được.
- Reload giữ deck (localStorage); xoá deck hoạt động; deck rỗng/không dòng hợp lệ → toast lỗi.
