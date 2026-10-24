import { describe, it, expect, vi, beforeEach } from "vitest";

/* W6.3 — API kết quả thi demo: POST lưu + GET lịch sử của user hiện tại.
   Pattern giống battle/attempts.test.ts (mock auth + db). */

const getSession = vi.fn();
const valuesFn = vi.fn().mockReturnThis();
const selectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockResolvedValue([]),
};

vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("@/lib/db", () => ({
  createDb: () => ({
    insert: () => ({ values: valuesFn }),
    select: () => selectChain,
  }),
}));

import { GET, POST } from "../results/route";

const baseUrl = "http://localhost:3100/api/v1/exam/results";

function postReq(body?: unknown) {
  return new Request(baseUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

function getReq(query = "?level=hsk1") {
  return new Request(baseUrl + query) as unknown as import("next/server").NextRequest;
}

const validBody = {
  level: "hsk1",
  totalScore: 8,
  maxScore: 10,
  sections: [
    { section: "listening", score: 4, maxScore: 5 },
    { section: "reading", score: 3, maxScore: 5 },
    { section: "writing", score: 1, maxScore: 2 },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue(null);
  valuesFn.mockReturnThis();
  selectChain.where.mockReturnThis();
  selectChain.orderBy.mockResolvedValue([]);
});

describe("POST /api/v1/exam/results", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(401);
  });

  it("400 khi level không hợp lệ (hsk99)", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(postReq({ ...validBody, level: "hsk99" }));
    expect(res.status).toBe(400);
  });

  it("400 khi sections rỗng", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(postReq({ ...validBody, sections: [] }));
    expect(res.status).toBe(400);
  });

  it("400 khi section không nằm trong enum listening/reading/writing", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(
      postReq({ ...validBody, sections: [{ section: "speaking", score: 8, maxScore: 10 }] })
    );
    expect(res.status).toBe(400);
  });

  it("400 khi totalScore lệch tổng điểm các sections", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(postReq({ ...validBody, totalScore: 9 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("total_score_mismatch");
  });

  it("400 khi body sai shape", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    expect((await POST(postReq({ ...validBody, maxScore: 0 }))).status).toBe(400);
    expect((await POST(postReq(null))).status).toBe(400);
  });

  it("200 happy path — trả { id }, insert.values nhận id string + userId từ session", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    const arg = valuesFn.mock.calls[0][0];
    expect(typeof arg.id).toBe("string");
    expect(json.id).toBe(arg.id);
    expect(arg.userId).toBe("u1");
    expect(arg.level).toBe("hsk1");
    expect(arg.totalScore).toBe(8);
    expect(arg.sections).toEqual(validBody.sections);
  });
});

describe("GET /api/v1/exam/results?level=hsk1", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  it("400 khi thiếu level", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await GET(getReq(""));
    expect(res.status).toBe(400);
  });

  it("200 — trả items map shape đúng, mới nhất trước", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const createdAt = new Date("2026-10-24T00:00:00Z");
    selectChain.orderBy.mockResolvedValue([
      {
        id: "r2",
        totalScore: 9,
        maxScore: 10,
        sections: [{ section: "listening", score: 5, maxScore: 5 }],
        createdAt,
      },
    ]);
    const res = await GET(getReq("?level=hsk1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toEqual([
      {
        id: "r2",
        totalScore: 9,
        maxScore: 10,
        sections: [{ section: "listening", score: 5, maxScore: 5 }],
        createdAt: createdAt.toISOString(),
      },
    ]);
  });
});
