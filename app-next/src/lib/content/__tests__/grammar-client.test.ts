import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.resetModules(); // reset promise cache module-level giữa các test
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("loadGrammar", () => {
  it("GET /api/v1/content/grammar và parse JSON", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([{ id: "ba" }]), { status: 200 }));
    const { loadGrammar } = await import("@/lib/content/grammar-client");
    expect(await loadGrammar()).toEqual([{ id: "ba" }]);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/content/grammar");
  });

  it("fetch 1 lần dù gọi nhiều lần (promise cache)", async () => {
    fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));
    const { loadGrammar } = await import("@/lib/content/grammar-client");
    await Promise.all([loadGrammar(), loadGrammar()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fail lần 1 → mount lại (module reset) được retry fetch, lần 2 trả data", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "bi" }]), { status: 200 }));

    // Mount lần 1: fail
    const mod1 = await import("@/lib/content/grammar-client");
    await expect(mod1.loadGrammar()).rejects.toThrow(/500/);

    // Mount lần 2: negative cache đã clear → fetch lại và nhận data
    const mod2 = await import("@/lib/content/grammar-client");
    expect(await mod2.loadGrammar()).toEqual([{ id: "bi" }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
