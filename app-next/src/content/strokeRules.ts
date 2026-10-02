import { strokeRulesSchema, lastStrokesSchema } from "./schema";

/* Port 1:1 từ clone/js/data/stroke-rules.js — 7 quy tắc thứ tự nét + 3 nét luôn viết sau cùng (PLAN-20). */
export type StrokeRule = { n: number; name: string; chars: string[]; desc: string };

export const strokeRules: StrokeRule[] = [
 {
  "n": 1,
  "name": "Trước – sau",
  "chars": [
   "爸"
  ],
  "desc": "Nét trước viết trước, không cắt ngang nét sau."
 },
 {
  "n": 2,
  "name": "Trên – dưới",
  "chars": [
   "月"
  ],
  "desc": "Viết nét trên xong mới xuống nét dưới."
 },
 {
  "n": 3,
  "name": "Trái – phải",
  "chars": [
   "们"
  ],
  "desc": "Nét bên trái trước, sang bên phải."
 },
 {
  "n": 4,
  "name": "Ngoài – trong",
  "chars": [
   "国"
  ],
  "desc": "Khung ngoài kín trước, phần trong sau."
 },
 {
  "n": 5,
  "name": "Chạm – cắt",
  "chars": [
   "区"
  ],
  "desc": "Chạm vào nét trước, không cắt qua nó."
 },
 {
  "n": 6,
  "name": "Đóng trước – mở sau",
  "chars": [
   "夫"
  ],
  "desc": "Nét khép kín viết trước nét mở."
 },
 {
  "n": 7,
  "name": "Viết nét cuối",
  "chars": [
   "女"
  ],
  "desc": "Nét chéo kéo dài luôn là nét cuối."
 }
];

export const lastStrokes: { glyph: string; name: string }[] = [
 {
  "glyph": "辶",
  "name": "đi"
 },
 {
  "glyph": "廴",
  "name": "quy"
 },
 {
  "glyph": "ㄑ",
  "name": "nét chéo phải"
 }
];

// zod validate (pattern Task 7) — ném lỗi nếu dữ liệu port sai
strokeRulesSchema.parse(strokeRules);
lastStrokesSchema.parse(lastStrokes);
