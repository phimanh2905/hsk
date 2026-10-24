/* Port 1:1 từ clone/js/data/courses.js — dữ liệu 7 khóa học.
   genLessons/genGrammar/genHanzi giữ nguyên logic gốc (chuyển TS), không hardcode output. */

export type Skill = "vocab" | "grammar" | "hanzi";

export type LessonMeta = {
  pageId: string;
  order: number;
  title: string;
  words?: number;
  meta?: string;
  skill: Skill;
};

export type BookMeta = { slug: string; name: string; cardMeta: string; lessons: number };

/* ---- HSK 1: 15 bài từ vựng thật theo giáo trình 标准教程 HSK 1 · 3.0 ---- */
const hsk1Titles: { t: string; w: number }[] = [
  { t: "Chào hỏi & xưng hô", w: 25 },
  { t: "Chào hỏi & xưng hô & Đại từ & từ để hỏi", w: 15 },
  { t: "Đại từ & từ để hỏi & Gia đình & con người", w: 15 },
  { t: "Gia đình & con người", w: 20 },
  { t: "Số & lượng từ", w: 25 },
  { t: "Số & lượng từ & Thời gian", w: 15 },
  { t: "Thời gian", w: 20 },
  { t: "Học tập & trường lớp", w: 25 },
  { t: "Học tập & trường lớp (phần 2)", w: 17 },
  { t: "Công nghệ & liên lạc & Công việc & mua sắm", w: 15 },
  { t: "Công việc & mua sắm & Phương vị & nơi chốn", w: 15 },
  { t: "Phương vị & nơi chốn", w: 25 },
  { t: "Phương vị & nơi chốn (phần 2)", w: 25 },
  { t: "Giao thông & đi lại", w: 23 },
  { t: "Ăn uống", w: 23 },
  { t: "Sức khỏe & cơ thể & Cảm xúc & thái độ", w: 15 },
  { t: "Cảm xúc & thái độ & Tính từ & mô tả", w: 15 },
  { t: "Tính từ & mô tả", w: 18 },
  { t: "Thiên nhiên & động vật & Giải trí & thể thao", w: 15 },
  { t: "Giải trí & thể thao & Từ nối & ngữ pháp", w: 15 },
  { t: "Từ nối & ngữ pháp", w: 25 },
  { t: "Từ nối & ngữ pháp & Động từ & hoạt động thường ngày", w: 15 },
  { t: "Động từ & hoạt động thường ngày", w: 19 },
  { t: "Giao tiếp & suy nghĩ", w: 16 },
  { t: "Thời gian & tần suất (bổ sung) & Mức độ & lượng (bổ sung)", w: 15 },
  { t: "Danh từ trừu tượng & Sở thích & hoạt động cá nhân", w: 15 },
  { t: "Sở thích & hoạt động cá nhân & Từ thông dụng khác", w: 11 }
]; // 27 bài — cardMeta: "497 từ vựng · 41 mẫu", lessons: 27
const hsk2Titles: { t: string; w: number }[] = [
  { t: "Chào hỏi & xưng hô", w: 18 },
  { t: "Đại từ & từ để hỏi & Gia đình & con người", w: 15 },
  { t: "Gia đình & con người & Số & lượng từ", w: 15 },
  { t: "Số & lượng từ", w: 25 },
  { t: "Số & lượng từ & Thời gian", w: 15 },
  { t: "Thời gian", w: 25 },
  { t: "Thời gian & Học tập & trường lớp", w: 15 },
  { t: "Học tập & trường lớp", w: 25 },
  { t: "Học tập & trường lớp (phần 2)", w: 21 },
  { t: "Công nghệ & liên lạc & Công việc & mua sắm", w: 15 },
  { t: "Công việc & mua sắm", w: 25 },
  { t: "Công việc & mua sắm & Phương vị & nơi chốn", w: 15 },
  { t: "Phương vị & nơi chốn", w: 25 },
  { t: "Phương vị & nơi chốn & Giao thông & đi lại", w: 15 },
  { t: "Giao thông & đi lại", w: 25 },
  { t: "Giao thông & đi lại & Ăn uống", w: 15 },
  { t: "Ăn uống", w: 21 },
  { t: "Sức khỏe & cơ thể", w: 25 },
  { t: "Sức khỏe & cơ thể & Cảm xúc & thái độ", w: 15 },
  { t: "Cảm xúc & thái độ & Thời tiết & màu sắc", w: 15 },
  { t: "Thời tiết & màu sắc", w: 22 },
  { t: "Tính từ & mô tả", w: 25 },
  { t: "Tính từ & mô tả & Thiên nhiên & động vật", w: 15 },
  { t: "Thiên nhiên & động vật", w: 20 },
  { t: "Giải trí & thể thao", w: 25 },
  { t: "Giải trí & thể thao & Từ nối & ngữ pháp", w: 15 },
  { t: "Từ nối & ngữ pháp", w: 25 },
  { t: "Từ nối & ngữ pháp (phần 2)", w: 25 },
  { t: "Từ nối & ngữ pháp & Động từ & hoạt động thường ngày", w: 15 },
  { t: "Động từ & hoạt động thường ngày", w: 25 },
  { t: "Động từ & hoạt động thường ngày & Giao tiếp & suy nghĩ", w: 15 },
  { t: "Giao tiếp & suy nghĩ & Thời gian & tần suất (bổ sung)", w: 15 },
  { t: "Thời gian & tần suất (bổ sung) & Mức độ & lượng (bổ sung)", w: 15 },
  { t: "Mức độ & lượng (bổ sung) & Danh từ trừu tượng", w: 15 },
  { t: "Danh từ trừu tượng", w: 15 },
  { t: "Học tập & ngôn ngữ (bổ sung) & Đồ dùng & quần áo", w: 15 },
  { t: "Địa điểm & hành chính", w: 20 },
  { t: "Động từ & trạng thái (bổ sung)", w: 25 },
  { t: "Động từ & trạng thái (bổ sung) (phần 2)", w: 25 },
  { t: "Động từ & trạng thái (bổ sung) & Từ thông dụng khác", w: 10 }
]; // 40 bài — cardMeta: "771 từ vựng · 45 mẫu", lessons: 40
const hsk3Titles: { t: string; w: number }[] = [
  { t: "Gia đình & quan hệ (1)", w: 25 },
  { t: "Gia đình & quan hệ (2)", w: 25 },
  { t: "Gia đình & quan hệ (3)", w: 25 },
  { t: "Gia đình & quan hệ (4)", w: 25 },
  { t: "Cảm xúc & tâm trạng", w: 25 },
  { t: "Tính cách & phẩm chất", w: 16 },
  { t: "Công việc & văn phòng", w: 25 },
  { t: "Học tập & trường lớp", w: 25 },
  { t: "Ăn uống & ẩm thực (1)", w: 25 },
  { t: "Ăn uống & ẩm thực (2)", w: 25 },
  { t: "Ăn uống & ẩm thực (3)", w: 25 },
  { t: "Ăn uống & ẩm thực (4)", w: 25 },
  { t: "Mua sắm & tiền bạc", w: 25 },
  { t: "Du lịch & giao thông", w: 17 },
  { t: "Thời gian & lịch (1)", w: 25 },
  { t: "Thời gian & lịch (2)", w: 16 },
  { t: "Thời tiết & tự nhiên", w: 21 },
  { t: "Sức khỏe & cơ thể (1)", w: 25 },
  { t: "Sức khỏe & cơ thể (2)", w: 16 },
  { t: "Nhà cửa & đồ vật", w: 23 },
  { t: "Quần áo & màu sắc", w: 25 },
  { t: "Giao tiếp & lời nói", w: 25 },
  { t: "Giải trí & thể thao", w: 25 },
  { t: "Suy nghĩ & ý kiến", w: 25 },
  { t: "Hành động & vận động (1)", w: 25 },
  { t: "Hành động & vận động (2)", w: 25 },
  { t: "Hành động & vận động (3)", w: 25 },
  { t: "Hành động & vận động (4)", w: 20 },
  { t: "Bổ sung (1)", w: 25 },
  { t: "Bổ sung (2)", w: 25 },
  { t: "Bổ sung (3)", w: 25 },
  { t: "Bổ sung (4)", w: 25 },
  { t: "Bổ sung (5)", w: 25 },
  { t: "Bổ sung (6)", w: 25 },
  { t: "Bổ sung (7)", w: 25 },
  { t: "Bổ sung (8)", w: 25 },
  { t: "Bổ sung (9)", w: 25 },
  { t: "Bổ sung (10)", w: 25 },
  { t: "Bổ sung (11)", w: 25 },
  { t: "Bổ sung (12)", w: 25 },
  { t: "Bổ sung (13)", w: 13 }
]; // 41 bài — cardMeta: "970 từ vựng · 63 mẫu", lessons: 41
const hsk4Titles: { t: string; w: number }[] = [
  { t: "Gia đình & quan hệ (1)", w: 25 },
  { t: "Gia đình & quan hệ (2)", w: 25 },
  { t: "Gia đình & quan hệ (3)", w: 25 },
  { t: "Gia đình & quan hệ (4)", w: 25 },
  { t: "Gia đình & quan hệ (5)", w: 25 },
  { t: "Gia đình & quan hệ (6)", w: 20 },
  { t: "Cảm xúc & tâm trạng", w: 23 },
  { t: "Công việc & văn phòng", w: 22 },
  { t: "Học tập & trường lớp", w: 25 },
  { t: "Ăn uống & ẩm thực (1)", w: 25 },
  { t: "Ăn uống & ẩm thực (2)", w: 25 },
  { t: "Ăn uống & ẩm thực (3)", w: 25 },
  { t: "Ăn uống & ẩm thực (4)", w: 25 },
  { t: "Mua sắm & tiền bạc", w: 25 },
  { t: "Du lịch & giao thông", w: 20 },
  { t: "Thời gian & lịch (1)", w: 25 },
  { t: "Thời gian & lịch (2)", w: 23 },
  { t: "Thời tiết & tự nhiên", w: 25 },
  { t: "Sức khỏe & cơ thể (1)", w: 25 },
  { t: "Sức khỏe & cơ thể (2)", w: 25 },
  { t: "Nhà cửa & đồ vật (1)", w: 25 },
  { t: "Nhà cửa & đồ vật (2)", w: 25 },
  { t: "Quần áo & màu sắc", w: 22 },
  { t: "Giao tiếp & lời nói", w: 25 },
  { t: "Suy nghĩ & ý kiến", w: 22 },
  { t: "Hành động & vận động (1)", w: 25 },
  { t: "Hành động & vận động (2)", w: 25 },
  { t: "Hành động & vận động (3)", w: 25 },
  { t: "Hành động & vận động (4)", w: 20 },
  { t: "Bổ sung (1)", w: 25 },
  { t: "Bổ sung (2)", w: 25 },
  { t: "Bổ sung (3)", w: 25 },
  { t: "Bổ sung (4)", w: 25 },
  { t: "Bổ sung (5)", w: 25 },
  { t: "Bổ sung (6)", w: 25 },
  { t: "Bổ sung (7)", w: 25 },
  { t: "Bổ sung (8)", w: 25 },
  { t: "Bổ sung (9)", w: 25 },
  { t: "Bổ sung (10)", w: 25 },
  { t: "Bổ sung (11)", w: 25 },
  { t: "Bổ sung (12)", w: 23 }
]; // 41 bài — cardMeta: "999 từ vựng", lessons: 41
const hsk5Titles: { t: string; w: number }[] = [
  { t: "Gia đình & quan hệ (1)", w: 25 },
  { t: "Gia đình & quan hệ (2)", w: 25 },
  { t: "Gia đình & quan hệ (3)", w: 25 },
  { t: "Gia đình & quan hệ (4)", w: 25 },
  { t: "Gia đình & quan hệ (5)", w: 23 },
  { t: "Cảm xúc & tâm trạng", w: 25 },
  { t: "Học tập & trường lớp", w: 23 },
  { t: "Ăn uống & ẩm thực (1)", w: 25 },
  { t: "Ăn uống & ẩm thực (2)", w: 25 },
  { t: "Ăn uống & ẩm thực (3)", w: 25 },
  { t: "Ăn uống & ẩm thực (4)", w: 25 },
  { t: "Ăn uống & ẩm thực (5)", w: 15 },
  { t: "Mua sắm & tiền bạc", w: 25 },
  { t: "Du lịch & giao thông", w: 22 },
  { t: "Thời gian & lịch (1)", w: 25 },
  { t: "Thời gian & lịch (2)", w: 23 },
  { t: "Thời tiết & tự nhiên (1)", w: 25 },
  { t: "Thời tiết & tự nhiên (2)", w: 22 },
  { t: "Sức khỏe & cơ thể (1)", w: 25 },
  { t: "Sức khỏe & cơ thể (2)", w: 25 },
  { t: "Nhà cửa & đồ vật", w: 25 },
  { t: "Quần áo & màu sắc", w: 23 },
  { t: "Giao tiếp & lời nói", w: 25 },
  { t: "Giải trí & thể thao", w: 23 },
  { t: "Suy nghĩ & ý kiến", w: 25 },
  { t: "Xã hội & chính trị", w: 18 },
  { t: "Hành động & vận động (1)", w: 25 },
  { t: "Hành động & vận động (2)", w: 25 },
  { t: "Hành động & vận động (3)", w: 25 },
  { t: "Hành động & vận động (4)", w: 25 },
  { t: "Bổ sung (1)", w: 25 },
  { t: "Bổ sung (2)", w: 25 },
  { t: "Bổ sung (3)", w: 25 },
  { t: "Bổ sung (4)", w: 25 },
  { t: "Bổ sung (5)", w: 25 },
  { t: "Bổ sung (6)", w: 25 },
  { t: "Bổ sung (7)", w: 25 },
  { t: "Bổ sung (8)", w: 25 },
  { t: "Bổ sung (9)", w: 25 },
  { t: "Bổ sung (10)", w: 25 },
  { t: "Bổ sung (11)", w: 25 },
  { t: "Bổ sung (12)", w: 25 },
  { t: "Bổ sung (13)", w: 25 },
  { t: "Bổ sung (14)", w: 18 },
  { t: "Bổ sung (15)", w: 8 }
]; // 45 bài — cardMeta: "1071 từ vựng", lessons: 45

