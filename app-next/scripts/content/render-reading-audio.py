#!/usr/bin/env python3
"""render-reading-audio (plan 2026-10-30 reading-library, Task 3): Kokoro offline TTS cho reading HSK 1-5.

Đọc data/reading/passages-hskN.json (mảng passage từ gen-reading.mts), với mỗi câu
render mp3 24kHz mono vào public/audio/reading/<passageId>/sent-<n>.mp3
(n từ 1, voice zf_001), đo duration bằng ffprobe và ghi index JSON chung
data/reading/audio-index.json dạng:
  { "<passageId>": { "sentences": [{ "audio": "sent-1.mp3", "durSec": 2.41 }, ...] }, ... }

Index là merge với file cũ (nếu có) nên --only không mất dữ liệu passage khác.
DurSec luôn ffprobe lại cho TẤT CẢ các câu (kể cả skip), nên JSON khớp đĩa.

QA gate mỗi câu: duration 0.3–20s và RMS > -50dBFS (bỏ im lặng). Fail → report
stderr + exit 1 (RMS đo trên wav render; câu skip chỉ check duration từ ffprobe).

Idempotent: câu đã có file đích thì skip (dùng --force để render lại).

KHÔNG chạy trong build/CI — tool thủ công. Cần venv có kokoro + soundfile và
ffmpeg/ffprobe trong PATH.

Usage:
  ./.venv-kokoro/bin/python render-reading-audio.py                # cả 5 level
  ./.venv-kokoro/bin/python render-reading-audio.py --level 1
  ./.venv-kokoro/bin/python render-reading-audio.py --only hsk1-reading-1 --force
  ./.venv-kokoro/bin/python render-reading-audio.py --dry-run      # không cần kokoro
Flags fixture (test cục bộ, không dùng thật): --data <dir> --public <dir> --out <dir>
"""
from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
import tempfile
from pathlib import Path

VOICE = "zf_001"
SAMPLE_RATE = 24000
MIN_DUR, MAX_DUR = 0.3, 20.0
MIN_RMS_DB = -50.0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    here = Path(__file__).resolve().parent
    app_root = here.parent.parent
    p = argparse.ArgumentParser(description="Render reading audio bằng Kokoro + audio-index ffprobe")
    g = p.add_mutually_exclusive_group()
    g.add_argument("--level", type=int, choices=[1, 2, 3, 4, 5], help="Chỉ render level HSK N (mặc định cả 5)")
    g.add_argument("--only", type=str, metavar="passageId", help="Chỉ 1 passage, ví dụ hsk1-reading-1")
    p.add_argument("--force", action="store_true", help="Render lại cả khi file mp3 đã tồn tại")
    p.add_argument("--dry-run", action="store_true", help="Chỉ liệt kê việc sẽ làm, không render")
    p.add_argument("--data", type=Path, default=here / "data" / "reading", help="Thư mục passages JSON")
    p.add_argument("--public", type=Path, default=app_root / "public" / "audio" / "reading", help="Thư mục audio output")
    p.add_argument("--out", type=Path, default=None, help="Ghi audio-index.json ra chỗ khác (mặc định --data)")
    args = p.parse_args(argv)
    if args.out is None:
        args.out = args.data
    return args


def load_passages(data_dir: Path, level: int) -> list[dict]:
    path = data_dir / f"passages-hsk{level}.json"
    if not path.exists():
        sys.exit(f"Không tìm thấy {path} — chạy gen-reading.mts --level {level} trước")
    records = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(records, list):
        sys.exit(f"{path} phải là mảng passage")
    return records


def ffprobe_duration(mp3: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp3)],
        check=True, capture_output=True, text=True,
    ).stdout.strip()
    return float(out)


def synth_line(pipeline, text: str, tmp_wav: Path, soundfile) -> None:
    """Ghép các chunk numpy 24kHz của KPipeline thành 1 file wav mono."""
    import numpy as np  # noqa: F401  (đi kèm kokoro)

    chunks = [result.audio for result in pipeline(text, voice=VOICE)]
    if not chunks:
        raise RuntimeError("KPipeline không trả chunk audio nào")
    audio = np.concatenate(chunks)
    soundfile.write(str(tmp_wav), audio, SAMPLE_RATE)


