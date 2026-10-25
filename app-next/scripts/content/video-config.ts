/* Danh sách video curated cho Wave 1 — owner điền tay vào shadowing-videos.json.
   Chỉ video ID công khai từ YouTube; CẤM dữ liệu từ nhaihsk (xem plan Global Constraints 1). */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type CuratedVideo = {
  videoId: string;
  playlistId: string;
  hsk: string;
  topic: "life" | "food" | "travel" | "film";
  spd: number;
};

const PLAYLISTS = ["daihuaxiyou", "long-baba", "so-cap", "an-kha-hy", "simple-days"];
const TOPICS = ["life", "food", "travel", "film"];
const SPDS = [0.75, 0.85, 0.9, 1];

export function loadCuratedVideos(raw: unknown): CuratedVideo[] {
  if (!Array.isArray(raw)) throw new Error("Cần ít nhất 20 video curated");
  if (raw.length === 0) throw new Error("Cần ít nhất 20 video curated");
  const out = raw.map((v) => {
    const c = v as Record<string, unknown>;
    if (typeof c.videoId !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(c.videoId))
      throw new Error(`videoId không hợp lệ: ${String(c.videoId)}`);
    if (typeof c.playlistId !== "string" || !PLAYLISTS.includes(c.playlistId))
      throw new Error(`playlistId không hợp lệ: ${String(c.playlistId)}`);
    if (typeof c.hsk !== "string" || !/^HSK[1-6]$/.test(c.hsk)) throw new Error(`hsk không hợp lệ: ${String(c.hsk)}`);
    if (typeof c.topic !== "string" || !TOPICS.includes(c.topic)) throw new Error(`topic không hợp lệ: ${String(c.topic)}`);
    if (typeof c.spd !== "number" || !SPDS.includes(c.spd)) throw new Error(`spd không hợp lệ: ${String(c.spd)}`);
    return { videoId: c.videoId, playlistId: c.playlistId, hsk: c.hsk, topic: c.topic as CuratedVideo["topic"], spd: c.spd };
  });
  return out;
}

export function readCuratedVideos(): CuratedVideo[] {
  const raw = JSON.parse(readFileSync(join(import.meta.dirname, "shadowing-videos.json"), "utf8")) as unknown;
  if (!Array.isArray(raw) || raw.length < 20) throw new Error("Cần ít nhất 20 video curated");
  return loadCuratedVideos(raw);
}
