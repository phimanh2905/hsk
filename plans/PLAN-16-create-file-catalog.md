# Create-file catalog + form 7 nhóm (SPEC-16) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** `/create-file` = catalog 9 mẫu in; mỗi mẫu → form 2 cột (preview + 7 nhóm tuỳ chọn) với state persist.

**Architecture:** `NHAI_DATA.templates[]` (9 mẫu + nhóm). `CF` state object trong `sessionStorage['nhai.cf.state']`. `renderCatalog()` và `renderForm()` cùng nằm trong `js/create-file.js`, chọn theo `?view`/`?tpl`.

**Tech Stack:** Tailwind v4, vanilla JS (defer, không module), SVG inline cho ảnh minh hoạ.

**Spec:** `clone/specs/SPEC-16-create-file-catalog.md`

## Global Constraints
- Ownership: `create-file.html`, `js/create-file.js`, `js/data/templates.js`. KHÔNG sửa `js/shell.js`.
- Giữ nguyên gate FREEHSK / `NHAI.mockLogin` cho nút In.
- Giữ `@media print` trong `assets/theme.css` chỉ in cột trái.
- Script load bằng `defer`; init theo pattern `readyState==="complete" ? init() : addEventListener("DOMContentLoaded", init)`.

## Review Focus
- Mặc định mọi control khớp gốc (Điền tự, gray, 12, 1, 0, 3/12, Khải thư, CNstrokeorder, Tô mờ, 30%, 78%, Pinyin+Nghĩa).
- Đổi control → preview cập nhật ngay, không reload.
- Đổi `?tpl=` giữ state (sessionStorage).
- Preview không throw khi dữ liệu nét thiếu (fallback generic).

---

### Task 1: Data 9 mẫu + state
**Files:** `clone/js/data/templates.js`, `clone/js/create-file.js`
- [ ] Step 1: `NHAI_DATA.templates` = 9 phần tử `{id, name, group, desc, thumb:'<svg string>'}`. group ∈ `hanzi | vocab | paper`. `thumb` là SVG inline nhỏ (48×48 viewBox) vẽ tay: ô vuông/nét đỏ/dòng kẻ/ô pinyin/ô mờ.
- [ ] Step 2: `CF` state factory đọc/ghi `sessionStorage['nhai.cf.state']`, merge với default (mọi key đều có default).
- [ ] Step 3: Verify: reload vẫn giá trị cũ; xoá sessionStorage → về default.

### Task 2: Catalog view
**Files:** `clone/js/create-file.js`, `clone/create-file.html`
- [ ] Step 1: markup `#cf-root` rỗng + banner "Cần mã tải file để in…" + link "Tham gia nhóm để lấy mã" (`href="#"` + toast).
- [ ] Step 2: `renderCatalog()` — 3 section theo nhóm, mỗi section `h2` + grid card (thumb + `h3` + desc), card `<a href="create-file.html?tpl=<id>">`.
- [ ] Step 3: Verify: 9 card, 3 nhóm đúng tên, click điều hướng đúng `tpl`.

### Task 3: Form view — 7 nhóm tuỳ chọn
**Files:** `clone/js/create-file.js`
- [ ] Step 1: khung 2 cột (`grid lg:grid-cols-[1fr_360px]`): trái `#cf-preview`, phải `#cf-form`.
- [ ] Step 2: group 1 Từ vựng cần luyện — 3 nút (Hướng dẫn → modal hướng dẫn; Nhập vào danh sách → modal textarea; Format bằng AI → mock chuẩn hoá + toast) + danh sách 4 từ mẫu (chữ / pinyin / Hán Việt IN HOA / input nghĩa / nút xoá) + "N từ sẽ có trong bản in" + "Xóa tất cả".
- [ ] Step 3: group 2–7 (Trang, Loại ô, Màu ô, Bố cục, Chữ, Hiển thị) — dựng bằng `field()` helper: `stepper(label,key,min,max)`, `radioRow`, `checkRow`, `slider`, `textInput`. Mọi control gắn `data-key` → `on("input"|"change")` → `CF[k]=…; persist(); renderPreview()`.
- [ ] Step 4: chân form: nút "Khôi phục mặc định" (reset CF + re-render form + preview) + ghi chú "Bấm In rồi chọn 'Lưu dưới dạng PDF'…".
- [ ] Step 5: Verify: đổi từng control, preview đổi; restore mặc định đúng.

### Task 4: Preview bám tuỳ chọn
**Files:** `clone/js/create-file.js`
- [ ] Step 1: `cellShape(type)` trả class shape cho 5 loại ô (điền tự tròn nhẹ, mễ tươi, vuông, hồi cung, cửu cung) + `cellColorVar(color)` map gray/red/green/blue → CSS var.
- [ ] Step 2: `renderPreview()` — theo `tpl`: `stroke-order`/`big-char` giữ renderer SVG nét hiện có (SPEC-13) nhưng meta lấy từ `CF.chars`; các mẫu khác dựng lưới ô với `perRow` cột, `fillRows` hàng tô, `blankRows` hàng trống, `faintCount` chữ đầu tô mờ, `showPinyin`/`showMeaning`, `fontSize`/`opacity` áp vào style inline.
- [ ] Step 3: header form: link "‹ Thư viện mẫu", badge "N trang" tính từ số hàng, nút "🖨 In / Lưu PDF" (gate + `window.print()`).
- [ ] Step 4: card "Mẫu in cùng loại" — list các mẫu cùng `group`, click đổi `tpl` bằng `history.replaceState` (giữ state).
- [ ] Step 5: Verify theo tiêu chí nghiệm thu SPEC-16; `git commit -m "feat(create-file): catalog 9 mẫu + form 7 nhóm tuỳ chọn"`.
