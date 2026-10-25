# Design: Lộ trình hoàn thiện app-next HSK1→HSK5 (chuẩn HSK 3.0) — full user journey

Ngày: 2026-10-24 · Trạng thái: ĐÃ DUYỆT (owner) · Phạm vi: app-next + D1 + Workers

## Mục tiêu

Mọi phân hệ trong menu có user journey khép kín: **vào → học content thật → lưu tiến độ (multi-device khi login) → quay lại tiếp tục được**, độ phủ content HSK 1→5 chuẩn HSK 3.0, ngang khả năng funcional của nhaihsk.com nhưng content tự sở hữu 100%.

## Nguyên tắc kiến trúc (học từ RE nhaihsk 2026-10-23)

1. **localStorage-first**: ghi local ngay → debounce ~5s sync server; merge **số lấy max, timestamp lấy cũ nhất**; tombstone xóa mềm 90 ngày chống re-add.
2. **Thuật toán chạy client** (SRS, XP, battle scoring) — server chỉ lưu, hợp kiến trúc Workers giá rẻ.
3. **Content pre-generated**: audio render offline thành mp3 tĩnh self-host; AI sinh content bằng batch script offline, không gọi runtime.
4. **Content tự sở hữu**: word list HSK 3.0 là tiêu chuẩn công khai; nghĩa/ví dụ AI sinh + owner review; audio Kokoro tự render; transcript tự sinh bằng Whisper. KHÔNG copy database/curated content từ nhaihsk (rủi ro pháp lý: bản quyền biên soạn, cạnh tranh không lành mạnh). Video YouTube công khai embed qua IFrame API chính thức là hợp pháp (kể cả video đối thủ đang dùng — video thuộc kênh gốc).

## Quyết định đã chốt bởi owner (2026-10-24)

| Quyết định | Chọn |
|---|---|
| Thứ tự lộ trình | A — Content-first, shadowing đẩy lên đầu |
| Nguồn content vocab/grammar | AI batch + spot-check review |
| TTS dialogue/audio tự sinh | Kokoro offline (self-host mp3) |
| LLM cho batch + assistant | Endpoint OpenAI-compatible `buffproxy.softtip88.workers.dev/v1/chat/completions`, model `smart-router/fallback` (key qua env/secret, không commit) |
| Transcript video | Whisper chạy local trên máy dev (whisper.cpp / faster-whisper), KHÔNG scrape transcript nhaihsk |

## Wave 0 — Vá journey đang gãy (thuần client)

**Mục tiêu:** các phân hệ đã có bắt đầu lưu được toàn bộ trạng thái người dùng thấy trên UI.

**Công việc:**
- W0.1 Gọi `markPageDone` khi learner hoàn thành bài (mode cuối / ngưỡng hoàn thành) → dashboard `lessonsDone` hoạt động (hiện luôn = 0).
- W0.2 Hanzi Studio: lưu kết quả quiz draw vào ProgressStore key mới `bye.hanzi.quiz` (char → attempts/best/last); catalog + trang detail hiển thị trạng thái "đã luyện".
- W0.3 Sound-rules: lưu điểm quiz tốt nhất (`bye.soundrules.best`).
- W0.4 Reading: auto-save bài dán vào `bye.reading.drafts`, quay lại còn nguyên bài + vị trí.

**Đạt được:** dashboard/progress hiển thị số thật; không còn tính năng "học xong mà không nhớ gì".

**Acceptance:** e2e mới cho markPageDone + hanzi quiz persist; toàn bộ test hiện có xanh. Ước lượng: 2–3 ngày.

## Wave 1 — Shadowing full journey với video thật (whisper pipeline)

**Mục tiêu:** phân hệ shadowing có thư viện video thật + phụ đề câu-đúng-câu (như nhaihsk), hoàn thiện TRƯỚC để thông full user journey theo yêu cầu owner.

**Công việc:**
- W1.0 Setup Whisper local trên máy dev (brew whisper-cpp hoặc pip faster-whisper; model medium zh) + script transcribe 1 video test, verify timestamp chất lượng.
- W1.1 Curate danh sách 20–40 video YouTube học tiếng Trung (nguồn: tìm kiếm YouTube + các video công khai đối thủ đang embed; chỉ lấy video ID — thuộc kênh gốc).
- W1.2 Script `scripts/content/build-shadowing-from-youtube.mts`: video ID → yt-dlp tải audio (chỉ để transcribe nội bộ) → Whisper word-timestamps → tách câu + pinyin (pypinyin) → owner review nhanh → sinh SQL seed theo schema `content_shadowing_videos/subtitles` hiện có (giữ `youtubeId`, embed youtube-nocookie).
- W1.3 Nạp seed D1 local (`hsk-dev`) + remote; mở rộng số video có phụ đề từ 1/20 → toàn bộ.
- W1.4 (giữ nguyên tốt hiện có) mic record + score + progress D1 merge; thêm hiển thị % phụ đề đã hoàn thành trên library card.

