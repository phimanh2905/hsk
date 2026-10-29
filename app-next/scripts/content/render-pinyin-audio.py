#!/usr/bin/env python3
"""render-pinyin-audio: Kokoro offline TTS cho bảng pinyin tĩnh.

Đọc data/pinyin/render-input.json (mảng cells từ gen-pinyin-hanzi-map — Task 2),
với mỗi cell {initial, final, base, hanzi: [char|null ×5]} render 1 mp3 24kHz
mono cho mỗi tone vào public/audio/pinyin/{base}-{tone}.mp3.

Text được synth:
  - ô có chữ Hán (hanzi[tone-1] != null) → synth chữ đó.
  - ô null chữ Hán nhưng tone 1-4 → pinyin-direct: synth pinyin có dấu
    (kết quả spike: "mā"/"ě" cho audio tiếng Trung ngắn, plausible).
  - ô null chữ Hán tone 5 (neutral) → skip (âm tiết không tồn tại theo
    thiết kế dữ liệu; pinyin không dấu cho audio kém tin cậy).

QA gate từng file: duration 0.2–1.5s (ffprobe) và RMS > -50 dBFS
(soundfile đọc lại mp3). File fail được ghi vào data/pinyin/render-report.json
(trường failed) và script exit code != 0.

Tính năng phụ: cắt im lặng đầu/cuối ngưỡng -45 dBFS (giữ 40ms pad) — chữ
Hán đơn âm của Kokoro hay có đuôi im lặng đẩy duration vượt 1.5s.

KHÔNG chạy trong build/CI — tool thủ công. Cần venv có kokoro + soundfile và
ffmpeg/ffprobe trong PATH. Venv dùng: scripts/content/.venv-kokoro (repo chính).

Usage:
  ./.venv-kokoro/bin/python render-pinyin-audio.py --dry-run
  ./.venv-kokoro/bin/python render-pinyin-audio.py --only ma
  ./.venv-kokoro/bin/python render-pinyin-audio.py --only ma --force
"""
from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

VOICE = "zf_xiaobei"  # zf_001 không tồn tại trên hexgrad/Kokoro-82M (spike đã xác nhận)
SAMPLE_RATE = 24000
MIN_DUR, MAX_DUR = 0.2, 1.5
MIN_RMS_DB = -50.0
TRIM_THRESHOLD_DB = -45.0
TRIM_PAD_SEC = 0.04

# Port của src/lib/pinyin/tone-mark.ts (applyTone) — giữ khớp logic.
_TONE_MARKS = {1: "\u0304", 2: "\u0301", 3: "\u030c", 4: "\u0300"}
_VOWEL_PRIORITY = ["a", "o", "e", "ü", "i", "u"]


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    here = Path(__file__).resolve().parent
    app_root = here.parent.parent
    p = argparse.ArgumentParser(description="Render audio pinyin tĩnh bằng Kokoro + QA gate")
    p.add_argument("--dry-run", action="store_true", help="Chỉ đếm việc sẽ làm, không import kokoro")
    p.add_argument("--only", type=str, default=None, help="Chỉ render 1 syllable theo base (vd: ma)")
    p.add_argument("--force", action="store_true", help="Render lại cả khi file mp3 đã tồn tại")
    p.add_argument(
        "--input", type=Path, default=here / "data" / "pinyin" / "render-input.json",
        help="Đường dẫn render-input.json",
    )
    p.add_argument("--public", type=Path, default=app_root / "public" / "audio" / "pinyin",
                   help="Thư mục output mp3")
    p.add_argument("--report", type=Path, default=here / "data" / "pinyin" / "render-report.json",
                   help="Đường dẫn render-report.json")
    return p.parse_args(argv)


def load_cells(input_path: Path) -> list[dict]:
    if not input_path.exists():
        sys.exit(f"Không tìm thấy {input_path} — chạy gen render-input.json (Task 2) trước")
    data = json.loads(input_path.read_text(encoding="utf-8"))
    cells = data["cells"] if isinstance(data, dict) else data
    if not isinstance(cells, list) or not all(isinstance(c, dict) for c in cells):
        sys.exit(f"{input_path} không đúng dạng cells[]")
    return cells


def main_vowel_index(s: str) -> int:
    if s.endswith("iu") or s.endswith("ui"):
        return len(s) - 1
    for v in _VOWEL_PRIORITY:
        i = s.find(v)
        if i >= 0:
            return i
    return -1


def apply_tone(syllable: str, tone: int) -> str:
    if tone == 5:
        return syllable
    s = syllable  # input đã NFC từ JSON
    i = main_vowel_index(s)
    if i < 0:
        return s
    return s[:i] + s[i] + _TONE_MARKS[tone] + s[i + 1 :]


def trim_silence(audio, numpy, threshold_db: float = TRIM_THRESHOLD_DB, pad_sec: float = TRIM_PAD_SEC):
    """Cắt im lặng đầu/cuối dưới ngưỡng, giữ lại pad_sec hai đầu."""
    amp = numpy.abs(audio)
    db = 20 * numpy.log10(amp + 1e-9)
    idx = numpy.where(db > threshold_db)[0]
    if len(idx) == 0:
        return audio
    pad = int(pad_sec * SAMPLE_RATE)
    start = max(0, int(idx[0]) - pad)
    end = min(len(audio), int(idx[-1]) + pad)
    return audio[start:end]


def rms_db(audio, numpy) -> float:
    rms = numpy.sqrt(numpy.mean(numpy.square(audio.astype(numpy.float64))))
    if rms <= 0 or math.isnan(rms):
        return -float("inf")
    return 20 * math.log10(rms)


