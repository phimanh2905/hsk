/* askAi — helper chung cho các use case AI phụ (widget chat vẫn tự gọi fetch trực tiếp
   để xử lý 401/429 riêng). Consumer catch → tự toast thân thiện. */
export type AiMessage = { role: "user" | "assistant"; content: string };

export async function askAi(messages: AiMessage[]): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as { text?: string };
  return data.text ?? "";
}