def check_rms_db(wav: Path, soundfile, passage_id: str, n: int) -> float:
    """RMS toàn file (dBFS, 0 dB = full scale). Ims lặng số học ~ -inf."""
    audio, _ = soundfile.read(str(wav))
    rms = math.sqrt(float((audio.astype("float64") ** 2).mean())) if audio.size else 0.0
    db = 20 * math.log10(rms) if rms > 0 else -math.inf
    if not db > MIN_RMS_DB:
        sys.exit(
            f"QA FAIL {passageId} sent-{n}: RMS {db:.1f}dBFS <= {MIN_RMS_DB}dBFS "
            "(âm im lặng) — xoá file đích nếu đã ghi và sửa câu."
        )
    return db


def transcode_to_mp3(tmp_wav: Path, mp3: Path) -> None:
    mp3.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(tmp_wav), "-ac", "1", "-ar", str(SAMPLE_RATE),
         "-codec:a", "libmp3lame", "-b:a", "32k", str(mp3)],
        check=True, capture_output=True, text=True,
    )


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    levels = [args.level] if args.level is not None else [1, 2, 3, 4, 5]
    only = args.only

    pipeline = None
    soundfile = None
    if not args.dry_run:
        from kokoro import KPipeline  # nặng — chỉ import khi render thật
        import soundfile

        pipeline = KPipeline(lang_code="zh")

    idx_path = args.out / "audio-index.json"
    index: dict[str, dict] = {}
    if idx_path.exists():
        index = json.loads(idx_path.read_text(encoding="utf-8"))

    tmp_dir = Path(tempfile.mkdtemp(prefix="reading-tts-"))
    total_files = 0
    qa_failures: list[str] = []
    try:
        for level in levels:
            passages = load_passages(args.data, level)
            for p in passages:
                pid = str(p["id"])
                if only is not None and pid != only:
                    continue
                sentences = p["sentences"]
                entry = index.setdefault(pid, {"sentences": []})
                entry["sentences"] = []
                for n, sent in enumerate(sentences, start=1):
                    mp3 = args.public / pid / f"sent-{n}.mp3"
                    if args.force or not mp3.exists():
                        if args.dry_run:
                            print(f"[dry-run] {pid}/sent-{n}.mp3 voice={VOICE} text={sent['zh'][:20]!r}")
                        else:
                            tmp_wav = tmp_dir / f"{pid}-{n}.wav"
                            synth_line(pipeline, sent["zh"], tmp_wav, soundfile)
                            check_rms_db(tmp_wav, soundfile, pid, n)
                            transcode_to_mp3(tmp_wav, mp3)
                            tmp_wav.unlink()
                    if args.dry_run and not mp3.exists():
                        total_files += 1
                        continue
                    dur = ffprobe_duration(mp3)
                    if not (MIN_DUR <= dur <= MAX_DUR):
                        qa_failures.append(f"{pid} sent-{n}: duration {dur:.2f}s ngoài [{MIN_DUR}, {MAX_DUR}]")
                        entry["sentences"].append({"audio": f"sent-{n}.mp3", "durSec": round(dur, 2)})
                        total_files += 1
                        continue
                    entry["sentences"].append({"audio": f"sent-{n}.mp3", "durSec": round(dur, 2)})
                    total_files += 1
                print(f"{pid}: {len(sentences)} câu ok")
    finally:
        for f in tmp_dir.glob("*.wav"):
            f.unlink(missing_ok=True)
        tmp_dir.rmdir()

    if qa_failures:
        for msg in qa_failures:
            print(f"QA FAIL: {msg}", file=sys.stderr)
        return 1

    if not args.dry_run:
        idx_path.parent.mkdir(parents=True, exist_ok=True)
        idx_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"ghi {idx_path} ({len(index)} passage)")
    else:
        print(f"[dry-run] sẽ ghi {idx_path} ({len(index)} passage)")

    print(f"xong: {total_files} câu{' (dry-run, không render)' if args.dry_run else ''}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
