/* Port 1:1 từ clone/js/data/roadmapPinyin.js — dữ liệu lộ trình Pinyin 6 bước
   (roadmap-pinyin.html). Riêng bước "recap" bổ sung `links` điều hướng thực hành. */

import { z } from "zod";

export type PinyinVowel = { s: string; zh: string; vi: string };
export type PinyinGroupItem = { s: string; zh: string; vi: string };
export type PinyinGroup = { name: string; items: PinyinGroupItem[] };
export type PinyinTone = { mark: string; arrow: string; name: string; desc: string; py: string; zh: string; vi: string };
export type PinyinRule = { rule: string; desc: string; ex: string };
export type PinyinStep = {
  key: string;
  label: string;
  title: string;
  intro: string;
  initials?: string[];
  theory?: string;
  vowels?: PinyinVowel[];
  groups?: PinyinGroup[];
  tones?: PinyinTone[];
  rules?: PinyinRule[];
  note?: string;
  links?: { label: string; href: string }[];
};

export const roadmapPinyinSteps: PinyinStep[] = [
  {
    key: "initials",
    label: "Thanh mẫu",
    title: "Bước 1 · Thanh mẫu (声母)",
    intro: "Thanh mẫu là phụ âm đầu của một âm tiết tiếng Trung. Tiếng Trung chuẩn có 23 thanh mẫu — hãy bấm 🔊 để nghe cách đọc từng âm.",
    initials: ["b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "zh", "ch", "sh", "r", "z", "c", "s", "y", "w"],
    theory: "Nhóm môi: b p m f · Nhóm đầu lưỡi: d t n l · Nhóm cuống lưỡi: g k h · Nhóm mặt lưỡi: j q x · Nhóm lưỡi cuộn: zh ch sh r · Nhóm đầu lưỡi trước: z c s · Âm đôi: y w. Chú ý: zh/ch/sh là âm lưỡi cuộn, còn z/c/s là âm lưỡi trước — hai nhóm này rất dễ nhầm khi nghe."
  },
  {
    key: "finals",
    label: "Vận mẫu đơn",
    title: "Bước 2 · Vận mẫu đơn (单韵母)",
    intro: "Vận mẫu đơn là 6 nguyên âm cơ bản tạo nên phần vần của âm tiết. Đây là những âm quan trọng nhất — phát âm chuẩn từ đầu để học nhanh về sau.",
    vowels: [
      { s: "a", zh: "啊", vi: "Mở rộng miệng, phát như “a” trong tiếng Việt." },
      { s: "o", zh: "喔", vi: "Môi tròn, phát như “ô” nhưng ngắn hơn." },
      { s: "e", zh: "鹅", vi: "Miệng mở nửa, phát như “ơ” kéo dài." },
      { s: "i", zh: "一", vi: "Môi kéo ngang, phát như “i”." },
      { s: "u", zh: "五", vi: "Môi chu và tròn, phát như “u”." },
      { s: "ü", zh: "鱼", vi: "Phát “i” nhưng giữ môi tròn như “u” — âm đặc trưng của tiếng Trung." }
    ]
  },
  {
    key: "compound",
    label: "Vận mẫu ghép",
    title: "Bước 3 · Vận mẫu ghép (复韵母)",
    intro: "Vận mẫu ghép được tạo từ hai hay ba nguyên âm ghép với nhau hoặc kết thúc bằng -n/-ng. Học theo nhóm để dễ nhớ.",
    groups: [
      {
        name: "Ghép hai nguyên âm",
        items: [
          { s: "ai", zh: "爱", vi: "yêu" },
          { s: "ei", zh: "妹", vi: "em gái" },
          { s: "ao", zh: "猫", vi: "con mèo" },
          { s: "ou", zh: "走", vi: "đi bộ" }
        ]
      },
      {
        name: "Ghép với âm mũi -n",
        items: [
          { s: "an", zh: "安", vi: "bình an" },
          { s: "en", zh: "门", vi: "cửa" },
          { s: "in", zh: "金", vi: "vàng" },
          { s: "un", zh: "温", vi: "ấm" },
          { s: "ün", zh: "云", vi: "mây" }
        ]
      },
      {
        name: "Ghép với âm mũi -ng",
        items: [
          { s: "ang", zh: "房", vi: "nhà" },
          { s: "eng", zh: "灯", vi: "đèn" },
          { s: "ing", zh: "星", vi: "ngôi sao" },
          { s: "ong", zh: "中", vi: "trung" }
        ]
      },
      {
        name: "Ghép với âm đệm i / u / ü",
        items: [
          { s: "ia", zh: "家", vi: "nhà" },
          { s: "ie", zh: "写", vi: "viết" },
          { s: "iao", zh: "小", vi: "nhỏ" },
          { s: "iu", zh: "六", vi: "sáu" },
          { s: "ian", zh: "天", vi: "trời" },
          { s: "iang", zh: "想", vi: "nghĩ" },
          { s: "ua", zh: "花", vi: "hoa" },
          { s: "uo", zh: "说", vi: "nói" },
          { s: "uai", zh: "快", vi: "nhanh" },
          { s: "ui", zh: "水", vi: "nước" },
          { s: "uan", zh: "圆", vi: "tròn" },
          { s: "uang", zh: "光", vi: "ánh sáng" },
          { s: "üe", zh: "月", vi: "trăng" },
          { s: "üan", zh: "圆", vi: "tròn" },
          { s: "iong", zh: "熊", vi: "con gấu" }
        ]
      },
      {
        name: "Vận mẫu đặc biệt",
        items: [
          { s: "er", zh: "二", vi: "hai" }
        ]
      }
    ]
  },
  {
    key: "tones",
    label: "Thanh điệu",
    title: "Bước 4 · Thanh điệu (声调)",
    intro: "Tiếng Trung có 4 thanh điệu cơ bản. Cùng một phiên âm nhưng thanh khác nhau thì nghĩa hoàn toàn khác — ví dụ kinh điển: mā má mǎ mà.",
    tones: [
      {
        mark: "ˉ", arrow: "→", name: "Thanh 1",
        desc: "Cao và phẳng đều, không đổi cao độ — như hát một nốt dài.",
        py: "mā", zh: "妈", vi: "mẹ"
      },
      {
        mark: "´", arrow: "↗", name: "Thanh 2",
        desc: "Đi lên từ trung bình đến cao — như giọng ngạc nhiên “à?”.",
        py: "má", zh: "麻", vi: "gai dầu"
      },
      {
        mark: "ˇ", arrow: "⌄", name: "Thanh 3",
        desc: "Đi xuống thấp rồi lên lại — trong hội thoại thường chỉ đọc nửa sau.",
        py: "mǎ", zh: "马", vi: "con ngựa"
      },
      {
        mark: "`", arrow: "↘", name: "Thanh 4",
        desc: "Rơi xuống dứt khoát từ cao xuống thấp — như câu mệnh lệnh ngắn.",
        py: "mà", zh: "骂", vi: "mắng"
      }
    ]
  },
  {
    key: "rules",
    label: "Quy tắc đọc",
    title: "Bước 5 · Quy tắc viết (Quy tắc đánh dấu)",
    intro: "Khi vận mẫu i / u / ü đứng một mình hoặc cần viết dấu thanh, có những quy tắc bắt buộc phải nhớ.",
    rules: [
      {
        rule: "i đứng một mình → yi",
        desc: "Không viết “i” đơn lẻ — thêm y vào đầu.",
        ex: "i → yi · 衣 yī (áo) · 医 yī (y)"
      },
      {
        rule: "u đứng một mình → wu",
        desc: "Không viết “u” đơn lẻ — thêm w vào đầu.",
        ex: "u → wu · 五 wǔ (năm) · 屋 wū (nhà)"
      },
      {
        rule: "ü đứng một mình → yu",
        desc: "Thêm y vào đầu và bỏ hai chấm của ü.",
        ex: "ü → yu · 鱼 yú (cá) · 雨 yǔ (mưa)"
      },
      {
        rule: "i có dấu thanh → bỏ chấm",
        desc: "Khi i mang dấu thanh, chấm hai chấm trên i biến mất.",
        ex: "ni + ˇ → nǐ · 你 (bạn) · lǐ 里 (trong)"
      },
      {
        rule: "Dấu đặt trên nguyên âm chính",
        desc: "Nhiều nguyên âm: ưu tiên a > o > e. Riêng iu/ui thì dấu đặt trên âm sau.",
        ex: "hǎo 好 (dấu trên a) · duì 对 (ui → dấu trên i) · liù 六 (iu → dấu trên u)"
      }
    ]
  },
  {
    key: "recap",
    label: "Tổng ôn pinyin",
    title: "Bước 6 · Tổng ôn pinyin",
    intro: "Chúc mừng bạn đã đi hết lộ trình Pinyin! 🎉 Giờ là lúc thực hành để phản xạ ngay khi nhìn thấy một phiên âm.",
    note: "Luyện tập hằng ngày với bài tập pinyin và quay lại bảng tổng hợp bất cứ lúc nào bạn muốn.",
    links: [
      { label: "Làm bài tập pinyin", href: "/pinyin/practice" },
      { label: "Xem lại bảng", href: "/pinyin" }
    ]
  }
];

/* ================= zod validate (pattern Task 7-8) ================= */
const pinyinStepSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  title: z.string().min(1),
  intro: z.string().min(1),
  initials: z.array(z.string().min(1)).optional(),
  theory: z.string().optional(),
  vowels: z.array(z.object({ s: z.string().min(1), zh: z.string().min(1), vi: z.string().min(1) })).optional(),
  groups: z.array(z.object({ name: z.string().min(1), items: z.array(z.object({ s: z.string().min(1), zh: z.string().min(1), vi: z.string().min(1) })).min(1) })).optional(),
  tones: z.array(z.object({ mark: z.string().min(1), arrow: z.string(), name: z.string().min(1), desc: z.string().min(1), py: z.string().min(1), zh: z.string().min(1), vi: z.string().min(1) })).optional(),
  rules: z.array(z.object({ rule: z.string().min(1), desc: z.string().min(1), ex: z.string().min(1) })).optional(),
  note: z.string().optional(),
  links: z.array(z.object({ label: z.string().min(1), href: z.string().min(1) })).optional(),
});
roadmapPinyinSteps.forEach((s) => pinyinStepSchema.parse(s));
