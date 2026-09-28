# Hai sổ tay vocab/grammar (SPEC-18) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** `my-vocab.html` và `my-grammar.html` dùng chung 1 template sổ tay, copy đúng từng trang; modal tạo 1 ô; persist localStorage.

**Architecture:** `NHAI_DATA.notebooks[kind]` = `{h1, sub, cta, empty, emptySub, modalTitle, samples:[…]}`. `js/notebook.js` đọc `?kind=` (mặc định lấy từ `document.body.dataset.kind`). Store: `nhai.decks` (vocab) / `nhai.notebooks` (grammar).

**Tech Stack:** Tailwind v4, vanilla JS (defer).

**Spec:** `clone/specs/SPEC-18-notebooks.md`

## Global Constraints
- Ownership: `my-vocab.html`, `my-grammar.html`, `notebook.html`, `js/notebook.js`, `js/data/notebooks.js`.
- KHÔNG sửa `js/shell.js`.
- Hai trang HTML chỉ khác nhau 1 dòng `<body data-kind="vocab|grammar">` + title.

## Review Focus
- Copy từng trang đúng 100% với SPEC-18.
- Nút "Tạo" disabled khi textfield rỗng, bật khi có ký tự.
- Item mới xuất hiện đầu list và còn sau reload.

---

### Task 1: Data + template dùng chung
**Files:** `clone/js/data/notebooks.js`, `clone/my-vocab.html`, `clone/my-grammar.html`
- [ ] Step 1: data 2 kind với đúng chuỗi copy ở SPEC-18 + `samples` (vocab 3 mẫu, grammar 2 mẫu).
- [ ] Step 2: `my-vocab.html` / `my-grammar.html` → cùng skeleton: `<body data-kind="…">`, `<title>`, `<main id="nb-root">`, script `defer` theo thứ tự `shell.js`, `data/notebooks.js`, `notebook.js`.
- [ ] Step 3: Verify: 2 trang render đúng H1/sub/cta/empty tương ứng.

### Task 2: Modal tạo
**Files:** `clone/js/notebook.js`
- [ ] Step 1: `openCreate()` dựng overlay + card: `h3` = `modalTitle`, 1 textfield autofocus, nút "Huỷ" + "Tạo" (disabled khi rỗng) + ✕.
- [ ] Step 2: `input` → cập nhật disabled; Enter → submit; submit → prepend store, persist, re-render, toast "Đã tạo <tên>".
- [ ] Step 3: Verify: submit rỗng không làm gì; tạo xong item hiện đầu list.

### Task 3: Danh sách có dữ liệu + trang chi tiết
**Files:** `clone/js/notebook.js`, `clone/notebook.html`
- [ ] Step 1: `renderList()` — nếu có item: grid card (tên, số mục, ngày sửa, menu ⋯ → Sửa tên / Xoá / Mở); ghép `store` trước `samples`.
- [ ] Step 2: `notebook.html?kind=&id=` — header giống, phần dưới là bảng từ (chữ / pinyin / Hán Việt / nghĩa) lấy từ `samples[id]` hoặc 12 dòng mẫu, + nút "＋ Thêm từ" (toast mock).
- [ ] Step 3: Verify: card → trang chi tiết; state persist; `git commit -m "feat(notebooks): sổ tay từ vựng + ngữ pháp dùng chung template"`.
