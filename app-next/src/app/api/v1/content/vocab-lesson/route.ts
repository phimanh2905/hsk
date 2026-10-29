import { NextResponse } from "next/server";
import { getVocabLesson } from "@/lib/content/vocab";

/* Content dataset đọc hiếm/ghi hiếm — cache CDN 1h, stale 1 ngày. */
const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const book = searchParams.get("book");
  const page = searchParams.get("page");
  if (!book || !page) return NextResponse.json({ error: "Thiếu book hoặc page" }, { status: 400 });
  try {
    const lesson = await getVocabLesson(book, page);
    if (!lesson) return NextResponse.json({ error: "Không tìm thấy bài học" }, { status: 404 });
    return NextResponse.json({ lesson }, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error("[api/v1/content/vocab-lesson]", err);
    return NextResponse.json({ error: "Không đọc được bài học" }, { status: 500 });
  }
}
