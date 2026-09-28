# Radicals autoplay + 7 quy tắc nét (SPEC-20) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** Nút ⚙ mở modal "Tự động phát thẻ" có autoplay thật; thêm section 7 quy tắc thứ tự nét + card lưu ý 3 nét cuối.

**Architecture:** `js/radicals.js` giữ state deck; thêm `openAutoplay()` + `startAutoplay(cfg)` với `setTimeout` lưu vào `R.timer`/`R.flipTimer`, huỷ khi điều hướng. Data 7 quy tắc trong `js/data/stroke-rules.js`.

**Tech Stack:** Tailwind v4, vanilla JS (defer), `speechSynthesis` qua `NHAI.speak`.

**Spec:** `clone/specs/SPEC-20-radicals-autoplay-strokes.md`

## Global Constraints
- Ownership: `radicals.html`, `js/radicals.js`, `js/data/stroke-rules.js`. KHÔNG sửa `js/shell.js`.
- Không timer nào sống sót khi rời trang: huỷ trong `beforeunload` và khi mở modal khác.
- Ô minh hoạ dùng chữ Hán font hệ thống, không ảnh ngoài.

## Review Focus
- Mặc định modal: 3 giây / 2 giây / tắt / 1 lần.
- Select "Số lần nghe lại" disabled khi toggle "Nghe từ vựng" tắt.
- Nhịp lật/chuyển thẻ đúng; ⏸ dừng thật.

---

### Task 1: Data 7 quy tắc + 3 nét cuối
**Files:** `clone/js/data/stroke-rules.js`
- [ ] Step 1: `NHAI_DATA.strokeRules = [{n, name, desc, chars:["爸"]}, …7 mục theo bảng SPEC-20]`.
- [ ] Step 2: `NHAI_DATA.lastStrokes = [{glyph:"辶", name:"đi"}, {glyph:"廴", name:"quy"}, {glyph:"ㄑ", name:"nét chéo phải"}]`.
- [ ] Step 3: Verify: đủ 7 + 3, ví dụ đúng 爸 月 们 国 区 夫 女.

### Task 2: Modal tự động phát thẻ + autoplay
**Files:** `clone/js/radicals.js`, `clone/radicals.html`
- [ ] Step 1: nút ⚙ → `openAutoplay()` dựng modal 4 control (select 3s, select 2s, toggle, select 1 lần) + Huỷ/Bắt đầu.
- [ ] Step 2: `startAutoplay(cfg)` — `flipTimer` lặn `cfg.flipMs` toggle class `is-flipped`; `nextTimer` lặn `cfg.nextMs` `next()`; nếu `cfg.speak` → `NHAI.speak(pinyin,'zh-CN')` lặp `cfg.repeat` cách 400ms.
- [ ] Step 3: badge "Tự động" đổi thành nút ⏸ dừng; `stopAutoplay()` clear cả 2 timer.
- [ ] Step 4: Verify: mở modal, chọn 2s/1s, bấm Bắt đầu, quan sát nhịp; bấm ⏸ dừng; điều hướng trang không còn timer chạy.

### Task 3: Section 7 quy tắc + card lưu ý
**Files:** `clone/js/radicals.js`
- [ ] Step 1: `renderStrokeRules()` — `h2` "Quy tắc thứ tự nét" + sub; grid 2 cột 7 card (số tròn đỏ + `h3` + desc + ô minh hoạ 48px).
- [ ] Step 2: `renderLastStrokes()` — card nền vàng nhạt viền trái 4px, `h3` "⏳ Ba nét cuối luôn viết sau cùng", dòng giải thích, hàng 3 ô (glyph + tên).
- [ ] Step 3: đặt 2 section ngay dưới khối deck, trước footer; responsive 1 cột trên mobile.
- [ ] Step 4: Verify + `git commit -m "feat(radicals): modal autoplay + 7 quy tắc thứ tự nét"`.
