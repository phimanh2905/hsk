import { describe, it, expect, vi, beforeEach } from "vitest";

const getSession = vi.fn();
const insertChain = { values: vi.fn().mockReturnThis() };
const dbAll = vi.fn();

vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("@/lib/db", () => ({
  createDb: () => ({ insert: () => insertChain, all: dbAll }),
}));

import { POST } from "../attempts/route";

function req(body?: unknown) {
  return new Request("http://localhost:3100/api/v1/battle/attempts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

const validBody = {
  book: "hsk1",
  page: "lesson-1",
  correctCount: 11,
  totalCount: 13,
  durationMs: 32_000,
  score: 134,
};

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue(null);
  insertChain.values.mockReturnThis();
  dbAll.mockResolvedValue([{ n: 0 }]);
});

describe("POST /api/v1/battle/attempts", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await POST(req(validBody));
    expect(res.status).toBe(401);
  });

  it("400 khi totalCount < 4", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(req({ ...validBody, totalCount: 3, correctCount: 3 }));
    expect(res.status).toBe(400);
  });

  it("400 khi score > 150", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(req({ ...validBody, score: 200 }));
    expect(res.status).toBe(400);
  });

  it("400 khi correctCount > totalCount", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(req({ ...validBody, correctCount: 99 }));
    expect(res.status).toBe(400);
  });

  it("200 happy path — insert nhận id string, userId từ session, bookSlug/lessonSlug map đúng", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(req(validBody));
    expect(res.status).toBe(200);
    const arg = insertChain.values.mock.calls[0][0];
    expect(typeof arg.id).toBe("string");
    expect(arg.userId).toBe("u1");
    expect(arg.bookSlug).toBe("hsk1");
    expect(arg.lessonSlug).toBe("lesson-1");
    expect(arg.score).toBe(134);
  });

  it("rank = số best cao hơn + 1", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    dbAll.mockResolvedValue([{ n: 4 }]);
    const res = await POST(req(validBody));
    const json = await res.json();
    expect(json).toMatchObject({ id: insertChain.values.mock.calls[0][0].id, rank: 5 });
  });
});
