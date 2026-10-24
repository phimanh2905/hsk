import { describe, it, expect, vi, beforeEach } from "vitest";

const getSession = vi.fn();
const where = vi.fn();
const selectChain = {
  from: vi.fn().mockReturnThis(),
  where,
};
const insertChain = {
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
};
const deleteWhere = vi.fn().mockResolvedValue(undefined);
const deleteChain = { where: deleteWhere };
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("@/lib/db", () => ({
  createDb: () => ({
    select: () => ({ from: () => ({ where }) }),
    insert: () => insertChain,
    delete: () => deleteChain,
  }),
}));

import { POST } from "../route";

function req(body?: unknown) {
  return new Request("http://localhost:3100/api/v1/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

/** Route select 6 lần: 3 domain existing + 3 domain final. */
function queueSelects(existing: Record<string, unknown[]>, final: Record<string, unknown[]>) {
  where.mockResolvedValueOnce(existing.srs ?? []).mockResolvedValueOnce(existing.studyDay ?? []).mockResolvedValueOnce(existing.lessonProgress ?? []).mockResolvedValueOnce(final.srs ?? []).mockResolvedValueOnce(final.studyDay ?? []).mockResolvedValueOnce(final.lessonProgress ?? []);
}

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue(null);
  deleteWhere.mockResolvedValue(undefined);
});

describe("POST /api/v1/sync", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await POST(req({ srs: [], studyDay: [], lessonProgress: [] }));
    expect(res.status).toBe(401);
  });

  it("400 khi body sai schema (date sai định dạng)", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(req({ srs: [], studyDay: [{ date: "2026/10/24", xp: 1, correct: 0, updatedAt: 100 }], lessonProgress: [] }));
    expect(res.status).toBe(400);
  });

  it("400 khi body sai schema (srs key rỗng)", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(req({ srs: [{ key: "", status: "new", dueAt: null, reviewCount: 0, lastReviewedAt: null, updatedAt: 100, deletedAt: null }], studyDay: [], lessonProgress: [] }));
    expect(res.status).toBe(400);
  });

  it("merge đúng: incoming mới hơn thắng, counters lấy max", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    queueSelects(
      { srs: [{ key: "k1", status: "learning", dueAt: 50, reviewCount: 3, lastReviewedAt: 90, updatedAt: 100, deletedAt: null }] },
      { srs: [], studyDay: [], lessonProgress: [] }
    );
    const res = await POST(req({
      srs: [{ key: "k1", status: "learned", dueAt: 250, reviewCount: 5, lastReviewedAt: 200, updatedAt: 200, deletedAt: null }],
      studyDay: [],
      lessonProgress: [],
    }));
    expect(res.status).toBe(200);
    // lần gọi values đầu tiên = srs
    const arg = insertChain.values.mock.calls[0][0][0];
    expect(arg.reviewCount).toBe(5); // max(3,5)
    expect(arg.updatedAt).toBe(200); // incoming thắng
    expect(arg.status).toBe("learned");
  });

  it("row mới (server chưa có) upsert nguyên incoming", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    queueSelects({ srs: [] }, { srs: [], studyDay: [], lessonProgress: [] });
    const incoming = { key: "k2", status: "new", dueAt: null, reviewCount: 0, lastReviewedAt: null, updatedAt: 300, deletedAt: null };
    await POST(req({ srs: [incoming], studyDay: [], lessonProgress: [] }));
    const arg = insertChain.values.mock.calls[0][0][0];
    expect(arg).toMatchObject({ userId: "u1", key: "k2", status: "new", updatedAt: 300 });
  });

  it("response chứa toàn bộ state server sau merge", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    queueSelects(
      { srs: [], studyDay: [], lessonProgress: [] },
      {
        srs: [{ key: "k1", status: "learned", dueAt: 250, reviewCount: 5, lastReviewedAt: 200, updatedAt: 200, deletedAt: null }],
        studyDay: [{ date: "2026-10-24", xp: 30, correct: 8, updatedAt: 200 }],
        lessonProgress: [{ book: "hsk1", lesson: "l1", modes: { read: 3 }, knownCount: 5, updatedAt: 200, deletedAt: null }],
      }
    );
    const res = await POST(req({
      srs: [{ key: "k1", status: "learned", dueAt: 250, reviewCount: 5, lastReviewedAt: 200, updatedAt: 200, deletedAt: null }],
      studyDay: [{ date: "2026-10-24", xp: 30, correct: 8, updatedAt: 200 }],
      lessonProgress: [{ book: "hsk1", lesson: "l1", modes: { read: 3 }, knownCount: 5, updatedAt: 200, deletedAt: null }],
    }));
    const json = await res.json();
    expect(json.serverTime).toBeTypeOf("number");
    expect(json.srs).toEqual([
      { key: "k1", status: "learned", dueAt: 250, reviewCount: 5, lastReviewedAt: 200, updatedAt: 200, deletedAt: null },
    ]);
    expect(json.studyDay).toEqual([{ date: "2026-10-24", xp: 30, correct: 8, updatedAt: 200 }]);
    expect(json.lessonProgress).toEqual([{ book: "hsk1", lesson: "l1", modes: { read: 3 }, knownCount: 5, updatedAt: 200, deletedAt: null }]);
  });

  it("purge tombstone >90 ngày: gọi delete.where cho srs_cards và lesson_progress", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    queueSelects({ srs: [], studyDay: [], lessonProgress: [] }, { srs: [], studyDay: [], lessonProgress: [] });
    await POST(req({
      srs: [{ key: "dead", status: "new", dueAt: null, reviewCount: 0, lastReviewedAt: null, updatedAt: 100, deletedAt: 1 }],
      studyDay: [],
      lessonProgress: [{ book: "hsk1", lesson: "l9", modes: {}, knownCount: 0, updatedAt: 100, deletedAt: 1 }],
    }));
    expect(deleteWhere).toHaveBeenCalledTimes(2);
  });

  it("batch có 2 bản cùng key không throw — values nhận bản đã merge (dedupe)", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    queueSelects({ srs: [] }, { srs: [], studyDay: [], lessonProgress: [] });
    const res = await POST(req({
      srs: [
        { key: "k1", status: "learning", dueAt: 50, reviewCount: 3, lastReviewedAt: 90, updatedAt: 100, deletedAt: null },
        { key: "k1", status: "learned", dueAt: 250, reviewCount: 5, lastReviewedAt: 200, updatedAt: 200, deletedAt: null },
      ],
      studyDay: [
        { date: "2026-10-24", xp: 10, correct: 2, updatedAt: 100 },
        { date: "2026-10-24", xp: 30, correct: 8, updatedAt: 200 },
      ],
      lessonProgress: [],
    }));
    expect(res.status).toBe(200);
    const srsArg = insertChain.values.mock.calls[0][0];
    expect(srsArg).toHaveLength(1); // dedupe: 1 row thay vì 2 (tránh 500 ON CONFLICT)
    expect(srsArg[0]).toMatchObject({ key: "k1", status: "learned", reviewCount: 5, updatedAt: 200 });
    const dayArg = insertChain.values.mock.calls[1][0];
    expect(dayArg).toHaveLength(1);
    expect(dayArg[0]).toMatchObject({ date: "2026-10-24", xp: 30, correct: 8, updatedAt: 200 });
  });
});
