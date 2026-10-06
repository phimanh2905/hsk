"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/use-session";
import { useToastSafe } from "@/components/shell/toast-provider";
import {
  readLocalEntries, writeLocalEntries, newEntryId, NOTEBOOK_KEY, type NotebookEntry,
} from "@/lib/notebook/entries";
import type { EntryKind, EntryPayload } from "@/lib/notebook/payload";

export type NewEntryInput = {
  kind: EntryKind; tag: string; tagTone: "red" | "lav" | "per";
  payload: EntryPayload; hsk?: string | null; source?: "auto" | "manual";
};

const byNewest = (a: NotebookEntry, b: NotebookEntry) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export function useNotebookEntries() {
  const { loggedIn, isPending } = useSession();
  const toast = useToastSafe();
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [ready, setReady] = useState(loggedIn ? false : true);
  const entriesRef = useRef(entries);
  useEffect(() => { entriesRef.current = entries; }, [entries]);

  const create = useCallback((input: NewEntryInput): NotebookEntry => {
    const now = new Date().toISOString();
    const entry: NotebookEntry = {
      id: newEntryId(), kind: input.kind, tag: input.tag, tagTone: input.tagTone,
      payload: input.payload, saved: false, hsk: input.hsk ?? null,
      source: input.source ?? "manual", createdAt: now, updatedAt: now,
    };
    setEntries((list) => [entry, ...list]);
    if (!loggedIn) writeLocalEntries([entry, ...entriesRef.current]);
    else {
      fetch("/api/v1/notebook/entries", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: entry.id, kind: entry.kind, tag: entry.tag, tagTone: entry.tagTone, payload: entry.payload, hsk: entry.hsk, source: entry.source, saved: entry.saved }),
      })
        .then((res) => { if (!res.ok) throw new Error(String(res.status)); })
        .catch(() => toast?.("Chưa đồng bộ được — sẽ thử lại sau"));
    }
    return entry;
  }, [loggedIn, toast]);

  const setSaved = useCallback((id: string, saved: boolean) => {
    setEntries((list) => {
      const next = list.map((e) => (e.id === id ? { ...e, saved, updatedAt: new Date().toISOString() } : e));
      if (!loggedIn) writeLocalEntries(next);
      return next;
    });
    if (loggedIn) {
      fetch(`/api/v1/notebook/entries/${id}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ saved }),
      })
        .then((res) => { if (!res.ok) throw new Error(String(res.status)); })
        .catch(() => toast?.("Chưa đồng bộ được — sẽ thử lại sau"));
    }
  }, [loggedIn, toast]);

  const remove = useCallback((id: string) => {
    setEntries((list) => {
      const next = list.filter((e) => e.id !== id);
      if (!loggedIn) writeLocalEntries(next);
      return next;
    });
    if (loggedIn) {
      fetch(`/api/v1/notebook/entries/${id}`, { method: "DELETE" })
        .then((res) => { if (!res.ok) throw new Error(String(res.status)); })
        .catch(() => toast?.("Chưa đồng bộ được — sẽ thử lại sau"));
    }
  }, [loggedIn, toast]);

  // mount / login: GET server + merge-on-login (Review Focus 3)
  useEffect(() => {
    if (isPending) return;
    if (!loggedIn) { setEntries(readLocalEntries().sort(byNewest)); setReady(true); return; }
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/v1/notebook/entries");
        if (!res.ok) throw new Error(String(res.status));
        const { items } = (await res.json()) as { items: NotebookEntry[] };
        const local = readLocalEntries();
        // Spec §3.5: push local entry khi chưa có trên server HOẶC updatedAt mới hơn server.
        const push = local.filter((l) => {
          const server = items.find((s) => s.id === l.id);
          return !server || new Date(l.updatedAt) > new Date(server.updatedAt);
        });
        await Promise.all(push.map((m) =>
          fetch("/api/v1/notebook/entries", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: m.id, kind: m.kind, tag: m.tag, tagTone: m.tagTone, payload: m.payload, hsk: m.hsk, source: m.source, saved: m.saved }),
          })
          .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r; })
        ));
        // Đã sync hết local (mọi entry local đều có trên server) → clear (Review Focus 3)
        localStorage.removeItem(NOTEBOOK_KEY);
        if (alive) { setEntries([...local.filter((l) => !push.includes(l)), ...items].sort(byNewest)); setReady(true); }
      } catch {
        if (alive) { setEntries(readLocalEntries().sort(byNewest)); setReady(true); toast?.("Chưa đồng bộ được — sẽ thử lại sau"); }
      }
    })();
    return () => { alive = false; };
  }, [loggedIn, isPending, toast]);

  return { entries, ready, create, setSaved, remove };
}
