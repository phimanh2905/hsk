# Review → Thống kê học tập (SPEC-17) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** `review.html` trở thành dashboard "Thống kê học tập": 2 tab, 6 ô đếm, empty bộ thẻ, 5 ô TB, bar 7 ngày, donut phân bổ.

**Architecture:** `js/review-stats.js` render toàn bộ từ `NHAI_DATA.review` (counts, week, distribution). Giữ `js/lesson-review.js` (nếu có) cho luồng chơi ôn ở `review-play.html`.

**Tech Stack:** Tailwind v4, vanilla JS (defer), SVG donut.

**Spec:** `clone/specs/SPEC-17-review-stats.md`

## Global Constraints
- Ownership: `review.html`, `js/review-stats.js`, `js/data/review.js`. KHÔNG sửa `js/shell.js`.
- Boot pattern: `readyState==="complete" ? init() : addEventListener("DOMContentLoaded", init)`.
- Nếu `review-play.html` đang tồn tại thì giữ nguyên; nếu không, nút "Bắt đầu ôn tập" dẫn `lesson.html?book=hsk1&page=lesson-1&mode=quiz`.

## Review Focus
- Title tag đúng "Ôn tập ngắt quãng | Nhai HSK".
- Đổi tab chỉ đổi nhãn/text/link, không dựng lại layout.
- Donut: 4 lát, tổng góc 360°, có legend % khớp.

---

### Task 1: Data + khung trang
**Files:** `clone/js/data/review.js`, `clone/review.html`
- [ ] Step 1: `NHAI_DATA.review = { counts:[12,34,8,41,96,191], today:0, week:0, avgPerDay:0, avgPerCard:0, streak:0, last7:[3,5,0,8,12,4,0], dist:{forgot:8,hard:5,good:14,easy:3}, total:30, monthTotal:30, copy:{vocab:{emptyDesc,emptyLink,emptyHref}, grammar:{…}} }`.
- [ ] Step 2: `review.html` — `<title>Ôn tập ngắt quãng | Nhai HSK`; `#rv-root`; bỏ form "bắt đầu ôn tập" cũ.
- [ ] Step 3: Verify: title đúng, trang rỗng (chưa render) không lỗi console.

### Task 2: 6 ô đếm + empty bộ thẻ
**Files:** `clone/js/review-stats.js`
- [ ] Step 1: `renderCounts()` — grid 6 cột (`grid-cols-2 md:grid-cols-3 lg:grid-cols-6`), mỗi ô: số 28px theo bảng màu SPEC-17 + nhãn nhỏ.
- [ ] Step 2: `renderEmptyCard(domain)` — `h2` "Bộ thẻ đang trống", text + link đỏ theo domain.
- [ ] Step 3: Verify: 6 ô đúng nhãn/màu; đổi tab đổi text + link.

### Task 3: Chi tiết ôn tập (5 ô + bar 7 ngày + donut)
**Files:** `clone/js/review-stats.js`
- [ ] Step 1: `renderDetail()` — 5 ô nhỏ (Streak/Hôm nay/Tuần này/TB ngày/TB thẻ).
- [ ] Step 2: `renderWeek()` — 7 cột flex `items-end`, nhãn `T3 T4 T5 T6 T7 CN T2` đúng thứ tự mảng `last7`; cột hôm nay màu `--nhai-main`, ngày khác `--nhai-soft`; nền card trắng viền.
- [ ] Step 3: `renderDonut()` — SVG `viewBox="0 0 42 42"`, 4 lát `stroke-dasharray` tính từ `dist`, `stroke-width=6`, bo tròn; legend 4 dòng "nhãn — N (X%)"; chân bảng "Tổng: N lượt · Tháng này: M lượt".
- [ ] Step 4: Verify: % trong legend khớp tỉ lệ `dist`; `git commit -m "feat(review): dashboard Thống kê học tập"`.
