/* Port 1:1 từ clone/js/create-file.js — defaults, merge, parseLine, AI mock format.
   charInfo: clone đọc NHAI_DATA.hanzi trước, fallback sau; app-next không có window.NHAI_DATA
   nên trả CHAR_INFO_FALLBACK luôn (giữ chữ ký cho formatAiMock). */

import { getVocabData } from "@/lib/srs-session";
import type { VocabData as VocabSource, VocabWord } from "@/lib/content/vocab";
import type { CfChar, CfState } from "./types";

export const CHAR_INFO_FALLBACK: Record<string, { pinyin: string; hanViet: string; meaning: string }> = {
  永: { pinyin: "yǒng", hanViet: "VĨNH", meaning: "vĩnh viễn, mãi mãi" },
  远: { pinyin: "yuǎn", hanViet: "VIỄN", meaning: "xa" },
  学: { pinyin: "xué", hanViet: "HỌC", meaning: "học" },
  习: { pinyin: "xí", hanViet: "TẬP", meaning: "tập luyện" },
  汉: { pinyin: "hàn", hanViet: "HÁN", meaning: "tiếng Hán, người Hán" },
  字: { pinyin: "zì", hanViet: "TỰ", meaning: "chữ" },
};

export function charInfo(ch: string): { pinyin: string; hanViet: string; meaning: string } {
  return CHAR_INFO_FALLBACK[ch] || { pinyin: "", hanViet: "", meaning: "" };
}

export const DEFAULT_CHARS: CfChar[] = [
  { hanzi: "学习", pinyin: "xué xí", hv: "HỌC TẬP", meaning: "học tập" },
  { hanzi: "朋友", pinyin: "péng yǒu", hv: "BẰNG HỮU", meaning: "bạn bè" },
  { hanzi: "老师", pinyin: "lǎo shī", hv: "LÃO SƯ", meaning: "giáo viên" },
  { hanzi: "工作", pinyin: "gōng zuò", hv: "CÔNG TÁC", meaning: "công việc" },
];

function copyChars(chars: CfChar[]): CfChar[] {
  return chars.map((c) => ({ hanzi: c.hanzi, pinyin: c.pinyin, hv: c.hv, meaning: c.meaning }));
}

/* 18 nhóm key đúng bảng Global Constraints (clone create-file.js:62-82) */
export function cfDefaults(): CfState {
  return {
    tpl: null,
    chars: copyChars(DEFAULT_CHARS),
    title: "",
    nameDate: true,
    cellType: "dien-tu",
    cellColor: "gray",
    perRow: 12,
    fillRows: 1,
    blankRows: 0,
    faintCount: 3,
    script: "khai",
    strokeSource: "CNstrokeorder",
    traceStyle: ["faint"],
    opacity: 30,
    fontSize: 78,
    showPinyin: true,
    showMeaning: true,
  };
}

function fallbackChars(): CfChar[] {
  return Object.keys(CHAR_INFO_FALLBACK).map((ch) => ({
    hanzi: ch,
    pinyin: charInfo(ch).pinyin,
    hv: charInfo(ch).hanViet,
    meaning: charInfo(ch).meaning,
  }));
}

/* 4 từ mẫu đầu Bài 1 HSK1 (đếm "4 từ sẽ có trong bản in") — data đọc từ nguồn
   inject của srs-session (ContentBridge → API), thay import content/vocab trực tiếp. */
export function vocabCharsFrom(data: VocabSource): CfChar[] {
  const words: VocabWord[] = data.hsk1?.["lesson-1"]?.words.slice(0, 4) ?? [];
  return words.map((w) => ({ hanzi: w.hanzi, pinyin: w.pinyin, hv: w.hanViet, meaning: w.meaning }));
}

/* chars theo template; template khác → DEFAULT_CHARS (clone cfReset giữ DEFAULT_CHARS) */
export function cfDefaultsFor(tpl: string | null): CfState {
  const d = cfDefaults();
  d.tpl = tpl || null;
  if (tpl === "stroke-order" || tpl === "big-char") d.chars = fallbackChars();
  else if (tpl === "vocab") d.chars = vocabCharsFrom(getVocabData() ?? {});
  return d;
}

/* port cfLoadAll (create-file.js:89-105): mọi key có trong raw thắng default;
   chars/traceStyle không phải array (hoặc rỗng với traceStyle) → default */
export function mergeCfState(raw: unknown, tpl: string | null): CfState {
  const d = cfDefaultsFor(tpl);
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  const merged = { ...d };
  Object.keys(d).forEach((k) => {
    if (o[k] !== undefined) {
      (merged as unknown as Record<string, unknown>)[k] = o[k];
    }
  });
  if (tpl !== null && o.tpl === undefined) merged.tpl = tpl;
  if (!Array.isArray(merged.chars)) merged.chars = d.chars;
  if (!Array.isArray(merged.traceStyle) || !merged.traceStyle.length) merged.traceStyle = d.traceStyle;
  return merged;
}

/* tách 1 dòng "hanzi pinyin nghĩa" (clone create-file.js:439-450);
   hv suy từ charInfo của từng chữ, IN HOA */
export function parseLine(line: string): CfChar | null {
  const tokens = String(line).trim().split(/\s+/);
  if (!tokens.length || !tokens[0]) return null;
  const pyRe = /^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+$/;
  const hz = tokens[0];
  const py: string[] = [];
  const mean: string[] = [];
  for (let i = 1; i < tokens.length; i++) {
    if (!mean.length && pyRe.test(tokens[i])) py.push(tokens[i]);
    else mean.push(tokens[i]);
  }
  const hv = Array.from(hz)
    .map((ch) => (charInfo(ch).hanViet || "").split(/\s+/)[0] || "")
    .join(" ")
    .trim()
    .toUpperCase();
  return { hanzi: hz, pinyin: py.join(" "), hv: hv, meaning: mean.join(" ") };
}

/* mock "AI": chuẩn hoá pinyin + Hán Việt IN HOA từ charInfo + nghĩa fallback chữ đầu
   (clone create-file.js:775-786) */
export function formatVocabMock(chars: CfChar[]): CfChar[] {
  return chars.map((c0) => {
    const c = { ...c0 };
    c.pinyin = c.pinyin.replace(/\s+/g, " ").trim();
    const hv = Array.from(c.hanzi)
      .map((ch) => (charInfo(ch).hanViet || "").split(/\s+/)[0] || "")
      .join(" ")
      .trim();
    if (hv) c.hv = hv.toUpperCase();
    if (!c.meaning) c.meaning = charInfo(Array.from(c.hanzi)[0] || "").meaning || "";
    return c;
  });
}
