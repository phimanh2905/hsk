# Test case control-browser — Shadowing dictation (WSD)

Dev server :3100 (`pnpm dev`), Chrome thật qua control-browser (IAB), login guest không cần.
Video mẫu: `EA3rwvr99Q0` (đã seed words WSD).

Trạng thái: **chưa chạy — sẽ chạy qua control-browser sau Task 11.**

| # | Kịch bản | Bước | Kỳ vọng |
|---|----------|------|---------|
| T1 | Mode switch phím | Mở `/shadowing/EA3rwvr99Q0`, bấm phím 2 → 3 → 1 | Panel dict → pron → transcript tương ứng, aria-pressed đúng |
| T2 | Typing sai | Mode 2, gõ "这是完全错误的答案啊", Kiểm tra | dict-diff hiển thị per-char (đỏ/xanh/skip), badge Lỗi sai > 0, reason "Bạn mắc n lỗi" |
| T3 | Typing đúng | Gõ nguyên văn câu 1 (copy từ transcript), Kiểm tra | "Hoàn toàn chính xác", score 100 ghi progress |
| T4 | Stats nhớ | Sau T2, check đúng câu đó; phát lại 2 lần (Nghe câu mẫu); check lại | Badge Điểm lần trước = % trước; Lượt phát lại = 2 |
| T5 | Hint 👁 | Mode 2, bấm 👁 3 lần | 3 ô đầu hiện chữ, còn lại "?" |
| T6 | Arrange đúng | Variant Ghép từ, tap đủ mảnh theo thứ tự đúng, KIỂM TRA | "Hoàn toàn chính xác", tự sang câu sau |
| T7 | Arrange sai | Tap thiếu 1 mảnh, KIỂM TRA | Mảnh built viền đỏ, badge lỗi ≥ 1 |
| T8 | Variant nhớ | Đổi Ghép từ, reload, vào mode 2 | Variant vẫn Ghép từ |
| T9 | Karaoke | Mode 1, bấm Phát, xem câu active | Từ đang phát highlight chạy theo (kw-active chuyển) |
| T10 | Auto-pause | Bật "Tự ngắt", Phát | Video dừng tại cuối câu (word cuối), aria-pressed true |
| T11 | Auto-pause nhớ | Reload sau T10 | Toggle vẫn bật |
| T12 | Pron record | Mode 3, giữ/click BẮT ĐẦU GHI ÂM nói 2s, DỪNG | Score % hiện, toast/progress cập nhật |
| T13 | Audio mode không vỡ | Mở `/shadowing/hsk1/lesson-1`, bấm 2 → 3 | Dict panel chạy theo parts (không words), không crash; không có nút Tự ngắt |
| T14 | Phím cũ giữ nguyên | K (play), L (loop), ←/→ (chuyển câu), Space giữ thu | Hành vi như trước |
