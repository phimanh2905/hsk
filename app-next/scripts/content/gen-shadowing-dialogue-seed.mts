/* W3.3 — Sinh drizzle/seeds/content-shadowing-dialogues.sql từ
   data/dialogues/dialogues-hsk{1,2,3}.json (gen-dialogues + merge-audio-timing).
   Idempotent: INSERT OR REPLACE theo PK. Playlist ord = 5 (sau 5 playlist cũ),
   video ordBase = 20 (sau 20 video cũ).
   Chạy: pnpm dlx tsx scripts/content/gen-shadowing-dialogue-seed.mts (từ app-next/) */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dialogueRows } from "./src/dialogue-seed";
import type { DialogueRecord } from "./src/dialogues";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(scriptDir, "data", "dialogues");
const PLAYLIST_ORD = 5;
const VIDEO_ORD_BASE = 20;

const esc = (s: string) => s.replace(/'/g, "''");

const dialogues: DialogueRecord[] = [];
for (const level of [1, 2, 3]) {
  const p = join(dataDir, `dialogues-hsk${level}.json`);
  if (!existsSync(p)) {
    console.log(`Bỏ qua (chưa có): ${p}`);
    continue;
  }
  const raw = JSON.parse(readFileSync(p, "utf8")) as DialogueRecord[] | { dialogues: DialogueRecord[] };
  const records = Array.isArray(raw) ? raw : raw.dialogues;
  console.log(`dialogues-hsk${level}.json: ${records.length} bài`);
  dialogues.push(...records);
}

const { playlist, videos, subtitles } = dialogueRows(dialogues, VIDEO_ORD_BASE);

const lines: string[] = [
  "-- Seed content_shadowing_* playlist Hội thoại theo bài (W3.3) — sinh tự động, đừng sửa tay.",
  `INSERT OR REPLACE INTO content_shadowing_playlists (id, ord, slug, name, total, desc, channel) VALUES ('${esc(playlist.id)}', ${PLAYLIST_ORD}, '${esc(playlist.slug)}', '${esc(playlist.name)}', ${playlist.total}, '${esc(playlist.desc)}', '${esc(playlist.channel)}');`,
];

videos.forEach((v) => {
  lines.push(
    `INSERT OR REPLACE INTO content_shadowing_videos (id, ord, title, playlist_id, hsk, views, views_suffix, duration, dur_sec, plays, topic, spd, type, audio_dir) VALUES ('${esc(v.id)}', ${v.ord}, '${esc(v.title)}', '${esc(v.playlistId)}', '${esc(v.hsk)}', ${v.views}, '${esc(v.viewsSuffix)}', '${esc(v.duration)}', ${v.durSec}, ${v.plays}, '${esc(v.topic)}', ${v.spd}, '${esc(v.type)}', ${v.audioDir === null ? "NULL" : `'${esc(v.audioDir)}'`});`
  );
});

for (const [videoId, sentences] of Object.entries(subtitles)) {
  lines.push(
    `INSERT OR REPLACE INTO content_shadowing_subtitles (video_id, sentences) VALUES ('${esc(videoId)}', '${esc(JSON.stringify(sentences))}');`
  );
}

mkdirSync("drizzle/seeds", { recursive: true });
writeFileSync("drizzle/seeds/content-shadowing-dialogues.sql", lines.join("\n") + "\n");
console.log(`Đã ghi ${lines.length - 1} rows -> drizzle/seeds/content-shadowing-dialogues.sql`);
