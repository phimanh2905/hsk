/* Port 1:1 từ clone/js/create-file.js — state CF v2 (PLAN-16): 18 nhóm key + reducer.
   Tham chiếu clone: dòng 21-28 (charInfo), 55-82 (DEFAULT_CHARS + cfDefaults),
   439-450 (parseLine), 687-719 (onControl), 775-786 (AI mock format). */

export type CfCellType = "dien-tu" | "mi" | "vuong" | "hoi-cung" | "cuu-cung";
export type CfCellColor = "green" | "red" | "blue" | "gray";
export type CfScript = "khai" | "hanh";
export type CfStrokeSource = "CNstrokeorder" | "qingfeng";

export type CfChar = { hanzi: string; pinyin: string; hv: string; meaning: string };

export type CfState = {
  tpl: string | null;
  chars: CfChar[];
  title: string;
  nameDate: boolean;
  cellType: CfCellType;
  cellColor: CfCellColor;
  perRow: number;
  fillRows: number;
  blankRows: number;
  faintCount: number;
  script: CfScript;
  strokeSource: CfStrokeSource;
  traceStyle: string[];
  opacity: number;
  fontSize: number;
  showPinyin: boolean;
  showMeaning: boolean;
};

export type CfAction =
  | { type: "set"; key: keyof CfState; value: string | number | boolean }
  | { type: "setTraceStyle"; value: string; checked: boolean }
  | { type: "setScript"; value: CfScript; checked: boolean }
  | { type: "step"; key: "perRow" | "fillRows" | "blankRows" | "faintCount"; dir: number; min: number; max: number }
  | { type: "setMeaning"; index: number; value: string }
  | { type: "deleteChar"; index: number }
  | { type: "addChars"; chars: CfChar[] }
  | { type: "clearChars" }
  | { type: "formatAiMock" }
  | { type: "setTpl"; tpl: string }
  | { type: "hydrate"; state: CfState }
  | { type: "reset"; tpl: string | null };

export { cfDefaults, cfDefaultsFor, mergeCfState, parseLine, charInfo, DEFAULT_CHARS, CHAR_INFO_FALLBACK } from "./defaults";
export { cfReducer } from "./reducer";
