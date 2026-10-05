/* Bye HSK — SP1: dữ liệu bảng xếp hạng (port từ clone/js/data/leaderboard.js + helper từ clone/js/leaderboard.js). */

export type XpRow = { name: string; points: number };
export type BattleRow = { name: string; score: string; time: string };

/* XP tổng — sắp theo điểm giảm dần */
export const leaderboardData: { xp: XpRow[]; battle: BattleRow[] } = {
  xp: [
    { name: "My Phan", points: 7915 },
    { name: "Khánh Linh Trần", points: 5850 },
    { name: "TÔI VÀ EM", points: 4977 },
    { name: "Quỳnh Ngọc (Wuynhh)", points: 4838 },
    { name: "Boi thy Huynh", points: 4523 },
    { name: "Ngọc Nguyễn", points: 4153 },
    { name: "Vân Anh Ngô", points: 3675 },
    { name: "Đạt Nguyễn Thành", points: 3591 },
    { name: "Thi Yen", points: 3397 },
    { name: "Giao Trần Quỳnh", points: 3235 },
  ],
  /* Đấu trí tháng — 10 hàng, điểm 12/15 → 9/15, kèm thời gian */
  battle: [
    { name: "Minh Anh Phạm", score: "12/15", time: "5 phút trước" },
    { name: "Tuấn Kiệt", score: "12/15", time: "18 phút trước" },
    { name: "Hải Yến", score: "11/15", time: "32 phút trước" },
    { name: "Đức Anh Vũ", score: "11/15", time: "1 giờ trước" },
    { name: "Thanh Thảo", score: "11/15", time: "2 giờ trước" },
    { name: "Hoàng Nam", score: "10/15", time: "3 giờ trước" },
    { name: "Kim Chi Lê", score: "10/15", time: "5 giờ trước" },
    { name: "Trung Hiếu", score: "10/15", time: "7 giờ trước" },
    { name: "Bảo Ngọc Trần", score: "9/15", time: "9 giờ trước" },
    { name: "Gia Huy", score: "9/15", time: "hôm qua" },
  ],
};

export function initials(name: string): string {
  const words = String(name)
    .replace(/\([^)]*\)/g, "") // bỏ phần trong ngoặc: (Wuynhh)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const a = (words[0] || "?").charAt(0);
  const b = words.length > 1 ? words[1].charAt(0) : "";
  return (a + b).toUpperCase();
}

export function formatXp(points: number): string {
  return points.toLocaleString("vi-VN") + " XP";
}
