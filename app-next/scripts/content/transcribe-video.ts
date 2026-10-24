/* Pipeline 1 video: yt-dlp audio → whisper.cpp -ojf -ml 1 → tách câu → pypinyin.
   CHỈ chạy trên máy dev (cần brew whisper-cli + venv). Audio/JSON trung gian ở out/
   (gitignored) — pháp lý: không commit, không dùng dữ liệu ngoài curated list. */
import { execFile } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { splitSentences, type WhisperToken } from "./split-sentences";
import type { WordPinyin } from "./pinyin-parts";

export type TokenizedSentence = { zh: string; start: number; end: number; words: WordPinyin };

export const PY_SEGMENT_SNIPPET = `import sys, json
from pypinyin import lazy_pinyin
with open(sys.argv[1], encoding="utf-8") as f:
    words = json.load(f)
print(json.dumps([{"zh": w["zh"], "py": lazy_pinyin(w["zh"], errors="ignore")} for w in words], ensure_ascii=False))`;

const RUN = (cmd: string, args: string[], cwd: string) =>
  new Promise<string>((res, rej) =>
    execFile(cmd, args, { cwd, maxBuffer: 256 * 1024 * 1024 }, (err, stdout) =>
      err ? rej(new Error(`${cmd} failed: ${String(err.message).slice(0, 400)}`)) : res(stdout)
    )
  );

export function flattenWhisperJson(json: string): WhisperToken[] {
  const d = JSON.parse(json) as { transcription: { offsets: { from: number; to: number }; text: string }[] };
  return d.transcription
    .map((t) => ({ text: t.text.replace(/\s+/g, ""), start: t.offsets.from / 1000, end: t.offsets.to / 1000 }))
    .filter((t) => t.text !== "");
}

export async function transcribeVideo(videoId: string, opts?: { outDir?: string }): Promise<TokenizedSentence[]> {
  const root = opts?.outDir ?? join(import.meta.dirname, "out");
  const dir = join(root, videoId);
  await mkdir(dir, { recursive: true });
  const venv = join(import.meta.dirname, ".venv", "bin");
  const yt = join(venv, "yt-dlp");
  const py = join(venv, "python");
  await RUN(yt, ["-x", "--audio-format", "wav", "-o", join(dir, "audio.%(ext)s"), `https://www.youtube.com/watch?v=${videoId}`], import.meta.dirname);
  await RUN(
    "whisper-cli",
    ["-m", join(import.meta.dirname, "models", "ggml-medium.bin"), "-l", "zh", "-ml", "1", "-ojf", "-f", join(dir, "audio.wav"), "-of", join(dir, "whisper")],
    import.meta.dirname
  );
  const tokens = flattenWhisperJson(await readFile(join(dir, "whisper.json"), "utf8"));
  const sentences = splitSentences(tokens);
  // python không nhận stdin qua execFile → ghi words.json rồi snippet đọc qua sys.argv[1]
  const wordsFile = join(dir, "words.json");
  await writeFile(wordsFile, JSON.stringify(sentences.map((s) => ({ zh: s.zh }))), "utf8");
  const pyOut = await RUN(py, ["-c", PY_SEGMENT_SNIPPET, wordsFile], import.meta.dirname);
  await writeFile(join(dir, "pinyin.json"), pyOut, "utf8");
  const wordPinyin = JSON.parse(pyOut) as WordPinyin[];
  return sentences.map((s, i) => ({ zh: s.zh, start: s.start, end: s.end, words: wordPinyin[i] ?? { zh: s.zh, py: [] } }));
}
