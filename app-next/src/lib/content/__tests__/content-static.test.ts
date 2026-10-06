import { describe, expect, it } from "vitest";
import {
  getVocab, getVocabLesson, getVocabMeta,
} from "@/lib/content/vocab";
import {
  getShadowingPlaylists, getShadowingVideos, getShadowingSubtitles, getShadowingVideoById,
} from "@/lib/content/shadowing";
import { vocabWordSchema } from "@/content/schema";
import { vocab as staticVocab } from "@/content/vocab";
import { shadowingVideos as staticVideos, shadowingPlaylists as staticPlaylists } from "@/content/shadowing";

describe("content facade — vocab (nguồn static)", () => {
  it("getVocab trả đủ 6 book", async () => {
    const data = await getVocab();
    expect(Object.keys(data).sort()).toEqual(["hsk1", "hsk2", "hsk3", "hsk4", "hsk5", "hsk6"]);
  });

  it("mọi word khớp zod schema (dữ liệu seed sau này phải sạch)", async () => {
    const data = await getVocab();
    for (const pages of Object.values(data)) {
      for (const lesson of Object.values(pages)) {
        for (const w of lesson.words) {
          const r = vocabWordSchema.safeParse(w);
          expect(r.success, JSON.stringify(w).slice(0, 80)).toBe(true);
        }
      }
    }
  });

  it("getVocabLesson trả lesson / null khi sai key", async () => {
    expect((await getVocabLesson("hsk1", "lesson-1"))?.words.length).toBeGreaterThan(0);
    expect(await getVocabLesson("hsk9", "lesson-1")).toBeNull();
  });

  it("getVocabMeta: wordCount + firstHanzi khớp data", async () => {
    const meta = await getVocabMeta();
    const hsk1 = meta.find((b) => b.book === "hsk1");
    expect(hsk1).toBeDefined();
    const firstPage = Object.entries(staticVocab.hsk1)[0];
    const m0 = hsk1!.lessons[0];
    expect(m0.pageId).toBe(firstPage[0]);
    expect(m0.title).toBe(firstPage[1].title);
    expect(m0.wordCount).toBe(firstPage[1].words.length);
    expect(m0.firstHanzi).toBe(firstPage[1].words[0]?.hanzi ?? "");
  });
});

describe("content facade — shadowing (nguồn static)", () => {
  it("5 playlist, videos không mồ côi playlist", async () => {
    const playlists = await getShadowingPlaylists();
    const videos = await getShadowingVideos();
    expect(playlists.length).toBe(staticPlaylists.length);
    expect(videos.length).toBe(staticVideos.length);
    const ids = new Set(playlists.map((p) => p.id));
    for (const v of videos) expect(ids.has(v.playlistId), v.id).toBe(true);
  });

  it("subtitles có key đúng videoId, câu có start<=end", async () => {
    const subs = await getShadowingSubtitles();
    const videoIds = new Set(staticVideos.map((v) => v.id));
    for (const [vid, sentences] of Object.entries(subs)) {
      expect(videoIds.has(vid), vid).toBe(true);
      for (const s of sentences) expect(s.start).toBeLessThanOrEqual(s.end);
    }
  });

  it("getShadowingVideoById trả video/null", async () => {
    const videos = staticVideos;
    expect((await getShadowingVideoById(videos[0].id))?.id).toBe(videos[0].id);
    expect(await getShadowingVideoById("khong-ton-tai")).toBeNull();
  });
});
