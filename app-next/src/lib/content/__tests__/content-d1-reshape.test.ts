import { describe, expect, it } from "vitest";
import { rowsToVocabData, rowsToVocabMeta, ContentNotFoundError } from "@/lib/content/vocab";
import { rowsToShadowing, ContentNotFoundError as ShadowingErr } from "@/lib/content/shadowing";
import { vocab as staticVocab } from "@/content/vocab";
import { shadowingVideos as staticVideos, shadowingSubtitles as staticSubs } from "@/content/shadowing";

/* Fixture = đúng shape seed sinh ra từ data static (Task 11/12): flatten các
   object gốc thành rows có ord. */
const vocabRows = Object.entries(staticVocab).flatMap(([book, pages]) =>
  Object.entries(pages).map(([pageId, lesson], i) => ({
    book, pageId, ord: i, title: lesson.title, words: lesson.words,
  }))
);

describe("rowsToVocabData / rowsToVocabMeta", () => {
  it("tái tạo đúng shape static (parity)", () => {
    expect(rowsToVocabData(vocabRows)).toEqual(staticVocab);
  });
  it("meta: số lesson + wordCount khớp", () => {
    const meta = rowsToVocabMeta(vocabRows);
    const hsk1 = meta.find((b) => b.book === "hsk1")!;
    expect(hsk1.lessons.length).toBe(Object.keys(staticVocab.hsk1).length);
    expect(hsk1.lessons[0].wordCount).toBe(Object.values(staticVocab.hsk1)[0].words.length);
    expect(hsk1.lessons[0].firstHanzi).toBe(Object.values(staticVocab.hsk1)[0].words[0].hanzi);
  });
  it("ContentNotFoundError có tên đúng", () => {
    const e = new ContentNotFoundError("content_vocabs");
    expect(e.name).toBe("ContentNotFoundError");
    expect(e.message).toContain("content_vocabs");
  });
});

const videoRows = staticVideos.map((v, i) => ({ ...v, ord: i }));
const subRows = Object.entries(staticSubs).map(([videoId, sentences]) => ({ videoId, sentences }));

describe("rowsToShadowing", () => {
  it("videos giữ thứ tự ord, topic cast về kiểu gốc", () => {
    const { videos } = rowsToShadowing(videoRows, subRows);
    expect(videos.map((v) => v.id)).toEqual(staticVideos.map((v) => v.id));
    expect(videos[0].topic).toBe(staticVideos[0].topic);
  });
  it("subtitles 1:1", () => {
    const { subtitles } = rowsToShadowing(videoRows, subRows);
    expect(subtitles).toEqual(staticSubs);
  });
  it("ShadowingErr export đúng", () => {
    expect(new ShadowingErr("x").name).toBe("ContentNotFoundError");
  });
});
