# Shadowing (SPEC-06) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc executing-plans. Checkbox `- [ ]`.

**Goal:** shadowing.html (thư viện 5 nhóm) + shadowing-video.html (player theo câu, 2 mode, dictation).

**Architecture:** iframe YouTube + postMessage API; fallback TTS nếu iframe chặn; player state = câu hiện tại + mode + tốc độ.

**Tech Stack:** Tailwind v4 CDN, vanilla JS, YouTube IFrame API (postMessage), getUserMedia (optional), speechSynthesis.

**Spec:** `clone/specs/SPEC-06-shadowing.md`

## Global Constraints
- Thumbnail là placeholder gradient (không tải ảnh ngoài).
- Phụ đề EA3rwvr99Q0 đủ ≥9 câu đúng nội dung SPEC-06.
- KHÔNG sửa shell.js; mode "Bắt chước phát âm" là mặc định.

## Review Focus
- Offline (iframe không load): sau 4s phải tự bật banner "Chế độ TTS" và player vẫn hoạt động bằng speechSynthesis.
- Timestamps phụ đề giả phải tăng dần không giao nhau, câu cuối ≤ thời lượng video hiển thị.

---

### Task 1: Dữ liệu `js/data/shadowing.js`
**Files:** Create `clone/js/data/shadowing.js`
- [ ] Step 1: categories (5 nhóm đúng tên/mô tả/4 video mỗi nhóm với id, count, hsk, duration) + subtitles cho EA3rwvr99Q0 (9 câu SPEC-06, start/end 0-165s) + subtitles mẫu 5-8 câu cho 3 video khác.
- [ ] Step 2: Verify console: categories.length===5, subtitles["EA3rwvr99Q0"].length>=9.

### Task 2: `shadowing.html` + `js/shadowing.js`
**Files:** Create 2 file
- [ ] Step 1: Grid nhóm + card (placeholder gradient + 短片, badges count/HSK/YouTube/duration) + ?cat filter + breadcrumb.
- [ ] Step 2: Verify 20 card, link đúng ?id=.

### Task 3: `shadowing-video.html` + `js/shadowing-video.js`
**Files:** Create 2 file
- [ ] Step 1: Layout: toolbar mode/ẩn video/phím tắt + h1 + badge + iframe nocookie + thanh điều khiển câu (Câu trước/Lặp lại/Play/Câu sau, Tự ngắt câu, Bản dịch, Pinyin, tốc độ, Cài đặt dialog).
- [ ] Step 2: YouTube postMessage controller (play/pause/seekTo/getCurrentTime polling 500ms; vòng đời câu = start/end). Fallback TTS sau 4s không ready.
- [ ] Step 3: Transcript BẢN CHÉP: toggle Pinyin/Trans/Ẩn; câu button với parts + pinyin + dịch + Báo lỗi toast; active vàng + scrollIntoView.
- [ ] Step 4: Mode dictation: input + "Nghe câu này" + "Kiểm tra" (so sau khi stripTones bỏ dấu cách) + highlight sai + "Bỏ qua câu này". Mode shadowing: nút ghi âm MediaRecorder (fail im lặng).
- [ ] Step 5: Phím tắt Space/←/→/R (không chặn khi focus input); dialog "Phím tắt".
- [ ] Step 6: Verify tất cả mode/fallback (chặn YouTube qua network condition hoặc test fallback flag ?tts=1); `git commit -m "feat(shadowing): library + player + dictation"`.
