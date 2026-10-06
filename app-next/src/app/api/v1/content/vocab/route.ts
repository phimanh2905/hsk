import { NextResponse } from "next/server";
import { getVocab } from "@/lib/content/vocab";

/* Content dataset đọc hiếm/ghi hiếm — cache CDN 1h, stale 1 ngày. */
const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getVocab(), { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error("[api/v1/content/vocab]", err);
    return NextResponse.json({ error: "Không đọc được dữ liệu từ vựng" }, { status: 500 });
  }
}
