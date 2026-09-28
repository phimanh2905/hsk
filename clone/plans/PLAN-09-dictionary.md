# Dictionary + Static pages (SPEC-09) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** dictionary.html search 3 kiểu + entry card + vẽ chữ modal; terms/privacy/delete-account.

**Architecture:** search chạy client trên data; normalize query (chữ Hán / pinyin không dấu / nghĩa Việt substring); render entry cards.

**Tech Stack:** Tailwind v4 CDN, vanilla JS.

**Spec:** `clone/specs/SPEC-09-dictionary-static.md`

## Global Constraints
- Data ≥15 entry; 学习 đủ 5 kết quả đúng SPEC-09.
- Nút "Tra từ" disabled khi input rỗng; URL ?q= cập nhật khi tra (replaceState) + F5 giữ kết quả.

## Review Focus
- Query có pinyin có dấu (xuéxí) hoặc hoa (XUEXI) vẫn match.
- Entry không có phồn thể → ẩn dòng, không hiện "undefined".

---

### Task 1: Dữ liệu `js/data/dictionary.js`
**Files:** Create `clone/js/data/dictionary.js`
- [ ] Step 1: 15+ entry theo SPEC-09 (学习 5 kết quả đầy đủ: 学习/学习刻苦/学习强国/学习时报/+1; các từ khác 1-3 nghĩa + 1-2 ví dụ {zh, pinyinPerChar, vi}).
- [ ] Step 2: Verify: tìm "học" (nghĩa Việt) trả ≥3 entry.

### Task 2: `dictionary.html` + `js/dictionary.js` + `js/draw-modal.js`
**Files:** Create 3 file
- [ ] Step 1: Search bar (placeholder, disabled state, Xoá từ khoá, "Vẽ chữ để tra" mở modal canvas vẽ — reuse pattern draw-pad tự viết gọn: vẽ → "Tra chữ này" → tra 你) + gợi ý tra nhanh khi rỗng.
- [ ] Step 2: Kết quả: "Trung → Việt" + count + entry cards (hanzi + pinyin + phồn thể + 🔊 + nghĩa + badges + Thêm vào sổ tay ⭐ localStorage + Xem từng chữ → hanzi.html?char= + nghĩa đánh số + ví dụ) + empty state.
- [ ] Step 3: Verify 3 kiểu search + F5 ?q= + no-undefined; 

### Task 3: terms.html + privacy.html + delete-account.html
**Files:** Create 3 file
- [ ] Step 1: Nội dung 5 mục mỗi trang theo SPEC-09; delete-account: form email + "Yêu cầu xoá" → toast + disable.
- [ ] Step 2: Verify + `git commit -m "feat: dictionary + static pages"`.
