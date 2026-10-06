import { describe, it, expect, vi, beforeEach } from "vitest";

const getSession = vi.fn();
const selectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([]),
};
const insertChain = {
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
};
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("@/lib/db", () => ({
  createDb: () => ({
    select: () => selectChain,
    insert: () => insertChain,
    update: () => ({ set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) }),
  }),
}));
vi.mock("@/lib/content/shadowing", () => ({
  getShadowingVideoById: vi.fn(async (id: string) =>
    id === "EA3rwvr99Q0" ? { id, title: "Demo", topic: "life" } : null
  ),
}));

import { GET } from "../progress/route";
import { PUT } from "../progress/[videoId]/route";

function req(body?: unknown, method: "GET" | "PUT" = "GET") {
  return new Request("http://localhost:3100/api/v1/shadowing/progress", {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as import("next/server").NextRequest;
}

beforeEach(() => { vi.clearAllMocks(); getSession.mockResolvedValue(null); });

describe("GET /api/v1/shadowing/progress", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });
  it("trả items khi có session", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    selectChain.where.mockResolvedValue([
      { videoId: "EA3rwvr99Q0", status: "done", score: 88, seconds: 120, linesDone: 9, updatedAt: 1_700_000_000 },
    ]);
    const res = await GET(req());
    const json = await res.json();
    expect(json.items[0]).toMatchObject({ videoId: "EA3rwvr99Q0", status: "done" });
  });
});

describe("PUT /api/v1/shadowing/progress/[videoId]", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await PUT(req({ score: 80 }, "PUT"), { params: Promise.resolve({ videoId: "EA3rwvr99Q0" }) });
    expect(res.status).toBe(401);
  });
  it("400 khi videoId không có trong content", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await PUT(req({ score: 80 }, "PUT"), { params: Promise.resolve({ videoId: "NOPE" }) });
    expect(res.status).toBe(400);
  });
  it("400 khi body sai schema (score 200)", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await PUT(req({ score: 200 }, "PUT"), { params: Promise.resolve({ videoId: "EA3rwvr99Q0" }) });
    expect(res.status).toBe(400);
  });
  it("upsert hợp lệ gọi insert.onConflictDoUpdate", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    selectChain.where.mockResolvedValue([{ id: "r1", status: "mid", score: 70, seconds: 30, linesDone: 2 }]);
    const res = await PUT(req({ score: 90, secondsDelta: 10, linesDoneDelta: 1 }, "PUT"), { params: Promise.resolve({ videoId: "EA3rwvr99Q0" }) });
    expect(res.status).toBe(200);
    expect(insertChain.onConflictDoUpdate).toHaveBeenCalled();
    const arg = insertChain.values.mock.calls[0][0];
    expect(arg.score).toBe(90);          // max(70, 90)
    expect(arg.seconds).toBe(40);        // 30 + 10
    expect(arg.linesDone).toBe(3);       // 2 + 1
  });
  it("status done không bị hạ về mid", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    selectChain.where.mockResolvedValue([{ id: "r1", status: "done", score: 88, seconds: 0, linesDone: 9 }]);
    await PUT(req({ status: "mid" }, "PUT"), { params: Promise.resolve({ videoId: "EA3rwvr99Q0" }) });
    expect(insertChain.values.mock.calls[0][0].status).toBe("done");
  });
});
