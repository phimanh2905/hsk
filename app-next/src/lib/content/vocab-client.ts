/* Loader client-side cho vocab qua API content — dataset lên D1 thì
   client KHÔNG import được data trực tiếp nữa. Promise cache module-level:
   nhiều component cùng phiên chỉ fetch 1 lần. */
import type { VocabData, VocabMeta } from "@/lib/content/vocab";

let vocabCache: Promise<VocabData> | null = null;

export function loadVocab(): Promise<VocabData> {
  if (!vocabCache) {
    vocabCache = fetch("/api/v1/content/vocab").then((r) => {
      if (!r.ok) throw new Error(`content/vocab HTTP ${r.status}`);
      return r.json() as Promise<VocabData>;
    });
  }
  return vocabCache;
}

let metaCache: Promise<VocabMeta> | null = null;

export function loadVocabMeta(): Promise<VocabMeta> {
  if (!metaCache) {
    metaCache = fetch("/api/v1/content/vocab-meta").then((r) => {
      if (!r.ok) throw new Error(`content/vocab-meta HTTP ${r.status}`);
      return r.json() as Promise<VocabMeta>;
    });
  }
  return metaCache;
}
