/* Port 1:1 từ clone/js/pinyin-utils.js (+ BYE.stripTones từ clone/js/shell.js) */

const MARKS: Record<string, string[]> = {
  a: ["ā", "á", "ǎ", "à", "a"],
  o: ["ō", "ó", "ǒ", "ò", "o"],
  e: ["ē", "é", "ě", "è", "e"],
  i: ["ī", "í", "ǐ", "ì", "i"],
  u: ["ū", "ú", "ǔ", "ù", "u"],
  "ü": ["ǖ", "ǘ", "ǚ", "ǜ", "ü"],
};

/* Thứ tự ưu tiên đặt dấu: a > o > e > i > u > ü
   Ngoại lệ: "iu" -> dấu trên u (liù), "ui" -> dấu trên i (huì) */
const PRIORITY = ["a", "o", "e", "i", "u", "ü"];

function markVowel(syl: string, tone: number): string {
  let target: string | null = null;
  if (syl.indexOf("iu") !== -1) target = "u";
  else if (syl.indexOf("ui") !== -1) target = "i";
  else {
    for (const p of PRIORITY) {
      if (syl.indexOf(p) !== -1) {
        target = p;
        break;
      }
    }
  }
  if (!target) return syl;
  const marked = MARKS[target][Math.min(Math.max(tone, 1), 5) - 1];
  if (!marked) return syl;
  const idx = syl.indexOf(target);
  return syl.slice(0, idx) + marked + syl.slice(idx + 1);
}

function convertToken(tok: string): string {
  const m = /^([a-züv:]+)(\d)?$/.exec(tok);
  if (!m) return tok; // dấu câu hoặc đã có sẵn dấu -> giữ nguyên
  const syl = m[1].replace(/u[:：]/g, "ü").replace(/v/g, "ü");
  let tone = m[2] ? parseInt(m[2], 10) : 5;
  if (tone < 1 || tone > 5) tone = 5;
  return markVowel(syl, tone);
}

export function toPinyin(input: string): string {
  if (input === null || input === undefined) return "";
  const s = String(input)
    .replace(/([a-züv:]+)(\d)/g, "$1$2 ") // "ping2guo3" -> "ping2 guo3 "
    .trim();
  if (!s) return "";
  return s
    .split(/\s+/)
    .map((tok) => {
      const low = tok.toLowerCase().replace(/([a-züv:]+)(\d)$/, "$1$2"); // giữ nguyên, chỉ lowercase
      // token hợp lệ (chữ + số tuỳ chọn) -> chuyển; không hợp lệ / đã có dấu -> giữ nguyên văn
      return /^([a-züv:]+)(\d)?$/.test(low) ? convertToken(low) : tok;
    })
    .filter((t) => t !== "")
    .join(" ");
}

/* shell.js BYE.stripTones — ü/ǖǘǚǜ -> v trước khi NFD
   (U+0308 nằm trong dải \u0300-\u036f nên phải thay trước để còn "v") */
export function stripTones(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/[üǖǘǚǜ]/g, "v")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[:'’·]/g, "");
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = Array.prototype.slice.call(arr) as T[];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

/* Tách pinyin (có sẵn dấu) thành mảng âm tiết: "Wáng lǎoshī" -> ["wáng","lǎo","shī"] */
const VOW = "aeiouüvāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ";
function isV(ch: string): boolean {
  return !!ch && VOW.indexOf(ch) !== -1;
}

export function splitPinyin(pinyin: string): string[] {
  const out: string[] = [];
  String(pinyin || "")
    .split(/\s+/)
    .forEach((tok) => {
      if (!tok) return;
      const low = tok.toLowerCase();
      let i = 0;
      while (i < low.length) {
        const start = i;
        if (/^(zh|ch|sh)/.test(low.slice(i))) i += 2;
        else if (/[bpmfdtnlgkhjqxrzcsyw]/.test(low[i])) i += 1;
        while (i < low.length && isV(low[i])) i++;
        if (low.slice(i, i + 2) === "ng" && (i + 2 >= low.length || !isV(low[i + 2]))) i += 2;
        else if (low[i] === "n" && (i + 1 >= low.length || !isV(low[i + 1]))) i += 1;
        out.push(low.slice(start, i) || low.slice(start, start + 1));
        if (i === start) i = start + 1; // tránh lặp vô hạn
      }
    });
  return out;
}

/* Ghép mảng pinyinPerChar thành 1 dòng hiển thị: "lǐ míng，nǐ hǎo。" */
export function pinyinLine(perChar: { c: string; py: string }[]): string {
  let out = "";
  let prevPunct = true;
  (perChar || []).forEach((t) => {
    if (!t.py) return;
    const isPunct = /[，。？！、：；…—]/.test(t.py);
    if (isPunct) {
      out += t.py;
      prevPunct = true;
      return;
    }
    out += (out && !prevPunct ? " " : "") + t.py;
    prevPunct = false;
  });
  return out;
}
