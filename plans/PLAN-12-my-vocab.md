# My-vocab Decks (SPEC-12) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** my-vocab + my-grammar = tạo/deck quản lý deck riêng, học bằng engine flashcard sẵn có.

**Architecture:** Decks lưu `localStorage.nhai.decks` / `nhai.grammarDecks` (id, name, rows[{hanzi,pinyin,meaning}]). lesson.js đọc `?custom=<deckId>` map về schema words.

**Tech Stack:** Tailwind v4, vanilla JS, localStorage.

**Spec:** `clone/specs/SPEC-12-my-vocab-decks.md`

## Global Constraints
- Ownership: my-vocab.html, my-grammar.html, js/my-pages.js, js/data/* không đụng; lesson.js chỉ THÊM nhánh custom deck (1 hàm nhỏ, không phá hiện có).
- Parser dòng: `hanzi pinyin meaning` (tách 2 cột đầu bằng whitespace, phần còn lại = meaning).

## Review Focus
- Deck trống/không dòng hợp lệ → toast, không tạo.
- lesson custom: quiz/typing vẫn chạy với example rỗng (ẩn Đọc hiểu/Nghe ghép câu nếu thiếu example).

---

### Task 1: my-vocab deck list + modal tạo
**Files:** Modify `clone/my-vocab.html`, `clone/js/my-pages.js`
- [ ] Step 1: mock-login view: header + nút "+ Tạo bộ mới" (2 chỗ: top-right + empty state card 📒 "Chưa có bộ từ vựng nào").
- [ ] Step 2: Modal: input tên + textarea rows (placeholder định dạng) + parser + preview "Đã nhập N từ hợp lệ" + Lưu → localStorage; render grid deck cards (tên, N từ, Học/Sửa/Xoá).
- [ ] Step 3: Sửa = mở lại modal prefill; Xoá = confirm; Verify reload giữ deck.

### Task 2: Học deck qua lesson.html
**Files:** Modify `clone/js/lesson.js`
- [ ] Step 1: loadData: nếu `?custom=` → đọc deck từ localStorage, map `{hanzi, pinyin, meaning, pos:"—", example:null}`; title = tên deck.
- [ ] Step 2: renderWordList/quiz/typing bỏ qua example null (ẩn Đọc hiểu + Nghe ghép câu khỏi sidebar khi không có example nào).
- [ ] Step 3: Verify: tạo deck → Học → flashcard 5 từ chạy; `git commit -m "feat(my-vocab): custom decks"`.

### Task 3: my-grammar đối xứng
**Files:** Modify `clone/my-grammar.html`
- [ ] Step 1: cùng pattern (rows: `mẫu câu — nghĩa`); Học → lesson custom type "grammar".
- [ ] Step 2: Verify + commit.
