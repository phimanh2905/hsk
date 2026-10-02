/* Port 1:1 từ clone/js/data/review.js — PLAN-17 / SPEC-17: dữ liệu mẫu cho dashboard "Thống kê học tập".
   Chỉ đổi: emptyHref "reading.html" → "/course"; "course.html?book=hsk1&skill=grammar" → "/course/hsk1?skill=grammar". */

export type ReviewCopy = { emptyDesc: string; emptyLink: string; emptyHref: string };
export type Dist = { forgot: number; hard: number; good: number; easy: number };

export const reviewData: {
  counts: number[];
  today: number;
  week: number;
  avgPerDay: number;
  avgPerCard: number;
  streak: number;
  last7: number[];
  dist: Dist;
  total: number;
  monthTotal: number;
  copy: Record<"vocab" | "grammar", ReviewCopy>;
} = {
  counts: [12, 34, 8, 41, 96, 191], // Cần ôn · Mới thêm · Đang học · Mới thuộc · Đã thuộc · Tổng
  today: 0,
  week: 0,
  avgPerDay: 0,
  avgPerCard: 0,
  streak: 0,
  last7: [3, 5, 0, 8, 12, 4, 0], // T3 T4 T5 T6 T7 CN T2
  dist: { forgot: 8, hard: 5, good: 14, easy: 3 },
  total: 30,
  monthTotal: 30,
  copy: {
    vocab: {
      emptyDesc: "Bấm nút ⭐ cạnh mỗi từ trong bài học để thêm từ vào bộ thẻ ôn.",
      emptyLink: "Vào kệ sách →",
      emptyHref: "/course"
    },
    grammar: {
      emptyDesc: "Bấm nút ⭐ trên mẫu ngữ pháp để thêm vào bộ thẻ ôn tập.",
      emptyLink: "Vào mục ngữ pháp →",
      emptyHref: "/course/hsk1?skill=grammar"
    }
  }
};
