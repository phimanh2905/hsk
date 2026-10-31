import { describe, it, expect, vi, beforeEach } from "vitest";

const getVocab = vi.fn();
vi.mock("@/lib/content/vocab", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/content/vocab")>();
  return { ...actual, getVocab: (...a: unknown[]) => getVocab(...a) };
});

const shadowingMocks = vi.hoisted(() => ({
  getShadowingPlaylists: vi.fn(),
  getShadowingVideos: vi.fn(),
  getShadowingSubtitles: vi.fn(),
  getShadowingVideoById: vi.fn(),
  getShadowingSubtitlesByVideo: vi.fn(),
}));
vi.mock("@/lib/content/shadowing", () => shadowingMocks);

import { handleContentVocab, handleContentShadowing } from "../content";

const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

function req(query: string): Request {
  return new Request(`http://localhost/api/v1/content/shadowing${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("handleContentVocab", () => {
  it("200 + Cache-Control khi dữ liệu đọc thành công", async () => {
    getVocab.mockResolvedValue([{ hsk: "HSK1" }]);
    const res = await handleContentVocab();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(CACHE);
    expect(await res.json()).toEqual([{ hsk: "HSK1" }]);
  });

  it("500 JSON khi getVocab throw", async () => {
    getVocab.mockRejectedValue(new Error("d1 down"));
    const res = await handleContentVocab();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Không đọc được dữ liệu từ vựng" });
    expect(res.headers.get("Cache-Control")).toBeNull();
  });
});

describe("handleContentShadowing", () => {
  it("không query → full dataset (playlists + videos + subtitles)", async () => {
    shadowingMocks.getShadowingPlaylists.mockResolvedValue([{ id: "p1" }]);
    shadowingMocks.getShadowingVideos.mockResolvedValue([{ id: "v1", playlistId: "p1" }]);
    shadowingMocks.getShadowingSubtitles.mockResolvedValue({ v1: [{ n: 1 }] });
    const res = await handleContentShadowing(req(""));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(CACHE);
    expect(await res.json()).toEqual({
      playlists: [{ id: "p1" }],
      videos: [{ id: "v1", playlistId: "p1" }],
      subtitles: { v1: [{ n: 1 }] },
    });
  });

  it("?video= → 1 video + subtitles của nó; không có subs → []", async () => {
    shadowingMocks.getShadowingVideoById.mockResolvedValue({ id: "hsk1/lesson-1", playlistId: "p1" });
    shadowingMocks.getShadowingSubtitlesByVideo.mockResolvedValue([{ n: 1 }]);
    const res = await handleContentShadowing(req("?video=hsk1%2Flesson-1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ video: { id: "hsk1/lesson-1", playlistId: "p1" }, subtitles: [{ n: 1 }] });

    shadowingMocks.getShadowingSubtitlesByVideo.mockResolvedValue(null);
    const res2 = await handleContentShadowing(req("?video=hsk1/lesson-1"));
    expect(await res2.json()).toEqual({ video: { id: "hsk1/lesson-1", playlistId: "p1" }, subtitles: [] });
  });

  it("?video= không thấy → 404 JSON", async () => {
    shadowingMocks.getShadowingVideoById.mockResolvedValue(null);
    const res = await handleContentShadowing(req("?video=nope"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Không tìm thấy video" });
  });

  it("?playlist= → playlist + videos con lọc theo playlistId; không thấy → 404", async () => {
    shadowingMocks.getShadowingPlaylists.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
    shadowingMocks.getShadowingVideos.mockResolvedValue([
      { id: "v1", playlistId: "p1" },
      { id: "v2", playlistId: "p2" },
    ]);
    const res = await handleContentShadowing(req("?playlist=p2"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ playlist: { id: "p2" }, videos: [{ id: "v2", playlistId: "p2" }] });

    const res404 = await handleContentShadowing(req("?playlist=p3"));
    expect(res404.status).toBe(404);
    expect(await res404.json()).toEqual({ error: "Không tìm thấy playlist" });
  });

  it("500 JSON khi content layer throw", async () => {
    shadowingMocks.getShadowingPlaylists.mockRejectedValue(new Error("d1 down"));
    const res = await handleContentShadowing(req(""));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Không đọc được dữ liệu shadowing" });
  });
});
