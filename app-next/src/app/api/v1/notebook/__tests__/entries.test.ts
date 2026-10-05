// src/app/api/v1/notebook/__tests__/entries.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const getSession = vi.fn();
const rows: Record<string, unknown>[] = [];
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("@/lib/db", () => ({
  createDb: () => ({
    select: () => ({ from: () => ({ where: () => ({ orderBy: () => Promise.resolve(rows) }) }) }),
    insert: () => ({ values: (v: unknown) => ({ onConflictDoUpdate: () => Promise.resolve(undefined) }) }),
  }),
}));

import { GET, POST, rowToApi } from "../entries/route";

function req(method: "GET" | "POST", body?: unknown) {
  return new Request("http://localhost:3100/api/v1/notebook/entries", {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;
}
const validBody = {
  kind: "wrong", tag: "🛑 Lỗi sai", payload: { q: "q?", wrong: null, right: { zh: "居然" }, cause: "c" },
};

beforeEach(() => { vi.clearAllMocks(); rows.length = 0; getSession.mockResolvedValue(null); });

describe("GET /api/v1/notebook/entries", () => {
  it("401 khi chưa đăng nhập", async () => {
    expect((await GET(req("GET"))).status).toBe(401);
  });
  it("200 trả items đã parse payload", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    rows.push({ id: "e1", kind: "wrong", tag: "t", tagTone: "red", payload: JSON.stringify(validBody.payload), saved: 0, hsk: null, source: "auto", createdAt: 1_700_000_000, updatedAt: 1_700_000_000 });
    const json = await (await GET(req("GET"))).json();
    expect(json.items).toHaveLength(1);
    expect(json.items[0].payload).toMatchObject({ q: "q?" });
    expect(json.items[0].createdAt).toContain("T");
  });
  it("payload hỏng → loại khỏi list, không crash", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    rows.push({ id: "bad", kind: "wrong", tag: "t", tagTone: "red", payload: "{broken", saved: 0, hsk: null, source: "auto", createdAt: 1, updatedAt: 1 });
    const json = await (await GET(req("GET"))).json();
    expect(json.items).toHaveLength(0);
  });
});

describe("POST /api/v1/notebook/entries", () => {
  it("401 khi chưa đăng nhập", async () => {
    expect((await POST(req("POST", validBody))).status).toBe(401);
  });
  it("400 payload sai kind", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const res = await POST(req("POST", { kind: "chars", tag: "t", payload: { oops: 1 } }));
    expect(res.status).toBe(400);
  });
  it("201 tạo entry: id sinh khi thiếu, default tagTone=red source=manual", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const json = await (await POST(req("POST", validBody))).json();
    expect(json.item).toMatchObject({ kind: "wrong", tagTone: "red", source: "manual", saved: false });
    expect(json.item.id).toBeTruthy();
  });
  it("201 upsert idempotent khi có id", async () => {
    getSession.mockResolvedValue({ user: { id: "u1" } });
    const r1 = await (await POST(req("POST", { ...validBody, id: "e9" }))).json();
    const r2 = await (await POST(req("POST", { ...validBody, id: "e9" }))).json();
    expect(r1.item.id).toBe("e9");
    expect(r2.item.id).toBe("e9");
  });
});

describe("rowToApi", () => {
  it("payload hỏng → null", () => {
    expect(rowToApi({ id: "x", kind: "personal", tag: "t", tagTone: "per", payload: "nope", saved: 0, hsk: null, source: "manual", createdAt: 0, updatedAt: 0 })).toBeNull();
  });
});
