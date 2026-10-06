import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/content/vocab", () => ({
  getVocab: vi.fn(),
  getVocabMeta: vi.fn(),
}));
vi.mock("@/lib/content/shadowing", () => ({
  getShadowingPlaylists: vi.fn(),
  getShadowingVideos: vi.fn(),
  getShadowingSubtitles: vi.fn(),
}));

import { GET as GET_VOCAB } from "@/app/api/v1/content/vocab/route";
import { GET as GET_META } from "@/app/api/v1/content/vocab-meta/route";
import { GET as GET_SHADOWING } from "@/app/api/v1/content/shadowing/route";
import { getVocab, getVocabMeta } from "@/lib/content/vocab";
import { getShadowingPlaylists, getShadowingVideos, getShadowingSubtitles } from "@/lib/content/shadowing";

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/content/vocab", () => {
  it("200 + Cache-Control khi OK", async () => {
    vi.mocked(getVocab).mockResolvedValue({ hsk1: {} });
    const res = await GET_VOCAB();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
    expect(await res.json()).toEqual({ hsk1: {} });
  });
  it("500 khi nguồn lỗi", async () => {
    vi.mocked(getVocab).mockRejectedValue(new Error("DB down"));
    const res = await GET_VOCAB();
    expect(res.status).toBe(500);
  });
});

describe("GET /api/v1/content/vocab-meta", () => {
  it("200 khi OK", async () => {
    vi.mocked(getVocabMeta).mockResolvedValue([{ book: "hsk1", lessons: [] }]);
    const res = await GET_META();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ book: "hsk1", lessons: [] }]);
  });
  it("500 khi nguồn lỗi", async () => {
    vi.mocked(getVocabMeta).mockRejectedValue(new Error("DB down"));
    expect((await GET_META()).status).toBe(500);
  });
});

describe("GET /api/v1/content/shadowing", () => {
  it("200 + shape { playlists, videos, subtitles }", async () => {
    vi.mocked(getShadowingPlaylists).mockResolvedValue([]);
    vi.mocked(getShadowingVideos).mockResolvedValue([]);
    vi.mocked(getShadowingSubtitles).mockResolvedValue({});
    const res = await GET_SHADOWING();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ playlists: [], videos: [], subtitles: {} });
  });
  it("500 khi nguồn lỗi", async () => {
    vi.mocked(getShadowingVideos).mockRejectedValue(new Error("DB down"));
    expect((await GET_SHADOWING()).status).toBe(500);
  });
});
