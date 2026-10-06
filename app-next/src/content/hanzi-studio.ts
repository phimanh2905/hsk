/* Hanzi Studio — 12 chữ demo, port 1:1 CHARS array của opendesign_hsk/hanzi.html.
   Spec 2026-10-05 §1: demo data tách biệt (st done/mid/new hardcode), sau này swap
   ra data thật mà không đụng UI. Không liên quan content/hanzi.ts (màn [char]). */

export type StrokeDir = "E" | "SE" | "S" | "SW" | "W" | "N" | "NE" | "T";

export type StudioChar = {
  ch: string;
  py: string;
  hv: string;
  mean: string;
  n: number;
  hsk: "HSK 1" | "HSK 2" | "HSK 3" | "HSK 4-6";
  st: "done" | "mid" | "new";
  rad: string;      // "爫 (Trảo)" — render tách phần Hán đầu + phần mô tả sau
  struct: string;
  tip: string;
  order: [string, string][]; // tên nét + tên pinyin của nét
  d: StrokeDir[];   // hướng mong muốn mỗi nét (input chấm điểm; "T" = nét gập)
  p: string[];      // SVG path 300×300 mỗi nét
};

export const STUDIO_LEVELS = ["all", "HSK 1", "HSK 2", "HSK 3", "HSK 4-6"] as const;
export type StudioLevel = (typeof STUDIO_LEVELS)[number];

