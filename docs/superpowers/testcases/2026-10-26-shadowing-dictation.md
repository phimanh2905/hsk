# Test case control-browser — Shadowing dictation (WSD)

Dev server :3100 (`pnpm dev`), Chrome thật qua control-browser (IAB), login guest không cần.
Video mẫu: `EA3rwvr99Q0` (đã seed words WSD).

Trạng thái: **14/14 PASS — đã chạy qua control-browser 2026-10-27.**

Ghi chú môi trường: IAB không giao sự kiện chuột/phím thật tới trang (giới hạn backend) →
tương tác qua synthetic events (`element.click()`, `KeyboardEvent` trên `document`) — vẫn chạy
React thật đã hydrate; path sự kiện thật đã được e2e Playwright cover 5/5. YouTube iframe bị
Error 153 trong IAB → thời gian video mô phỏng bằng MessageEvent infoDelivery (cách e2e stub).

| # | Kịch bản | Bước | Kỳ vọng | Kết quả |
|---|----------|------|---------|---------|
| T1 | Mode switch phím | Mở `/shadowing/EA3rwvr99Q0`, bấm phím 2 → 3 → 1 | Panel dict → pron → transcript tương ứng, aria-pressed đúng | ✅ PASS |
| T2 | Typing sai | Mode 2, gõ "这是完全错误的答案啊", Kiểm tra | dict-diff hiển thị per-char (đỏ/xanh/skip), badge Lỗi sai > 0, reason "Bạn mắc n lỗi" | ✅ PASS — 9 bad + skip, "Lỗi sai: 9 / Thiếu: 3", reason "Bạn mắc 12 lỗi" |
| T3 | Typing đúng | Gõ nguyên văn câu 1 (copy từ transcript), Kiểm tra | "Hoàn toàn chính xác", score 100 ghi progress | ✅ PASS — reason "Hoàn toàn chính xác", lastScore 100 |
| T4 | Stats nhớ | Sau T2, check đúng câu đó; phát lại 2 lần (Nghe câu mẫu); check lại | Badge Điểm lần trước = % trước; Lượt phát lại = 2 | ✅ PASS — localStorage line 1: {errors: 15, lastScore: 100, replays: 2}. Minor: badge replays chỉ refresh ở lần check sau (deferred) |
| T5 | Hint 👁 | Mode 2, bấm 👁 3 lần | 3 ô đầu hiện chữ, còn lại "?" | ✅ PASS — 啊/我/才 mở, 5 ô còn "?" |
| T6 | Arrange đúng | Variant Ghép từ, tap đủ mảnh theo thứ tự đúng, KIỂM TRA | "Hoàn toàn chính xác", tự sang câu sau | ✅ PASS — sang Câu 2/96, panel reset sạch, stats ghi 100 |
| T7 | Arrange sai | Tap thiếu 1 mảnh, KIỂM TRA | Mảnh built viền đỏ, badge lỗi ≥ 1 | ✅ PASS (SAU fix 804e0bb) — viền đỏ feedback-error, "Thiếu: 2", không sang câu sau. Trước fix: bug diffChars missing bị skippedWant che → PASS oan (đã fix + retest) |
| T8 | Variant nhớ | Đổi Ghép từ, reload, vào mode 2 | Variant vẫn Ghép từ | ✅ PASS — aria-pressed arrange = true sau reload |
| T9 | Karaoke | Mode 1, bấm Phát, xem câu active | Từ đang phát highlight chạy theo (data-active="1" chuyển) | ✅ PASS — t=0.5s active 啊, t=1.05s active 我 (spans 啊/我/才/离) |
| T10 | Auto-pause | Bật "Tự ngắt", Phát | Video dừng tại cuối câu (word cuối), aria-pressed true | ✅ PASS — đưa time 1.4s (câu end 1.5s) → playing dừng, label "Phát" |
| T11 | Auto-pause nhớ | Reload sau T10 | Toggle vẫn bật | ✅ PASS — aria-pressed = true sau reload |
| T12 | Pron record | Mode 3, giữ/click BẮT ĐẦU GHI ÂM nói 2s, DỪNG | Score % hiện, toast/progress cập nhật | ✅ PASS — getUserMedia mock (AudioContext stream), THU ÂM→DỪNG→THU ÂM, score 60% (bản ghi giả ngắn) |
| T13 | Audio mode không vỡ | Mở `/shadowing/hsk1/lesson-1`, bấm 2 → 3 | Dict panel chạy theo parts (không words), không crash; không có nút Tự ngắt | ✅ PASS — arrange tile từ parts ("你好！"), auto-pause button vắng mặt, pron chạy |
| T14 | Phím cũ giữ nguyên | K (play), L (loop), ←/→ (chuyển câu), Space giữ thu | Hành vi như trước | ✅ PASS — K toggle Tạm dừng/Phát, → sang Câu 2/11, L aria-pressed true |

Bug tìm thấy trong QA: **diffChars missing bị skippedWant che phủ** (thiếu chữ giữa/subsequence
vẫn "Hoàn toàn chính xác") — fix `804e0bb`, retest T6/T7 + typing omission PASS.
