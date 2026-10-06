import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.resetModules(); // reset promise cache module-level giữa các test
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("loadVocabMeta", () => {
  it("GET /api/v1/content/vocab-meta và parse JSON", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([{ book: "hsk1", lessons: [] }]), { status: 200 }));
    const { loadVocabMeta } = await import("@/lib/content/vocab-client");
    const meta = await loadVocabMeta();
    expect(meta).toEqual([{ book: "hsk1", lessons: [] }]);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/content/vocab-meta");
  });

  it("throw khi response không ok", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 500 }));
    const { loadVocabMeta } = await import("@/lib/content/vocab-client");
    await expect(loadVocabMeta()).rejects.toThrow(/500/);
  });

  it("fetch 1 lần dù gọi nhiều lần (promise cache)", async () => {
    fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));
    const { loadVocabMeta } = await import("@/lib/content/vocab-client");
    await Promise.all([loadVocabMeta(), loadVocabMeta()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("loadVocab", () => {
  it("GET /api/v1/content/vocab", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ hsk1: {} }), { status: 200 }));
    const { loadVocab } = await import("@/lib/content/vocab-client");
    expect(await loadVocab()).toEqual({ hsk1: {} });
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/content/vocab");
  });
});
