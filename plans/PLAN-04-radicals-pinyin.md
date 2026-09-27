# Radicals + Pinyin + Practice + Sound Rules (SPEC-04) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** radicals.html (214 bộ thủ flashcard + grid), pinyin.html (bảng 406 âm), pinyin-practice.html, sound-rules.html.

**Architecture:** radicals = flashcard deck tự viết (pattern SPEC-02) + grid nhóm nét; pinyin = bảng generated từ data; practice = quiz runtime; sound-rules = static content + mini quiz.

**Tech Stack:** Tailwind v4 CDN, vanilla JS, speechSynthesis.

**Spec:** `clone/specs/SPEC-04-radicals-pinyin-soundrules.md`

## Global Constraints
- Đủ 214 bộ thủ; đủ 37 vận mẫu × 23 thanh mẫu; ví dụ thanh điệu theo % trong spec.
- Bấm thẻ/ô phải có hành động (deck nhảy tới / popup chi tiết) — không dead click.

## Review Focus
- Ô pinyin không tồn tại (vd "bi", "fai") phải là ô "·" muted, không phát âm được.
- Popup pinyin đóng bằng Escape + backdrop.

---

### Task 1: Dữ liệu `js/data/radicals.js` + `js/data/pinyin.js`
**Files:** Create 2 file data
- [ ] Step 1: radicals.js: 214 item {i, char, hanViet, meaning, strokes} theo nhóm 1-17 nét (bộ 1-214 chuẩn Kangxi, tên Hán Việt chuẩn).
- [ ] Step 2: pinyin.js: initials 23, finals 37, bảng valid (~406 âm có dấu chuẩn), examples 2 từ/âm quan trọng.

### Task 2: `radicals.html` + `js/radicals.js`
**Files:** Create `clone/radicals.html`, `clone/js/radicals.js`
- [ ] Step 1: Flashcard deck (counter 1/214, Tự động, Xáo trộn, TTS, phím tắt, lật thẻ) + grid nhóm theo số nét + nút "Tạo file luyện viết (214 bộ)" → create-file.html?tpl=radicals; bấm thẻ grid → deck nhảy.
- [ ] Step 2: Verify: shuffle không thiếu bộ; grid đủ nhóm.

### Task 3: `pinyin.html` + `js/pinyin.js`
**Files:** Create `clone/pinyin.html`, `clone/js/pinyin.js`
- [ ] Step 1: Bảng ma trận + filter pill thanh mẫu + popup chi tiết (âm 4 thanh + TTS + từ ví dụ) đóng Escape/backdrop.
- [ ] Step 2: Verify: đếm ô hợp lệ ≥ 400; "·" muted.

### Task 4: `pinyin-practice.html` + `js/pinyin-practice.js`
**Files:** Create 2 file
- [ ] Step 1: 10 câu luân phiên nghe-chọn-âm / chọn-thanh-điệu, counter, kết quả "Đúng X/10", "Làm lại".
- [ ] Step 2: Verify random không lặp câu trong lượt.

### Task 5: `sound-rules.html` + `js/sound-rules.js` + `js/data/soundrules.js`
**Files:** Create 3 file
- [ ] Step 1: Bảng thanh điệu 6 hàng đúng % + bar màu; quy tắc âm đầu (8-10) + âm cuối/vần (6-8) kèm ví dụ; bài tập 5 câu chấm + giải thích.
- [ ] Step 2: Verify + `git commit -m "feat: radicals, pinyin, sound-rules"`.
