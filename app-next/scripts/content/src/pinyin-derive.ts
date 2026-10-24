/* pinyin-derive (Ruling 1+2, W2.2): derive pinyinPerChar + hanViet DETERMINISTIC,
   không dùng kết quả LLM. Pinyin per-char qua python bridge (pypinyin, venv W1),
   hanViet per-char qua bảng hanvietData (package MIT hanviet-pinyin-words). */
import { execFile } from "node:child_process";
import { writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { hanvietData } from "./hanviet-data";
import type { PinyinPerChar } from "../../../src/content/vocab";

export type CharPy = { c: string; py: string; t3: string; t?: string };

/* python không nhận stdin qua execFile → ghi items.json, snippet đọc qua sys.argv[1] */
export const PY_PINYIN_SNIPPET = `import sys, json
from pypinyin import lazy_pinyin, Style
from zhconv import convert
with open(sys.argv[1], encoding="utf-8") as f:
    items = json.load(f)
def is_han(c):
    return '\\u4e00' <= c <= '\\u9fff'
out = []
for it in items:
    row = []
    for c in it["zh"]:
        if is_han(c):
            tone = lazy_pinyin(c, style=Style.TONE, errors=lambda a: [a])
            tone3 = lazy_pinyin(c, style=Style.TONE3, errors=lambda a: [a])
            row.append({"c": c, "py": tone[0], "t3": tone3[0], "t": convert(c, "zh-hant")})
        else:
            row.append({"c": c, "py": c, "t3": c, "t": c})
    out.append(row)
print(json.dumps(out, ensure_ascii=False))`;

export const VENV_PYTHON = path.join(import.meta.dirname, "../.venv/bin/python");

async function runPython(pythonBin: string, zhList: string[]): Promise<CharPy[][]> {
  const tmp = path.join(path.dirname(pythonBin), "..", "py-derive-input.json");
  await writeFile(tmp, JSON.stringify(zhList.map((zh) => ({ zh }))), "utf8");
  const stdout = await new Promise<string>((res, rej) =>
    execFile(
      pythonBin,
      ["-c", PY_PINYIN_SNIPPET, tmp],
      { maxBuffer: 256 * 1024 * 1024 },
      (err, out) => (err ? rej(new Error(`python failed: ${String(err.message).slice(0, 400)}`)) : res(out))
    )
  ).finally(() => unlink(tmp).catch(() => {}));
  return JSON.parse(stdout) as CharPy[][];
}

/* punct/space: py chụp nguyên ký tự (convention như perChar cũ) */
const PUNCT = /[，。？！、：；…—,.!?;:()"'\s（）]/;

export function pyPerChar(rows: CharPy[]): PinyinPerChar[] {
  return rows.map(({ c, py }) => ({ c, py: PUNCT.test(c) ? c : py }));
}

/* hanViet per-char: map['字']['kang4'] → 'khang'; neutral tone 5 → thử 1..4;
   '*' = đọc mặc định; không có trong map → '' (validate cho phép, liệt kê report) */
/* chữ thiếu trong map (2/2971 char của HSK 3.0) — bổ sung tay */
const HAN_VIET_OVERRIDES: Record<string, string> = { "着": "TRỨ", "痹": "TỊ" };

export function hanVietChar(c: string, t3: string, trad?: string): string {
  // bảng hanvietData theo chữ PHỒN THỂ — tra qua t (zhconv), fallback chữ gốc
  const entry = hanvietData[trad ?? c] ?? hanvietData[c];
  if (HAN_VIET_OVERRIDES[c]) return HAN_VIET_OVERRIDES[c];
  if (!entry) return "";
  if (entry["*"]) return entry["*"][0] ?? "";
  if (entry[t3]) return entry[t3][0] ?? "";
  const base = t3.replace(/\d$/, ""); // pypinyin TONE3 bỏ hẳn số cho thanh neutral
  for (const tone of ["5", "1", "2", "3", "4", ""]) {
    if (entry[base + tone]) return entry[base + tone][0] ?? "";
  }
  return "";
}

export function hanVietOf(chars: CharPy[]): string {
  return chars
    .filter(({ c }) => !PUNCT.test(c))
    .map(({ c, t3, t }) => hanVietChar(c, t3, t))
    .join(" ")
    .toUpperCase();
}

/* derive cả pinyinPerChar + hanViet cho danh sách câu/word — 1 lần gọi python */
export async function derivePinyinBatch(
  zhList: string[],
  opts?: { pythonBin?: string }
): Promise<{ perChar: PinyinPerChar[][]; hanViet: string[]; perCharRows: CharPy[][] }> {
  const rows = await runPython(opts?.pythonBin ?? VENV_PYTHON, zhList);
  return {
    perChar: rows.map(pyPerChar),
    hanViet: rows.map(hanVietOf),
    perCharRows: rows
  };
}

/* đọc lại output python cho unit test (stub python in JSON ra stdout) */
export async function parseRows(stdout: string): Promise<{ perChar: PinyinPerChar[][]; hanViet: string[] }> {
  const rows = JSON.parse(stdout) as CharPy[][];
  return { perChar: rows.map(pyPerChar), hanViet: rows.map(hanVietOf) };
}

export async function readJsonFile(f: string): Promise<CharPy[][]> {
  return JSON.parse(await readFile(f, "utf8")) as CharPy[][];
}
