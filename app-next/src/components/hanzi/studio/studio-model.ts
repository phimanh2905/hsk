/* Logic thuần cho Hanzi Studio radical-first — tách khỏi component để test không cần render. */
import { RADICAL_INDEX, type StudioRadical } from "@/content/hanzi-studio/radical-index";
import { CHAR_META, type StudioCharMeta } from "@/content/hanzi-studio/char-meta";

export type CatalogMode = "rad" | "hsk";
export type StrokeFilter = "all" | "1-2" | "3" | "4" | "5+";
export type CatFilter = "core" | "human" | "nature" | "animal";
export type HskLevel = "HSK 1" | "HSK 2" | "HSK 3";
export type StudioSelection = { kind: "rad"; g: string } | { kind: "char"; g: string };

export const PAGE_SIZE = 8;

export const STROKE_FILTERS: { key: StrokeFilter; label: string }[] = [
  { key: "all", label: "Tất cả (214)" },
  { key: "1-2", label: "1–2 nét" },
  { key: "3", label: "3 nét" },
  { key: "4", label: "4 nét" },
  { key: "5+", label: "5+ nét" },
];
export const CAT_FILTERS: { key: CatFilter; label: string }[] = [
  { key: "core", label: "50 bộ cốt lõi" },
  { key: "human", label: "Con người" },
  { key: "nature", label: "Thiên nhiên" },
  { key: "animal", label: "Động vật" },
];
export const HSK_TABS: { key: HskLevel | "all"; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "HSK 1", label: "HSK 1" },
  { key: "HSK 2", label: "HSK 2" },
  { key: "HSK 3", label: "HSK 3" },
];

export const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function filterRadicals(opts: { stroke: StrokeFilter; cat: CatFilter; q: string }): StudioRadical[] {
  const q = fold(opts.q.trim().toLowerCase());
  return RADICAL_INDEX.filter((r) => {
    if (opts.stroke === "1-2" && r.strokes > 2) return false;
    if (opts.stroke === "3" && r.strokes !== 3) return false;
    if (opts.stroke === "4" && r.strokes !== 4) return false;
    if (opts.stroke === "5+" && r.strokes < 5) return false;
    if (opts.cat === "core" && !r.core) return false;
    if (opts.cat !== "core" && r.cat !== opts.cat) return false;
    if (q && !fold(`${r.char}${r.hanViet}${r.meaning}`).toLowerCase().includes(q)) return false;
    return true;
  });
}

const ALL_CHARS: StudioCharMeta[] = Object.values(CHAR_META);

export function filterChars(opts: { level: HskLevel | "all"; q: string }): StudioCharMeta[] {
  const q = fold(opts.q.trim().toLowerCase());
  return ALL_CHARS.filter((c) => {
    if (opts.level !== "all" && c.level !== opts.level) return false;
    if (q && !fold(`${c.ch}${c.py}`).toLowerCase().includes(q)) return false;
    return true;
  });
}

export const radicalOf = (g: string) => RADICAL_INDEX.find((r) => r.char === g);
export const charOf = (g: string) => CHAR_META[g];
/* Bộ thủ chứa chữ này (tra ngược RADICAL_INDEX.chars) — dùng để hiển thị "Bộ X" cho kind "char". */
export const radicalOfChar = (ch: string) => RADICAL_INDEX.find((r) => r.chars.some((c) => c.ch === ch));
