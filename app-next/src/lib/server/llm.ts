/* LLM helper server-side (Workers) — OpenAI-compatible chat completions ép JSON.
   Tách từ scripts/content/src/llm.ts (code trên Workers không import được từ scripts/).
   Env: CONTENT_LLM_BASE_URL (baseUrl gốc, vd https://api.x.com/v1), CONTENT_LLM_KEY, CONTENT_LLM_MODEL.
   Gotcha: .env.local không vào getCloudflareContext() ở dev → luôn ưu tiên process.env,
   chỉ fallback getCloudflareContext().env khi process.env thiếu. */

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type LlmConfig = { baseUrl: string; key: string; model: string };

type MaybeEnv = Record<string, string | undefined> | undefined;

async function readBindingEnv(): Promise<MaybeEnv> {
  try {
    // import động: next dev / vitest không có binding → bắt lỗi, không crash.
    const mod = (await import("@opennextjs/cloudflare")) as unknown as {
      getCloudflareContext?: () => unknown;
    };
    if (typeof mod.getCloudflareContext !== "function") return undefined;
    const ctx = mod.getCloudflareContext() as { env?: unknown } | null | undefined;
    if (ctx && typeof ctx === "object" && ctx.env && typeof ctx.env === "object") {
      return ctx.env as MaybeEnv;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export async function llmConfigFromEnv(
  procEnv: NodeJS.ProcessEnv = process.env
): Promise<LlmConfig> {
  const binding = await readBindingEnv();
  const pick = (k: string): string | undefined => {
    const v = procEnv[k]?.trim();
    if (v) return v;
    const bv = binding?.[k];
    return typeof bv === "string" && bv.trim() ? bv.trim() : undefined;
  };
  const baseUrl = pick("CONTENT_LLM_BASE_URL");
  const key = pick("CONTENT_LLM_KEY");
  const model = pick("CONTENT_LLM_MODEL");
  if (!baseUrl || !key || !model) throw new Error("NO_LLM");
  return { baseUrl, key, model };
}

/* Cắt code fence ```json ... ``` (nếu có) rồi JSON.parse. */
export function extractJson(content: string): unknown {
  let s = content.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/.exec(s);
  if (fence) s = fence[1].trim();
  return JSON.parse(s);
}

export async function chatJson(
  messages: ChatMessage[],
  opts?: { temperature?: number; fetchImpl?: typeof fetch }
): Promise<unknown> {
  const cfg = await llmConfigFromEnv();
  const url = cfg.baseUrl.endsWith("/chat/completions")
    ? cfg.baseUrl
    : `${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const doFetch = opts?.fetchImpl ?? fetch;
  const res = await doFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.key}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: opts?.temperature ?? 0.3,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("LLM trả về rỗng");
  }
  return extractJson(content);
}
