# Test case — HSK1-5 user journeys (spec-derived)

Ngày: 2026-10-25 · Môi trường: dev server `localhost:3100` (branch `hsk15-roadmap` @ `9bd336e`) · Thực thi: control-browser (browser thật)
Nguồn: spec `docs/superpowers/specs/2026-10-24-hsk15-roadmap-design.md` (acceptance W0–W7) + hiện trạng PR #17.
Quy ước: mỗi case PASS khi MỌI expected thỏa; FAIL → ghi chẩn đoán, fix app/case, re-run.

## A. Lesson & progression (W0.1, W2)
- **TC-A1** Trang chủ render: heading chào + section "Lộ trình HSK" hiện; vào /course thấy 7 sách (Bye HSK 1→7-9), HSK1 cardMeta "497 từ vựng · 41 mẫu" + 27 bài.
- **TC-A2** /course/hsk1 liệt kê 27 bài (lesson-1 "Chào hỏi & xưng hô"); click lesson-1 → /lesson/hsk1/lesson-1, thẻ đầu là 你.
- **TC-A3** Học flash deck hết bài (lật + good từng thẻ) → localStorage `bye.pageDone` chứa hsk1/lesson-1; quay lại trang chủ ProgressMatrix đếm bài xong ≥ 1.
- **TC-A4** Bài cuối HSK5: /lesson/hsk5/lesson-45 mở 200, có thẻ flash (data thật 45 bài).
- **TC-A5** /my-grammar (đã login) hiện danh mục 60 điểm HSK 1 (từ D1 content_grammars), filter hoạt động.

## B. SRS SM-2 (W0, W5)
- **TC-B1** Trong lesson, bấm ⭐ "Thêm vào ôn tập" → toast + badge /review tăng số từ due.
- **TC-B2** /review bắt đầu phiên: reveal thẻ → 4 nút Quên/Khó/Tốt/Dễ + phím 1–4 hoạt động.
- **TC-B3** Chấm "Tốt" 1 lần → localStorage srs item status "review" + intervalDays ≥ 1; chấm "Quên" → status relearning + lapses ≥ 1.
- **TC-B4** /progress: heatmap có ô sáng ngày hôm nay, "Từ đã thuộc" là số, KHÔNG còn "#14594" rank.

## C. Shadowing (W1, W3)
- **TC-C1** /shadowing hiện 6 playlist (5 YouTube + "Hội thoại theo bài" 128 video).
- **TC-C2** Mở video YouTube đầu: phụ đề câu hiện, transcript active.
- **TC-C3** Mở /shadowing/hsk1/lesson-1 (audio): `<audio data-testid="audio-player">` hiện; mp3 /audio/hsk1/lesson-1-1.mp3 trả 200.
- **TC-C4** Card video hội thoại có % hoàn thành (StatusPill) hoặc "Chưa học".

## D. Hanzi Studio (W0.2)
- **TC-D1** /hanzi: catalog 214 bộ thủ + tab theo cấp độ HSK; chọn chữ → workbench.
- **TC-D2** Draw quiz hoàn thành 1 chữ → quay lại catalog thấy badge "✓ Đã luyện"; /hanzi/水 có chip đã luyện.

## E. Battle & BXH (W6)
- **TC-E1** Lesson có ≥4 từ → mode Đấu trí chạy 13 câu, điểm hiện dạng X/150.
- **TC-E2** (login) Sau 1 ván: POST /api/v1/battle/attempts 200; /leaderboard?tab=battle tải dữ liệu thật (không skeleton treo).

## F. Thi thử (W6)
- **TC-F1** /certificate-test: card HSK 1 có link "Làm bài thi demo"; card khác (HSK 2) vẫn toast "sắp ra mắt".
- **TC-F2** Guest làm hết đề HSK1 (chọn option + điền tự luận) → tổng điểm + breakdown per section hiện.

## G. AI assistant (W7)
- **TC-G1** Widget Tiểu Ngữ guest: mở thấy nút "Đăng nhập để hỏi", không có ô nhập.
- **TC-G2** (login) Gõ câu hỏi → nhận phản hồi text từ AI (không lỗi toast).
- **TC-G3** Grammar card (đã login): nút "🤖 Giải thích" → khối kết quả hiện.

## H. Sync đa thiết bị (W4)
- **TC-H1** Guest học (thêm SRS + XP) → login (session tự ký) → reload: merge-push POST /api/v1/sync 200.
- **TC-H2** Session 2 (context riêng): /my-vocab thấy đúng dữ liệu; gate /progress yêu cầu login khi guest.
- **TC-H3** (login) /my-vocab /my-grammar /progress vào thẳng (server gate pass).

## I. Reading (W3)
- **TC-I1** /reading: picker "Bài đọc theo level" hiện 15 passages; mở passage HSK1 → câu đầu + MCQ.
- **TC-I2** Dán văn bản mới → "Tạo bài đọc" → karaoke sentences render; draft lưu (reload còn).

## J. Create-file (W0-W3)
- **TC-J1** /create-file: chọn template vocab → có chữ mẫu → nút in (gate print hiện bản in/chặn đúng).

## K. Cơ bản web (spec "Nguyên tắc")
- **TC-K1** Điều hướng nhanh 8 route chính (/,/course,/roadmap,/review,/hanzi,/shadowing,/pinyin,/progress) đều 200, không console error fatal.

Tổng: **32 case**. Báo cáo thực thi: `2026-10-25-hsk15-journeys-report.md`.
