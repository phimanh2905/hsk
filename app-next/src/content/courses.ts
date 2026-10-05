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
  { t: "Xin chào!", w: 13 },
  { t: "Tôi tên là ByeHSK", w: 15 },
  { t: "Tôi là người Việt Nam", w: 22 },
  { t: "Tôi có hai đứa con", w: 21 },
  { t: "Hôm nay tôi nghỉ", w: 22 },
  { t: "Số điện thoại của bạn là bao nhiêu?", w: 23 },
  { t: "Tôi tan làm lúc 6 rưỡi tối", w: 27 },
  { t: "Bố tôi cũng làm việc ở bệnh viện", w: 27 },
  { t: "Sáng mai tôi học ở trường", w: 23 },
  { t: "Táo ở đây rẻ thật!", w: 23 },
  { t: "Tôi đang học đại học", w: 25 },
  { t: "Hôm qua tuyết rơi", w: 24 },
  { t: "Cho tôi một cốc trà", w: 20 },
  { t: "Tôi đã xem một bộ phim", w: 28 },
  { t: "Hẹn gặp ở sân bay!", w: 20 }
];

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
    cardMeta: "333 từ vựng · 41 mẫu",
    titles: hsk1Titles
  }),
  hsk2: makeBook({
    slug: "hsk2", name: "Bye HSK 2",
    cardMeta: "213 từ vựng · 45 mẫu",
    lessons: 45, minW: 12, maxW: 18
  }),
  hsk3: makeBook({
    slug: "hsk3", name: "Bye HSK 3",
    cardMeta: "483 từ vựng · 63 mẫu",
    lessons: 63, minW: 14, maxW: 20
  }),
  hsk4: makeBook({
    slug: "hsk4", name: "Bye HSK 4",
    cardMeta: "972 từ vựng",
    lessons: 30, minW: 18, maxW: 24
  }),
  hsk5: makeBook({
    slug: "hsk5", name: "Bye HSK 5",
    cardMeta: "1059 từ vựng",
    lessons: 30, minW: 20, maxW: 26
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
  { slug: "hsk1", name: "Bye HSK 1", cardMeta: "333 từ vựng · 41 mẫu", lessons: 15 },
  { slug: "hsk2", name: "Bye HSK 2", cardMeta: "213 từ vựng · 45 mẫu", lessons: 45 },
  { slug: "hsk3", name: "Bye HSK 3", cardMeta: "483 từ vựng · 63 mẫu", lessons: 63 },
  { slug: "hsk4", name: "Bye HSK 4", cardMeta: "972 từ vựng", lessons: 30 },
  { slug: "hsk5", name: "Bye HSK 5", cardMeta: "1059 từ vựng", lessons: 30 },
  { slug: "hsk6", name: "Bye HSK 6", cardMeta: "1123 từ vựng", lessons: 30 },
  { slug: "hsk79", name: "Bye HSK 7-9", cardMeta: "5606 từ vựng", lessons: 30 }
];
