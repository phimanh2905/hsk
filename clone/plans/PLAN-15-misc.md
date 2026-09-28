# Misc Gaps (SPEC-15) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** 6 chỉnh nhỏ: review chi tiết, màu stat, grammar grid, badge pinyin, 404 mascot, mascot kép AI.

**Architecture:** Chỉnh từng file theo ownership; không đổi logic chính.

**Tech Stack:** Tailwind v4, vanilla JS.

**Spec:** `clone/specs/SPEC-15-misc-gaps.md`

## Global Constraints
- Mỗi task verify bằng server + AX/text check; commit cuối.

## Review Focus
- 404.html phải link về index; skeleton card review phải có nội dung khi có thẻ.

---

### Task 1: Review chi tiết + màu stat
**Files:** Modify `clone/review.html`, `clone/js/review.js`
- [ ] Step 1: Thêm section "Chi tiết ôn tập": trống → 4 card skeleton (viền + 3 thanh xám); có thẻ → bảng hàng thẻ.
- [ ] Step 2: Màu số: Cần ôn đỏ (#c03922), Đã thuộc dài hạn xanh lá (#2e7d32).
- [ ] Step 3: Verify.

### Task 2: Grammar grid 2 cột + badge pinyin
**Files:** Modify `clone/js/course.js`, `clone/js/shell.js`
- [ ] Step 1: course.js skill=grammar: grid 2 cột card (title + 2 dòng placeholder + nút TTS phải), giữ 🔒.
- [ ] Step 2: shell.js: item pinyin badge "học kỹ ×99" (text-[9px] viền đỏ, absolute -top-1 -right-2); drawer cũng có.
- [ ] Step 3: Verify.

### Task 3: 404 mascot + AI mascot kép
**Files:** Create `clone/404.html`, Modify `clone/js/shell.js`
- [ ] Step 1: 404.html: shell + card giữa mascot 🤔 64px + h1 "404" + copy + nút "Về trang chủ".
- [ ] Step 2: Floating AI button: 2 span emoji chồng (🤖 + 🍅 nhỏ góc dưới-phải, rotate nhẹ).
- [ ] Step 3: Verify + `git commit -m "feat: misc gaps per original comparison"`.
