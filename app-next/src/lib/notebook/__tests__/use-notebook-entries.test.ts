// src/lib/notebook/__tests__/use-notebook-entries.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const useSession = vi.fn();
vi.mock("@/lib/use-session", () => ({ useSession: () => useSession() }));
const toast = vi.fn();
vi.mock("@/components/shell/toast-provider", () => ({ useToastSafe: () => toast }));
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { useNotebookEntries } from "@/lib/notebook/use-notebook-entries";
import { NOTEBOOK_KEY, type NotebookEntry } from "@/lib/notebook/entries";

const localEntry: NotebookEntry = {
  id: "e-local", kind: "wrong", tag: "t", tagTone: "red",
  payload: { q: "q", wrong: null, right: { zh: "x" }, cause: "c" },
  saved: false, hsk: null, source: "auto",
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};

beforeEach(() => { localStorage.clear(); fetchMock.mockReset(); toast.mockReset(); });

describe("guest nhánh", () => {
  it("create/setSaved/remove tất cả qua localStorage + re-render", () => {
    useSession.mockReturnValue({ loggedIn: false, isPending: false });
    const { result } = renderHook(() => useNotebookEntries());
    let created: NotebookEntry;
    act(() => { created = result.current.create({ kind: "personal", tag: "📝", tagTone: "per", payload: { note: "abc" }, source: "manual" }); });
    expect(result.current.entries).toHaveLength(1);
    act(() => result.current.setSaved(created.id, true));
    expect(JSON.parse(localStorage.getItem(NOTEBOOK_KEY)!)[0].saved).toBe(true);
    act(() => result.current.remove(created.id));
    expect(result.current.entries).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("entries sort createdAt DESC", () => {
    useSession.mockReturnValue({ loggedIn: false, isPending: false });
    localStorage.setItem(NOTEBOOK_KEY, JSON.stringify([
      { ...localEntry, id: "old", createdAt: "2026-10-01T00:00:00Z" },
      { ...localEntry, id: "new", createdAt: "2026-10-05T00:00:00Z" },
    ]));
    const { result } = renderHook(() => useNotebookEntries());
    expect(result.current.entries.map((e) => e.id)).toEqual(["new", "old"]);
  });
});

describe("user đăng nhập", () => {
  it("GET khi mount; create → POST với id client sinh", async () => {
    useSession.mockReturnValue({ loggedIn: true, isPending: false });
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      init
        ? Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ item: { id: "x" } }) })
        : Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) })
    );
    const { result } = renderHook(() => useNotebookEntries());
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.create({ kind: "wrong", tag: "t", tagTone: "red", payload: localEntry.payload }));
    const [url, init] = fetchMock.mock.calls.find(([, i]) => (i as RequestInit | undefined)?.method === "POST")!;
    expect(String(url)).toContain("/api/v1/notebook/entries");
    expect(JSON.parse((init as RequestInit).body as string).id).toBeTruthy();
    expect(result.current.entries).toHaveLength(1); // optimistic
  });
  it("merge-on-login: entry local chưa có trên server → POST rồi clear", async () => {
    localStorage.setItem(NOTEBOOK_KEY, JSON.stringify([localEntry]));
    useSession.mockReturnValue({ loggedIn: true, isPending: false });
    fetchMock.mockImplementation((_, init?: RequestInit) =>
      init
        ? Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ item: { id: localEntry.id } }) })
        : Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) })
    );
    const { result } = renderHook(() => useNotebookEntries());
    await waitFor(() => expect(result.current.ready).toBe(true));
    await waitFor(() => {
      const posts = fetchMock.mock.calls.filter(([, i]) => (i as RequestInit | undefined)?.method === "POST");
      expect(posts).toHaveLength(1);
      expect(localStorage.getItem(NOTEBOOK_KEY)).toBe(null); // đã sync → clear
    });
  });
  it("server GET hỏng → fallback local, ready vẫn true", async () => {
    useSession.mockReturnValue({ loggedIn: true, isPending: false });
    fetchMock.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useNotebookEntries());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(toast).toHaveBeenCalled();
  });
});
