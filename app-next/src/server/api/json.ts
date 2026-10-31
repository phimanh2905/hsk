export function json(
  data: unknown,
  init?: { status?: number; headers?: Record<string, string> }
): Response {
  return new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // default của Worker responses (match next.config.ts) — trước spread để caller override được.
      "referrer-policy": "strict-origin-when-cross-origin",
      ...(init?.headers ?? {}),
    },
  });
}
