import { describe, it, expect } from "vitest";
import { leaderboardData, initials, formatXp } from "../leaderboard";

describe("leaderboardData", () => {
  it("có đúng 10 hàng XP giảm dần, hàng đầu là My Phan 7915", () => {
    expect(leaderboardData.xp).toHaveLength(10);
    expect(leaderboardData.xp[0]).toEqual({ name: "My Phan", points: 7915 });
    const points = leaderboardData.xp.map((r) => r.points);
    expect([...points].sort((a, b) => b - a)).toEqual(points);
  });

  it("có đúng 10 hàng Đấu trí, điểm 12/15 → 9/15, có thời gian", () => {
    expect(leaderboardData.battle).toHaveLength(10);
    expect(leaderboardData.battle[0]).toEqual({
      name: "Minh Anh Phạm",
      score: "12/15",
      time: "5 phút trước",
    });
    expect(leaderboardData.battle[9].score).toBe("9/15");
  });
});

describe("initials", () => {
  it("bỏ phần trong ngoặc và lấy 2 chữ cái", () => {
    expect(initials("Quỳnh Ngọc (Wuynhh)")).toBe("QN");
  });
  it("tên 1 từ lấy 1 chữ cái, viết hoa", () => {
    expect(initials("Tuấn Kiệt")).toBe("TK");
    expect(initials("gia huy")).toBe("GH");
  });
});

describe("formatXp", () => {
  it("format vi-VN với dấu chấm ngăn cách nghìn + ' XP'", () => {
    expect(formatXp(7915)).toBe("7.915 XP");
    expect(formatXp(3235)).toBe("3.235 XP");
  });
});
