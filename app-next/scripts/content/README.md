# Shadowing transcribe pipeline (whisper.cpp + yt-dlp + pypinyin)

Toolchain dùng cho Wave 1 (shadowing video → text + pinyin).

> Cảnh báo pháp lý: Audio chỉ tải nội bộ để transcribe, không commit (.venv/out/models đã gitignore); không dùng dữ liệu nhaihsk.

## Cài đặt (macOS darwin arm64)

### 1. whisper.cpp + ffmpeg (Homebrew)

```bash
brew install whisper-cpp ffmpeg
which whisper-cli && whisper-cli --help >/dev/null && echo OK
```

### 2. Model medium (~1.5GB, tải vào `scripts/content/models/`)

```bash
mkdir -p /Volumes/samsung512/Code/hsk/app-next/scripts/content/models
curl -L -C - -o /Volumes/samsung512/Code/hsk/app-next/scripts/content/models/ggml-medium.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin
ls -lh /Volumes/samsung512/Code/hsk/app-next/scripts/content/models/ggml-medium.bin
# File đúng phải ~1.5GB. Nếu nhỏ hơn (~1.0GB) thì file bị cut giữa chừng,
# whisper-cli sẽ báo "ERROR not all tensors loaded from model file - expected 947, got 695"
# → resume download bằng curl -L -C - như trên.
```

### 3. Python venv với yt-dlp + pypinyin

```bash
cd /Volumes/samsung512/Code/hsk/app-next/scripts/content
python3 -m venv .venv
./.venv/bin/pip install --upgrade pip
./.venv/bin/pip install yt-dlp pypinyin
./.venv/bin/yt-dlp --version && ./.venv/bin/python -c "import pypinyin; print('pypinyin OK')"
```

## Smoke verify

Lấy 90 giây đầu của video test (đủ để verify, tránh chờ full video ~16 phút):

```bash
cd /Volumes/samsung512/Code/hsk/app-next/scripts/content
mkdir -p out/EA3rwvr99Q0
./.venv/bin/yt-dlp -x --audio-format wav -o "out/EA3rwvr99Q0/audio.%(ext)s" "https://www.youtube.com/watch?v=EA3rwvr99Q0"
ffmpeg -y -i out/EA3rwvr99Q0/audio.wav -t 90 out/EA3rwvr99Q0/audio-smoke.wav
whisper-cli -m models/ggml-medium.bin -l zh -ml 1 -ojf \
  -f out/EA3rwvr99Q0/audio-smoke.wav -of out/EA3rwvr99Q0/whisper-smoke
```

Verify JSON có token-level timestamps (`timestamps.from` + `text` ở từng phần tử `transcription`):

```bash
python3 -c "import json;d=json.load(open('out/EA3rwvr99Q0/whisper-smoke.json'));t=d['transcription'][0];print('OK', t['timestamps']['from'], repr(t['text']))"
```

Kết quả tham chiếu (máy dev, 2026-10-24): `OK 00:00:00,000 '啊'` — 218 tokens cho 90s audio, ~13s tổng thời gian (Metal).

Lưu ý: `-ml 1` bắt buộc (mỗi token 1 segment con) để có `timestamps.from` ở từng phần tử; `-ojf` = JSON full, không fallback text.

## Word list HSK 3.0 (W2 content pipeline)

Tải dataset chuẩn HSK 3.0 vào `scripts/content/vendor/` (gitignored, không commit):

```bash
mkdir -p /Volumes/samsung512/Code/hsk/app-next/scripts/content/vendor
curl -L -o /Volumes/samsung512/Code/hsk/app-next/scripts/content/vendor/hsk30.csv \
  https://raw.githubusercontent.com/ivankra/hsk30/master/hsk30.csv
head -2 /Volumes/samsung512/Code/hsk/app-next/scripts/content/vendor/hsk30.csv
```

- Nguồn: repo `ivankra/hsk30` (branch `master`) — License: MIT (code), dữ liệu nguồn văn bản Bộ GD&ĐT TQ.
- File dùng: `hsk30.csv` (1 dòng/từ, cột `Simplified`/`Pinyin`/`Level`). Level `1..6`, `7-9` bị parser bỏ qua.
- Chuẩn cumulative HSK 3.0: 500 / 1272 / 2245 / 3245 / 4316 (level 1-5).

