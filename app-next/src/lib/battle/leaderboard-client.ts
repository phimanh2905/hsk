/* Client gọi /api/v1/battle/leaderboard — cache 60s per key (W6.2).
   Cache in-memory module-level: hit trong 60s trả luôn không fetch.
   Export clearLeaderboardCache để POST attempt xong gọi (bảng cập nhật ngay). */

type CacheEntry = { at: number; data: unknown };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

/* Shape trả về của GET /api/v1/battle/leaderboard (Task 4) */
export type MonthLeaderboardItem = {
  name: string;
  totalScore: number;
  bestScore: number;
  lessonsPlayed: number;
};

export type LessonLeaderboardItem = {
  name: string;
  score: number;
  correct: number;
  total: number;
  durationMs: number;
  createdAt: string;
};

export async function fetchBattleLeaderboard(
  scope: "lesson" | "month",
  opts: { book?: string; page?: string } = {}
): Promise<unknown> {
  const key = scope + JSON.stringify(opts);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const qs = new URLSearchParams({
    scope,
    ...(opts.book ? { book: opts.book } : {}),
    ...(opts.page ? { page: opts.page } : {}),
  });
  const res = await fetch(`/api/v1/battle/leaderboard?${qs}`);
  if (!res.ok) throw new Error("leaderboard_failed");
  const data = await res.json();
  cache.set(key, { at: Date.now(), data });
  return data;
}

export function clearLeaderboardCache(): void {
  cache.clear();
}
