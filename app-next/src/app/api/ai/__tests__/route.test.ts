// src/app/api/ai/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { UpstreamError } from "@/lib/ai";

const getSession = vi.fn();
const callUpstream = vi.fn();
const resolveAiConfig = vi.fn();
// UpstreamError thật từ module thật; callUpstream + resolveAiConfig mock.
vi.mock("@/lib/ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai")>();
  return { ...actual, callUpstream: (...a: unknown[]) => callUpstream(...a), resolveAiConfig: (...a: unknown[]) => resolveAiConfig(...a) };
});
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => ({ env: {} }) }));

import { POST, __resetRateLimitForTest } from "../route";

function req(body?: unknown) {
  return new Request("http://localhost:3100/api/ai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as unknown as NextRequest;
}
const okBody = { messages: [{ role: "user", content: "你好是什么意思？" }] };

beforeEach(() => {
  vi.clearAllMocks();
  __resetRateLimitForTest();
  getSession.mockResolvedValue({ user: { id: "u1" } });
  resolveAiConfig.mockReturnValue({ url: "https://upstream.example/v1/chat/completions", key: "k" });
  callUpstream.mockResolvedValue({ text: "Trả lời ngắn gọn" });
});

describe("POST /api/ai", () => {
  it("401 khi chưa đăng nhập", async () => {
    getSession.mockResolvedValue(null);
    expect((await POST(req(okBody))).status).toBe(401);
  });
  it("400 khi body sai (thiếu messages / role lạ / content không phải string)", async () => {
    expect((await POST(req({}))).status).toBe(400);
    expect((await POST(req({ messages: [{ role: "system", content: "x" }] }))).status).toBe(400);
    expect((await POST(req({ messages: [{ role: "user", content: 123 }] }))).status).toBe(400);
    expect((await POST(req({ messages: [] }))).status).toBe(400);
  });
  it("413 khi > 20 messages hoặc tổng content > 4000 ký tự", async () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ role: "user", content: `m${i}` }));
    expect((await POST(req({ messages: many }))).status).toBe(413);
    const long = "a".repeat(4001);
    expect((await POST(req({ messages: [{ role: "user", content: long }] }))).status).toBe(413);
  });
  it("429 sau request thứ 11 trong 60s", async () => {
    for (let i = 0; i < 10; i++) {
      expect((await POST(req(okBody))).status).toBe(200);
    }
    expect((await POST(req(okBody))).status).toBe(429);
  });
  it("200 { text } khi upstream ok — system prompt ở đầu, không chứa user id", async () => {
    const res = await POST(req({ ...okBody, messages: [...okBody.messages, { role: "assistant", content: "hi" }] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "Trả lời ngắn gọn" });
    const msgs = callUpstream.mock.calls[0][1] as Array<{ role: string; content: string }>;
    expect(msgs[0].role).toBe("system");
    expect(msgs[0].content).toContain("Tiểu Ngữ");
    expect(JSON.stringify(msgs)).not.toContain("u1");
    expect(msgs.slice(1)).toEqual([...okBody.messages, { role: "assistant", content: "hi" }]);
  });
  it("502 khi callUpstream throw UpstreamError", async () => {
    callUpstream.mockRejectedValue(new UpstreamError(502, "timeout"));
    const res = await POST(req(okBody));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("upstreamDown");
  });
  it("503 khi resolveAiConfig throw (thiếu secret)", async () => {
    resolveAiConfig.mockImplementation(() => { throw new Error("Thiếu AI_UPSTREAM_URL"); });
    const res = await POST(req(okBody));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("noConfig");
  });
  it("maxTokens client bị clamp ≤ 2048", async () => {
    await POST(req({ ...okBody, maxTokens: 9999 }));
    expect((callUpstream.mock.calls[0][2] as { maxTokens: number }).maxTokens).toBe(2048);
    await POST(req({ ...okBody, maxTokens: 100 }));
    expect((callUpstream.mock.calls[1][2] as { maxTokens: number }).maxTokens).toBe(100);
  });
  it("400 khi body không parse được JSON", async () => {
    const raw = new Request("http://localhost:3100/api/ai", { method: "POST", body: "{broken", headers: { "content-type": "application/json" } }) as unknown as NextRequest;
    expect((await POST(raw)).status).toBe(400);
  });
});
