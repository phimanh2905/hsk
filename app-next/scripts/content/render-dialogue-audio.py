#!/usr/bin/env python3
"""render-dialogue-audio (W3.2): Kokoro offline TTS cho dialogue HSK 1-3.

Đọc data/dialogues/dialogues-hskN.json (mảng DialogueRecord từ gen-dialogues),
với mỗi line render mp3 24kHz mono vào public/audio/<book>/<lesson>-<n>.mp3
(voice: speaker A -> zf_001, B -> zm_009), đo duration bằng ffprobe và ghi
timing JSON data/dialogues/timing-hskN.json dạng:
  { "<book>/<lesson>": [{ "n": 1, "durSec": 3.42 }, ...] }

Idempotent: line đã có file đích thì skip (dùng --force để render lại).
Luôn tính lại timing cho TẤT CẢ các line (kể cả skip) từ ffprobe, nên JSON
luôn đầy đủ khớp số file trên đĩa.

KHÔNG chạy trong build/CI — tool thủ công. Cần venv có kokoro + soundfile
và ffmpeg/ffprobe trong PATH (xem README.md mục "Kokoro render dialogue").

Usage:
  ./.venv/bin/python render-dialogue-audio.py --level 1
  ./.venv/bin/python render-dialogue-audio.py --lesson hsk1/lesson-1
  ./.venv/bin/python render-dialogue-audio.py --level 1 --force
  ./.venv/bin/python render-dialogue-audio.py --level 1 --dry-run  # không cần kokoro
Flags fixture (test cục bộ, không dùng thật): --data <dir> --public <dir> --out <dir>
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

VOICE_BY_SPEAKER = {"A": "zf_xiaoxiao", "B": "zm_yunjian"}
SAMPLE_RATE = 24000
LESSON_RE = re.compile(r"^lesson-\d+$")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    here = Path(__file__).resolve().parent
    app_root = here.parent.parent
    p = argparse.ArgumentParser(description="Render dialogue audio bằng Kokoro + timing ffprobe")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--level", type=int, choices=[1, 2, 3], help="Render cả level HSK 1/2/3")
    g.add_argument("--lesson", type=str, help="Chỉ 1 bài, id dạng hsk1/lesson-1")
    p.add_argument("--force", action="store_true", help="Render lại cả khi file mp3 đã tồn tại")
    p.add_argument("--dry-run", action="store_true", help="Chỉ liệt kê việc sẽ làm, không render")
    p.add_argument("--data", type=Path, default=here / "data" / "dialogues", help="Thư mục dialogues/timing JSON")
    p.add_argument("--public", type=Path, default=app_root / "public" / "audio", help="Thư mục audio output")
    p.add_argument("--out", type=Path, default=None, help="Ghi timing JSON ra chỗ khác (mặc định --data)")
    args = p.parse_args(argv)
    if args.out is None:
        args.out = args.data
    if args.lesson is not None:
        m = re.match(r"^(hsk[123])/(lesson-\d+)$", args.lesson)
        if not m:
            p.error("--lesson phải có dạng hsk1/lesson-1 (hsk1..hsk3)")
        args._book, args._lesson_id = m.group(1), m.group(2)
    return args


def load_records(data_dir: Path, level: int) -> list[dict]:
    path = data_dir / f"dialogues-hsk{level}.json"
    if not path.exists():
        sys.exit(f"Không tìm thấy {path} — chạy gen-dialogues.mts trước")
    records = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(records, list):
        sys.exit(f"{path} phải là mảng DialogueRecord")
    return records


def ffprobe_duration(mp3: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp3)],
        check=True, capture_output=True, text=True,
    ).stdout.strip()
    return float(out)


def synth_line(pipeline, text: str, voice: str, tmp_wav: Path, soundfile) -> None:
    """Ghép các chunk numpy 24kHz của KPipeline thành 1 file wav mono."""
    import numpy as np  # noqa: F401  (đi kèm kokoro)

    chunks = [result.audio for result in pipeline(text, voice=voice)]
    if not chunks:
        raise RuntimeError("KPipeline không trả chunk audio nào")
    audio = np.concatenate(chunks)
    soundfile.write(str(tmp_wav), audio, SAMPLE_RATE)


def transcode_to_mp3(tmp_wav: Path, mp3: Path) -> None:
    mp3.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(tmp_wav), "-ac", "1", "-ar", str(SAMPLE_RATE),
         "-codec:a", "libmp3lame", "-b:a", "32k", str(mp3)],
        check=True, capture_output=True, text=True,
    )


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    levels: list[int]
    only: str | None = None
    if args.lesson is not None:
        levels = [int(args._book[-1])]
        only = args._lesson_id
    else:
        levels = [args.level]

    pipeline = None
    soundfile = None
    if not args.dry_run:
        from kokoro import KPipeline  # nặng — chỉ import khi render thật
        import soundfile

        pipeline = KPipeline(lang_code="zh")

    tmp_dir = Path(tempfile.mkdtemp(prefix="dialogue-tts-"))
    total_files = 0
    try:
        for level in levels:
            records = load_records(args.data, level)
            timing: dict[str, list[dict]] = {}
            for rec in records:
                book, lesson = rec["book"], rec["lesson"]
                if book != f"hsk{level}" or not LESSON_RE.match(str(lesson)):
                    continue
                if only is not None and lesson != only:
                    continue
                lines = rec["lines"]
                timing[f"{book}/{lesson}"] = []
                for line in lines:
                    n, speaker = int(line["n"]), str(line["speaker"])
                    voice = VOICE_BY_SPEAKER.get(speaker)
                    if voice is None:
                        sys.exit(f'{book}/{lesson} line {n}: speaker không hợp lệ "{speaker}"')
                    mp3 = args.public / book / f"{lesson}-{n}.mp3"
                    if args.force or not mp3.exists():
                        if args.dry_run:
                            print(f"[dry-run] {book}/{lesson}-{n}.mp3 voice={voice} text={line['zh'][:20]!r}")
                        else:
                            tmp_wav = tmp_dir / f"{book}-{lesson}-{n}.wav"
                            synth_line(pipeline, line["zh"], voice, tmp_wav, soundfile)
                            transcode_to_mp3(tmp_wav, mp3)
                            tmp_wav.unlink()
                    if args.dry_run and not mp3.exists():
                        total_files += 1
                        continue
                    dur = round(ffprobe_duration(mp3), 2)
                    timing[f"{book}/{lesson}"].append({"n": n, "durSec": dur})
                    total_files += 1
                print(f"{book}/{lesson}: {len(lines)} file ok")
            out_path = args.out / f"timing-hsk{level}.json"
            if not args.dry_run:
                out_path.parent.mkdir(parents=True, exist_ok=True)
                out_path.write_text(json.dumps(timing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                print(f"ghi {out_path} ({len(timing)} bài)")
            else:
                print(f"[dry-run] sẽ ghi {out_path} ({len(timing)} bài)")
    finally:
        for f in tmp_dir.glob("*.wav"):
            f.unlink(missing_ok=True)
        tmp_dir.rmdir()

    print(f"xong: {total_files} line{' (dry-run, không render)' if args.dry_run else ''}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
