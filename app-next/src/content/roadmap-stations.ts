import { z } from "zod";
import { generatedLessons, type GeneratedLesson } from "./roadmap-generated";

/* STATIONS + levels cho Roadmap Journey v2 (spec 2026-10-29 §2):
   8 chặng pinyin..hsk-7-9; hsk-1/3/4/5 sinh trạm từ generatedLessons
   (buildLevelStations nhóm 5 bài + milestone cuối), hsk-2 giữ 7 trạm
   curated rồi nối trạm generator cho các bài còn lại.
   KHÔNG lưu side (suy ra từ index) và KHÔNG lưu state/pct/stars (derive từ
   progressStore — spec 2026-10-04 §4). */

export const stationSchema = z.object({
  id: z.string(),
  no: z.string(),
  title: z.string(),
  zh: z.string(),
  meta: z.string(),
  kind: z.enum(["lesson", "milestone"]),
  lesson: z
    .object({ book: z.string(), page: z.string() })
    .optional(),
  /** Danh sách bài của trạm (generator: cả nhóm; curated: 1 bài hoặc rỗng với milestone). */
  lessons: z.array(z.object({ book: z.string(), page: z.string() })).optional(),
  vocab: z.array(z.tuple([z.string(), z.string(), z.string()])),
  gram: z.array(z.tuple([z.string(), z.string()])),
});
export type Station = z.infer<typeof stationSchema>;

export const levelIdSchema = z.enum([
  "pinyin",
  "hsk-1",
  "hsk-2",
  "hsk-3",
  "hsk-4",
  "hsk-5",
  "hsk-6",
  "hsk-7-9",
]);
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

/** Nhóm `lessons` thành các trạm `groupSize` bài + 1 milestone cuối. */
export function buildLevelStations(
  lessons: GeneratedLesson[],
  opts: { groupSize?: number; idPrefix?: string; startNo?: number; milestoneId?: string } = {},
): Station[] {
  const { groupSize = 5, idPrefix = "g", startNo = 1, milestoneId = "milestone" } = opts;
  const stations: Station[] = [];
  for (let i = 0; i < lessons.length; i += groupSize) {
    const group = lessons.slice(i, i + groupSize);
    stations.push({
      id: `${idPrefix}${stations.length + 1}`,
      no: `Trạm ${startNo + stations.length}`,
      kind: "lesson",
      title: group[0].title,
      zh: "",
      meta: `${group.reduce((s, l) => s + l.wordCount, 0)} từ · ${group.length} bài`,
      lesson: { book: group[0].book, page: group[0].page },
      lessons: group.map((l) => ({ book: l.book, page: l.page })),
      vocab: [],
      gram: [],
    });
  }
  stations.push({
    id: milestoneId,
    no: `Trạm ${startNo + stations.length}`,
    kind: "milestone",
    title: "Tổng ôn chặng",
    zh: "复习",
    meta: "Đề mix tổng hợp từ vựng & nghe của chặng",
    lessons: lessons.map((l) => ({ book: l.book, page: l.page })),
    vocab: [],
    gram: [],
  });
  return stations;
}

const byBook = (book: string) => generatedLessons.filter((l) => l.book === book);

/* hsk-2: 7 trạm curated giữ nguyên (ids 1..6,m, thứ tự hiện tại: …5, m, 6),
   mỗi trạm thêm lessons mirror của lesson; các bài hsk2 chưa thuộc curated
   (34 bài) thành trạm generator id b1..bN nối NGAY SAU Trạm 6. */
