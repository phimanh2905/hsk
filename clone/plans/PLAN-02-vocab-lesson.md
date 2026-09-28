# Vocab Lesson — Flashcard + 7 chế độ (SPEC-02) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** lesson.html với flashcard lật + 7 chế độ học hoạt động + danh sách từ, đúng SPEC-02.

**Architecture:** State machine `currentMode` trong `js/lesson.js`; mỗi mode có hàm render + teardown; pinyin parser dùng chung `js/pinyin-utils.js`.

**Tech Stack:** Tailwind v4 CDN, vanilla JS, speechSynthesis, CSS 3D flip.

**Spec:** `clone/specs/SPEC-02-vocab-lesson.md`

## Global Constraints
- 13 từ Bài 1 HSK1 đúng y SPEC-02 (chữ/pinyin/âm HV/nghĩa/ví dụ).
- Mỗi chế độ đổi được qua sidebar không reload; counter "n / 13" cập nhật.
- Phím tắt flashcard không chặn khi đang gõ input.

## Review Focus
- Parser pinyin "ni3"→"nǐ", "lv4"→"lǜ", "zhong1"→"zhōng" phải đúng dấu trên nguyên âm chính.
- Xáo trộn không lặp thẻ cho tới hết bộ.
- Đáp án trắc nghiệm nhiễu không trùng đáp án đúng.

---

### Task 1: Dữ liệu `js/data/vocab.js` + `js/pinyin-utils.js`
**Files:** Create `clone/js/data/vocab.js`, `clone/js/pinyin-utils.js`
- [ ] Step 1: vocab.js: 13 từ Bài 1 đầy đủ (SPEC-02) + bài 2-15 của hsk1 (8-15 từ hợp lệ HSK1 mỗi bài, viết tay nhanh) + sách khác 1 bài demo mỗi book.
- [ ] Step 2: pinyin-utils.js: `NHAI.toPinyin("ni3") → "nǐ"` (map số→dấu theo nguyên âm chính, v→ü, chuẩn hóa tách âm tiết); `NHAI.stripTones("xuéxí") → "xuexi"`; export vào window.NHAI. Test console: assert 5 case (ni3, lv4, zhong1, xiao3, er4).

### Task 2: Khung lesson.html + sidebar chế độ + flashcard
**Files:** Create `clone/lesson.html`, `clone/js/lesson.js`, `clone/js/lesson-flashcard.js`
- [ ] Step 1: Layout 2 cột theo SPEC-02; header + tabs Từ vựng/Ví dụ; sidebar 7 nút + In file + Thêm cả bài; đọc query ?book&page; fallback bài 1.
- [ ] Step 2: Flashcard: flip 3D, chiều ZH→VI/VI→ZH, Tự động (interval 2.5s), Xáo trộn (Fisher-Yates), phím tắt ←/A ↓/X ↑/Z →/D, badge trạng thái thẻ, counter.

### Task 3: Trắc nghiệm + Gõ từ
**Files:** Create `clone/js/lesson-quiz.js`, `clone/js/lesson-typing.js`
- [ ] Step 1: Quiz: 4 đáp án pinyin (nhiễu từ cùng bài), toggle đề (Cách đọc/Từ vựng/Ý nghĩa), "Không biết", "Bí quá thì nghe" TTS, đúng→xanh + next 800ms, sai→đỏ + rung.
- [ ] Step 2: Typing: ô trống theo số âm tiết, parser từ Task 1, "Gợi ý (0/5)" mở dần, "Kiểm tra" chấm, toggle đề.

### Task 4: Đọc hiểu + Nghe ghép câu
**Files:** Create `clone/js/lesson-reading.js`, `clone/js/lesson-listen.js`
- [ ] Step 1: Đọc hiểu: câu khuyết "__" + dịch + 4 đáp án chữ Hán + "Câu này bó tay" + toggle "Nghĩa".
- [ ] Step 2: Nghe ghép câu: TTS câu (rate theo 0.5x/0.8x/1x/1.5x/2x), pool thẻ chữ → vùng ghép, "Ghép câu" so đúng thứ tự, "Gõ lại".

### Task 5: Hanzi Dance + Đấu trí
**Files:** Create `clone/js/lesson-dance.js`, `clone/js/lesson-battle.js`
- [ ] Step 1: Dance: chọn nhạc pill, Bắt đầu, emoji nhảy CSS khi gõ đúng pinyin (dùng parser), 13 từ.
- [ ] Step 2: Đấu trí: intro + Top 10 (đúng số liệu SPEC-02) + link BXH tháng; "Bắt đầu thi" chạy 13 câu trộn 5 dạng + timer; kết quả + best localStorage; dòng "Đăng nhập để lưu kết quả".

### Task 6: Danh sách từ + tích hợp
**Files:** Modify `clone/js/lesson.js`
- [ ] Step 1: List từ cuối trang (số, hanzi, pos, pinyin, ÂM HV, nghĩa, ví dụ + pinyin từng chữ + dịch, 3 nút: Báo lỗi toast, ⭐ SRS localStorage `nhai.srs.new++` + toast, 🔊 TTS).
- [ ] Step 2: Verify đầy đủ 7 mode + phím tắt + không lỗi console; `git commit -m "feat(lesson): flashcard + 7 study modes"`.
