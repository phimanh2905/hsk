/* Port 1:1 từ clone/js/create-file.js — renderer A4 thuần chuỗi HTML (PLAN-13/16).
   renderPages(state) → mảng trang (mỗi trang 1 chuỗi sheet, <A4Preview> chỉ dangerouslySetInnerHTML).
   Tham chiếu clone: 162-189 (stroke svg), 191-231 (meta/ô/màu), 234-243 (sheetHtml),
   246-270 (stroke/big block), 272-345 (trace/word/grid/flat), 347-435 (buildPages/paginate). */

import type { CfState } from "./types";
import { STROKE_DATA as CONTENT_STROKES } from "@/content/hanzi-strokes";

export type StrokePolyline = number[][];

/* 8 chữ từ clone/js/data/hanzi.js:121-165 (toạ độ 0–100) — gộp với 你 từ @/content/hanzi-strokes */
const STROKE_DATA: Record<string, StrokePolyline[]> = {
  ...CONTENT_STROKES,
  "一": [[[14, 50], [86, 50]]],
  "二": [[[14, 32], [86, 32]], [[14, 68], [86, 68]]],
  "人": [[[50, 15], [20, 72]], [[34, 44], [84, 72]]],
  "口": [[[26, 24], [26, 76]], [[26, 24], [76, 24], [76, 76]], [[26, 76], [76, 76]]],
  "日": [[[28, 16], [28, 84]], [[28, 16], [74, 16], [74, 84]], [[28, 50], [74, 50]], [[28, 84], [74, 84]]],
  "木": [[[12, 42], [88, 42]], [[50, 10], [50, 90]], [[50, 50], [24, 80]], [[50, 50], [78, 80]]],
  "永": [
    [[52, 8], [47, 18]],
    [[24, 30], [74, 30], [58, 70], [64, 76]],
    [[28, 44], [40, 44], [30, 58]],
    [[54, 46], [36, 74]],
    [[56, 52], [80, 76]],
  ],
};

/* fallback generic 4 nét (khung ô vuông) cho chữ chưa có data — không throw */
export function genericStrokes(): StrokePolyline[] {
  return [
    [[20, 25], [80, 25]],
    [[22, 27], [22, 80]],
    [[78, 27], [78, 80]],
    [[20, 80], [80, 80]],
  ];
}

export function strokeDataOf(ch: string): StrokePolyline[] {
  return STROKE_DATA[ch] || genericStrokes();
}