const curatedHsk2Base: Station[] = [
  {
    id: "1", no: "Trạm 1", kind: "lesson",
    title: "Chào hỏi & Làm quen", zh: "你好",
    lesson: { book: "hsk2", page: "lesson-1" },
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
    lesson: { book: "hsk2", page: "lesson-11" },
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
    lesson: { book: "hsk2", page: "lesson-6" },
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
    lesson: { book: "hsk2", page: "lesson-25" },
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
    lesson: { book: "hsk2", page: "lesson-15" },
    meta: "问路 · Hỏi đường & phương tiện",
    vocab: [
      ["地铁", "dìtiě", "tàu điện ngầm"], ["怎么走", "zěnme zǒu", "đi thế nào"],
      ["附近", "fùjìn", "gần đây"],
    ],
    gram: [["Hỏi đường", "请问，…怎么走？"], ["Phương vị", "在…旁边 / 对面"]],
  },
  {
    id: "m", no: "Milestone", kind: "milestone",
    title: "Ôn tập chặng & Mini test", zh: "复习",
    meta: "Đánh giá năng lực HSK 2 · Mini test tổng hợp",
    vocab: [["Tổng ôn 60 từ", "zǒng fùxí", "flashcard chặng 1"]],
    gram: [["Tổng hợp ngữ pháp", "把 · Hỏi giá · Hỏi giờ"], ["Mini test 20 câu", "Nghe · Đọc · Viết"]],
  },
  {
    id: "6", no: "Trạm 6", kind: "lesson",
    title: "Thời tiết & Bốn mùa", zh: "天气",
    lesson: { book: "hsk2", page: "lesson-21" },
    meta: "天气 · Từ vựng thời tiết & so sánh 比",
    vocab: [["天气", "tiānqì", "thời tiết"], ["下雨", "xià yǔ", "mưa"], ["冷", "lěng", "lạnh"]],
    gram: [["Miêu tả thời tiết", "今天… / 明天会…"], ["So sánh", "比 + adj"]],
  },
];

const curatedHsk2Stations = curatedHsk2Base.map((s) => ({
  ...s,
  lessons: s.lesson ? [s.lesson] : [],
}));

const curatedHsk2Pages = new Set([
  "lesson-1", "lesson-11", "lesson-6", "lesson-25", "lesson-15", "lesson-21",
]);
const hsk2Extra = buildLevelStations(
  byBook("hsk2").filter((l) => !curatedHsk2Pages.has(l.page)),
  { idPrefix: "b", startNo: 7, milestoneId: "b-milestone" },
);

export const roadmapLevels: RoadmapLevel[] = [
  {
    id: "pinyin",
    label: "Pinyin",
    kicker: "NỀN TẢNG · PHÁT ÂM",
    title: "Nền tảng: Pinyin & nét cơ bản",
    status: "available",
    stations: [], // banner-only — dẫn về /roadmap/pinyin (spec §4)
  },
  {
    id: "hsk-1",
    label: "HSK 1",
    kicker: "CHẶNG 1 · NỀN TẢNG GIAO TIẾP",
    title: "Chặng 1: Giao tiếp thường nhật",
    status: "available",
    stations: buildLevelStations(byBook("hsk1")),
  },
  {
    id: "hsk-2",
    label: "HSK 2",
    kicker: "CHẶNG 1 · NỀN TẢNG GIAO TIẾP",
    title: "Chặng 1: Giao tiếp thường nhật",
    status: "available",
    stations: [...curatedHsk2Stations, ...hsk2Extra],
  },
  {
    id: "hsk-3",
    label: "HSK 3",
    kicker: "CHẶNG 2 · MỞ RỘNG XÃ HỘI",
    title: "Chặng 2: Mở rộng xã hội",
    status: "available",
    stations: buildLevelStations(byBook("hsk3")),
  },
  {
    id: "hsk-4",
    label: "HSK 4",
    kicker: "CHẶNG 3 · TRUNG CẤP",
    title: "Chặng 3: Trung cấp giao tiếp & đọc hiểu",
    status: "available",
    stations: buildLevelStations(byBook("hsk4")),
  },
  {
    id: "hsk-5",
    label: "HSK 5",
    kicker: "CHẶNG 4 · TRUNG CẤP CAO",
    title: "Chặng 4: Trung cấp cao — nghe hiểu & văn bản",
    status: "available",
    stations: buildLevelStations(byBook("hsk5")),
  },
  {
    id: "hsk-6",
    label: "HSK 6",
    kicker: "NÂNG CAO · HỌC THUẬT & NGHỀ NGHIỆP",
    title: "Chặng nâng cao: Học thuật & nghề nghiệp",
    status: "upcoming",
    stations: [],
  },
  {
    id: "hsk-7-9",
    label: "HSK 7–9",
    kicker: "NÂNG CAO · HỌC THUẬT & NGHỀ NGHIỆP",
    title: "Chặng đỉnh: HSK 7–9",
    status: "upcoming",
    stations: [],
  },
];

// Validate lúc load (pattern của src/content/*) — lỗi schema ném ngay, không chờ render.
roadmapLevels.forEach((l) => roadmapLevelSchema.parse(l));

export function getRoadmapLevel(id: string): RoadmapLevel | null {
  return roadmapLevels.find((l) => l.id === id) ?? null;
}
