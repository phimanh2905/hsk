import { describe, expect, it } from "vitest";
import { vocabWordSchema } from "@/content/schema";
import { vocab as staticVocab } from "@/content/vocab";
import { shadowingVideos as staticVideos, shadowingPlaylists as staticPlaylists, shadowingSubtitles as staticSubs } from "@/content/shadowing";

/* Facade (src/lib/content/*) giờ đọc D1 — jsdom không có binding nên phần gọi
   facade được kiểm chứng qua e2e (e2e/content-d1.spec.ts). File này giữ vai trò
   validate Nguồn seed: data static phải sạch trước khi generator tạo SQL. */
describe("nguồn seed — vocab (static)", () => {
  it("đủ 6 book", () => {
    expect(Object.keys(staticVocab).sort()).toEqual(["hsk1", "hsk2", "hsk3", "hsk4", "hsk5", "hsk6"]);
  });

  it("mọi word khớp zod schema (dữ liệu seed phải sạch)", () => {
    for (const pages of Object.values(staticVocab)) {
      for (const lesson of Object.values(pages)) {
        for (const w of lesson.words) {
          const r = vocabWordSchema.safeParse(w);
          expect(r.success, JSON.stringify(w).slice(0, 80)).toBe(true);
        }
      }
    }
  });
});

describe("nguồn seed — shadowing (static)", () => {
  it("5 playlist, videos không mồ côi playlist", () => {
    const ids = new Set(staticPlaylists.map((p) => p.id));
    expect(staticPlaylists.length).toBe(5);
    for (const v of staticVideos) expect(ids.has(v.playlistId), v.id).toBe(true);
  });

  it("subtitles có key đúng videoId, câu có start<=end", () => {
    const videoIds = new Set(staticVideos.map((v) => v.id));
    for (const [vid, sentences] of Object.entries(staticSubs)) {
      expect(videoIds.has(vid), vid).toBe(true);
      for (const s of sentences) expect(s.start).toBeLessThanOrEqual(s.end);
    }
  });
});