function genLessons(n: number, minW: number, maxW: number): LessonMeta[] {
  const arr: LessonMeta[] = [];
  for (let i = 1; i <= n; i++) {
    const words = minW + ((i * 3) % (maxW - minW + 1));
    arr.push({
      pageId: "lesson-" + i,
      order: i,
      title: "Bài " + i,
      words: words,
      skill: "vocab"
    });
  }
  return arr;
}

export function genGrammar(n: number): LessonMeta[] {
  const arr: LessonMeta[] = [];
  for (let i = 1; i <= n; i++) {
      arr.push({
        pageId: "lesson-" + i,
        order: i,
        title: "Bài " + i + " — Ngữ pháp",
        meta: "≈" + (4 + (i % 4)) + " mẫu",
        skill: "grammar"
      });
  }
  return arr;
}

export function genHanzi(n: number): LessonMeta[] {
  const arr: LessonMeta[] = [];
  for (let i = 1; i <= n; i++) {
      arr.push({
        pageId: "lesson-" + i,
        order: i,
        title: "Bài " + i + " — Chữ Hán",
      meta: "≈" + (8 + (i % 5)) + " chữ",
      skill: "hanzi"
    });
  }
  return arr;
}

type BookConfig = {
  slug: string;
  name: string;
  cardMeta: string;
  lessons?: number;
  minW?: number;
  maxW?: number;
  titles?: { t: string; w: number }[];
};

