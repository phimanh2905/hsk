# Reading + Certificate Test (SPEC-07) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** reading.html (paste → "AI" render karaoke + demo doc) và certificate-test.html (10 card sắp ra mắt).

**Architecture:** Karaoke = TTS từng câu + highlight span tuần tự (timer chia đều); "AI" tạo bài = render từ data mẫu, văn bản lạ hiện placeholder dịch demo.

**Tech Stack:** Tailwind v4 CDN, vanilla JS, speechSynthesis (onboundary nếu có, fallback timer).

**Spec:** `clone/specs/SPEC-07-reading-certificates.md`

## Global Constraints
- Counter 3000 ký tự realtime; block dán quá giới hạn (slice).
- Demo doc "一个人的生活 — Cuộc sống một mình — 2:29 · 654 ký tự" đúng nhãn.

## Review Focus
- TTS unsupported → highlight vẫn chạy theo timer, không treo UI.
- Text dài 3000 ký tự phải render không lag (chỉ tách câu, không tách span quá 1 câu đang phát).

---

### Task 1: Dữ liệu `js/data/reading.js`
**Files:** Create `clone/js/data/reading.js`
- [ ] Step 1: sampleText (~300 ký tự tiếng Trung, nội dung đời thường tự viết, ≥ 8 câu); demoDoc {title:"一个人的生活", label:"Cuộc sống một mình", meta:"2:29 · 654 ký tự", sentences: ≥12 câu {zh, pinyin, vi}, vocab: 5 từ {word, py, vi}, questions: 3 câu {q, options[4], answer}} — tự biên soạn.
- [ ] Step 2: Verify console sentences.length>=12.

### Task 2: `reading.html` + `js/reading.js`
**Files:** Create 2 file
- [ ] Step 1: Layout sidebar demo/bài của bạn + textarea + counter + "Dùng văn bản mẫu" + "Tạo bài đọc" + callout 6 bước collapse.
- [ ] Step 2: Kết quả "Tạo bài đọc": header + "Phát cả bài" (TTS tuần tự) + karaoke từng câu (span ký tự highlight vàng theo onboundary/timer) + toggle dịch/pinyin; văn bản không có trong data → dịch placeholder như spec.
- [ ] Step 3: Demo doc: mở từ sidebar → render đầy đủ + "Câu hỏi & Từ vựng" (3 quiz chấm + 5 từ ⭐).
- [ ] Step 4: Verify: highlight chạy đúng câu bấm; không lỗi khi text rỗng/quá dài.

### Task 3: `certificate-test.html` + `js/certificate.js` + `js/data/certificates.js`
**Files:** Create 3 file
- [ ] Step 1: Data 7 HSK + 3 HSKK đúng số liệu SPEC-07; grid 2 section + badge "Sắp ra mắt" + toast khi bấm.
- [ ] Step 2: Verify 10 card; `git commit -m "feat: reading, certificates"`.
