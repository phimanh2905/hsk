/* Content layer — grammar (spec dehardcode §4). Pages/components gọi qua đây,
   KHÔNG import trực tiếp src/content/grammar-points; nguồn dữ liệu là D1
   (bảng content_grammars, seed bởi scripts/seed/gen-grammar-seed.mts).
   Chỉ chạy server-side — createDb() cần binding D1 trong request context. */
import { asc } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { contentGrammars } from "@/lib/db/schema";
import type { GrammarPoint } from "@/content/grammar-points";

export type { GrammarPoint };
import { ContentNotFoundError } from "@/lib/content/vocab";
export { ContentNotFoundError };

type GrammarRow = {
  id: string;
  level: string;
  ord: number;
  title: string;
  hz: string;
  topic: string;
  def: string;
  formula: unknown; // JSON string (D1 raw) hoặc đã parse (drizzle mode:json)
  pitfall: unknown;
  ex: unknown;
};

function parseJson<T>(v: unknown): T {
  if (typeof v === "string") return JSON.parse(v) as T;
  return v as T;
}

/* Pure function (test được): sort theo ord, map JSON field về đúng tuple. */
export function rowsToGrammarPoints(rows: GrammarRow[]): GrammarPoint[] {
  return [...rows]
    .sort((a, b) => a.ord - b.ord)
    .map((r) => ({
      id: r.id,
      level: r.level,
      topic: r.topic,
      title: r.title,
      hz: r.hz,
      def: r.def,
      formula: parseJson<[label: string, isKey?: "key"][]>(r.formula),
      pitfall: parseJson<[string, string, string]>(r.pitfall),
      ex: parseJson<{ hz: string; py: string; vi: string }[]>(r.ex),
    })) as GrammarPoint[];
}

export async function getGrammar(): Promise<GrammarPoint[]> {
  const rows = await createDb().select().from(contentGrammars).orderBy(asc(contentGrammars.ord));
  if (rows.length === 0) throw new ContentNotFoundError("content_grammars");
  return rowsToGrammarPoints(rows);
}
