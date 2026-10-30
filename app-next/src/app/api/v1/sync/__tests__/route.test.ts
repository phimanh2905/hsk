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

/** Route select 11 lần: 5 domain existing (srs, studyDay, lessonProgress,
    readingProgress, readingDrafts) + 6 domain final (thêm reviewLogs). */
function queueSelects(existing: Record<string, unknown[]>, final: Record<string, unknown[]>) {
  where
    .mockResolvedValueOnce(existing.srs ?? [])
    .mockResolvedValueOnce(existing.studyDay ?? [])
    .mockResolvedValueOnce(existing.lessonProgress ?? [])
    .mockResolvedValueOnce(existing.readingProgress ?? [])
    .mockResolvedValueOnce(existing.readingDrafts ?? [])
    .mockResolvedValueOnce(final.srs ?? [])
    .mockResolvedValueOnce(final.studyDay ?? [])
    .mockResolvedValueOnce(final.lessonProgress ?? [])
    .mockResolvedValueOnce(final.reviewLogs ?? [])
    .mockResolvedValueOnce(final.readingProgress ?? [])
    .mockResolvedValueOnce(final.readingDrafts ?? []);
}

const srsFix = (over: Record<string, unknown>) => ({
  key: "k1",
  status: "new",
  dueAt: null,
  reviewCount: 0,
  lastReviewedAt: null,
  ease: 2.5,
  intervalDays: 0,
  lapses: 0,
  updatedAt: 100,
  deletedAt: null,
  ...over,
});

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
      { srs: [{ key: "k1", status: "learning", dueAt: 50, reviewCount: 3, lastReviewedAt: 90, ease: 2.5, intervalDays: 0, lapses: 0, updatedAt: 100, deletedAt: null }] },
      { srs: [], studyDay: [], lessonProgress: [] }
    );
    const res = await POST(req({
      srs: [{ key: "k1", status: "learned", dueAt: 250, reviewCount: 5, lastReviewedAt: 200, ease: 2.1, intervalDays: 7, lapses: 1, updatedAt: 200, deletedAt: null }],
      studyDay: [],
      lessonProgress: [],
    }));
    expect(res.status).toBe(200);
    // lần gọi values đầu tiên = srs
    const arg = insertChain.values.mock.calls[0][0][0];
    expect(arg.reviewCount).toBe(5); // max(3,5)
    expect(arg.updatedAt).toBe(200); // incoming thắng
    expect(arg.status).toBe("review"); // W5.1: status legacy learned → review khi ghi DB
    expect(arg.ease).toBe(2.1);
    expect(arg.intervalDays).toBe(7); // legacy learned thiếu interval → map 7 (known → 21)
    expect(arg.lapses).toBe(1);
  });

  it("payload legacy known thiếu ease/intervalDays/lapses → ghi DB review/interval 21/ease 2.5", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    queueSelects({ srs: [] }, { srs: [], studyDay: [], lessonProgress: [] });
    const res = await POST(req({
      srs: [{ key: "k3", status: "known", dueAt: 250, reviewCount: 5, lastReviewedAt: 200, updatedAt: 200, deletedAt: null }],
      studyDay: [],
      lessonProgress: [],
    }));
    expect(res.status).toBe(200);
    const arg = insertChain.values.mock.calls[0][0][0];
    expect(arg).toMatchObject({ key: "k3", status: "review", intervalDays: 21, ease: 2.5, lapses: 0 });
  });

  it("SM-2: incoming mới hơn thắng ease/intervalDays/lapses", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    queueSelects(
      { srs: [{ key: "k1", status: "review", dueAt: 50, reviewCount: 3, lastReviewedAt: 90, ease: 2.8, intervalDays: 20, lapses: 4, updatedAt: 100, deletedAt: null }] },
      { srs: [], studyDay: [], lessonProgress: [] }
    );
    const res = await POST(req({
      srs: [srsFix({ key: "k1", status: "review", dueAt: 990, reviewCount: 4, lastReviewedAt: 950, ease: 2.2, intervalDays: 12, lapses: 1, updatedAt: 200 })],
      studyDay: [],
      lessonProgress: [],
    }));
    expect(res.status).toBe(200);
    const arg = insertChain.values.mock.calls[0][0][0];
    expect(arg).toMatchObject({ ease: 2.2, intervalDays: 12, lapses: 1, reviewCount: 4, updatedAt: 200 });
  });

  it("400 khi reviewLogs rating ngoài [1,4]", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(req({
      srs: [],
      studyDay: [],
      lessonProgress: [],
      reviewLogs: [{ itemKey: "k1", cardType: "vocab", rating: 5, durationMs: 100, reviewedAt: 500 }],
    }));
    expect(res.status).toBe(400);
  });

  it("reviewLogs hợp lệ → upsert theo (userId, itemKey, reviewedAt), set excluded thuần", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    queueSelects({ srs: [], studyDay: [], lessonProgress: [] }, { srs: [], studyDay: [], lessonProgress: [], reviewLogs: [] });
    const log = { itemKey: "k1", cardType: "grammar", rating: 2, durationMs: 800, reviewedAt: 12345 };
    const res = await POST(req({ srs: [], studyDay: [], lessonProgress: [], reviewLogs: [log] }));
    expect(res.status).toBe(200);
    // domain rỗng không insert → lần gọi values cuối = reviewLogs
    const calls = insertChain.values.mock.calls;
    expect(calls[calls.length - 1][0]).toEqual([expect.objectContaining({ userId: "u1", ...log })]);
    const conflictArg = insertChain.onConflictDoUpdate.mock.calls[insertChain.onConflictDoUpdate.mock.calls.length - 1][0];
    expect(conflictArg.set).toMatchObject({ rating: expect.anything(), durationMs: expect.anything() });
  });

  it("batch reviewLogs trùng khóa (itemKey, reviewedAt) → dedupe 1 row", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    queueSelects({ srs: [], studyDay: [], lessonProgress: [] }, { srs: [], studyDay: [], lessonProgress: [], reviewLogs: [] });
    await POST(req({
      srs: [],
      studyDay: [],
      lessonProgress: [],
      reviewLogs: [
        { itemKey: "k1", cardType: "vocab", rating: 3, durationMs: 100, reviewedAt: 500 },
        { itemKey: "k1", cardType: "vocab", rating: 4, durationMs: 200, reviewedAt: 500 },
      ],
    }));
    const rows = insertChain.values.mock.calls[insertChain.values.mock.calls.length - 1][0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ rating: 3, durationMs: 100 }); // giữ bản đầu (append-only)
  });

  it("response chứa reviewLogs server sau merge", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    queueSelects(
      { srs: [], studyDay: [], lessonProgress: [] },
      {
        srs: [],
        studyDay: [],
        lessonProgress: [],
        reviewLogs: [{ itemKey: "k1", cardType: "vocab", rating: 3, durationMs: 100, reviewedAt: 500 }],
      }
    );
    const res = await POST(req({ srs: [], studyDay: [], lessonProgress: [], reviewLogs: [] }));
    const json = await res.json();
    expect(json.reviewLogs).toEqual([
      { itemKey: "k1", cardType: "vocab", rating: 3, durationMs: 100, reviewedAt: 500 },
    ]);
  });

  it("row mới (server chưa có) upsert nguyên incoming", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    queueSelects({ srs: [] }, { srs: [], studyDay: [], lessonProgress: [] });
    const incoming = { key: "k2", status: "new", dueAt: null, reviewCount: 0, lastReviewedAt: null, ease: 2.5, intervalDays: 0, lapses: 0, updatedAt: 300, deletedAt: null };
    await POST(req({ srs: [incoming], studyDay: [], lessonProgress: [] }));
    const arg = insertChain.values.mock.calls[0][0][0];
    expect(arg).toMatchObject({ userId: "u1", key: "k2", status: "new", updatedAt: 300 });
  });

  it("response chứa toàn bộ state server sau merge", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    queueSelects(
      { srs: [], studyDay: [], lessonProgress: [] },
      {
        srs: [{ key: "k1", status: "learned", dueAt: 250, reviewCount: 5, lastReviewedAt: 200, ease: 2.1, intervalDays: 7, lapses: 1, updatedAt: 200, deletedAt: null }],
        studyDay: [{ date: "2026-10-24", xp: 30, correct: 8, updatedAt: 200 }],
        lessonProgress: [{ book: "hsk1", lesson: "l1", modes: { read: 3 }, knownCount: 5, updatedAt: 200, deletedAt: null }],
      }
    );
    const res = await POST(req({
      srs: [{ key: "k1", status: "learned", dueAt: 250, reviewCount: 5, lastReviewedAt: 200, ease: 2.1, intervalDays: 7, lapses: 1, updatedAt: 200, deletedAt: null }],
      studyDay: [{ date: "2026-10-24", xp: 30, correct: 8, updatedAt: 200 }],
      lessonProgress: [{ book: "hsk1", lesson: "l1", modes: { read: 3 }, knownCount: 5, updatedAt: 200, deletedAt: null }],
    }));
    const json = await res.json();
    expect(json.serverTime).toBeTypeOf("number");
    expect(json.srs).toEqual([
      { key: "k1", status: "learned", dueAt: 250, reviewCount: 5, lastReviewedAt: 200, ease: 2.1, intervalDays: 7, lapses: 1, updatedAt: 200, deletedAt: null },
    ]);
    expect(json.studyDay).toEqual([{ date: "2026-10-24", xp: 30, correct: 8, updatedAt: 200 }]);
    expect(json.lessonProgress).toEqual([{ book: "hsk1", lesson: "l1", modes: { read: 3 }, knownCount: 5, updatedAt: 200, deletedAt: null }]);
  });

  it("purge tombstone >90 ngày: gọi delete.where cho srs_cards và lesson_progress", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    queueSelects({ srs: [], studyDay: [], lessonProgress: [] }, { srs: [], studyDay: [], lessonProgress: [] });
    await POST(req({
      srs: [{ key: "dead", status: "new", dueAt: null, reviewCount: 0, lastReviewedAt: null, ease: 2.5, intervalDays: 0, lapses: 0, updatedAt: 100, deletedAt: 1 }],
      studyDay: [],
      lessonProgress: [{ book: "hsk1", lesson: "l9", modes: {}, knownCount: 0, updatedAt: 100, deletedAt: 1 }],
    }));
    expect(deleteWhere).toHaveBeenCalledTimes(3); // srs + lessonProgress + readingDrafts
  });

  it("payload > 9 cards: insert chunk ≤ 8 rows/statement (D1 100 bind params)", async () => {
    // D1 giới hạn 100 biến/query; srs_cards 11 cột → >9 rows phải chunk (bug 500
    // "too many SQL variables" phát hiện qua browser QA 2026-10-25).
    const srs = Array.from({ length: 28 }, (_, i) => ({
      key: `chunk-${i}`, status: "review", dueAt: 1, reviewCount: 1, lastReviewedAt: 1,
      updatedAt: 1, ease: 2.5, intervalDays: 1, lapses: 0, deletedAt: null,
    }));
    getSession.mockResolvedValue({ user: { id: "u1" } });
    queueSelects({ srs: [] }, { srs: [], studyDay: [], lessonProgress: [] });
    const res = await POST(req({ srs, studyDay: [], lessonProgress: [], reviewLogs: [] }));
    expect(res.status).toBe(200);
    const insertCalls = insertChain.values.mock.calls.map((c) => c[0].length);
    expect(insertCalls.length).toBeGreaterThanOrEqual(4); // 28 cards → ≥ 4 statement
    for (const n of insertCalls) expect(n).toBeLessThanOrEqual(8);
  });

  it("batch có 2 bản cùng key không throw — values nhận bản đã merge (dedupe)", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    queueSelects({ srs: [] }, { srs: [], studyDay: [], lessonProgress: [] });
    const res = await POST(req({
      srs: [
        { key: "k1", status: "learning", dueAt: 50, reviewCount: 3, lastReviewedAt: 90, ease: 2.5, intervalDays: 0, lapses: 0, updatedAt: 100, deletedAt: null },
        { key: "k1", status: "learned", dueAt: 250, reviewCount: 5, lastReviewedAt: 200, ease: 2.1, intervalDays: 7, lapses: 1, updatedAt: 200, deletedAt: null },
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
    expect(srsArg[0]).toMatchObject({ key: "k1", status: "review", reviewCount: 5, updatedAt: 200 }); // learned → review (SM-2)
    const dayArg = insertChain.values.mock.calls[1][0];
    expect(dayArg).toHaveLength(1);
    expect(dayArg[0]).toMatchObject({ date: "2026-10-24", xp: 30, correct: 8, updatedAt: 200 });
  });
});