function makeBook(cfg: BookConfig): { slug: string; name: string; cardMeta: string; lessons: number; pages: LessonMeta[] } {
  const list: LessonMeta[] = cfg.titles
    ? cfg.titles.map((x, idx) => ({
        pageId: "lesson-" + (idx + 1),
        order: idx + 1,
        title: x.t,
        words: x.w,
        skill: "vocab" as Skill
      }))
    : genLessons(cfg.lessons!, cfg.minW!, cfg.maxW!);
  return {
    slug: cfg.slug,
    name: cfg.name,
    cardMeta: cfg.cardMeta,
    lessons: list.length,
    pages: list
  };
}

export const courses: Record<string, { pages: LessonMeta[] }> = {
  hsk1: makeBook({
    slug: "hsk1", name: "Bye HSK 1",
    cardMeta: "497 từ vựng · 41 mẫu",
    titles: hsk1Titles
  }),
  hsk2: makeBook({
    slug: "hsk2", name: "Bye HSK 2",
    cardMeta: "771 từ vựng · 45 mẫu",
    titles: hsk2Titles, minW: 12, maxW: 18
  }),
  hsk3: makeBook({
    slug: "hsk3", name: "Bye HSK 3",
    cardMeta: "970 từ vựng · 63 mẫu",
    titles: hsk3Titles, minW: 14, maxW: 20
  }),
  hsk4: makeBook({
    slug: "hsk4", name: "Bye HSK 4",
    cardMeta: "999 từ vựng",
    titles: hsk4Titles, minW: 18, maxW: 24
  }),
  hsk5: makeBook({
    slug: "hsk5", name: "Bye HSK 5",
    cardMeta: "1071 từ vựng",
    titles: hsk5Titles, minW: 20, maxW: 26
  }),
  hsk6: makeBook({
    slug: "hsk6", name: "Bye HSK 6",
    cardMeta: "1123 từ vựng",
    lessons: 30, minW: 22, maxW: 28
  }),
  hsk79: makeBook({
    slug: "hsk79", name: "Bye HSK 7-9",
    cardMeta: "5606 từ vựng",
    lessons: 30, minW: 25, maxW: 30
  })
};

export const books: BookMeta[] = [
  { slug: "hsk1", name: "Bye HSK 1", cardMeta: "497 từ vựng · 41 mẫu", lessons: 27 },
  { slug: "hsk2", name: "Bye HSK 2", cardMeta: "771 từ vựng · 45 mẫu", lessons: 40 },
  { slug: "hsk3", name: "Bye HSK 3", cardMeta: "970 từ vựng · 63 mẫu", lessons: 41 },
  { slug: "hsk4", name: "Bye HSK 4", cardMeta: "999 từ vựng", lessons: 41 },
  { slug: "hsk5", name: "Bye HSK 5", cardMeta: "1071 từ vựng", lessons: 45 },
  { slug: "hsk6", name: "Bye HSK 6", cardMeta: "1123 từ vựng", lessons: 30 },
  { slug: "hsk79", name: "Bye HSK 7-9", cardMeta: "5606 từ vựng", lessons: 30 }
];
