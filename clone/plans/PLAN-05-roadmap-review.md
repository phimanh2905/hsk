# Roadmap + Review + Login-gated (SPEC-05) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** roadmap.html, roadmap-pinyin.html (stepper 6 bước), review.html (SRS stats từ localStorage), my-vocab/my-grammar/progress (gated).

**Architecture:** static content + localStorage (`nhai.srs`, `nhai.mockLogin`); stepper bằng query `?step=`.

**Tech Stack:** Tailwind v4 CDN, vanilla JS.

**Spec:** `clone/specs/SPEC-05-roadmap-review-gated.md`

## Global Constraints
- Copy đúng spec (mô tả 5 chặng, 6 chỉ số SRS, chu kỳ 21 ngày).
- `?step=` ngoài 1-6 → fallback 1; tab ngoài danh sách → fallback.

## Review Focus
- localStorage tr corrupted (JSON hỏng) → phải try/catch về mặc định 0.
- Review phải cập nhật số khi bấm ⭐ ở lesson.html rồi quay lại (đọc lúc render, không hardcode).

---

### Task 1: `roadmap.html` + `js/roadmap.js`
**Files:** Create `clone/roadmap.html`, `clone/js/roadmap.js`
- [ ] Step 1: Timeline 6 chặng + "Hành trình của bạn 🚩" + Tổng ôn card + đích đến (copy SPEC-05).
- [ ] Step 2: Verify: mỗi chặng link đúng course.html?book=…; chặng HSK 1 hiện "Chưa bắt đầu".

### Task 2: `roadmap-pinyin.html` + `js/data/roadmapPinyin.js` + `js/roadmap-pinyin.js`
**Files:** Create 3 file
- [ ] Step 1: Data 6 bước (thanh mẫu 23, vận mẫu đơn 6, ghép, 4 thanh điệu mā má mǎ mà, quy tắc i/u/ü + dấu, tổng ôn) theo SPEC-05.
- [ ] Step 2: Stepper + render từng bước + prev/next + 🔊 cho mỗi âm.
- [ ] Step 3: Verify: ?step=5 hiện quy tắc đọc; nút bước 6 link practice/pinyin.

### Task 3: `review.html` + `js/review.js`
**Files:** Create 2 file
- [ ] Step 1: 2 tab + 6 ô thống kê đọc `localStorage.nhai.srs` (try/catch) + trạng thái rỗng + list thẻ khi có (Đã thuộc/Chưa thuộc cập nhật storage).
- [ ] Step 2: Verify: bấm ⭐ ở lesson.html (thêm tay vào localStorage) → review hiện "Mới thêm" tăng.

### Task 4: my-vocab, my-grammar, progress
**Files:** Create `clone/my-vocab.html`, `clone/js/my-pages.js`, `clone/my-grammar.html`, `clone/progress.html`
- [ ] Step 1: Pattern khoá 🔒 + nút Đăng nhập (gọi NHAI.openLogin()); progress có 3 card tiến độ giả khi mockLogin + nút "Đăng xuất (demo)".
- [ ] Step 2: Verify 3 trang + modal; `git commit -m "feat: roadmap, review, gated pages"`.