## Script W2 (Node, chạy bằng tsx)

```bash
cd /Volumes/samsung512/Code/hsk/app-next
pnpm vitest run scripts/content            # unit + integration test
pnpm exec tsx scripts/content/src/hsk-list.ts   # (nếu có CLI; các script batch ở task sau)
```

## Dialogues + Reading (Wave 3)

Sinh hội thoại mẫu per bài học (dialogue) qua LLM cho HSK 1–3, dùng cho tab Reading/Kokoro.

- Input: `data/vocab/lessons-hskN.json` (từ gen-lessons W2.3) + `data/vocab/hsk1..N.json` (vocab cumulative để check OOV).
- Output: `scripts/content/data/dialogues/dialogues-hskN.json` — mảng `{id: "hskN/lesson-X", book, lesson, title, titleVi, lines: [{n, speaker: "A"|"B", zh, pinyin, vi}]}` (audio/durSec thêm sau khi TTS).
- Validate thuần: `scripts/content/src/dialogues.ts` (8–15 câu, vai A/B xen kẽ, đủ zh/pinyin/vi; OOV vocab chỉ là warning).

Chạy (mỗi level một lệnh, KHÔNG chạy trong build/CI):

```bash
cd /Volumes/samsung512/Code/hsk/app-next
pnpm dlx tsx scripts/content/gen-dialogues.mts --level 1
pnpm dlx tsx scripts/content/gen-dialogues.mts --level 2
pnpm dlx tsx scripts/content/gen-dialogues.mts --level 3
# 1 bài duy nhất (regenerate sau khi xóa bài khỏi JSON):
pnpm dlx tsx scripts/content/gen-dialogues.mts --level 1 --lesson lesson-1
```

Env: `.env.local` (app-next) cung cấp `CONTENT_LLM_BASE_URL` / `CONTENT_LLM_KEY` / `CONTENT_LLM_MODEL`. 1 request/bài, retry kèm message lỗi tối đa 5 lần/bài; chạy lại sẽ skip các bài đã có trong output. Exit 1 nếu còn bài fail.

### Review checklist (spot-check mỗi level)

1. Số câu 8–15, vai A/B xen kẽ đúng (bắt đầu A).
2. Mỗi câu đủ zh + pinyin + vi; pinyin có dấu thanh, KHÔNG tone number (lỗi LLM hay gặp: `ni3` — nếu hàng loạt thì fix prompt rồi chạy lại).
3. Dịch Việt tự nhiên, đúng nghĩa; câu không máy móc/lặp cấu trúc.
4. Từ trong câu nằm trong độ phủ vocab của bài + level trước (cột OOV trong log chỉ là warning — xem có đáng bỏ qua không).
5. Nội dung bám chủ đề bài; không dính nội dung có bản quyền.

### Kokoro render dialogue audio (W3.2)

TTS offline (Kokoro, CPU darwin arm64) từng câu dialogue → mp3 24kHz mono + timing JSON.

Voice map theo speaker: `A` → `zf_001` (nữ), `B` → `zm_009` (nam).

Cài đặt (một lần):

```bash
cd /Volumes/samsung512/Code/hsk/app-next/scripts/content
python3 -m venv .venv && .venv/bin/pip install 'kokoro>=0.8' soundfile
brew list espeak-ng >/dev/null 2>&1 || brew install espeak-ng   # misaki G2P fallback
brew list ffmpeg >/dev/null 2>&1 || brew install ffmpeg          # mp3 + ffprobe
# Smoke test (lần đầu tải model về ~/.cache/hexgrad):
./.venv/bin/python -c "from kokoro import KPipeline; p=KPipeline(lang_code='zh'); print('ok')"
```

Render (cần `data/dialogues/dialogues-hskN.json` từ gen-dialogues trước; KHÔNG chạy trong build/CI):

```bash
cd /Volumes/samsung512/Code/hsk/app-next/scripts/content
./.venv/bin/python render-dialogue-audio.py --lesson hsk1/lesson-1   # smoke 1 bài, nghe thử mp3
./.venv/bin/python render-dialogue-audio.py --level 1                # batch cả level
./.venv/bin/python render-dialogue-audio.py --level 2
./.venv/bin/python render-dialogue-audio.py --level 3
# --force render lại cả khi mp3 đã có; --dry-run chỉ liệt kê (không cần kokoro)
```

