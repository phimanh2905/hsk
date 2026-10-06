/* Content layer — shadowing (spec dehardcode §4.1). Nguồn static, sẽ chuyển D1;
   chữ ký bất đồng bộ không đổi. topicVi là label UI tĩnh — giữ code. */
import {
  shadowingPlaylists as staticPlaylists,
  shadowingVideos as staticVideos,
  shadowingSubtitles as staticSubtitles,
  shadowingVideoById,
  topicVi,
  type ShadowingPlaylist,
  type ShadowingTopic,
  type ShadowingVideo,
  type SubtitleSentence,
} from "@/content/shadowing";

export type { ShadowingPlaylist, ShadowingTopic, ShadowingVideo, SubtitleSentence };
export { topicVi };

export type SubtitlesByVideo = Record<string, SubtitleSentence[]>;

export async function getShadowingPlaylists(): Promise<ShadowingPlaylist[]> {
  return staticPlaylists;
}

export async function getShadowingVideos(): Promise<ShadowingVideo[]> {
  return staticVideos;
}

export async function getShadowingSubtitles(): Promise<SubtitlesByVideo> {
  return staticSubtitles;
}

export async function getShadowingVideoById(id: string): Promise<ShadowingVideo | null> {
  return shadowingVideoById(id) ?? null;
}

export async function getShadowingSubtitlesByVideo(videoId: string): Promise<SubtitleSentence[] | null> {
  return staticSubtitles[videoId] ?? null;
}
