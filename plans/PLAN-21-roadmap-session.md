# Roadmap pinyin timeline + trang buổi (SPEC-21) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** `roadmap-pinyin.html` = timeline 8 buổi zigzag có khoá tuần tự; `roadmap-session.html?s=N` = trình buổi 4 tab (Học / Flashcard / Trắc nghiệm / Bài kiểm tra) chấm điểm và mở khoá buổi sau.

**Architecture:** `NHAI_DATA.roadmap.pinyin.sessions[8]` = `{n,title,minutes,desc,learn,cards,quiz,test}`. State `localStorage['nhai.roadmap.pinyin'] = {done:[1], quizDone:[1,2]}`. `js/roadmap-session.js` dùng lại engine flashcard của `lesson-flashcard.js` nếu có, nếu không thì dựng bản nhẹ trong file.

**Tech Stack:** Tailwind v4, vanilla JS (defer).

**Spec:** `clone/specs/SPEC-21-roadmap-session.md`

## Global Constraints
- Ownership: `roadmap-pinyin.html`, `roadmap-session.html`, `js/roadmap-pinyin.js`, `js/roadmap-session.js`, `js/data/roadmap.js`.
- KHÔNG sửa `js/shell.js`.
- Tooltip khoá dùng CSS `group-hover` (không cần JS).
- Mặc định: buổi 1 mở, 2–8 khoá.

## Review Focus
- Node khoá hover hiện tooltip đúng số buổi.
- Bài kiểm tra ≥1/2 mới bật nút "Hoàn thành buổi N".
- Hoàn thành → timeline cập nhật, buổi sau mở khoá, persist qua reload.

---

### Task 1: Data 8 buổi
**Files:** `clone/js/data/roadmap.js`
- [ ] Step 1: `sessions[8]` với `title/minutes/desc` đúng bảng SPEC-21.
- [ ] Step 2: mỗi buổi có `learn` (4 mục cho buổi 1; các buổi sau 3–4 mục), `cards` 4–6 thẻ, `quiz` 2 câu `{q,options,answer,explain}`, `test` = 1 trắc nghiệm + 1 tự luận `{prompt,answer}`.
- [ ] Step 3: Verify: đủ 8 buổi, mỗi buổi có đủ 4 mảng.

### Task 2: Timeline 8 node
**Files:** `clone/js/roadmap-pinyin.js`, `clone/roadmap-pinyin.html`
- [ ] Step 1: H1 + sub; container `relative` với đường nối dọc.
- [ ] Step 2: `renderTimeline()` — 8 node xen kẽ (`:nth-child(even)` dịch ngang desktop, thẳng mobile), node tròn 56px + card: `h3`, thời lượng, desc, badge trạng thái.
- [ ] Step 3: trạng thái `done` (vòng xanh ✓) / `current` (vòng đỏ, badge "Bạn đang ở đây") / `locked` (🔒, card mờ, `group` + tooltip "Buổi chưa mở khoá 🔒 — Hoàn thành Bài kiểm tra của Buổi N-1 để mở Buổi N").
- [ ] Step 4: marker cuối "🚩 8 buổi · Hoàn thành chặng" + dòng "Bạn mới học N/8 buổi".
- [ ] Step 5: Verify theo SPEC-21; commit `feat(roadmap): timeline 8 buổi + khoá tuần tự`.

### Task 3: Trang buổi 4 tab
**Files:** `clone/js/roadmap-session.js`, `clone/roadmap-session.html`
- [ ] Step 1: đọc `?s=N` (mặc định 1; N bị khoá → toast + chuyển về timeline); header link "‹ Lộ trình pinyin", `h2` "Buổi N — <title>", progress bar.
- [ ] Step 2: 4 tab pill `Học`(✓ nếu done) / `Flashcard` / `Trắc nghiệm` / `Bài kiểm tra`(🔒 nếu buổi trước chưa làm test).
- [ ] Step 3: tab Học — dựng `learn` (buổi 1: 4 ô thanh ā á ǎ à mỗi ô có ký hiệu, tên, ví dụ chữ + nút 🔊 qua `NHAI.speak`), bảng "Tự nhận biết", nút "Đã đọc xong, sang Flashcard →".
- [ ] Step 4: tab Flashcard — dựng nhẹ từ `cards` (mặt trước chữ, lật để xem pinyin/HV/nghĩa, đếm x/N, nút Chưa thuộc/Đã thuộc).
- [ ] Step 5: tab Trắc nghiệm — 2 câu 4 đáp án; sau khi hết hiện "Đúng x/2" + "Làm lại".
- [ ] Step 6: tab Bài kiểm tra — 1 trắc nghiệm + 1 tự luận (input pinyin, so `NHAI.toPinyin`); hiện điểm; nút "Hoàn thành buổi N →" chỉ bật khi ≥1/2; bấm → ghi state, điều hướng về timeline.
- [ ] Step 7: Verify đủ tiêu chí SPEC-21; `git commit -m "feat(roadmap): trang buổi học 4 tab + mở khoá tuần tự"`.
