import { describe, it, expect, vi, beforeEach } from "vitest";

const getSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  getAuth: () => ({ api: { getSession }, handler: vi.fn(() => new Response("ok")) }),
}));
const getVocab = vi.fn();
vi.mock("@/lib/content/vocab", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/content/vocab")>();
  return { ...actual, getVocab: (...a: unknown[]) => getVocab(...a) };
});

import { buildRouter } from "../router";

const req = (path: string, method = "GET") =>
  new Request(`http://x.test${path}`, { method });

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue(null);
});

describe("buildRouter mount", () => {
  it("GET /api/v1/content/vocab → handleContentVocab (200 + cache header)", async () => {
    getVocab.mockResolvedValue([]);
    const res = await buildRouter().handle(req("/api/v1/content/vocab"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
  });

  it("path chưa đăng nhập → 401 trên route user-data", async () => {
    const res = await buildRouter().handle(req("/api/v1/sync", "POST"));
    expect(res.status).toBe(401);
  });

  it("auth wildcard khớp mọi method, path không khớp → 404 JSON", async () => {
    expect((await buildRouter().handle(req("/api/v1/auth/get-session"))).status).toBe(200);
    const res = await buildRouter().handle(req("/api/v1/unknown"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not found" });
  });

  it("dev-login không bị auth wildcard che (method GET → auth handler, không phải 401 của dev-login POST)", async () => {
    // POST dev-login khi DISABLED (không set DEV_LOGIN_SECRET) → 404 của chính handler
    const res = await buildRouter().handle(req("/api/v1/auth/dev-login", "POST"));
    expect(await res.json()).toEqual({ error: "not_found" });
  });
});
