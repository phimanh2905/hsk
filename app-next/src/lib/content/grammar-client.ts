/* Loader client-side cho grammar qua API content — dataset lên D1 thì
   client KHÔNG import được data trực tiếp nữa. Promise cache module-level:
   nhiều component cùng phiên chỉ fetch 1 lần. */
import type { GrammarPoint } from "@/lib/content/grammar";

let grammarCache: Promise<GrammarPoint[]> | null = null;

export function loadGrammar(): Promise<GrammarPoint[]> {
  if (!grammarCache) {
    grammarCache = fetch("/api/v1/content/grammar")
      .then((r) => {
        if (!r.ok) throw new Error(`content/grammar HTTP ${r.status}`);
        return r.json() as Promise<GrammarPoint[]>;
      })
      // Negative cache vĩnh viễn là hỏng: reject thì clear để lần mount sau
      // được retry fetch thay vì nhận mãi lỗi cũ.
      .catch((e: unknown) => {
        grammarCache = null;
        throw e;
      });
  }
  return grammarCache;
}
