import type { EntryKind, EntryPayload } from "@/lib/notebook/payload";

export type NotebookEntry = {
  id: string; kind: EntryKind; tag: string; tagTone: "red" | "lav" | "per";
  payload: EntryPayload; saved: boolean; hsk: string | null;
  source: "auto" | "manual"; createdAt: string; updatedAt: string;
};

export const NOTEBOOK_KEY = "bye.notebookEntries";

export function readLocalEntries(): NotebookEntry[] {
  try {
    const raw = localStorage.getItem(NOTEBOOK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NotebookEntry[]) : [];
  } catch {
    return [];
  }
}

export function writeLocalEntries(list: NotebookEntry[]): void {
  try { localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(list)); } catch { /* private mode */ }
}

export function newEntryId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `nb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function notebookStats(list: NotebookEntry[], now: Date = new Date()): {
  total: number; wrongTotal: number; wrongWeek: number; wrongUnfixedWeek: number; fixedPct: number | null;
} {
  const weekAgo = now.getTime() - 7 * 86_400_000;
  const wrong = list.filter((e) => e.kind === "wrong");
  const wrongWeek = wrong.filter((e) => new Date(e.createdAt).getTime() >= weekAgo);
  const savedWrong = wrong.filter((e) => e.saved).length;
  return {
    total: list.length,
    wrongTotal: wrong.length,
    wrongWeek: wrongWeek.length,
    wrongUnfixedWeek: wrongWeek.filter((e) => !e.saved).length,
    fixedPct: wrong.length ? Math.round((savedWrong / wrong.length) * 100) : null,
  };
}
