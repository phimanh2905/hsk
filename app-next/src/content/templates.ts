/* Bye HSK — dữ liệu 9 mẫu "Tạo file" (PLAN-16 / SPEC-16).
   Port từ clone/js/data/templates.js — giữ nguyên id/name/desc/thumb.
   group ∈ hanzi | vocab | paper (3 section catalog). thumb = SVG inline 48×48 vẽ tay. */

export type TemplateGroup = "hanzi" | "vocab" | "paper";
export type FileTemplate = { id: string; name: string; group: TemplateGroup; desc: string; thumb: string };

const G = "#cfc4ae"; /* màu nét ô (khung) */
const R = "#c23b22"; /* đỏ — nét mới / nhấn */
const K = "#17150f"; /* đen — chữ */
const F = "#b9b0a0"; /* mờ — chữ nhạt */

/* polyline nét chữ 永 (thu nhỏ cho thumb) */
const YONG = "26,4 24,9 29,11|12,15 38,15 29,35 31,38|14,22 20,22 15,29|27,23 18,37|28,26 40,38";

function cells(x0: number, y0: number, w: number, h: number, cols: number, rows: number): string {
  let s = "";
  for (let i = 0; i <= cols; i++)
    s += '<line x1="' + (x0 + (i * w) / cols) + '" y1="' + y0 + '" x2="' + (x0 + (i * w) / cols) + '" y2="' + (y0 + (rows * h) / rows) + '"/>';
  for (let i = 0; i <= rows; i++)
    s += '<line x1="' + x0 + '" y1="' + (y0 + (i * h) / rows) + '" x2="' + (x0 + (cols * w) / cols) + '" y2="' + (y0 + (i * h) / rows) + '"/>';
  return s;
}

function strokes(pts: string, color?: string): string {
  return pts
    .split("|")
    .map(
      (p) =>
        '<polyline points="' + p + '" fill="none" stroke="' + (color || K) + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'
    )
    .join("");
}

