// src/lib/__tests__/ai.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveAiConfig, callUpstream, UpstreamError, type AiConfig } from "../ai";

const CFG: AiConfig = { url: "https://upstream.example/v1/chat/completions", key: "k-test" };

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.useRealTimers();
});

describe("resolveAiConfig", () => {
  it("ưu tiên env binding trước", () => {
    vi.stubEnv("AI_UPSTREAM_URL", "https://fallback.example/v1/chat/completions");
    vi.stubEnv("AI_UPSTREAM_KEY", "fallback-key");
    const cfg = resolveAiConfig({ AI_UPSTREAM_URL: "https://binding.example/v1/chat/completions", AI_UPSTREAM_KEY: "binding-key" }, "development");
    expect(cfg).toEqual({ url: "https://binding.example/v1/chat/completions", key: "binding-key" });
  });
  it("dev: fallback process.env khi env binding thiếu", () => {
    vi.stubEnv("AI_UPSTREAM_URL", "https://fallback.example/v1/chat/completions");
    vi.stubEnv("AI_UPSTREAM_KEY", "fallback-key");
    const cfg = resolveAiConfig({}, "development");
    expect(cfg).toEqual({ url: "https://fallback.example/v1/chat/completions", key: "fallback-key" });
  });
  it("production thiếu secret → ném Error", () => {
    expect(() => resolveAiConfig({}, "production")).toThrow(/AI_UPSTREAM_URL/);
  });
  it("production thiếu 1 trong 2 → ném Error", () => {
    expect(() => resolveAiConfig({ AI_UPSTREAM_URL: "https://x/v1/chat/completions" }, "production")).toThrow(/AI_UPSTREAM/);
  });
});

describe("callUpstream", () => {
  it("gọi fetch đúng URL/header/body và parse choices[0].message.content", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "Xin chào" } }] }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await callUpstream(CFG, [{ role: "user", content: "你好" }], { maxTokens: 512 });
    expect(res).toEqual({ text: "Xin chào" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(CFG.url);
    expect((init.headers as Record<string, string>).authorization).toBe(`Bearer ${CFG.key}`);
    expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({
      model: "smart-router/fallback",
      messages: [{ role: "user", content: "你好" }],
      max_tokens: 512,
    });
  });
  it("max_tokens mặc định 1024 khi không truyền", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);
    await callUpstream(CFG, [{ role: "user", content: "hi" }]);
    expect(JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).max_tokens).toBe(1024);
  });
  it("upstream !ok → UpstreamError giữ status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));
    const err = await callUpstream(CFG, [{ role: "user", content: "hi" }]).catch((e) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect((err as UpstreamError).status).toBe(500);
  });
  it("fetch reject (mạng) → UpstreamError status 502", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const err = await callUpstream(CFG, [{ role: "user", content: "hi" }]).catch((e) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect((err as UpstreamError).status).toBe(502);
  });
  it("timeout mặc định 30s → UpstreamError 502", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => new Promise((_res, rej) => {
        init?.signal?.addEventListener("abort", () => rej(new Error("aborted")));
      }))
    );
    const p = callUpstream(CFG, [{ role: "user", content: "hi" }]);
    const captured = p.catch((e) => e);
    await vi.advanceTimersByTimeAsync(29_999);
    await vi.advanceTimersByTimeAsync(1);
    const err = (await captured) as UpstreamError;
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err.status).toBe(502);
  });
});
