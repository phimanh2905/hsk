export type AiConfig = { url: string; key: string };

/* Fallback process.env CHỈ cho dev — mirror resolveAuthSecrets (auth-secrets.ts):
   .env.local của Next không nằm trong binding wrangler. Production lấy secret từ
   `wrangler secret put` và fail sớm nếu thiếu. */
export function resolveAiConfig(
  env: Record<string, string | undefined>,
  nodeEnv: string | undefined
): AiConfig {
  const allowFallback = nodeEnv !== "production";
  const { AI_UPSTREAM_URL, AI_UPSTREAM_KEY } = {
    AI_UPSTREAM_URL: env.AI_UPSTREAM_URL ?? (allowFallback ? process.env.AI_UPSTREAM_URL : undefined),
    AI_UPSTREAM_KEY: env.AI_UPSTREAM_KEY ?? (allowFallback ? process.env.AI_UPSTREAM_KEY : undefined),
  };
  if (!AI_UPSTREAM_URL || !AI_UPSTREAM_KEY) {
    throw new Error(
      "Thiếu AI_UPSTREAM_URL / AI_UPSTREAM_KEY. " +
        "Production: wrangler secret put <tên>. Local: thêm vào app-next/.env.local."
    );
  }
  return { url: AI_UPSTREAM_URL, key: AI_UPSTREAM_KEY };
}

export class UpstreamError extends Error {
  status: number;
  detail?: string;
  constructor(status: number, detail?: string) {
    super(detail ? `Upstream ${status}: ${detail}` : `Upstream ${status}`);
    this.name = "UpstreamError";
    this.status = status;
    this.detail = detail;
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

/* Forward request chat completion tới upstream (url đã là .../v1/chat/completions
   đầy đủ). Timeout mặc định 30s qua AbortController; network/timeout → UpstreamError 502. */
export async function callUpstream(
  cfg: AiConfig,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  opts?: { maxTokens?: number; timeoutMs?: number; signal?: AbortSignal }
): Promise<{ text: string }> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const cleanup = () => clearTimeout(timer);
  const signal = opts?.signal ? AbortSignal.any([controller.signal, opts.signal]) : controller.signal;
  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({
        model: "smart-router/fallback",
        messages,
        max_tokens: opts?.maxTokens ?? 1024,
      }),
      signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => undefined);
      throw new UpstreamError(res.status, body?.slice(0, 500));
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return { text: data.choices?.[0]?.message?.content ?? "" };
  } catch (e) {
    if (e instanceof UpstreamError) throw e;
    // fetch reject: lỗi mạng hoặc abort do timeout
    throw new UpstreamError(502, e instanceof Error ? e.message : String(e));
  } finally {
    cleanup();
  }
}
