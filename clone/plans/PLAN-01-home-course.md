# Home + Course + Leaderboard + Feedback (SPEC-01) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]` để tracking.

**Goal:** 4 trang: index.html, course.html, leaderboard.html, feedback.html (+terms/privacy) đúng SPEC-01.

**Architecture:** Mỗi trang HTML tĩnh dùng shell; render danh sách bằng JS từ `js/data/`.

**Tech Stack:** Tailwind v4 CDN, vanilla JS.

**Spec:** `clone/specs/SPEC-01-home-course-leaderboard.md`

## Global Constraints
- Đọc `clone/README.md` trước; KHÔNG sửa `js/shell.js`, `assets/theme.css`, file của agent khác.
- Copy tiếng Việt y specs (đúng số liệu 7 khóa, 10 bảng xếp hạng, 15 bài HSK1).
- Verify mỗi task: `python3 -m http.server 8080` + curl + console không lỗi; xong task thì `git commit`.

## Review Focus
- Query param sai (book không tồn tại) → fallback hsk1, không trang trắng.
- Tab skill cập nhật URL (?skill=) mà không reload trang (history.replaceState) — nhưng vẫn phải hoạt động khi F5.

---

### Task 1: Dữ liệu `js/data/courses.js`
**Files:** Create `clone/js/data/courses.js`
- [ ] Step 1: `NHAI_DATA.courses = { hsk1: {name:"HSK 1", zh:"标准教程 HSK 1 · 3.0", pages:15, meta:"333 từ vựng · 41 mẫu", wordCount:333, list:[{pageId, order, title, words, skill:'vocab'}…15 bài tên thật theo SPEC-01]}, hsk2…hsk79 }` — hsk2: 45 bài "Bài N" (12-18 từ), hsk3: 63, hsk4-6: 30, hsk7-9: 30. grammar/hanzi: mỗi book có mảng `grammar:[…5 bài]`, `hanzi:[…4 bài]` (tên kiểu "Bài N — Ngữ pháp").
- [ ] Step 2: Verify bằng `node -e` hoặc mở console: `NHAI_DATA.courses.hsk1.list.length === 15`.

### Task 2: `index.html` + `js/home.js`
**Files:** Create `clone/index.html`, `clone/js/home.js`
- [ ] Step 1: Trang chủ theo SPEC-01 §1 (chào mừng, card Facebook, section HSK 3.0 với 7 card từ data, footer nhỏ).
- [ ] Step 2: Verify: 7 card đúng meta; link đúng `course.html?book=`.

### Task 3: `course.html` + `js/course.js`
**Files:** Create `clone/course.html`, `clone/js/course.js`
- [ ] Step 1: Mode kệ sách (không ?book) + mode khóa học: breadcrumb, h1, 3 tab skill (active đỏ, replaceState), tiến độ 0/N, danh sách bài theo skill (vocab link lesson.html; grammar/hanzi button + 🔒 mở login modal qua sự kiện shell `NHAI.openLogin()`), nút "Tổng ôn" → review.html.
- [ ] Step 2: Verify: ?book=hsk1&skill=grammar hiện 5 bài khóa; F5 giữ tab.

### Task 4: `leaderboard.html` + `js/leaderboard.js` + `js/data/leaderboard.js` + `feedback.html` + terms/privacy
**Files:** Create các file trên + `clone/js/feedback.js`
- [ ] Step 1: leaderboard theo SPEC-01 §3 (2 tab, 10 hàng XP đúng tên/điểm, battle tự sinh, "Cách tính điểm").
- [ ] Step 2: feedback (textarea + toast) + terms/privacy 5 mục.
- [ ] Step 3: Verify + `git commit -m "feat: home, course, leaderboard, feedback"`.
