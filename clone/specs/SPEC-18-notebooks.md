# SPEC-18: /my-vocab + /my-grammar = hai "Sổ tay" cùng khuôn

## Bối cảnh
Vòng 2: cả hai route đều là **trang sổ tay rỗng** cùng một khuôn, chỉ khác 3 từ. Clone `my-grammar.html` hiện là trang "My Grammar" khác bản chất. Chi tiết: `GAP-ANALYSIS-ROUND2.md` GAP-9.

## A. Khuôn dùng chung (`js/notebook.js` + `NHAI_DATA.notebooks`)
```
{ vocab:    { h1:"Sổ tay từ vựng", sub:"Tự tạo bộ từ vựng để học chủ động — nhập từ tài liệu của bạn…",
              cta:"Tạo bộ mới", empty:"Chưa có bộ từ vựng nào", emptySub:"Tạo bộ đầu tiên để nhập từ vựng từ tài liệu của bạn.",
              modalTitle:"Tạo bộ từ vựng mới", items: [ {name, count, n} ] },
  grammar:  { h1:"Sổ tay ngữ pháp", sub:"Tự ghi chú các mẫu ngữ pháp quan trọng — sắp xếp theo chủ đề…",
              cta:"Tạo sổ tay mới", empty:"Chưa có sổ tay ngữ pháp nào", emptySub:"Tạo sổ tay đầu tiên để ghi chú các mẫu ngữ pháp của bạn.",
              modalTitle:"Tạo sổ tay ngữ pháp mới", items: [ ... ] } }
```

## B. Trang list (cả 2 route dùng chung 1 template)
- Header: mascot 🍅 + H1 + sub; nút phải **cta** (nút chính bo tròn).
- Nếu chưa có mục nào: empty state căn giữa — icon sổ 📕 lớn, `h2` = empty, text = emptySub, nút cta thứ hai.
- Nếu có mục: lưới card — mỗi card tên + số mục + ngày sửa + menu ⋯ (Sửa tên / Xoá / Mở). Hardcode 3 mục mẫu cho `vocab` (Từ vực HSK 3.0 — 128 từ, Từ trong sách giáo khoa — 64 từ, Ngày thường giao tiếp — 45 từ) và 2 mục cho `grammar` (Mẫu câu gọi thoại — 12 mẫu, Ngữ pháp hay sai — 8 mẫu) để thấy bố cục có dữ liệu.
- Lưu `localStorage` key `nhai.decks` (vocab) / `nhai.notebooks` (grammar): mảng item đã tạo; danh sách mẫu luôn hiển thị sau các item đã tạo.

## C. Modal tạo
- Overlay tối giữa màn hình, card trắng bo tròn, `h3` = modalTitle, **1 textfield duy nhất** (placeholder "Nhập tên sổ tay / bộ từ vựng…"), nút phụ "Huỷ" + nút chính "Tạo" (**disabled khi rỗng**), nút ✕ góc trên phải.
- Enter trong textfield = Tạo. Tạo xong → prepend vào list, đóng modal, toast "Đã tạo <tên>".

## D. Trang chi tiết (không bắt buộc vòng này)
`notebook.html?kind=vocab&id=<id>` — khung giống trang list nhưng phần dưới là danh sách từ (chữ / pinyin / Hán Việt / nghĩa) + nút "＋ Thêm từ". Link từ card sang trang này.

## Tiêu chí nghiệm thu
- `/my-vocab` H1 "Sổ tay từ vựng", `/my-grammar` H1 "Sổ tay ngữ pháp" — đúng sub/cta/empty từng trang.
- Modal 1 ô, nút Tạo disabled khi rỗng, tạo được và item xuất hiện ngay, persist qua reload.
- Không còn nội dung "My Grammar" cũ trong `my-grammar.html`.
- Hai trang dùng chung 1 template, chỉ khác qua `NHAI_DATA.notebooks`.
