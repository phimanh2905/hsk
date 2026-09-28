# Create-file v2 (SPEC-13) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** create-file template view = picker chữ + SVG nét thật + sửa pinyin/nghĩa + đổi mẫu giữ nội dung + In/Lưu PDF.

**Architecture:** State `CF = {chars:[{hanzi,pinyin,meaning}], tpl}` giữ trong session; renderer v2; stroke SVG từ `NHAI_DATA.hanzi.strokes` (bổ sung data nét cho 214 bộ 1-6 nét).

**Tech Stack:** Tailwind v4, vanilla JS, SVG stroke-dashoffset.

**Spec:** `clone/specs/SPEC-13-create-file-v2.md`

## Global Constraints
- Ownership: create-file.html, js/create-file.js, js/data/templates.js, js/data/hanzi.js (thêm strokes); KHÔNG đụng shell.
- Gate FREEHSK/mockLogin giữ nguyên.

## Review Focus
- Sửa pinyin/nghĩa → preview cập nhật ngay (input event).
- Stroke SVG: chữ không có data → generic, không throw.
- Đổi tpl giữ chars (sessionStorage).

---

### Task 1: State + panel "Chữ Hán cần luyện"
**Files:** Modify `clone/js/create-file.js`, `clone/js/data/hanzi.js`
- [ ] Step 1: hanzi.js thêm `NHAI_DATA.hanzi.strokes = {"你":[[polyline…7 nét]], "一":[…], "二":[…], "人":[…], "口":[…], "日":[…], "木":[…], "永":[…]}` — mỗi nét = mảng điểm [x,y] trong viewBox 0-100.
- [ ] Step 2: create-file.js: CF state + panel: chips danh sách chọn (✕ xoá), hàng chip 214 bộ (bấm thêm), popover "Chọn chữ theo cấp HSK", "Xoá tất cả", modal bảng sửa pinyin/nghĩa (input event → CF → re-render).
- [ ] Step 3: Verify: thêm/xoá/sửa realtime.

### Task 2: Preview stroke-order v2 + big-char meta
**Files:** Modify `clone/js/create-file.js`
- [ ] Step 1: renderStrokeSVG(hanzi, mode) — mode: full (đen) | upto(k) (nét 0..k-1 đen, nét k đỏ) | faint.
- [ ] Step 2: stroke-order khối: meta dòng (HV IN HOA + pinyin + nghĩa từ CF) + ô SVG full + 4 ô upto tăng dần + 2 hàng faint; big-char thêm meta + SVG.
- [ ] Step 3: Verify từng chữ có data + fallback.

### Task 3: "Mẫu in cùng loại" + In
**Files:** Modify `clone/js/create-file.js`, `clone/create-file.html`
- [ ] Step 1: Card phải: 2 thumbnail (stroke-order/big-char) — bấm đổi `?tpl=` giữ CF (sessionStorage `nhai.cf.state` khôi phục).
- [ ] Step 2: Nút "🖨 In / Lưu PDF" (giữ gate) — window.print.
- [ ] Step 3: Verify đổi mẫu giữ nội dung + in; `git commit -m "feat(create-file): v2 picker + svg strokes + template switch"`.
