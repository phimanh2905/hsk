"use client";

/* Loader stroke data từ public/hanzi-data (chunk ~100 ký tự, sinh bởi
   scripts/build-hanzi-studio-data.mts). Cache in-memory: manifest 1 fetch,
   mỗi chunk 1 fetch. Trả null = ký tự không có data (UI ẩn luyện viết). */
export type WriterCharData = { strokes: string[]; medians: number[][][] };

let manifest: Record<string, string> | null = null;
const chunkCache = new Map<string, Map<string, WriterCharData>>();

export async function loadWriterCharData(ch: string): Promise<WriterCharData | null> {
  if (!manifest) {
    try {
      const res = await fetch("/hanzi-data/manifest.json");
      manifest = res.ok ? (await res.json()).chars : {};
    } catch {
      manifest = {};
    }
  }
  const chunk = manifest[ch];
  if (!chunk) return null;
  let store = chunkCache.get(chunk);
  if (!store) {
    try {
      const res = await fetch(`/hanzi-data/${chunk}.json`);
      if (!res.ok) return null;
      store = new Map(Object.entries((await res.json()) as Record<string, WriterCharData>));
      chunkCache.set(chunk, store);
    } catch {
      return null;
    }
  }
  return store.get(ch) ?? null;
}

export function clearWriterDataCache(): void {
  manifest = null;
  chunkCache.clear();
}
