import { NextResponse } from "next/server";
import { getVocabMeta } from "@/lib/content/vocab";

const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getVocabMeta(), { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error("[api/v1/content/vocab-meta]", err);
    return NextResponse.json({ error: "Không đọc được metadata từ vựng" }, { status: 500 });
  }
}