Output: `public/audio/<book>/<lesson>-<n>.mp3` (32kbps mono 24kHz) + `data/dialogues/timing-hskN.json`
dạng `{ "<book>/<lesson>": [{ "n": 1, "durSec": 3.42 }] }` — durSec làm tròn 2 chữ số, đo bằng ffprobe.
Idempotent: line đã có mp3 thì skip; timing luôn tính lại toàn bộ từ file trên đĩa.

Verify sau render: mỗi dialogue đủ số file = số dòng; `ffprobe -v error -show_entries stream=sample_rate,channels -of csv=p=0 public/audio/hsk1/lesson-1-1.mp3` → `24000, 1`.

## Seed playlist "Hội thoại theo bài" (W3.3)

Sau khi `gen-dialogues` + `merge-audio-timing` đã có `data/dialogues/dialogues-hskN.json`
(với `audio` + `durSec` từng line):

```bash
cd /Volumes/samsung512/Code/hsk/app-next
pnpm dlx tsx scripts/content/gen-shadowing-dialogue-seed.mts   # ghi drizzle/seeds/content-shadowing-dialogues.sql
pnpm wrangler d1 execute hsk-dev --remote --file=drizzle/seeds/content-shadowing-dialogues.sql -c wrangler.dev.jsonc   # dev
pnpm wrangler d1 execute hsk --remote --file=drizzle/seeds/content-shadowing-dialogues.sql   # prod (chỉ owner chạy khi duyệt)
pnpm wrangler d1 execute hsk --local --command "SELECT type, COUNT(*) FROM content_shadowing_videos GROUP BY type"   # verify
```

Migration cột (`type`, `audio_dir`) là `drizzle/0008_*.sql` — apply trước khi seed.
Idempotent: INSERT OR REPLACE theo PK, chạy lại an toàn.

## Ngân sách dung lượng public/audio (W3 T10)

Check tổng dung lượng mp3 render vào `public/audio/**`, nhóm theo book:

```bash
cd /Volumes/samsung512/Code/hsk/app-next
pnpm dlx tsx scripts/content/src/check-audio-size.mts
# --audio-dir <path> để trỏ thư mục khác (dùng trong unit test fixture)
```

- Ngưỡng: WARN nếu tổng > 40MB, FAIL (exit 1) nếu tổng > 80MB.
- Kỳ vọng sau render đủ HSK 1–3: ~25–35MB (130 bài × ~50s × 32kbps).
- Vượt WARN → giảm bitrate về 24k trong `render-dialogue-audio.py` rồi render lại `--force`.
- Unit test: `pnpm vitest run scripts/content/__tests__/check-audio-size.test.ts` (fixture tmp dirs).

## Acceptance checklist Wave 3 (dialogue + reading + Kokoro)

Chạy các verify sau khi hoàn tất data thật (gen-dialogues → render Kokoro → merge-audio-timing → seed D1):

1. **≥1 dialogue/bài HSK 1–3** — đếm bằng node:
   ```bash
   node -e '
   for (const l of [1,2,3]) {
     const d = require("./scripts/content/data/dialogues/dialogues-hsk" + l + ".json");
     console.log("hsk" + l, d.length, "bài");
   }'
   # Kỳ vọng: số bài = số bài học của level (hsk1: lesson-1..N), mỗi bài 8–15 câu.
   ```
2. **e2e player audio** — `pnpm exec playwright test e2e/content-d1.spec.ts`:
   case "playlist audio + player + mp3 (acceptance W3)" + case fixme "hsk1/lesson-1"
   trả 200 và có `<audio data-testid="audio-player">` (bật fixme khi data đã seed).
3. **Size trong ngân sách** — `pnpm dlx tsx scripts/content/src/check-audio-size.mts`
   → `OK` (tổng ≤ 40MB; nếu WARN/FAIL xem mục ngân sách ở trên).
4. **Reading passages** — `/reading` render từ `src/content/reading-passages.ts`
   (static, e2e case "trang /reading render không cần audio").
