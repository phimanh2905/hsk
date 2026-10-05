import { z } from "zod";

/* Port 1:1 STATIONS + levels từ opendesign_hsk/roadmap.html (mock serpentine).
   KHÔNG lưu side (suy ra từ index) và KHÔNG lưu state/pct/stars (derive từ
   progressStore — spec 2026-10-04 §4). */

export const stationSchema = z.object({
  id: z.string(),
  no: z.string(),
  title: z.string(),
  zh: z.string(),
  meta: z.string(),
  kind: z.enum(["lesson", "milestone"]),
  vocab: z.array(z.tuple([z.string(), z.string(), z.string()])),
  gram: z.array(z.tuple([z.string(), z.string()])),
});
export type Station = z.infer<typeof stationSchema>;

export const levelIdSchema = z.enum(["hsk-1", "hsk-2", "hsk-3", "hsk-4-6"]);
export type LevelId = z.infer<typeof levelIdSchema>;

export const roadmapLevelSchema = z.object({
  id: levelIdSchema,
  label: z.string(),
  kicker: z.string(),
  title: z.string(),
  status: z.enum(["available", "upcoming"]),
  stations: z.array(stationSchema),
});
export type RoadmapLevel = z.infer<typeof roadmapLevelSchema>;

export const roadmapLevels: RoadmapLevel[] = [
  {
    id: "hsk-1",
    label: "HSK 1",
    kicker: "NỀN TẢNG · PHÁT ÂM",
    title: "Nền tảng: Pinyin & nét cơ bản",
    status: "available",
    stations: [], // banner-only — dẫn về /roadmap/pinyin (spec §4)
  },
  {
    id: "hsk-2",
    label: "HSK 2",
    kicker: "CHẶNG 1 · NỀN TẢNG GIAO TIẾP",
    title: "Chặng 1: Giao tiếp thường nhật",
    status: "available",
    stations: [
      {
        id: "1", no: "Trạm 1", kind: "lesson",
        title: "Chào hỏi & Làm quen", zh: "你好",
        meta: "15/15 từ · 100% · 3 điểm ngữ pháp",
        vocab: [
          ["你好", "nǐ hǎo", "xin chào"], ["谢谢", "xièxie", "cảm ơn"],
          ["再见", "zàijiàn", "tạm biệt"], ["请", "qǐng", "xin mời"],
          ["对不起", "duìbuqǐ", "xin lỗi"],
        ],
        gram: [
          ["Câu chào + tên", "我叫… / 你叫什么？"],
          ["Phủ định cơ bản", "不 + động từ / tính từ"],
        ],
      },
      {
        id: "2", no: "Trạm 2", kind: "lesson",
        title: "Số đếm & Mua sắm", zh: "数字",
        meta: "15/15 từ · 100% · 2 điểm ngữ pháp",
        vocab: [
          ["买", "mǎi", "mua"], ["多少钱", "duōshao qián", "bao nhiêu tiền"],
          ["便宜", "piányi", "rẻ"], ["贵", "guì", "đắt"], ["个", "gè", "lượng từ"],
        ],
        gram: [["Hỏi giá", "…多少钱？"], ["Lượng từ 个", "Số + 个 + danh từ"]],
      },
      {
        id: "3", no: "Trạm 3", kind: "lesson",
        title: "Thời gian & Lịch trình", zh: "时间",
        meta: "15/15 từ · 100% · 2 điểm ngữ pháp",
        vocab: [
          ["今天", "jīntiān", "hôm nay"], ["明天", "míngtiān", "ngày mai"],
          ["几点", "jǐ diǎn", "mấy giờ"], ["上班", "shàngbān", "đi làm"],
          ["休息", "xiūxi", "nghỉ ngơi"],
        ],
        gram: [["Trạng từ thời gian", "今天 / 明天 + V"], ["Hỏi giờ", "现在几点？"]],
      },
      {
        id: "4", no: "Trạm 4", kind: "lesson",
        title: "Sở thích & Thời gian rảnh", zh: "爱好",
        meta: "8/15 từ vựng · 55% · Còn ~6 phút",
        vocab: [
          ["爱好", "àihào", "sở thích"], ["空闲", "kòngxián", "rảnh rỗi"],
          ["打球", "dǎ qiú", "chơi bóng"], ["音乐", "yīnyuè", "âm nhạc"],
          ["电影", "diànyǐng", "phim"], ["喜欢", "xǐhuan", "thích"],
          ["觉得", "juéde", "cảm thấy"], ["有意思", "yǒu yìsi", "thú vị"],
        ],
        gram: [
          ["Câu chữ 把", "把 + tân ngữ + V + 补语"],
          ["Biểu đạt sở thích", "喜欢 + V / 觉得…有意思"],
        ],
      },
      {
        id: "5", no: "Trạm 5", kind: "lesson",
        title: "Đi lại & Chỉ đường", zh: "问路",
        meta: "Khóa · mở sau khi xong Bài 4",
        vocab: [
          ["地铁", "dìtiě", "tàu điện ngầm"], ["怎么走", "zěnme zǒu", "đi thế nào"],
          ["附近", "fùjìn", "gần đây"],
        ],
        gram: [["Hỏi đường", "请问，…怎么走？"], ["Phương vị", "在…旁边 / 对面"]],
      },
      {
        id: "m", no: "Milestone", kind: "milestone",
        title: "Ôn tập chặng & Mini test", zh: "复习",
        meta: "Khóa · mở sau Trạm 5 · Đánh giá năng lực HSK 2",
        vocab: [["Tổng ôn 60 từ", "zǒng fùxí", "flashcard chặng 1"]],
        gram: [["Tổng hợp ngữ pháp", "把 · Hỏi giá · Hỏi giờ"], ["Mini test 20 câu", "Nghe · Đọc · Viết"]],
      },
      {
        id: "6", no: "Trạm 6", kind: "lesson",
        title: "Thời tiết & Bốn mùa", zh: "天气",
        meta: "Khóa · mở sau Milestone",
        vocab: [["天气", "tiānqì", "thời tiết"], ["下雨", "xià yǔ", "mưa"], ["冷", "lěng", "lạnh"]],
        gram: [["Miêu tả thời tiết", "今天… / 明天会…"], ["So sánh", "比 + adj"]],
      },
    ],
  },
  {
    id: "hsk-3",
    label: "HSK 3",
    kicker: "CHẶNG 2 · MỞ RỘNG XÃ HỘI",
    title: "Chặng 2: Mở rộng xã hội",
    status: "upcoming",
    stations: [],
  },
  {
    id: "hsk-4-6",
    label: "HSK 4–6",
    kicker: "NÂNG CAO · HỌC THUẬT & NGHỀ NGHIỆP",
    title: "Chặng nâng cao: Học thuật & nghề nghiệp",
    status: "upcoming",
    stations: [],
  },
];

// Validate lúc load (pattern của src/content/*) — lỗi schema ném ngay, không chờ render.
roadmapLevels.forEach((l) => roadmapLevelSchema.parse(l));

export function getRoadmapLevel(id: string): RoadmapLevel | null {
  return roadmapLevels.find((l) => l.id === id) ?? null;
}
