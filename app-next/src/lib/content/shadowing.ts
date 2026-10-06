/* Content layer — shadowing (spec dehardcode §4.1, §4.2). Nguồn D1 (3 bảng
   content_shadowing_*, seed bởi scripts/seed/gen-shadowing-seed.mts); chữ ký
   bất đồng bộ không đổi. topicVi là label UI tĩnh — giữ code.
   Chỉ chạy server-side — createDb() cần binding D1 trong request context. */
import { asc, eq } from "drizzle-orm";
import { createDb } from "@/lib/db";
import {
  contentShadowingPlaylists,
  contentShadowingSubtitles,
  contentShadowingVideos,
} from "@/lib/db/schema";
import type {
  ShadowingPlaylist,
  ShadowingTopic,
  ShadowingVideo,
  SubtitleSentence,
} from "@/content/shadowing";
import { topicVi } from "@/content/shadowing";

export type { ShadowingPlaylist, ShadowingTopic, ShadowingVideo, SubtitleSentence };
export { topicVi };

export type SubtitlesByVideo = Record<string, SubtitleSentence[]>;

export class ContentNotFoundError extends Error {
  constructor(dataset: string) {
    super(`Content dataset rỗng hoặc chưa seed: ${dataset}`);
    this.name = "ContentNotFoundError";
  }
}

/* DB lưu topic là text — nới kiểu ở row, cast lại về union khi reshape. */
type VideoRow = Omit<ShadowingVideo, "topic"> & { topic: string; ord: number };
type SubRow = { videoId: string; sentences: SubtitleSentence[] };

/* Pure function (test được): rows → shape app, sort ord, cast topic. */
export function rowsToShadowing(
  videoRows: VideoRow[],
  subRows: SubRow[]
): { videos: ShadowingVideo[]; subtitles: SubtitlesByVideo } {
  const videos = [...videoRows]
    .sort((a, b) => a.ord - b.ord)
    .map(({ ord: _ord, ...v }) => ({ ...v, topic: v.topic as ShadowingTopic }));
  const subtitles: SubtitlesByVideo = {};
  for (const r of subRows) subtitles[r.videoId] = r.sentences;
  return { videos, subtitles };
}

export async function getShadowingPlaylists(): Promise<ShadowingPlaylist[]> {
  const rows = await createDb()
    .select()
    .from(contentShadowingPlaylists)
    .orderBy(asc(contentShadowingPlaylists.ord));
  if (rows.length === 0) throw new ContentNotFoundError("content_shadowing_playlists");
  return rows.map(({ ord: _ord, ...p }) => p);
}

export async function getShadowingVideos(): Promise<ShadowingVideo[]> {
  const rows = await createDb()
    .select()
    .from(contentShadowingVideos)
    .orderBy(asc(contentShadowingVideos.ord));
  if (rows.length === 0) throw new ContentNotFoundError("content_shadowing_videos");
  return rowsToShadowing(rows, []).videos;
}

export async function getShadowingSubtitles(): Promise<SubtitlesByVideo> {
  const rows = await createDb().select().from(contentShadowingSubtitles);
  if (rows.length === 0) throw new ContentNotFoundError("content_shadowing_subtitles");
  return rowsToShadowing([], rows).subtitles;
}

export async function getShadowingVideoById(id: string): Promise<ShadowingVideo | null> {
  const rows = await createDb()
    .select()
    .from(contentShadowingVideos)
    .where(eq(contentShadowingVideos.id, id));
  if (!rows[0]) return null;
  return rowsToShadowing([rows[0]], []).videos[0] ?? null;
}

export async function getShadowingSubtitlesByVideo(videoId: string): Promise<SubtitleSentence[] | null> {
  const rows = await createDb()
    .select()
    .from(contentShadowingSubtitles)
    .where(eq(contentShadowingSubtitles.videoId, videoId));
  return rows[0]?.sentences ?? null;
}