export const STUDIO_CHARS: StudioChar[] = [
  { ch: "爱", py: "ài", hv: "ÁI", mean: "Yêu, thích, quý trọng", n: 10, hsk: "HSK 2", st: "new", rad: "爫 (Trảo)", struct: "Trên – Giữa – Dưới", tip: "Trên là móng vuốt (爫), dưới là bạn bè (友) che chở — yêu là nâng niu, che chở.",
    order: [["Phẩy", "piě"], ["Chấm", "diǎn"], ["Chấm", "diǎn"], ["Phẩy", "piě"], ["Chấm", "diǎn"], ["Phẩy ngang", "héngpiě"], ["Ngang", "héng"], ["Phẩy", "piě"], ["Phẩy ngang", "héngpiě"], ["Mác", "nà"]],
    d: ["SW", "SE", "SE", "SW", "SE", "E", "E", "SW", "E", "SE"],
    p: ["M156,32 C140,58 124,76 108,92", "M188,58 C190,66 191,74 192,82", "M132,96 C134,102 135,108 136,114", "M92,130 C140,128 185,124 216,102", "M150,148 C151,154 152,160 153,166", "M120,176 C150,174 180,174 200,170", "M100,196 C135,195 170,195 205,193", "M150,206 C136,226 123,242 111,256", "M102,262 C142,260 184,255 216,240", "M152,212 C172,230 192,246 212,258"] },
  { ch: "好", py: "hǎo · hào", hv: "HẢO · HIẾU", mean: "Tốt đẹp; yêu thích", n: 6, hsk: "HSK 2", st: "mid", rad: "女 (Nữ)", struct: "Trái – Phải", tip: "Người phụ nữ (女) bên đứa trẻ (子) — điều tốt đẹp. Trong 爱好 đọc là hào.",
    order: [["Gập phẩy", "zhépiě"], ["Phẩy", "piě"], ["Ngang", "héng"], ["Phẩy ngang", "héngpiě"], ["Sổ móc", "shùgōu"], ["Ngang", "héng"]],
    d: ["T", "SW", "E", "E", "S", "E"],
    p: ["M118,66 C104,116 92,158 76,202", "M148,84 C134,122 120,156 104,190", "M70,205 C100,203 125,203 150,201", "M168,112 C200,110 228,106 248,96", "M208,116 C208,160 208,200 206,232 C205,242 197,246 190,242", "M165,248 C195,246 222,246 250,244"] },
  { ch: "人", py: "rén", hv: "NHÂN", mean: "Người", n: 2, hsk: "HSK 1", st: "done", rad: "人 (Nhân)", struct: "Độc thể", tip: "Một nét phẩy, một nét mác — hình người đang bước.",
    order: [["Phẩy", "piě"], ["Mác", "nà"]], d: ["SW", "SE"],
    p: ["M150,60 C135,110 115,155 90,200", "M150,60 C165,110 185,155 210,200"] },
  { ch: "大", py: "dà", hv: "ĐẠI", mean: "Lớn, to", n: 3, hsk: "HSK 1", st: "done", rad: "大 (Đại)", struct: "Độc thể", tip: "Người (人) dang tay rộng — to lớn.",
    order: [["Ngang", "héng"], ["Phẩy", "piě"], ["Mác", "nà"]], d: ["E", "SW", "SE"],
    p: ["M80,90 C120,89 180,89 220,88", "M150,90 C135,135 115,175 95,215", "M150,90 C165,135 185,175 205,215"] },
  { ch: "国", py: "guó", hv: "QUỐC", mean: "Đất nước", n: 8, hsk: "HSK 2", st: "new", rad: "囗 (Vi)", struct: "Bao quanh", tip: "Khung bao (囗) ôm viên ngọc (玉) — đất nước giữ báu vật.",
    order: [["Sổ", "shù"], ["Gập ngang", "héngzhé"], ["Ngang", "héng"], ["Ngang", "héng"], ["Ngang", "héng"], ["Sổ", "shù"], ["Ngang", "héng"], ["Sổ", "shù"]],
    d: ["S", "T", "E", "E", "E", "S", "E", "S"],
    p: ["M85,85 C85,128 85,172 85,215", "M85,85 C128,85 172,85 215,85 C215,128 215,172 215,215", "M85,215 C128,215 172,215 215,215", "M120,125 C140,125 160,125 180,125", "M120,148 C140,148 160,148 180,148", "M150,125 C150,145 150,165 150,185", "M120,185 C140,185 160,185 180,185", "M168,148 C168,164 168,180 168,196"] },
  { ch: "汉", py: "hàn", hv: "HÁN", mean: "Dân tộc Hán; Trung Quốc", n: 5, hsk: "HSK 2", st: "mid", rad: "氵 (Thủy)", struct: "Trái – Phải", tip: "Ba chấm nước (氵) bên chữ viết tắt của “người” — tên dân tộc.",
    order: [["Chấm", "diǎn"], ["Chấm", "diǎn"], ["Hất", "tí"], ["Phẩy ngang", "héngpiě"], ["Mác", "nà"]],
    d: ["SE", "SE", "E", "E", "SE"],
    p: ["M115,78 C116,84 117,90 118,96", "M135,112 C136,118 137,124 138,130", "M118,152 C132,148 146,142 158,134", "M170,120 C200,118 225,114 245,104", "M190,150 C205,170 220,188 238,202"] },
  { ch: "书", py: "shū", hv: "THƯ", mean: "Sách; viết", n: 4, hsk: "HSK 2", st: "new", rad: "乙 (Ất)", struct: "Độc thể", tip: "Nét折叠层 như trang sách gấp — viết thành sách.",
    order: [["Gập ngang", "héngzhé"], ["Gập ngang móc", "héngzhégōu"], ["Sổ", "shù"], ["Chấm", "diǎn"]],
    d: ["T", "T", "S", "SE"],
    p: ["M100,80 C133,80 166,80 200,80 C200,100 200,120 200,140", "M100,140 C133,140 166,140 195,140 C195,165 195,190 192,212 C191,221 183,224 175,220", "M150,140 C150,170 150,200 150,230", "M150,248 C151,252 152,256 153,260"] },
  { ch: "口", py: "kǒu", hv: "KHẨU", mean: "Miệng", n: 3, hsk: "HSK 1", st: "done", rad: "口 (Khẩu)", struct: "Độc thể", tip: "Khung vuông mở — cái miệng đang nói.",
    order: [["Sổ", "shù"], ["Gập ngang", "héngzhé"], ["Ngang", "héng"]], d: ["S", "T", "E"],
    p: ["M100,90 C100,130 100,170 100,210", "M100,90 C133,90 166,90 200,90 C200,130 200,170 200,210", "M100,210 C133,210 166,210 200,210"] },
  { ch: "日", py: "rì", hv: "NHẬT", mean: "Ngày; mặt trời", n: 4, hsk: "HSK 1", st: "done", rad: "日 (Nhật)", struct: "Độc thể", tip: "Ô vuông thêm nét ngang giữa — mặt trời lên.",
    order: [["Sổ", "shù"], ["Gập ngang", "héngzhé"], ["Ngang", "héng"], ["Ngang", "héng"]], d: ["S", "T", "E", "E"],
    p: ["M110,80 C110,127 110,173 110,220", "M110,80 C137,80 163,80 190,80 C190,127 190,173 190,220", "M110,150 C137,150 163,150 190,150", "M110,220 C137,220 163,220 190,220"] },
  { ch: "木", py: "mù", hv: "MỘC", mean: "Gỗ, cây", n: 4, hsk: "HSK 2", st: "mid", rad: "木 (Mộc)", struct: "Độc thể", tip: "Cây có cành phẩy – mác hai bên thân sổ.",
    order: [["Ngang", "héng"], ["Sổ", "shù"], ["Phẩy", "piě"], ["Mác", "nà"]], d: ["E", "S", "SW", "SE"],
    p: ["M80,110 C120,109 180,109 220,108", "M150,70 C150,123 150,177 150,230", "M150,110 C130,140 110,170 95,200", "M150,110 C170,140 190,170 205,200"] },
  { ch: "水", py: "shuǐ", hv: "THỦY", mean: "Nước", n: 4, hsk: "HSK 2", st: "mid", rad: "水 (Thủy)", struct: "Độc thể", tip: "Dòng sổ móc giữa, hai bên phẩy – mác như nước bắn.",
    order: [["Sổ móc", "shùgōu"], ["Phẩy ngang", "héngpiě"], ["Phẩy", "piě"], ["Mác", "nà"]], d: ["S", "E", "SW", "SE"],
    p: ["M150,60 C150,110 150,150 150,185 C150,195 142,198 134,194", "M110,112 C150,110 190,108 222,98", "M150,122 C130,152 115,182 105,212", "M150,122 C170,152 190,182 206,210"] },
  { ch: "心", py: "xīn", hv: "TÂM", mean: "Trái tim; tâm trí", n: 4, hsk: "HSK 2", st: "done", rad: "心 (Tâm)", struct: "Độc thể", tip: "Nét卧钩 ôm hai chấm — trái tim包容.",
    order: [["Chấm", "diǎn"], ["Nét nằm móc", "wògōu"], ["Chấm", "diǎn"], ["Chấm", "diǎn"]], d: ["SE", "T", "SE", "SE"],
    p: ["M95,148 C96,154 97,160 98,166", "M95,150 C115,205 150,228 200,224 C214,223 221,216 222,206", "M168,148 C169,154 170,160 171,166", "M196,162 C197,168 198,174 199,180"] },
];
