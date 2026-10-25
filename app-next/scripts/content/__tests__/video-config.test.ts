import { describe, expect, it } from "vitest";
import { loadCuratedVideos } from "../video-config";

describe("loadCuratedVideos", () => {
  it("chấp nhận danh sách hợp lệ", () => {
    const vids = loadCuratedVideos([
      { videoId: "EA3rwvr99Q0", playlistId: "daihuaxiyou", hsk: "HSK3", topic: "film", spd: 0.9 },
    ]);
    expect(vids).toHaveLength(1);
    expect(vids[0].videoId).toBe("EA3rwvr99Q0");
  });
  it("từ chối videoId sai độ dài / playlist lạ / spd lạ", () => {
    expect(() =>
      loadCuratedVideos([{ videoId: "abc", playlistId: "daihuaxiyou", hsk: "HSK3", topic: "film", spd: 0.9 }])
    ).toThrow(/videoId/);
    expect(() =>
      loadCuratedVideos([{ videoId: "EA3rwvr99Q0", playlistId: "khong-co", hsk: "HSK3", topic: "film", spd: 0.9 }])
    ).toThrow(/playlistId/);
    expect(() =>
      loadCuratedVideos([{ videoId: "EA3rwvr99Q0", playlistId: "daihuaxiyou", hsk: "HSK3", topic: "film", spd: 0.5 }])
    ).toThrow(/spd/);
  });
  it("từ chối danh sách < 20 video", () => {
    expect(() => loadCuratedVideos([])).toThrow(/ít nhất 20/);
  });
});
