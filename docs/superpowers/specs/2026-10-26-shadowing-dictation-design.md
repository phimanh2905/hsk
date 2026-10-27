# Design: Shadowing Studio nâng cấp — Dictation 2 variant + Auto-pause + Karaoke + Pron mode

Ngày: 2026-10-26 · Trạng thái: chờ owner review · Nguồn RE: nhaihsk.com/shadowing/EA3rwvr99Q0 (chunk 384, API giải mã RSA-AES) — chỉ HỌC cơ chế, KHÔNG copy data/curated content của đối thủ.

## Mục tiêu

Studio shadowing của app-next có đủ 3 mode như đối thủ — **Shadow** (hiện có, giữ nguyên), **Dictation** (nâng cấp mạnh: 2 variant + per-char diff + stats), **Pron** (tách mode riêng) — cộng **auto-pause** và **karaoke highlight** theo word timing cho 20 video YouTube (W1 đã sinh whisper word timing).

## Quyết định owner đã chốt (2026-10-26)

1. **Word timing**: YouTube trước (20 video có word timing từ whisper W1). Dialogues Kokoro chỉ karaoke theo câu, không auto-pause, không sinh timing giả.
2. **Pron mode**: tách mode thứ 3 riêng như đối thủ.

## Phát hiện RE then chốt (tham chiếu, không chép)

- Diff chính tả đối thủ: two-pointer per-char, punctuation → skip, NFKC normalize, kết quả `{marks, missing, errors, total}`; feedback per-câu (perfect / n lỗi) + đếm lượt phát lại + điểm lần trước.
- Dictation A/B 2 variant (`Typing` / `Arrange`) — variant chọn được, localStorage nhớ lựa chọn.
- Segments API có `words[]: {text, reading, startMs, endMs}` per-word.
- Player: auto-pause cuối câu/cụm, đổi tốc độ, zoom, phím tắt Space/mũi tên/Digit1-2.
- Pron mode: recorder mic + chấm heuristic (không SpeechRecognition) — app đã có sẵn tương đương (`scoreFor`).

## Kiến trúc

### 1. Data — word timing vào D1 (WSD.1)

- Script `scripts/content/merge-word-timing.mts`: đọc `scripts/content/out/<videoId>/whisper.json` (đã có từ W1, word timestamps) + `split-sentences` hiện có → sinh `words: [{zh, py, startMs, endMs}]` per sentence (ghép word-token vào câu đã tách: word thuộc câu nếu startMs ∈ [start, end]).
- Migration: bảng `content_shadowing_subtitles` đổi cột `sentences` (JSON) — giữ shape `{n, start, end, parts, pinyin, vi}` và thêm key `words` vào từng sentence object (JSON mode → không migration schema, chỉ re-seed).
- Re-seed 20 video YouTube local + remote. Dialogues audio: không thêm `words` (undefined → UI biết).
- `src/content/shadowing.ts`: type `SubtitleSentence` thêm `words?: ShadowWord[]`.

### 2. Lib thuật toán (WSD.2, thuần + TDD)

- `src/lib/shadowing/diff-chars.ts` — thay thế `diffNormalized`: two-pointer (port ý tưởng đối thủ, viết lại): skip punctuation/space, NFKC lowercase, per-char `{ch, state: "ok"|"bad"|"skip"}`, trả `{marks, errors, missing, total}`. Decision-table tests (insert/xóa/thêm dấu thanh/punctuation).
- `src/lib/shadowing/dictation-stats.ts` — localStorage `bye.shadowing.dictStats.<videoId>`: `{[lineN]: {lastScore, errors, replays}}` qua ProgressStore method mới (append pattern Wave 0).
- `src/lib/shadowing/auto-pause.ts` — hook logic thuần: cho `words[]` + `currentMs` + `playing` → quyết định pause tại `endMs` của từ/câu khi bật auto-pause (poll 100ms như engine hiện có).

### 3. Studio UI (WSD.3–WSD.5)

- **Mode switch**: tabs Shadow / Dictation / Pron + phím Digit1/2/3 (state trong studio, không đổi URL).
- **Dictation nâng cấp** (thay dictation box hiện tại):
  - 2 nút variant Typing/Arrange; lựa chọn lưu `bye.shadowing.dictVariant`.
  - **Typing**: textarea + KIỂM TRA → per-char highlight (ok/bad/skip) bằng diff-chars + badge Lỗi sai / Thiếu / Điểm lần trước / Lượt phát lại; nút 👁 mở từng chữ (dictEyeHint); TIẾP THEO sang câu sau; reason line ("Hoàn toàn chính xác" / "Bạn mắc n lỗi").
  - **Arrange**: mảnh = các từ của câu (từ `parts` hoặc `words`, shuffle deterministic theo seed lineN); chạm mảnh để ghép; KIỂM TRA so khớp chuỗi; sai → mảnh đỏ, đúng → sang câu sau.
  - Ghi stats qua dictation-stats khi check; recordPractice score = % đúng (thay hằng 85).
- **Karaoke + auto-pause** (chỉ video có `words`):
  - Transcript stream: câu active highlight từ hiện tại (theo currentMs ∈ [startMs, endMs]).
  - Toggle "Tự ngắt câu" (mặc định off, nhớ localStorage): engine pause tại endMs câu khi đến gần (poll 100ms có sẵn trong use-player-engine).
- **Pron mode** (tab mới): transcript thu gọn + nút BẮT ĐẦU GHI ÂM/DỪNG (dùng use-recorder sẵn có) + điểm `scoreFor` + tip "nói rõ từng âm tiết"; recordPractice như shadow.
- **Phím tắt**: Digit1/2/3 đổi mode; Space play/pause giữ nguyên; S đổi tốc độ giữ nguyên.

### 4. Không làm (YAGNI)

- Không A/B test variant tự động (đối thủ dùng variant để đo — mình cho user chọn).
- Không copy curated content/word timing của đối thủ (pháp lý — whisper timing tự sinh W1).
- Không translation style per-user, không view count server (đã có progress riêng).
- Không zoom video (chi phí UI lớn, ít giá trị học).

## Acceptance

- Unit: diff-chars decision table (≥10 case biên), auto-pause logic, dictation-stats; suite 228+ files xanh.
- E2E mở rộng `shadowing` spec: dictation typing sai → highlight + stats; arrange ghép đúng; pron record mock → score; mode switch phím.
- Browser QA: karaoke highlight chạy theo video thật hsk1; auto-pause dừng cuối câu; 3 mode chuyển phím.

## Ước lượng: ~1 tuần solo. Rủi ro: whisper word timing lệch câu (verify khi merge — word ngoài [start,end] bỏ); arrange shuffle phải deterministic theo (videoId, lineN).
