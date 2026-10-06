import { NextResponse } from "next/server";
import {
  getShadowingPlaylists,
  getShadowingSubtitles,
  getShadowingVideos,
} from "@/lib/content/shadowing";

const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [playlists, videos, subtitles] = await Promise.all([
      getShadowingPlaylists(),
      getShadowingVideos(),
      getShadowingSubtitles(),
    ]);
    return NextResponse.json({ playlists, videos, subtitles }, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error("[api/v1/content/shadowing]", err);
    return NextResponse.json({ error: "Không đọc được dữ liệu shadowing" }, { status: 500 });
  }
}
