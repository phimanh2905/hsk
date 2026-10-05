/* Side-effect fire-and-forget — KHÔNG import các store/session nội bộ của app
   (chống import vòng, spec §3.4 — xem Review Focus 4). Người gọi
   (quiz/roadmap/review-dashboard) tự resolve word. */
import { authClient } from "@/lib/auth-client";
import { readLocalEntries, writeLocalEntries, newEntryId } from "@/lib/notebook/entries";

const DEDUP_MS = 24 * 3_600_000;
let lastCapture = new Map<string, number>(); // key → timestamp lần capture cuối

/** test-only: xóa dedupe giữa các case */
export function resetCaptureDedupe(): void { lastCapture = new Map(); }

export function captureWrong(input: {
  q: string; wrong: { zh: string; py?: string } | null; right: { zh: string; py?: string };
  cause: string; hsk?: string; tag?: string; tagTone?: "red" | "lav" | "per";
}): void {
  const key = `${input.q}\u0000${input.right.zh}`;
  const last = lastCapture.get(key) ?? 0;
  if (Date.now() - last < DEDUP_MS) return;
  lastCapture.set(key, Date.now());

  const now = new Date().toISOString();
  const entry = {
    id: newEntryId(),
    kind: "wrong" as const,
    tag: input.tag ?? "🛑 Lỗi sai khi luyện tập",
    tagTone: input.tagTone ?? ("red" as const),
    payload: { q: input.q, wrong: input.wrong, right: input.right, cause: input.cause },
    saved: false,
    hsk: input.hsk ?? null,
    source: "auto" as const,
    createdAt: now,
    updatedAt: now,
  };
  writeLocalEntries([entry, ...readLocalEntries()]);
  window.dispatchEvent(new CustomEvent("bye:progress"));

  // fire-and-forget: đã đăng nhập thì đẩy server luôn; thất bại thì sync-on-login sẽ đẩy sau
  void Promise.resolve(authClient.getSession()).then((s) => {
    if (s?.data?.user) {
      fetch("/api/v1/notebook/entries", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: entry.id, kind: entry.kind, tag: entry.tag, tagTone: entry.tagTone, payload: entry.payload, hsk: entry.hsk, source: entry.source }),
      }).catch(() => { /* sync-on-login sẽ đẩy */ });
    }
  });
}
