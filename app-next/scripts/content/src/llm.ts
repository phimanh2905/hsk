/* LLM client OpenAI-compatible cho batch content scripts (không dependency ngoài).
   Env: CONTENT_LLM_BASE_URL (đủ đường dẫn /v1/chat/completions), CONTENT_LLM_KEY, CONTENT_LLM_MODEL. */

export type LlmConfig = { baseUrl: string; key: string; model: string };

export function llmConfigFromEnv(env: Record<string, string | undefined>): LlmConfig {
  const missing = ["CONTENT_LLM_BASE_URL", "CONTENT_LLM_KEY", "CONTENT_LLM_MODEL"].filter(
    (k) => !env[k] || env[k]!.trim() === ""
  );
  if (missing.length > 0) {
    throw new Error(`Thiếu env CONTENT_LLM_*: ${missing.join(", ")}`);
  }
  return {
    baseUrl: env.CONTENT_LLM_BASE_URL!.trim(),
    key: env.CONTENT_LLM_KEY!.trim(),
    model: env.CONTENT_LLM_MODEL!.trim()
  };
}

/* Cắt code fence ```json ... ``` (nếu có) rồi JSON.parse. */
export function extractJson(content: string): unknown {
  let s = content.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/.exec(s);
  if (fence) s = fence[1].trim();
  return JSON.parse(s);
}

export type ChatMessage = { role: "system" | "user"; content: string };

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/* POST 1 lượt chat completion, ép JSON; retry exponential khi HTTP != 200 hoặc JSON hỏng.
   Throw kèm status, KHÔNG kèm key. */
export async function chatJson<T>(
  cfg: LlmConfig,
  messages: ChatMessage[],
  opts?: { retries?: number; baseDelayMs?: number; fetchImpl?: typeof fetch }
): Promise<T> {
  const retries = opts?.retries ?? 4;
  const baseDelayMs = opts?.baseDelayMs ?? 500;
  const doFetch = opts?.fetchImpl ?? fetch;
  const body = JSON.stringify({
    model: cfg.model,
    messages,
    temperature: 0.3,
    response_format: { type: "json_object" }
  });

  let lastError = "";
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(baseDelayMs * 2 ** (attempt - 1));
    let res: Response;
    try {
      res = await doFetch(cfg.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.key}`
        },
        body
      });
    } catch (err) {
      lastError = `network error: ${err instanceof Error ? err.message : String(err)}`;
      continue;
    }
    if (res.status !== 200) {
      lastError = `HTTP ${res.status}`;
      continue;
    }
    try {
      const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        lastError = "response thiếu choices[0].message.content";
        continue;
      }
      return extractJson(content) as T;
    } catch (err) {
      lastError = `JSON hỏng: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  throw new Error(`chatJson thất bại sau ${retries + 1} lần thử (${lastError}) — baseUrl: ${cfg.baseUrl}`);
}