export const fileTemplates: FileTemplate[] = [
  {
    id: "stroke-order",
    name: "Luyện viết theo thứ tự nét",
    group: "hanzi",
    desc: "Mỗi chữ: ô mẫu đánh số nét → từng bước thêm nét (nét mới tô đỏ) → hàng chữ mờ để tô.",
    thumb:
      '<svg viewBox="0 0 48 48">' +
      '<g stroke="' + G + '" stroke-width="1" fill="none">' + cells(2, 6, 44, 30, 4, 2) + "</g>" +
      '<g transform="translate(2,6) scale(0.3)">' + strokes(YONG, K) + "</g>" +
      '<circle cx="6" cy="9" r="2.6" fill="' + R + '"/><text x="6" y="10.5" font-size="3.4" fill="#fff" text-anchor="middle">1</text>' +
      '<g transform="translate(16.4,6) scale(0.3)" opacity="0.28">' + strokes(YONG, F) + "</g>" +
      '<g transform="translate(30.8,6) scale(0.3)" opacity="0.28">' + strokes(YONG, F) + "</g>" +
      '<g transform="translate(2,21) scale(0.3)" opacity="0.28">' + strokes(YONG, F) + "</g>" +
      '<g transform="translate(16.4,21) scale(0.3)" opacity="0.28">' + strokes(YONG, F) + "</g>" +
      '<g transform="translate(30.8,21) scale(0.3)" opacity="0.28">' + strokes(YONG, F) + "</g>" +
      "</svg>",
  },
  {
    id: "big-char",
    name: "Ô chữ lớn",
    group: "hanzi",
    desc: "Chữ mẫu ô lớn bên trái, pinyin + thứ tự nét + nghĩa ở trên, hàng tô bên phải.",
    thumb:
      '<svg viewBox="0 0 48 48">' +
      '<g stroke="' + G + '" stroke-width="1" fill="none">' + cells(2, 8, 14, 32, 1, 1) + cells(18, 8, 28, 32, 2, 2) + "</g>" +
      '<g transform="translate(2,8) scale(0.14)">' + strokes(YONG, K) + "</g>" +
      '<g transform="translate(18,8) scale(0.07)" opacity="0.28">' + strokes(YONG, F) + "</g>" +
      '<g transform="translate(32,8) scale(0.07)" opacity="0.28">' + strokes(YONG, F) + "</g>" +
      '<g transform="translate(18,24) scale(0.07)" opacity="0.28">' + strokes(YONG, F) + "</g>" +
      '<g transform="translate(32,24) scale(0.07)" opacity="0.28">' + strokes(YONG, F) + "</g>" +
      '<line x1="2" y1="4" x2="18" y2="4" stroke="' + F + '" stroke-width="1"/>' +
      "</svg>",
  },
  {
    id: "vocab",
    name: "Luyện viết từ vựng",
    group: "vocab",
    desc: "Từ + pinyin + nghĩa + câu ví dụ, pinyin trên từng ô, hàng tô theo lượt.",
    thumb:
      '<svg viewBox="0 0 48 48">' +
      '<text x="2" y="5" font-size="4.5" fill="' + F + '">nǐ hǎo</text>' +
      '<g stroke="' + G + '" stroke-width="1" fill="none">' + cells(2, 8, 44, 34, 4, 2) + "</g>" +
      '<g transform="translate(2,8) scale(0.3)" opacity="0.3">' + strokes("8,8 5,16|8,7 8,25|16,18 11,24|11,21 20,21", F) + "</g>" +
      '<g transform="translate(13.3,8) scale(0.3)" opacity="0.3">' + strokes("10,6 6,18|6,18 18,18|12,10 12,20|9,20 12,26", F) + "</g>" +
      '<g transform="translate(2,25) scale(0.3)" opacity="0.3">' + strokes("8,8 5,16|8,7 8,25|16,18 11,24|11,21 20,21", F) + "</g>" +
      '<g transform="translate(13.3,25) scale(0.3)" opacity="0.3">' + strokes("10,6 6,18|6,18 18,18|12,10 12,20|9,20 12,26", F) + "</g>" +
      "</svg>",
  },
  {
    id: "vocab-check",
    name: "Bảng tự kiểm tra từ vựng",
    group: "vocab",
    desc: "In sẵn từ — tự điền pinyin / nghĩa, viết lại chữ vào ô trống.",
    thumb:
      '<svg viewBox="0 0 48 48">' +
      '<text x="2" y="5" font-size="4.5" fill="' + F + '">你好 — Xin chào</text>' +
      '<g stroke="' + G + '" stroke-width="1" fill="none">' + cells(2, 8, 44, 34, 4, 2) + "</g>" +
      '<text x="6" y="18" font-size="7" fill="' + F + '">你</text><text x="20" y="18" font-size="7" fill="' + F + '">好</text>' +
      "</svg>",
  },
  {
    id: "pinyin-write",
    name: "Nhìn pinyin viết chữ Hán",
    group: "vocab",
    desc: "Pinyin in mờ trên cụm ô trống, mỗi từ một cụm — nhìn âm viết chữ.",
    thumb:
      '<svg viewBox="0 0 48 48">' +
      '<text x="2" y="5" font-size="4.5" fill="' + F + '">xué xí</text>' +
      '<g stroke="' + G + '" stroke-width="1" fill="none">' + cells(2, 8, 20, 34, 2, 2) + cells(26, 8, 20, 34, 2, 2) + "</g>" +
      '<text x="8" y="18" font-size="7" fill="' + R + '" opacity="0.55">学</text>' +
      '<text x="32" y="18" font-size="7" fill="' + R + '" opacity="0.55">习</text>' +
      "</svg>",
  },
  {
    id: "paragraph",
    name: "Chép đoạn văn",
    group: "paper",
    desc: "Mỗi chữ một ô có pinyin phía trên, tô lên chữ mờ.",
    thumb:
      '<svg viewBox="0 0 48 48">' +
      '<text x="2" y="5" font-size="4" fill="' + F + '">pī yīn</text>' +
      '<g stroke="' + G + '" stroke-width="1" fill="none">' + cells(2, 8, 44, 34, 6, 2) + "</g>" +
      '<g transform="translate(2,8) scale(0.166)" opacity="0.3">' + strokes(YONG, F) + "</g>" +
      '<g transform="translate(9.3,8) scale(0.166)" opacity="0.3">' + strokes(YONG, F) + "</g>" +
      '<g transform="translate(2,25) scale(0.166)" opacity="0.3">' + strokes(YONG, F) + "</g>" +
      "</svg>",
  },
  {
    id: "lined-paper",
    name: "Bài văn dòng kẻ có pinyin",
    group: "paper",
    desc: "Chữ chạy trên dòng kẻ như vở, lùi đầu đoạn, pinyin phía trên.",
    thumb:
      '<svg viewBox="0 0 48 48">' +
      '<g stroke="' + G + '" stroke-width="1">' +
      '<line x1="2" y1="10" x2="46" y2="10"/><line x1="2" y1="16" x2="46" y2="16"/>' +
      '<line x1="2" y1="28" x2="46" y2="28"/><line x1="2" y1="34" x2="46" y2="34"/>' +
      "</g>" +
      '<text x="8" y="15" font-size="6" fill="' + F + '">学</text>' +
      '<text x="8" y="33" font-size="6" fill="' + F + '">习</text>' +
      '<text x="2" y="43" font-size="4.5" fill="' + F + '">pīnyīn phía trên</text>' +
      "</svg>",
  },
  {
    id: "grid-paper",
    name: "Giấy ô trống",
    group: "paper",
    desc: "Chọn loại ô, số ô mỗi hàng, màu ô và số trang — giấy ô trống.",
    thumb:
      '<svg viewBox="0 0 48 48">' +
      '<g stroke="' + G + '" stroke-width="1" fill="none">' + cells(2, 2, 44, 44, 4, 4) + "</g>" +
      '<line x1="13" y1="2" x2="24" y2="13" stroke="' + F + '" stroke-width="0.7" stroke-dasharray="2 2"/>' +
      '<line x1="35" y1="24" x2="46" y2="35" stroke="' + F + '" stroke-width="0.7" stroke-dasharray="2 2"/>' +
      "</svg>",
  },
  {
    id: "cover",
    name: "Bìa vở luyện chữ",
    group: "paper",
    desc: "Tiêu đề chữ lớn trong ô có pinyin, ô điền lớp + họ tên.",
    thumb:
      '<svg viewBox="0 0 48 48">' +
      '<rect x="2" y="2" width="44" height="44" fill="none" stroke="' + G + '" stroke-width="1"/>' +
      '<rect x="16" y="8" width="16" height="16" fill="none" stroke="' + G + '" stroke-width="1"/>' +
      '<text x="24" y="21" font-size="11" fill="' + K + '" text-anchor="middle">练</text>' +
      '<text x="24" y="28.5" font-size="3.6" fill="' + F + '" text-anchor="middle">liàn</text>' +
      '<line x1="10" y1="33" x2="38" y2="33" stroke="' + F + '" stroke-width="1"/>' +
      '<line x1="10" y1="39" x2="38" y2="39" stroke="' + F + '" stroke-width="1"/>' +
      "</svg>",
  },
];

export const templateGroups: { id: TemplateGroup; label: string }[] = [
  { id: "hanzi", label: "Mẫu chữ Hán" },
  { id: "vocab", label: "Mẫu từ vựng" },
  { id: "paper", label: "Đoạn văn & giấy ô" },
];

export function templateById(id: string): FileTemplate | null {
  return fileTemplates.find((t) => t.id === id) ?? null;
}
