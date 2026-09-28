# Hanzi (SPEC-03) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** hanzi.html hai màn (tra/vẽ + khám phá theo cấp độ) và màn chi tiết chữ ?char=, đúng SPEC-03.

**Architecture:** Một trang 2 màn theo `?char=`; canvas vẽ pointer events; animation nét bằng SVG stroke-dashoffset từ data nét.

**Tech Stack:** Tailwind v4 CDN, vanilla JS, Canvas 2D, SVG.

**Spec:** `clone/specs/SPEC-03-hanzi.md`

## Global Constraints
- Chữ 你 có data ĐẦY ĐỦ đúng SPEC-03 (7 nét, thực chiến list 12 từ).
- Không tải font/data ngoài trừ Google Fonts Noto Sans SC (được phép).
- KHÔNG sửa file ngoài phạm vi (xem README ownership).

## Review Focus
- `?char=` được encodeURIComponent (你 → %E4%BD%A0) — khi đọc phải decodeURIComponent.
- Canvas vẽ phải hoạt động cả chuột lẫn touch.
- Animation nét dùng requestAnimationFrame, có nút replay.

---

### Task 1: Dữ liệu `js/data/hanzi.js`
**Files:** Create `clone/js/data/hanzi.js`
- [ ] Step 1: 你 đầy đủ theo SPEC-03 + ~24 chữ bài 1 + ~10 chữ thành phần (亻尔亠口木人口心日 moon) bản rút gọn + levels (HSK1: 247 chữ mới…).
- [ ] Step 2: Verify console: `NHAI_DATA.hanzi.chars["你"].strokes === 7`.

### Task 2: Canvas vẽ + search
**Files:** Create `clone/hanzi.html`, `clone/js/hanzi.js`, `clone/js/draw-pad.js`
- [ ] Step 1: draw-pad.js: component canvas grid mờ + pointer events + undo/clear + disable state nút + gợi ý giả 3 chữ khi có nét.
- [ ] Step 2: Màn 1: search autocomplete (lọc chữ/pinyin không dấu — dùng NHAI.stripTones), card vẽ, pills cấp độ + grid chữ (HSK1 = list chars có level HSK1), link 214 Bộ thủ → radicals.html; 3 nút Flashcard/Luyện viết/Tạo file (toast demo).

### Task 3: Màn chi tiết chữ + animation nét
**Files:** Modify `clone/js/hanzi.js`, Create `clone/js/hanzi-writer.js`
- [ ] Step 1: hanzi-writer.js: overlay SVG lên ô chữ lớn; data nét hardcode cho 你 (7 polyline đúng thứ tự) + generic 4 nét cho chữ khác; "Xem lại thứ tự nét" chạy tuần tự (dashoffset), "Hiển thị hạt mũi tên" toggle marker, "Thu phóng vừa khít" scale.
- [ ] Step 2: Layout chi tiết theo SPEC-03 (âm HV alt, nghĩa, pinyin, cấp độ, số nét, bộ thủ link, cấu tạo link, loại chữ, sidebar 2 list, Chữ sau).
- [ ] Step 3: Verify: mọi link ?char hoạt động, animation chạy, console sạch; `git commit -m "feat(hanzi): analysis + detail pages"`.
