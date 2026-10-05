/* Nhai HSK — dữ liệu thứ tự nét (port clone/js/hanzi-writer.js:9-29).
   Toạ độ 0–100. Mỗi nét: mảng điểm theo thứ tự bút chạy. */
export type StrokePolyline = number[][];

export const STROKE_DATA: Record<string, StrokePolyline[]> = {
  "你": [
    [[35, 14], [31, 24], [24, 40], [17, 57], [13, 71]],          // 1 撇 (亻)
    [[33, 36], [33, 58], [32, 84]],                              // 2 竖 (亻)
    [[56, 16], [50, 30], [44, 43]],                              // 3 撇 (尔)
    [[41, 31], [60, 28], [75, 36]],                              // 4 横钩
    [[58, 26], [58, 50], [57, 74], [61, 82]],                    // 5 竖钩
    [[52, 56], [45, 66], [35, 79]],                              // 6 撇
    [[65, 57], [71, 68], [77, 82]]                               // 7 点
  ]
};

/* generic 4 nét cho chữ chưa có data: khung 口 sơ khai */
export function genericStrokes(): StrokePolyline[] {
  return [
    [[18, 18], [82, 18]],
    [[82, 18], [82, 82]],
    [[82, 82], [18, 82]],
    [[18, 82], [18, 18], [30, 18]]
  ];
}

/* Dữ liệu nét dạng SVG path (port opendesign_hsk/review.html — demo stroke studio).
   Toạ độ viewBox 300×300; dùng khi STROKE_DATA không có chữ. rad tách name/desc để render <b>. */
export type StrokePathEntry = {
  py: string;
  total: number;
  rad: { name: string; desc: string };
  order: [string, string][];
  paths: string[];
};

export const STROKE_PATH_DATA: Record<string, StrokePathEntry> = {
  "爱": {
    py: "ài", total: 10,
    rad: { name: "爫 — Bộ Trảo", desc: "“Móng vuốt” · 4 nét · Trên–Giữa–Dưới" },
    order: [["Phẩy", "piě"], ["Chấm", "diǎn"], ["Chấm", "diǎn"], ["Phẩy", "piě"], ["Chấm", "diǎn"], ["Phẩy ngang", "héngpiě"], ["Ngang", "héng"], ["Phẩy", "piě"], ["Phẩy ngang", "héngpiě"], ["Mác", "nà"]],
    paths: [
      "M156,32 C140,58 124,76 108,92", "M188,58 C190,66 191,74 192,82", "M132,96 C134,102 135,108 136,114",
      "M92,130 C140,128 185,124 216,102", "M150,148 C151,154 152,160 153,166", "M120,176 C150,174 180,174 200,170",
      "M100,196 C135,195 170,195 205,193", "M150,206 C136,226 123,242 111,256", "M102,262 C142,260 184,255 216,240",
      "M152,212 C172,230 192,246 212,258",
    ],
  },
  "好": {
    py: "hǎo · hào", total: 6,
    rad: { name: "女 — Bộ Nữ", desc: "“Phụ nữ” · 3 nét · Trái–Phải (女 + 子)" },
    order: [["Gập phẩy", "zhépiě"], ["Phẩy", "piě"], ["Ngang", "héng"], ["Phẩy ngang", "héngpiě"], ["Sổ móc", "shùgōu"], ["Ngang", "héng"]],
    paths: [
      "M118,66 C104,116 92,158 76,202", "M148,84 C134,122 120,156 104,190", "M70,205 C100,203 125,203 150,201",
      "M168,112 C200,110 228,106 248,96", "M208,116 C208,160 208,200 206,232 C205,242 197,246 190,242",
      "M165,248 C195,246 222,246 250,244",
    ],
  },
};
