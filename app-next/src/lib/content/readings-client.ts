import type { ReadingDoc } from "@/lib/content/readings";

let cache: Promise<ReadingDoc[]> | null = null;

export function loadReadings(): Promise<ReadingDoc[]> {
  if (!cache) {
    cache = fetch("/api/v1/content/readings").then((r) => {
      if (!r.ok) throw new Error(`content/readings HTTP ${r.status}`);
      return r.json() as Promise<ReadingDoc[]>;
    });
  }
  return cache;
}

export function __resetReadingsCache() {
  cache = null;
}
