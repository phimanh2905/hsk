# Progress Stats (SPEC-11) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** /progress logged-in = XP + rank + 4 thống kê + heatmap 12 tháng.

**Architecture:** Đọc localStorage (`nhai.xp`, `nhai.srs`, `nhai.today`, `nhai.battle`), heatmap demo hardcode khi trống. File: progress.html + js/progress.js (thay js/my-pages.js phần progress).

**Tech Stack:** Tailwind v4, vanilla JS, CSS grid heatmap.

**Spec:** `clone/specs/SPEC-11-progress-stats.md`

## Global Constraints
- Chỉ sửa file ownership PLAN-11 (progress.html, js/progress.js); my-vocab/my-grammar giữ nguyên.
- Chưa mock-login → màn khoá cũ.

## Review Focus
- localStorage JSON hỏng → try/catch về 0.
- Heatmap 12 cột không tràn (grid-template-columns: repeat(12,1fr)).

---

### Task 1: Card Điểm của bạn + Thống kê 4 ô
**Files:** Modify `clone/progress.html`, `clone/js/progress.js`
- [ ] Step 1: Card Điểm: XP lớn (localStorage `nhai.xp` || 0), rank badge `#` + (14594 - xp), nút "Xem bảng xếp hạng →" → leaderboard.html.
- [ ] Step 2: 4 card: Chuỗi ngày (`nhai.streak`||0, sub "Học hôm nay để bắt đầu chuỗi"), Từ đã thuộc (đếm `nhai.srs.st.*` known, sub "trên tổng 9789 từ"), Bài hoàn thành ("N/153" — đếm `nhai.pageDone.*`>=2, sub "Xong khi học đủ 2 chế độ"), Hôm nay (`nhai.today`||0 + sub "Số câu trả lời đúng trong ngày").
- [ ] Step 3: Verify: node --check; mở ?mockLogin qua login modal — số render.

### Task 2: Heatmap 12 tháng
**Files:** Modify `clone/js/progress.js`
- [ ] Step 1: Card "Lịch học — 12 tháng gần đây": 12 cột header "Tháng N" (từ tháng hiện tại lùi), mỗi cột 28-31 ô 10px; data: localStorage `nhai.heat` (map YYYY-MM-DD→xp) || demo hardcode random cố định (seed).
- [ ] Step 2: 4 mức màu (0 = viền; 1-2/3-5/6+ = đỏ nhạt→đậm); title attr "Tháng N ngày D: Xp M".
- [ ] Step 3: Verify + `git commit -m "feat(progress): xp card, stats, heatmap"`.
