# Create File (SPEC-08) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** create-file.html hub 9+1 template với preview A4 render động + gate mã FREEHSK + window.print().

**Architecture:** Một trang; `?tpl=` chọn template; preview = HTML grid render từ form config + data; `@media print` ẩn UI chỉ in preview.

**Tech Stack:** Tailwind v4 CDN, vanilla JS, CSS grid, @media print.

**Spec:** `clone/specs/SPEC-08-create-file.md`

## Global Constraints
- Preview A4 tỉ lệ chuẩn (max-w-[794px], padding như giấy), header "Họ tên:/Ngày:" + footer "nhaihsk.com · facebook.com/groups/nhaihsk" trên mọi template.
- Chữ mờ để tô = opacity-25; ô vuông dùng aspect-square.
- Dữ liệu mặc định: stroke-order/big-char: 永 远 学 习 汉 字; vocab dùng Bài 1 HSK1 (import NHAI_DATA.vocab).

## Review Focus
- Form đổi (số hàng/checkbox) → preview cập nhật ngay không reload.
- window.print() chỉ in preview (form/toolbar bị ẩn) — kiểm tra bằng preview CSS print.
- ?tpl không hợp lệ → hub; badge trang cập nhật khi đổi số hàng.

---

### Task 1: `create-file.html` + `js/create-file.js` + `js/data/templates.js`
**Files:** Create 3 file
- [ ] Step 1: Hub: callout gate (input mã + "Mở khóa in", mã FREEHSK → localStorage `nhai.fileCode=1`), 3 section 9 card preview mini đúng mô tả SPEC-08.
- [ ] Step 2: Template view: breadcrumb, form cấu hình (input chữ/từ, số hàng 3-6, 2 checkbox, badge "N trang"), renderer từng template: stroke-order, big-char, vocab, vocab-check, copy, pinyin-lines, pinyin-write, blank-grid, cover, radicals (data từ radicals.js).
- [ ] Step 3: In: `window.print()` + @media print; gate: chưa có mã/mockLogin → nút In đổi "Đăng nhập để in" mở login modal.
- [ ] Step 4: Verify: mỗi ?tpl render đúng; đổi form realtime; sai mã toast; `git commit -m "feat(create-file): 10 templates + gate"`.