def synth(pipeline, text: str, tmp_wav: Path, soundfile, numpy) -> None:
    chunks = [result.audio for result in pipeline(text, voice=VOICE)]
    if not chunks:
        raise RuntimeError("KPipeline không trả chunk audio nào")
    audio = numpy.concatenate(chunks)
    audio = trim_silence(audio, numpy)
    soundfile.write(str(tmp_wav), audio, SAMPLE_RATE)


def transcode_to_mp3(tmp_wav: Path, mp3: Path) -> None:
    mp3.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(tmp_wav), "-ac", "1", "-ar", str(SAMPLE_RATE),
         "-codec:a", "libmp3lame", "-q:a", "4", str(mp3)],
        check=True, capture_output=True, text=True,
    )


def ffprobe_duration(mp3: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp3)],
        check=True, capture_output=True, text=True,
    ).stdout.strip()
    return float(out)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    cells = load_cells(args.input)
    if args.only:
        cells = [c for c in cells if c["base"] == args.only]
        if not cells:
            sys.exit(f"--only {args.only}: không có cell nào khớp base trong input")

    pipeline = None
    soundfile = None
    numpy = None
    if not args.dry_run:
        from kokoro import KPipeline  # nặng — chỉ import khi render thật
        import numpy as np
        import soundfile

        pipeline = KPipeline(lang_code="z")
        numpy = np

    plan: list[tuple[dict, int, str, Path, str | None]] = []  # (cell, tone, text, mp3, skip_reason)
    for cell in cells:
        base = cell["base"]
        hanzi = cell["hanzi"]
        for tone in range(1, 6):
            char = hanzi[tone - 1]
            mp3 = args.public / f"{base}-{tone}.mp3"
            if char is not None:
                plan.append((cell, tone, char, mp3, None))
            elif tone <= 4:
                plan.append((cell, tone, apply_tone(base, tone), mp3, None))
            else:
                plan.append((cell, tone, base, mp3,
                             "null hanzi tone 5 (neutral form không tồn tại theo dữ liệu)"))

    to_render = [p for p in plan if p[4] is None and (args.force or not p[3].exists())]
    by_tone_skip = {t: sum(1 for p in plan if p[4] is not None and p[1] == t) for t in range(1, 6)}
    by_tone_new = {t: sum(1 for p in to_render if p[1] == t) for t in range(1, 6)}

    if args.dry_run:
        print(f"[dry-run] input: {len(cells)} cells → {len(plan)} mục tone")
        print(f"[dry-run] sẽ render: {len(to_render)} (theo tone: {by_tone_new})")
        print(f"[dry-run] skip null-tone5: {sum(by_tone_skip.values())} (theo tone: {by_tone_skip})")
        existing = len(plan) - len(to_render) - sum(by_tone_skip.values())
        print(f"[dry-run] đã có trên đĩa (bỏ qua): {existing}")
        for cell, tone, text, mp3, reason in plan[:10]:
            print(f"[dry-run] {mp3.name} text={text!r} reason={reason}")
        return 0

    tmp_dir = Path(tempfile.mkdtemp(prefix="pinyin-tts-"))
    rendered = 0
    failed: list[dict] = []
    duration_ok = rms_ok = 0
    try:
        for i, (cell, tone, text, mp3, _reason) in enumerate(to_render, 1):
            base = cell["base"]
            try:
                # basename: guard against a base ever containing a path
                # separator (would escape tmp_dir); impossible with current
                # data, but cheap to enforce.
                tmp_wav = tmp_dir / f"{os.path.basename(base)}-{tone}.wav"
                synth(pipeline, text, tmp_wav, soundfile, numpy)
                transcode_to_mp3(tmp_wav, mp3)
                tmp_wav.unlink()
                dur = ffprobe_duration(mp3)
                audio, _sr = soundfile.read(str(mp3))
                rdb = rms_db(audio, numpy)
                ok_dur = MIN_DUR <= dur <= MAX_DUR
                ok_rms = rdb > MIN_RMS_DB
                if ok_dur:
                    duration_ok += 1
                if ok_rms:
                    rms_ok += 1
                if not ok_dur or not ok_rms:
                    reasons = []
                    if not ok_dur:
                        reasons.append(f"duration {dur:.2f}s ngoài [{MIN_DUR}, {MAX_DUR}]")
                    if not ok_rms:
                        reasons.append(f"RMS {rdb:.1f} dBFS <= {MIN_RMS_DB}")
                    failed.append({"syllable": base, "tone": tone, "reason": "; ".join(reasons)})
                    print(f"FAIL {mp3.name}: {failed[-1]['reason']}")
                else:
                    rendered += 1
                if i % 50 == 0:
                    print(f"tiến độ: {i}/{len(to_render)} ok={rendered} fail={len(failed)}")
            except Exception as exc:  # noqa: BLE001 — ghi vào report rồi tiếp tục
                failed.append({"syllable": base, "tone": tone, "reason": repr(exc)})
                print(f"ERROR {base}-{tone}: {exc!r}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    skipped = [{"syllable": p[0]["base"], "tone": p[1], "reason": p[4]} for p in plan if p[4] is not None]
    skipped_existing = len(plan) - len(to_render) - len(skipped)
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "voice": VOICE,
        "rendered": rendered,
        "skipped": skipped,
        "skippedExisting": skipped_existing,
        "failed": failed,
        "qa": {"durationOk": duration_ok, "rmsOk": rms_ok},
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"ghi {args.report}")
    print(f"xong: rendered={rendered} failed={len(failed)} skipped={len(skipped)} "
          f"skipExisting={skipped_existing} (qa durationOk={duration_ok} rmsOk={rms_ok})")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