/* mode: "full" (đen) | k (số) — nét 0..k-1 đen, nét k đỏ | "faint" (mờ) */
export function renderStrokeSvg(ch: string, mode: "full" | "faint" | number): string {
  const data = strokeDataOf(ch);
  const k = typeof mode === "number" ? mode : -1;
  let inner = "";
  for (let i = 0; i < data.length; i++) {
    if (k >= 0 && i > k) continue;
    const color = k >= 0 && i === k ? "#c23b22" : "#17150f";
    const op = mode === "faint" ? 0.14 : 1;
    const pts = data[i].map((p) => p[0] + "," + p[1]).join(" ");
    inner += '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-opacity="' + op +
      '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">' + inner + "</svg>";
}

function esc(s: unknown): string {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const NUMS = ["①", "②", "③", "④", "⑤"];

/* dòng meta: Hán Việt IN HOA + pinyin + nghĩa */
function metaLine(state: CfState, c: CfState["chars"][number]): string {
  let h = '<div class="text-sm mb-1">';
  h += '<span class="font-bold">' + esc((c.hv || "").toUpperCase() || "—") + "</span>";
  if (state.showPinyin && c.pinyin) h += ' <span class="zh">' + esc(c.pinyin) + "</span>";
  if (state.showMeaning && c.meaning) h += ' <span style="color:#888">— ' + esc(c.meaning) + "</span>";
  return h + "</div>";
}

/* map màu ô → giá trị CSS var --cell-c */
export function cellColorVar(color: CfState["cellColor"]): string {
  const map = { green: "#16a34a", red: "#dc2626", blue: "#2563eb", gray: "#9ca3af" };
  return map[color] || map.gray;
}

/* shape: decoration bên trong 1 ô theo state.cellType */
export function cellShape(state: CfState): string {
  const c = "var(--cell-c)";
  switch (state.cellType) {
    case "dien-tu": /* điền tự: bo tròn nhẹ */
      return '<i style="position:absolute;inset:5%;border:1px solid ' + c + ';border-radius:16%;pointer-events:none"></i>';
    case "mi": /* mễ tự: chéo + chữ thập nét đứt */
      return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">' +
        '<line x1="0" y1="0" x2="100" y2="100" stroke="' + c + '" stroke-width="1" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>' +
        '<line x1="100" y1="0" x2="0" y2="100" stroke="' + c + '" stroke-width="1" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>' +
        '<line x1="50" y1="0" x2="50" y2="100" stroke="' + c + '" stroke-width="1" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>' +
        '<line x1="0" y1="50" x2="100" y2="50" stroke="' + c + '" stroke-width="1" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/></svg>';
    case "vuong": /* ô vuông: dùng khung sẵn của .grid-cell */
      return "";
    case "hoi-cung": /* hồi cung: ô trong lồng ô */
      return '<i style="position:absolute;inset:16%;border:1px solid ' + c + ';pointer-events:none"></i>';
    case "cuu-cung": /* cửu cung: chữ thập giữa ô */
      return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">' +
        '<line x1="50" y1="0" x2="50" y2="100" stroke="' + c + '" stroke-width="1" vector-effect="non-scaling-stroke"/>' +
        '<line x1="0" y1="50" x2="100" y2="50" stroke="' + c + '" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>';
    default: return "";
  }
}

function shapeCell(state: CfState, inner: string, extraStyle?: string): string {
  return '<div class="grid-cell relative" style="--cell-c:' + cellColorVar(state.cellColor) + ";" + (extraStyle || "") + '">' +
    cellShape(state) + (inner || "") + "</div>";
}

function fadedChar(state: CfState, ch: string, size: number, opacity?: number): string {
  const op = opacity != null ? opacity : state.opacity / 100;
  return '<span class="zh zh-faded" style="font-size:' + (size || 1.6) + 'em;opacity:' + op + '">' + esc(ch) + "</span>";
}

function rowOf(state: CfState, cols: number, inner: string): string {
  let h = '<div class="grid" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">';
  for (let i = 0; i < cols; i++) h += shapeCell(state, inner);
  return h + "</div>";
}

/* chữ tô theo Kiểu chữ tô + Độ đậm + Cỡ chữ */
export function traceCharSpan(state: CfState, ch: string): string {
  const size = "font-size:" + (state.fontSize / 62) + "em;";
  const op = state.opacity / 100;
  if (state.traceStyle.indexOf("thin-dashed") >= 0)
    return '<span class="zh" style="' + size + "opacity:" + op + ';-webkit-text-stroke:0.5px #17150f;-webkit-text-fill-color:transparent">' + esc(ch) + "</span>";
  if (state.traceStyle.indexOf("dashed-hollow") >= 0)
    return '<span class="zh" style="' + size + "color:transparent;-webkit-text-stroke:1px dashed #17150f;opacity:" + op + '">' + esc(ch) + "</span>";
  if (state.traceStyle.indexOf("hollow") >= 0)
    return '<span class="zh" style="' + size + "color:transparent;-webkit-text-stroke:1px #17150f;opacity:" + Math.max(op, 0.5) + '">' + esc(ch) + "</span>";
  if (state.traceStyle.indexOf("faint") >= 0)
    return '<span class="zh zh-faded" style="' + size + "opacity:" + op + '">' + esc(ch) + "</span>";
  return '<span class="zh" style="' + size + '">' + esc(ch) + "</span>";
}

/* hàng ô: fillRows hàng có chữ mờ + blankRows hàng trống, pinyin trên hàng đầu */
function traceRows(state: CfState, word: CfState["chars"][number], cols: number): string {
  const chars = Array.from(word.hanzi);
  const perCharPy = word.pinyin ? String(word.pinyin).trim().split(/\s+/) : [];
  const exact = perCharPy.length === chars.length;
  let h = "";
  for (let r = 0; r < state.fillRows; r++) {
    if (state.showPinyin && word.pinyin && r === 0) {
      h += '<div class="grid text-center text-xs zh-faded" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">';
      for (let i = 0; i < cols; i++) h += "<div>" + (exact ? esc(perCharPy[i]) : (i === 0 ? esc(word.pinyin) : "")) + "</div>";
      h += "</div>";
    }
    h += '<div class="grid" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">';
    for (let c2 = 0; c2 < cols; c2++) {
      const show = r * cols + c2 < state.faintCount;
      h += shapeCell(state, show ? traceCharSpan(state, chars[c2 % chars.length] || "") : "");
    }
    h += "</div>";
  }
  for (let b = 0; b < state.blankRows; b++) {
    h += '<div class="grid" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">';
    for (let j = 0; j < cols; j++) h += shapeCell(state, "");
    h += "</div>";
  }
  return h;
}

function wordBlock(state: CfState, w: CfState["chars"][number]): string {
  let h = '<div class="mb-6 break-inside-avoid">';
  h += '<div class="flex items-baseline gap-2 flex-wrap mb-1">';
  h += '<span class="zh font-bold" style="font-size:1.4em">' + esc(w.hanzi) + "</span>";
  if (state.showPinyin && w.pinyin) h += '<span class="text-sm zh">(' + esc(w.pinyin) + ")</span>";
  if (state.showMeaning && w.meaning) h += '<span class="text-sm font-semibold">' + esc((w.hv || "").toUpperCase()) + " — " + esc(w.meaning) + "</span>";
  h += "</div>";
  h += traceRows(state, w, Math.max(Array.from(w.hanzi).length, 2));
  return h + "</div>";
}

function gridRows(state: CfState, count: number): string {
  let h = "";
  for (let r = 0; r < count; r++) {
    h += '<div class="grid" style="grid-template-columns:repeat(' + state.perRow + ',minmax(0,1fr))">';
    for (let i = 0; i < state.perRow; i++) h += shapeCell(state, "");
    h += "</div>";
  }
  return h;
}

function flatChars(state: CfState): { ch: string; py: string }[] {
  const out: { ch: string; py: string }[] = [];
  state.chars.forEach((w) => {
    const cs = Array.from(w.hanzi);
    const pys = w.pinyin ? w.pinyin.trim().split(/\s+/) : [];
    cs.forEach((ch, i) => {
      out.push({ ch: ch, py: pys.length === cs.length ? (pys[i] || "") : (i === 0 ? w.pinyin : "") });
    });
  });
  return out;
}

/* sheet A4 — NỘI DUNG trang (head + body + footer); wrapper print-page đặt ở <A4Preview>
   (đổi từ clone: sheetHtml không bọc div sheet — Task 11) */
function sheetHtml(state: CfState, content: string): string {
  let head = "";
  if (state.title) head += '<div class="text-center font-extrabold text-lg mb-2">' + esc(state.title) + "</div>";
  if (state.nameDate) head += '<div class="flex justify-between text-sm mb-4 pb-2 border-b-2 border-[#dccfb8]">' +
    "<span>Họ tên: ______________</span><span>Ngày: ____________</span></div>";
  return head +
    '<div class="sheet-body">' + content + "</div>" +
    '<div class="text-center text-xs mt-6 pt-2 border-t border-[#dccfb8]" style="color:#999">byehsk.com · facebook.com/groups/byehsk</div>';
}

function strokeBlock(state: CfState, c: CfState["chars"][number]): string {
  const data = strokeDataOf(c.hanzi);
  const n = data.length;
  const steps = Math.min(n, 5);
  let h = '<div class="mb-5 break-inside-avoid">';
  h += metaLine(state, c);
  h += '<div class="grid mb-1" style="grid-template-columns:repeat(6,minmax(0,1fr))">';
  h += shapeCell(state, renderStrokeSvg(c.hanzi, "full"));
  for (let s = 0; s < steps; s++) {
    const k = Math.round((s * (n - 1)) / Math.max(steps - 1, 1));
    h += shapeCell(state, '<span class="absolute top-0.5 left-1 text-[10px] font-bold" style="color:#c23b22">' + NUMS[s] + "</span>" + renderStrokeSvg(c.hanzi, k));
  }
  h += "</div>";
  for (let r = 0; r < 2; r++) h += rowOf(state, 8, fadedChar(state, c.hanzi, 1.5));
  return h + "</div>";
}

function bigBlock(state: CfState, c: CfState["chars"][number]): string {
  let h = '<div class="flex gap-3 mb-6 items-stretch break-inside-avoid">';
  h += '<div class="shrink-0">' + shapeCell(state, renderStrokeSvg(c.hanzi, "full"), "width:7rem;height:7rem") + "</div>";
  h += '<div class="flex-1 min-w-0">';
  h += metaLine(state, c);
  h += rowOf(state, 6, fadedChar(state, c.hanzi, 1.6));
  return h + "</div></div>";
}

function paginate<T>(items: T[], per: number, fn: (it: T) => string): string[] {
  const pages: string[] = [];
  let cur: string[] = [];
  items.forEach((it, i) => {
    if (i && i % per === 0) { pages.push(cur.join("")); cur = []; }
    cur.push(fn(it));
  });
  if (cur.length) pages.push(cur.join(""));
  return pages.length ? pages : [""];
}

/* port buildPages (create-file.js:347-425) — ĐỦ 9 nhánh theo id template; renderPages bọc sheetHtml */
function buildPages(state: CfState): string[] {
  const id = state.tpl;
  const totalRows = Math.max(state.fillRows + state.blankRows, 1);
  switch (id) {
    case "stroke-order":
      return paginate(state.chars, 2, (c) => strokeBlock(state, c));
    case "big-char":
      return paginate(state.chars, 3, (c) => bigBlock(state, c));
    case "vocab":
    case "vocab-check":
      return paginate(state.chars, 2, (c) => wordBlock(state, c));
    case "pinyin-write": {
      let h = "";
      state.chars.forEach((w) => {
        if (state.showPinyin && w.pinyin) h += '<div class="text-sm zh-faded mb-1">' + esc(w.pinyin) + "</div>";
        h += traceRows(state, w, Math.max(Array.from(w.hanzi).length, 2));
      });
      if (!state.chars.length) h += gridRows(state, totalRows);
      return [h];
    }
    case "paragraph": {
      const flat = flatChars(state);
      let body = "";
      for (let i = 0; i < flat.length || i === 0; i += state.perRow) {
        const row = flat.slice(i, i + state.perRow);
        if (!row.length && i > 0) break;
        if (state.showPinyin) {
          body += '<div class="grid text-center text-xs zh-faded" style="grid-template-columns:repeat(' + state.perRow + ',minmax(0,1fr))">';
          for (let j = 0; j < state.perRow; j++) body += "<div>" + (row[j] ? esc(row[j].py) : "") + "</div>";
          body += "</div>";
        }
        body += '<div class="grid" style="grid-template-columns:repeat(' + state.perRow + ',minmax(0,1fr))">';
        for (let k = 0; k < state.perRow; k++) {
          const show = k < state.faintCount && row[k];
          body += shapeCell(state, show ? traceCharSpan(state, row[k].ch) : "");
        }
        body += "</div>";
        if (i >= flat.length) break;
      }
      body += gridRows(state, state.blankRows);
      return [body];
    }
    case "lined-paper": {
      let lh = "";
      state.chars.forEach((w) => {
        lh += '<div class="mb-4 break-inside-avoid">';
        if (state.showPinyin && w.pinyin) lh += '<div class="text-sm zh-faded mb-1">' + esc(w.pinyin) + "</div>";
        lh += '<div class="border-t border-b border-[#dccfb8] py-1 flex gap-2 items-center">';
        Array.from(w.hanzi).forEach((ch, idx) => {
          lh += '<span style="font-size:' + (state.fontSize / 50) + 'em">' +
            (idx < state.faintCount ? traceCharSpan(state, ch) : '<span class="zh">' + esc(ch) + "</span>") + "</span>";
        });
        lh += "</div></div>";
      });
      for (let e = 0; e < state.blankRows; e++) lh += '<div class="border-t border-[#dccfb8] h-10"></div>';
      return [lh];
    }
    case "grid-paper": {
      /* giấy ô trống: luôn đủ ít nhất 1 trang đầy (14 hàng) */
      const pages: string[] = [];
      const rowsPerPage = 14;
      const rows = Math.max(totalRows, rowsPerPage);
      for (let p = 0; p * rowsPerPage < rows; p++) {
        pages.push(gridRows(state, Math.min(rowsPerPage, rows - p * rowsPerPage)));
      }
      return pages.length ? pages : [gridRows(state, rowsPerPage)];
    }
    case "cover": {
      const field = (label: string) =>
        '<div class="border-2 border-[#dccfb8] rounded-md px-3 py-2 text-sm" style="color:#999">' + label + ": ________________</div>";
      return ['<div class="min-h-[820px] flex flex-col items-center justify-center text-center gap-6">' +
        '<div class="grid-cell relative" style="width:112px;height:112px;--cell-c:' + cellColorVar(state.cellColor) + '">' + cellShape(state) +
        '<span class="zh" style="font-size:4em;opacity:' + Math.max(state.opacity / 100, 0.5) + '">练</span></div>' +
        '<h2 class="text-3xl font-extrabold">' + esc(state.title || "Sổ luyện viết chữ Hán") + "</h2>" +
        (state.nameDate ? '<div class="w-72 space-y-3 text-left">' + field("Họ tên") + field("Lớp") + field("Năm học") + "</div>" : "") +
        "</div>"];
    }
    default: return [""];
  }
}

export function renderPages(state: CfState): string[] {
  return buildPages(state).map((p) => sheetHtml(state, p));
}

/* estimator KHÔNG render — đồng bộ paginate per=2/3 và grid-paper rowsPerPage=14 */
export function estimatePages(state: CfState): number {
  const id = state.tpl;
  const n = state.chars.length;
  if (id === "stroke-order") return Math.max(Math.ceil(n / 2), 1);
  if (id === "big-char") return Math.max(Math.ceil(n / 3), 1);
  if (id === "vocab" || id === "vocab-check") return Math.max(Math.ceil(n / 2), 1);
  if (id === "grid-paper") {
    const totalRows = Math.max(state.fillRows + state.blankRows, 1);
    return Math.ceil(Math.max(totalRows, 14) / 14);
  }
  return 1;
}
