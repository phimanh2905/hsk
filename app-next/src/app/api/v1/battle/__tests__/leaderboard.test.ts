import { describe, it, expect, vi, beforeEach } from "vitest";

const dbAll = vi.fn();

vi.mock("@/lib/db", () => ({ createDb: () => ({ all: dbAll }) }));

import { GET } from "../leaderboard/route";

function req(query: string) {
  return new Request(`http://localhost:3100/api/v1/battle/leaderboard${query}`) as unknown as import(
    "next/server"
  ).NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  dbAll.mockResolvedValue([]);
});

describe("GET /api/v1/battle/leaderboard", () => {
  it("400 khi thiếu scope", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
  });

  it("400 khi scope không hợp lệ", async () => {
    const res = await GET(req("?scope=all"));
    expect(res.status).toBe(400);
  });

  it("400 khi scope=lesson nhưng thiếu book/page", async () => {
    const res = await GET(req("?scope=lesson"));
    expect(res.status).toBe(400);
    expect((await GET(req("?scope=lesson&book=hsk1"))).status).toBe(400);
  });

  it("scope=lesson trả items đúng shape (public, không cần đăng nhập)", async () => {
    dbAll.mockResolvedValue([
      { name: "An", score: 134, correct: 11, total: 13, durationMs: 32_000, createdAt: 1_760_000_000 },
    ]);
    const res = await GET(req("?scope=lesson&book=hsk1&page=lesson-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items[0]).toMatchObject({ name: "An", score: 134, correct: 11, total: 13, durationMs: 32_000 });
    expect(typeof json.items[0].createdAt).toBe("string"); // ISO
  });

  it("scope=month không cần book/page", async () => {
    dbAll.mockResolvedValue([
      { userId: "u1", name: "An", bookSlug: "hsk1", lessonSlug: "lesson-1", score: 120 },
      { userId: "u1", name: "An", bookSlug: "hsk1", lessonSlug: "lesson-2", score: 140 },
      { userId: "u2", name: "Bình", bookSlug: "hsk1", lessonSlug: "lesson-1", score: 100 },
    ]);
    const res = await GET(req("?scope=month"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items[0]).toEqual({ name: "An", totalScore: 260, bestScore: 140, lessonsPlayed: 2 });
    expect(json.items[1]).toEqual({ name: "Bình", totalScore: 100, bestScore: 100, lessonsPlayed: 1 });
    expect(json.items).toHaveLength(2);
  });

  it("month cắt còn 10 theo totalScore giảm dần", async () => {
    dbAll.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => ({ userId: `u${i}`, name: `U${i}`, bookSlug: "b", lessonSlug: "l", score: i }))
    );
    const json = await (await GET(req("?scope=month"))).json();
    expect(json.items).toHaveLength(10);
    expect(json.items[0].totalScore).toBe(11);
  });
});