**Đạt được:** user vào /shadowing → chọn video thật → nghe theo câu, thu âm, chấm điểm, tiến độ lưu server → quay lại tiếp tục. Journey khép kín 100%, không còn FALLBACK_SUBS.

**Acceptance:** ≥ 20 video có phụ đề thật trên local D1; e2e shadowing xanh; transcript không chứa dữ liệu lấy từ API nhaihsk (review thủ công). Ước lượng: 4–6 ngày.

## Wave 2 — Content vocab + grammar HSK 1–5 thật (AI batch qua buffproxy)

**Mục tiêu:** thay content demo (155 từ/20 bài, 6 điểm grammar) bằng đầy đủ HSK 1–5.

**Công việc:**
- W2.1 Import word list HSK 3.0 công khai (HSK1: 500 → HSK5: 4316 từ cumulative, có pinyin) vào `scripts/content/src/`.
- W2.2 Script `gen-vocab-batch.mts` gọi buffproxy (`smart-router/fallback`) sinh theo ĐÚNG schema `src/content/vocab.ts` hiện có (meaning, ví dụ + nghĩa ví dụ, âm Hán Việt) — component không đổi; chunk + retry + resume; owner spot-check 5%/level.
- W2.3 Chia bài 15–25 từ/bài theo chủ đề (AI gom nhóm) → books hsk1..hsk5 với số bài thật.
- W2.4 Chạy `gen-vocab-seed.mts` mở rộng → seed D1 local + remote; static fallback đồng bộ.
- W2.5 Grammar HSK1–5 (~60 điểm/level): AI draft + owner review; đưa vào D1 theo hướng branch `my-grammar-d1` (gộp nợ kỹ thuật đang dở: content layer + API + dehardcode trang).

**Đạt được:** /course hiện 5 sách với số bài thật; học liên tục không cạn content; my-grammar có data thật và sync D1.

**Acceptance:** số từ/bài khớp chuẩn HSK 3.0; grep gates; test content-validate xanh; e2e lesson chạy bài cuối HSK5. Ước lượng: 1–2 tuần (gồm thời gian chờ batch + review).

## Wave 3 — Dialogue + Reading tự sinh (Kokoro + AI)

**Mục tiêu:** track curriculum không phụ thuộc YouTube: hội thoại + bài đọc sinh từ đúng vocab từng bài.

**Công việc:**
- W3.1 Script sinh hội thoại 8–15 câu/bài (2 vai, chỉ dùng từ trong độ phủ bài) qua buffproxy + review.
- W3.2 Script Kokoro render mp3 từng câu (chạy local, voice zf_001/zm_009 có sẵn) → `public/audio/<book>/<lesson>-<n>.mp3`; segment timing = tổng duration từng file (chính xác tuyệt đối, không cần align).
- W3.3 Mở rộng schema `content_shadowing` hỗ trợ nguồn `type: audio` (không youtubeId) + seed; studio hỗ trợ player `<audio>` song song YouTube.
- W3.4 Reading passages theo level (vocab/quiz đi kèm) sinh cùng batch; lưu tiến độ đọc (dùng W0.4 + sync Wave 4).

**Đạt được:** mỗi bài vocab có "nghe hội thoại" + "bài đọc" cùng độ phủ từ; media tự sở hữu hoàn toàn; thêm được vô hạn không tốn runtime.

**Acceptance:** ≥ 1 dialogue/bài cho HSK1–3; player audio chạy e2e; dung lượng public/ trong ngân sách (nén, chunk). Ước lượng: 1 tuần.

## Wave 4 — HybridStore sync (backend)

**Mục tiêu:** tiến độ multi-device; guest local → login merge-push (mô hình đã chứng minh của đối thủ).

**Công việc:**
- W4.1 Bảng D1 mới: `srs_cards`, `study_day` (user, date, xp, correct, updated_at), `lesson_progress` (user, book, lesson, modes json, updated_at, deleted_at). Migration 0005.
- W4.2 `lib/store/hybrid-store.ts` bọc ProgressStore: write local + dirty → debounce 5s POST `/api/v1/sync` (batch upsert); response merge max/oldest; tombstone `deleted_at` 90 ngày; xung đột clock dùng updated_at.
- W4.3 API `/api/v1/sync` auth bắt buộc; guest thuần local; login lần đầu merge-push hai chiều.
- W4.4 Server-side gate thật cho /my-vocab, /my-grammar, /progress (bỏ LoginGate client-only).

