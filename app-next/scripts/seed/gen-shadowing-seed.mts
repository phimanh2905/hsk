/* Sinh drizzle/seeds/content-shadowing.sql từ src/content/shadowing.ts.
   Idempotent: INSERT OR REPLACE theo PK.
   Chạy: pnpm dlx tsx scripts/seed/gen-shadowing-seed.mts (từ app-next/) */
import { mkdirSync, writeFileSync } from "node:fs";
import { shadowingPlaylists, shadowingSubtitles, shadowingVideos } from "../../src/content/shadowing";

const esc = (s: string) => s.replace(/'/g, "''");
const lines: string[] = [
  "-- Seed content_shadowing_* — sinh tự động, đừng sửa tay.",
];

shadowingPlaylists.forEach((p, i) => {
  lines.push(
    `INSERT OR REPLACE INTO content_shadowing_playlists (id, ord, slug, name, total, desc, channel) VALUES ('${esc(p.id)}', ${i}, '${esc(p.slug)}', '${esc(p.name)}', ${p.total}, '${esc(p.desc)}', '${esc(p.channel)}');`
  );
});

shadowingVideos.forEach((v, i) => {
  lines.push(
    `INSERT OR REPLACE INTO content_shadowing_videos (id, ord, title, playlist_id, hsk, views, views_suffix, duration, dur_sec, plays, topic, spd) VALUES ('${esc(v.id)}', ${i}, '${esc(v.title)}', '${esc(v.playlistId)}', '${esc(v.hsk)}', ${v.views}, '${esc(v.viewsSuffix)}', '${esc(v.duration)}', ${v.durSec}, ${v.plays}, '${esc(v.topic)}', ${v.spd});`
  );
});

for (const [videoId, sentences] of Object.entries(shadowingSubtitles)) {
  lines.push(
    `INSERT OR REPLACE INTO content_shadowing_subtitles (video_id, sentences) VALUES ('${esc(videoId)}', '${esc(JSON.stringify(sentences))}');`
  );
}

mkdirSync("drizzle/seeds", { recursive: true });
writeFileSync("drizzle/seeds/content-shadowing.sql", lines.join("\n") + "\n");
console.log(`Đã ghi ${lines.length - 1} rows -> drizzle/seeds/content-shadowing.sql`);
