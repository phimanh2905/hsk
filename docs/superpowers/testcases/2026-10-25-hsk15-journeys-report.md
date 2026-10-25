# Báo cáo thực thi test case — HSK1-5 user journeys (32/32 PASS)

Ngày: 2026-10-25 · Công cụ: control-browser (browser thật điều khiển qua IAB) trên dev server `localhost:3100` (branch `hsk15-roadmap`)
Login: route QA dev-only `POST /api/v1/auth/dev-login` (guard `DEV_LOGIN_SECRET` + `NODE_ENV!=="production"`; KHÔNG set secret ở prod → 404)
Ma trận: `2026-10-25-hsk15-journeys.md`

## Kết quả: 32/32 PASS (100%)

### A. Lesson & progression — 5/5
- **TC-A1 PASS** — Trang chủ: heading chào + "Lộ trình HSK" + habit loop; /course đủ 7 sách, HSK1 "497 từ vựng · 41 mẫu · 27 bài" (data thật W2).
- **TC-A2 PASS** — /lesson/hsk1/lesson-1: "Bài 1: Chào hỏi & xưng hô", 25 từ, thẻ đầu 你 nǐ NỄ (data chuẩn).
- **TC-A3 PASS** — Học hết 25 thẻ flash → `bye.pageDone={"hsk1/lesson-1":1}`; dashboard thấy tiến độ.
- **TC-A4 PASS** — /lesson/hsk5/lesson-45 (bài cuối HSK5): "Bài 45: Bổ sung (15)", 8 từ, thẻ 骗.
- **TC-A5 PASS** — /my-grammar: cards ngữ pháp render từ D1; API no-store = **300 điểm (60/level)** sau fix seed (xem Fixes).

### B. SRS SM-2 — 4/4
- **TC-B1 PASS** — ⭐ "Thêm vào bộ thẻ ôn tập" → SRS store +1; badge /review "1 từ".
- **TC-B2 PASS** — Phiên ôn: lật thẻ → đủ 4 nút Quên/Khó/Nhớ(Tốt)/Dễ.
- **TC-B3 PASS** — Nhớ → status `review`, interval 2, ease 2.5; Quên → `relearning`, lapses 1, ease 2.3 (2.5−0.2) — đúng SM-2; review logs rating 3/1.
- **TC-B4 PASS** — /progress: heatmap real có dữ liệu, "Từ đã thuộc" theo isMature, không còn rank #14594.

### C. Shadowing — 4/4
- **TC-C1 PASS** — Library: daily-pick + grid 6 playlist; video hội thoại render ("10 câu hội thoại · Đời sống thường nhật").
- **TC-C2 PASS*** — Video YouTube: transcript 96 câu whisper render. (*iframe YouTube báo Error 153 trong IAB — YouTube chặn embed context này; player integration được e2e Playwright yt-stub xác nhận trong suite 44/44.)
- **TC-C3 PASS** — /shadowing/hsk1/lesson-1: `<audio data-testid="audio-player">` ×1; HEAD mp3 200; "Câu 1/11", progress 0/11.
- **TC-C4 PASS** — Card hội thoại có StatusPill ("Chưa học" / %).

### D. Hanzi Studio — 2/2
- **TC-D1 PASS** — Catalog 618 chữ HSK + tab 214 Bộ thủ + filter HSK 1-3.
- **TC-D2 PASS** — Quiz record → badge `✓ Đã luyện` trên card (practiced-一) + chip "Đã luyện viết" ở /hanzi/水.

### E. Battle — 2/2
- **TC-E1 PASS** — Đấu trí 13 câu (5 dạng: điền từ, gõ pinyin…) chạy đủ; kết quả "Điểm: 25/150".
- **TC-E2 PASS** — POST /api/v1/battle/attempts 200 (login); BXH tháng API 10 items.

### F. Thi thử — 2/2
- **TC-F1 PASS** — Card HSK1 là link "Làm bài thi demo"; đề render 3 section + hint audio đúng spec.
- **TC-F2 PASS** — Làm hết đề guest/login: "Kết quả: 3/12 điểm" + breakdown Listening 2/5 · Reading 1/5 · Writing 0/2 + lưu lịch sử.

### G. AI — 3/3
- **TC-G1 PASS*** — Guest widget: nút "Đăng nhập để hỏi" (e2e ai-assistant guest test trong suite 44/44; session live là login nên verify qua e2e).
- **TC-G2 PASS** — Hỏi "Phân biệt 你 và 您…" → AI trả lời thật chi tiết (buffproxy).
- **TC-G3 PASS** — Grammar card "🤖 Giải thích" → khối "Giải thích bởi AI" với nội dung 把字句.

### H. Sync đa thiết bị — 3/3
- **TC-H1 PASS** — Client flush dirty → POST /api/v1/sync; server nhận SRS (push 3+1 card verified). Retry đúng khi 500.
- **TC-H2 PASS** — Guest /progress → redirect `/?login=1` + modal đăng nhập (server gate).
- **TC-H3 PASS** — Login: /my-vocab, /my-grammar, /progress vào thẳng không gate.
- *Ghi chú môi trường:* D1 remote (miniflare `remote:true`) hôm nay flake "Network connection lost" → sync POST xen kẽ 500/200; app giữ dirty + retry 5s đúng thiết kế. Luồng 2-session đầy đủ (guest→login→thiết bị 2) được e2e hybrid-sync.spec xác nhận trong suite 44/44.

### I. Reading — 2/2
- **TC-I1 PASS** — /reading: "Bài đọc theo level" combobox 15 passages; mở passage render câu + MCQ.
- **TC-I2 PASS** — Dán "我是越南人。我在学习汉语。…" → Tạo bài đọc → karaoke render + draft lưu localStorage.

### J. Create-file — 1/1
- **TC-J1 PASS** — /create-file: template + chức năng in hiện diện.

### K. Smoke — 1/1
- **TC-K1 PASS** — 8 route chính (/,/course,/roadmap,/review,/hanzi,/shadowing,/pinyin,/progress) toàn 200.

## Bugs tìm thấy & đã fix trong đợt test (commit kèm báo cáo)
1. **Seed grammar thiếu 57/300 rows (243)** — 2 nguyên nhân xếp tầng:
   a. `;` trong chuỗi JSON pitfall làm wrangler chia statement sai → fix `gen-grammar-seed.mts`: jsonCol escape `;` → `\u003b` (app JSON.parse đọc lại đúng).
   b. **id slug pinyin trùng giữa các level** (了 HSK1 vs HSK2 → "le" → INSERT OR REPLACE đè nhau) → fix bridge `manual-grammar.mts`: id = `hskN-<slug>` + suffix số cho homograph cùng level. Sau fix: 300 unique cả remote + local, API = 300.
2. **Route QA dev-login** (mới): `POST /api/v1/auth/dev-login` — tạo user+session QA + Set-Cookie better-auth cho browser thật (httpOnly không set được qua JS); hoàn toàn tắt ở production (thiếu `DEV_LOGIN_SECRET` → 404).

## Verify chéo
- Unit suite sau thay đổi: **228 files / 1.323 pass / 0 fail**.
- E2E Playwright suite: 44/44 (chạy bù W2/W3/W6) — bổ sung cho các điểm browser thật không verify được (YouTube embed, guest widget, 2-session sync).
