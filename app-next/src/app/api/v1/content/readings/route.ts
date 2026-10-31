import { NextResponse } from "next/server";
import { getReadings } from "@/lib/content/readings";

/* Content dataset đọc hiếm/ghi hiếm — cache CDN 1h, stale 1 ngày. */
const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getReadings(), { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error("[api/v1/content/readings]", err);
    return NextResponse.json({ error: "Không đọc được bài đọc" }, { status: 500 });
  }
}
