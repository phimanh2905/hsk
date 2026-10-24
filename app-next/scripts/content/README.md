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
