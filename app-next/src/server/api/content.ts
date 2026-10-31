import { getVocab, getVocabMeta, getVocabLesson } from "@/lib/content/vocab";
import { getGrammar } from "@/lib/content/grammar";
import {
  getShadowingPlaylists,
  getShadowingSubtitles,
  getShadowingSubtitlesByVideo,
  getShadowingVideoById,
  getShadowingVideos,
} from "@/lib/content/shadowing";
import { getReadings } from "@/lib/content/readings";
import { json } from "./json";

/* Content dataset đọc hiếm/ghi hiếm — cache CDN 1h, stale 1 ngày.
   Lưu ý: s-maxage ở đây chỉ là browser-level hint vì Worker response không tự
   vào edge cache — nếu cần cache edge thật thì dùng Cache API (caches.default); defer. */
const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export async function handleContentVocab(): Promise<Response> {
  try {
    return json(await getVocab(), { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error("[api/v1/content/vocab]", err);
    return json({ error: "Không đọc được dữ liệu từ vựng" }, { status: 500 });
  }
}

export async function handleContentVocabMeta(): Promise<Response> {
  try {
    return json(await getVocabMeta(), { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error("[api/v1/content/vocab-meta]", err);
    return json({ error: "Không đọc được metadata từ vựng" }, { status: 500 });
  }
}

export async function handleContentVocabLesson(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const book = searchParams.get("book");
  const page = searchParams.get("page");
  if (!book || !page) return json({ error: "Thiếu book hoặc page" }, { status: 400 });
  try {
    const lesson = await getVocabLesson(book, page);
    if (!lesson) return json({ error: "Không tìm thấy bài học" }, { status: 404 });
    return json({ lesson }, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error("[api/v1/content/vocab-lesson]", err);
    return json({ error: "Không đọc được bài học" }, { status: 500 });
  }
}

export async function handleContentGrammar(): Promise<Response> {
  try {
    return json(await getGrammar(), { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error("[api/v1/content/grammar]", err);
    return json({ error: "Không đọc được dữ liệu ngữ pháp" }, { status: 500 });
  }
}

export async function handleContentShadowing(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("video");
  const playlistId = searchParams.get("playlist");
  try {
    /* Filter ?video=<id> — trả 1 video + subtitles của nó (SSG detail page). */
    if (videoId) {
      const video = await getShadowingVideoById(videoId);
      if (!video) return json({ error: "Không tìm thấy video" }, { status: 404 });
      const subtitles = await getShadowingSubtitlesByVideo(videoId);
      return json({ video, subtitles: subtitles ?? [] }, { headers: { "Cache-Control": CACHE } });
    }
    /* Filter ?playlist=<id> — trả playlist + videos con. */
    if (playlistId) {
      const playlist = (await getShadowingPlaylists()).find((p) => p.id === playlistId);
      if (!playlist) return json({ error: "Không tìm thấy playlist" }, { status: 404 });
      const videos = (await getShadowingVideos()).filter((v) => v.playlistId === playlistId);
      return json({ playlist, videos }, { headers: { "Cache-Control": CACHE } });
    }
    const [playlists, videos, subtitles] = await Promise.all([
      getShadowingPlaylists(),
      getShadowingVideos(),
      getShadowingSubtitles(),
    ]);
    return json({ playlists, videos, subtitles }, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error("[api/v1/content/shadowing]", err);
    return json({ error: "Không đọc được dữ liệu shadowing" }, { status: 500 });
  }
}

export async function handleContentReadings(): Promise<Response> {
  try {
    return json(await getReadings(), { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error("[api/v1/content/readings]", err);
    return json({ error: "Không đọc được bài đọc" }, { status: 500 });
  }
}
