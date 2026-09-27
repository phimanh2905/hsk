# Lesson Polish (SPEC-14) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** lesson.html visual khớp screenshot gốc: watermark Việt Nam, mascot, hàng controls, nút nav đỏ/xanh ngoài card.

**Architecture:** Chỉ sửa lesson.html markup + lesson-flashcard.js CSS class; không đổi state machine.

**Tech Stack:** Tailwind v4, inline SVG map, vanilla JS.

**Spec:** `clone/specs/SPEC-14-lesson-polish.md`

## Global Constraints
- Ownership: lesson.html, js/lesson-flashcard.js, assets/vietnam-map.svg.
- Giữ nguyên phím tắt, counter, mode switching.

## Review Focus
- Watermark không chặn click (pointer-events:none) và không đè chữ.
- Nút nav mới vẫn phát sự kiện same handlers (known/unknown/prev/next).

---

### Task 1: Watermark + mascot + header
**Files:** Create `clone/assets/vietnam-map.svg`, Modify `clone/lesson.html`
- [ ] Step 1: vietnam-map.svg: outline SVG đơn giản nước Việt Nam (path S-curve) màu #c03922.
- [ ] Step 2: card flashcard + main: thêm `<img src="assets/vietnam-map.svg" class="absolute opacity-[0.08] pointer-events-none">` layer; header: mascot 🍅 44px + h1 highlight vàng `bg-[#f5d76e]/50 rounded px-2`; badge "Bài 1" nền đen chữ trắng.
- [ ] Step 3: Verify không che nội dung.

### Task 2: Hàng controls + nút nav ngoài card
**Files:** Modify `clone/lesson.html`, `clone/js/lesson-flashcard.js`
- [ ] Step 1: Hàng 1: tabs trái — counter giữa — controls phải (flex justify-between, responsive wrap).
- [ ] Step 2: Nav row dưới card: Trước (ghost) / Chưa thuộc (btn đỏ #c03922) / Đã thuộc (btn xanh #2e7d32) / Sau (ghost) — rebind handlers cũ từ các nút trong card.
- [ ] Step 3: Mặt sau thẻ nền #f7e9c8; Verify phím tắt + flip; `git commit -m "feat(lesson): polish per original site"`.
