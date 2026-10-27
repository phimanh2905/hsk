# QA — ReactPlayer migration (10 test case control-browser)

Ngày chạy: 2026-10-28 · Môi trường: dev server :3100, dev-login QA route, IAB (viewport 1728×1000).
Video test: `/shadowing/EA3rwvr99Q0` (YouTube) và `/shadowing/hsk1/lesson-1` (audio Kokoro).

| # | Case | Kết quả | Ghi chú |
|---|------|---------|---------|
| TC01 | Render ReactPlayer, không "Video player configuration error" | **PASS** | iframe YouTube render qua youtube-video-element; src youtube-nocookie; không còn error 153 |
| TC02 | Overlay "chưa ready" biến mất sau onReady | **PASS** | |
| TC03 | Phát / tạm dừng (nút toolbar) | **PASS** | currentTime tăng khi phát, dừng hẳn khi pause |
| TC04 | Click câu trong transcript → seek tới đầu câu | **PASS** | click câu 3 → currentTime ≈ 3.0–3.2, tự phát |
| TC05 | Tốc độ 0.75x | **PASS** | playbackRate của player = 0.75, nút aria-pressed đúng |
| TC06 | Tự ngắt theo word timing | **PASS** | tự dừng ở 3.66s (mốc endMs cuối câu 3, trước ranh giới 4.0s) |
| TC07 | Lặp câu | **PASS** | liên tục quay về đầu câu, không bao giờ pause |
| TC08 | Dictation "Nghe câu mẫu" | **PASS** | seek về đầu câu + phát; dict-box hiển thị |
| TC09 | Karaoke highlight theo từ | **PASS** | data-active chạy theo thời gian (0,0,1 → 1,0,0) |
| TC10 | Audio mode play/pause/seek + auto-next clip | **PASS** | sau fix d437529: clip 2 tự phát khi clip 1 hết; pause dừng hẳn |

## Bug phát hiện và fix trong QA

1. **Engine mất đồng bộ nút Phát** (commit `84aad10`): engine ref-driven không còn đọc
   `playerState` từ postMessage — YouTube tự pause (buffer/policy) → nút Phát chết.
   Fix: thêm `syncPlaying` nối vào `onPlay`/`onPause` của ReactPlayer.
2. **Audio mode không tự phát clip kế** (commit `d437529`, bug tồn tại từ trước):
   `play()` bị gọi trùng lúc React đổi `src` clip → play promise bị abort.
   Fix: effect resume phát theo `cur` khi đang playing.

## Quan sát ngoài phạm vi migration (không fix trong PR này)

- `data-testid="t-cur"` và scrub bar là placeholder tĩnh, không nối `eng.time`
  (tồn tại từ trước, không thuộc engine).
- Trang có overflow ngang (scrollWidth 1401 vs viewport 1280) làm nội dung chui
  dưới sidebar ở một số bề rộng cửa sổ.
- Click giả (evaluate/JS) không tạo user gesture → YouTube chặn autoplay; QA phải
  dùng click thật (CUA). Người dùng thật không bị ảnh hưởng.
- Lưu ý QA: click CUA trên toolbar đôi khi không tới trang sau khi reload — dùng
  lại được sau khi focus; không tái hiện trên trình duyệt thật.

Kết luận: **10/10 PASS** — sẵn sàng deploy thử trên prod.
