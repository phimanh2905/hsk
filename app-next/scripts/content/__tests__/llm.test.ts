import { describe, expect, it, vi } from "vitest";
import { llmConfigFromEnv, extractJson, chatJson, type LlmConfig } from "../src/llm";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

const CFG: LlmConfig = { baseUrl: "https://example.test/v1/chat/completions", key: "test-key", model: "test-model" };

describe("llmConfigFromEnv", () => {
  it("đọc đủ 3 biến CONTENT_LLM_*", () => {
    const cfg = llmConfigFromEnv({
      CONTENT_LLM_BASE_URL: "https://x/v1/chat/completions",
      CONTENT_LLM_KEY: "k",
      CONTENT_LLM_MODEL: "m"
    });
    expect(cfg).toEqual({ baseUrl: "https://x/v1/chat/completions", key: "k", model: "m" });
  });

  it("throw khi thiếu biến, message không lộ key", () => {
    expect(() => llmConfigFromEnv({})).toThrow("Thiếu env CONTENT_LLM_*");
    try {
      llmConfigFromEnv({ CONTENT_LLM_MODEL: "m" });
      expect.unreachable("phải throw");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).not.toContain("test-key");
      expect(msg).toContain("Thiếu env CONTENT_LLM_*");
    }
  });
});

describe("extractJson", () => {
  it("cắt code fence ```json", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it("parse JSON trần", () => {
    expect(extractJson('{"words":[]}')).toEqual({ words: [] });
  });
  it("throw nếu JSON hỏng", () => {
    expect(() => extractJson("not json")).toThrow();
  });
});

describe("chatJson", () => {
  it("gọi đúng URL/headers/body, trả parsed content", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: '{"data":{"ok":true}}' } }] })
    );
    const result = await chatJson<{ data: { ok: boolean } }>(CFG, [{ role: "user", content: "hi" }], {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseDelayMs: 1
    });
    expect(result).toEqual({ data: { ok: true } });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const call = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const url = call[0];
    const init = call[1];
    expect(url).toBe("https://example.test/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("test-model");
    expect(body.temperature).toBe(0.3);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages).toEqual([{ role: "user", content: "hi" }]);
  });

  it("HTTP 500 lần 1, OK lần 2 -> thành công, fetch 2 lần", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500))
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: '{"data":42}' } }] }));
    const result = await chatJson<{ data: number }>(CFG, [{ role: "user", content: "x" }], {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseDelayMs: 1
    });
    expect(result).toEqual({ data: 42 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("content có fence cũng được cắt", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: '```json\n{"v":7}\n```' } }] })
    );
    const result = await chatJson<{ v: number }>(CFG, [{ role: "user", content: "x" }], {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      baseDelayMs: 1
    });
    expect(result).toEqual({ v: 7 });
  });

  it("luôn lỗi sau hết retries -> throw kèm status, không kèm key", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "boom" }, 500));
    await expect(
      chatJson(CFG, [{ role: "user", content: "x" }], {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        retries: 2,
        baseDelayMs: 1
      })
    ).rejects.toThrow(/500/);
    await expect(
      chatJson(CFG, [{ role: "user", content: "x" }], {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        retries: 1,
        baseDelayMs: 1
      })
    ).rejects.not.toThrow(/test-key/);
    expect(fetchImpl.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