**Đạt được:** học trên điện thoại, mở laptop thấy liền; không còn "đổi máy mất sạch" (nợ lớn nhất hiện tại).

**Acceptance:** e2e 2 session (guest→login→second device) không mất dữ liệu; migration + seed remote chạy sạch. Ước lượng: 1–2 tuần.

## Wave 5 — SRS SM-2 + stats thật

**Công việc:**
- W5.1 Nâng `applyGrade` Leitner 21 ngày → SM-2 4 mức (ease 2.5; Again −0.2 ease & interval×0.5; Hard ×1.2; Good ×ease; Easy +0.15 & ×1.3; mature ≥21 ngày; relearning 1/10 phút), giữ interface, migrate dữ liệu cũ (tiền lệ migrate 3 format đã có).
- W5.2 Review logs (card_type, item_key, rating, duration_ms) lưu local + sync Wave 4; `/progress` heatmap/streak ăn `study_day` thật; bỏ rank placeholder 14594−xp.

**Đạt được:** ôn tập có chu kỳ quên thật, thống kê trung thực. Ước lượng: 3–5 ngày.

## Wave 6 — Gamification + luyện thi

**Công việc:**
- W6.1 Mode Đấu trí trong lesson (ghép 5 dạng câu hỏi từ các mode sẵn có; min 4 từ) — scoring client-side: 100đ chính xác + 50đ tốc độ (≤2s/câu), max 150đ/bài.
- W6.2 Bảng D1 `battle_attempts` + API; /leaderboard thật (per-lesson + monthly) thay `content/leaderboard.ts` mock.
- W6.3 Certificate-test: đề format HSK 3.0 (listening/reading/writing) sinh từ content + audio Kokoro; chấm tự luận bỏ dấu câu + đếm `\u3400-\u9fff`; lưu kết quả D1; bỏ toast "sắp ra mắt".

**Đạt được:** vòng lặp thi đấu/xếp hạng thật; luyện thi có đề. Ước lượng: 1–2 tuần.

## Wave 7 — AI assistant (buffproxy qua /api/ai)

**Công việc:**
- W7.1 Route `/api/ai` trên Worker: forward sang buffproxy upstream (`smart-router/fallback`), upstream/key cấu hình qua wrangler secret (`AI_UPSTREAM_URL`, `AI_UPSTREAM_KEY`) — key KHÔNG vào client bundle; timeout + rate limit per user (dùng `cf-connecting-ip` như auth rate limit hiện có).
- W7.2 Thay chat "Tiểu Ngữ" mock bằng widget thật gọi /api/ai (đăng nhập; guest nút upgrade).
- W7.3 Use cases: giải thích ngữ pháp trong lesson, chấm viết Hanzi, "tạo reading từ văn bản tôi dán" (nối W3.4).
- Lưu ý vận hành: buffproxy là proxy ngoài không kiểm soát — nội dung chat đi qua bên thứ ba; thiết kế upstream hoán đổi được, không gửi PII, có fallback tắt gọn khi upstream chết.

**Đạt được:** AI thật trong app với chi phí gần bằng 0; có thể kéo sớm nếu owner muốn (endpoint đã chạy). Ước lượng: 3–5 ngày.

## Thứ tự & phụ thuộc

0 → 1 → 2 → 3 → 4 → 5 → 6 → 7. Wave 5 phụ thuộc 4 (sync); Wave 6 phụ thuộc 2 (content đầy đủ); Wave 7 độc lập, có thể bất kỳ lúc nào sau 0. Tổng: ~6–9 tuần part-time solo.

## Rủi ro & giảm thiểu

- **Whisper timestamp kém** với nhạc/ồn → chọn video nói chuyện, model medium, review câu gãy.
- **AI batch dịch sai nghĩa nhạy cảm** → spot-check 5%/level + sửa trực tiếp trong file nguồn rồi re-seed.
- **buffproxy không ổn định/đổi chính sách** → mọi consumer đọc từ 1 module config; hoán đổi upstream 1 dòng.
- **Dung lượng audio public/** → mp3 mono 24kHz, nén; kiểm tra trước khi deploy.
- **Pháp lý content** — không dùng transcript/data từ API nhaihsk; video chỉ embed chính thức; transcript tự sinh.
