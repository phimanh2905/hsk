"use client";

/* ProgressStore — LocalStorage-backed progress store (Task 6).
   Keys giữ tương thích với app cũ (clone/js): nhai.xp, nhai.today, nhai.heat,
   nhai.streak, nhai.pageDone, nhai.feedback, nhai.srs.* , nhai.battle.best.*, nhai.roadmap.pinyin.
   Mọi getter bọc try/catch trả mặc định khi JSON hỏng (như clone/js/review.js). */

import { useEffect, useState } from "react";

export type SrsStatus = "new" | "learning" | "learned" | "known";

export type SrsItem = {
  key: string;
  status: SrsStatus;
  dueAt: number | null;
  reviewCount: number;
  lastReviewedAt: number | null;
  updatedAt: number;
};

export type FeedbackEntry = { text: string; at: string };

export type DeckRow = { hanzi: string; pinyin?: string; hanviet?: string; meaning?: string };

export type DeckItem = { id: string; name: string; rows: DeckRow[]; updatedAt: string };

export type NotebookKind = "vocab" | "grammar";

export type VocabBookEntry = { hanzi: string; pinyin: string; vi: string };

export type ProgressSnapshot = { xp: number };

export interface ProgressStoreApi {
  getXp(): number;
  getToday(): number;
  addXp(n: number): void;
  getFeedback(): FeedbackEntry[];
  appendFeedback(entry: FeedbackEntry): void;
  getPageDone(book: string, page: string): boolean;
  markPageDone(book: string, page: string): void;
  listPageDone(book?: string): string[];
  getSrs(key: string): SrsItem | null;
  getAllSrs(): SrsItem[];
  toggleSrs(key: string): boolean;
  addSrsBatch(keys: string[]): number;
  countSrsNew(): number;
  getBattleBest(ctx: string): { correct: number; timeMs: number } | null;
  saveBattleBest(ctx: string, correct: number, timeMs: number): boolean;
  getRoadmapDone(): number[];
  markRoadmapSession(n: number): void;
  getRoadmapLearnSeen(): number[];
  markRoadmapLearnSeen(n: number): void;
  migrateLegacySrs(): void;
  getStreak(): number;
  getHeat(): Record<string, number> | null;
  listDecks(kind: NotebookKind): DeckItem[];
  getDeckItem(kind: NotebookKind, id: string): DeckItem | null;
  createDeck(kind: NotebookKind, name: string): DeckItem;
  renameDeck(kind: NotebookKind, id: string, name: string): void;
  deleteDeck(kind: NotebookKind, id: string): void;
  getVocabBook(): VocabBookEntry[];
  addToVocabBook(entry: VocabBookEntry): boolean;
}

const PROGRESS_EVENT = "nhai:progress";
const SRS_ITEMS_KEY = "nhai.srs.items";
const SRS_NEW_KEY = "nhai.srs.new";
const LEGACY_WORD_RE = /^nhai\.srs\.w\.([a-z0-9-]+)\.(.+)\.(\d+)$/;
const VALID_STATUS: SrsStatus[] = ["new", "learning", "learned", "known"];

/* ---------- helpers (an toàn đọc/ghi) ---------- */

function readNum(key: string, fallback = 0): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? fallback : n;
  } catch {
    return fallback;
  }
}

function writeNum(key: string, n: number): void {
  try {
    localStorage.setItem(key, String(n));
  } catch {
    /* silent */
  }
}

/* Roadmap "đã đọc tab Học" — key riêng khỏi nhai.roadmap.pinyin (buổi đã
   hoàn thành) nhưng CÙNG họ progress → phải nằm trong store để HybridStore
   (SP2) đồng bộ được, không đọc localStorage trực tiếp ở component. */
const ROADMAP_LEARN_SEEN_KEY = "nhai.roadmap.learnSeen";

function readNumArray(key: string): number[] {
  const arr = readJSON<unknown>(key, []);
  return Array.isArray(arr) ? arr.filter((n): n is number => typeof n === "number") : [];
}

function writeNumArray(key: string, arr: number[]): void {
  writeJSON(key, arr);
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* silent */
  }
}

/* Ngày hiện tại theo múi giờ VN (Asia/Ho_Chi_Minh), dạng YYYY-MM-DD. */
function vnDayString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function dayOffset(base: string, deltaDays: number): string {
  const [y, m, d] = base.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

function dispatchProgress(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PROGRESS_EVENT));
  }
}

function newSrsItem(key: string, status: SrsStatus = "new", lastReviewedAt: number | null = null): SrsItem {
  return {
    key,
    status,
    dueAt: Date.now(),
    reviewCount: 0,
    lastReviewedAt,
    updatedAt: Date.now(),
  };
}

function toSrsStatus(v: unknown): SrsStatus | null {
  return VALID_STATUS.includes(v as SrsStatus) ? (v as SrsStatus) : null;
}

export class ProgressStore implements ProgressStoreApi {
  /* ---------- XP / heat / streak / today ---------- */

  getXp(): number {
    return readNum("nhai.xp");
  }

  addXp(n: number): void {
    const xp = this.getXp() + n;
    writeNum("nhai.xp", xp);

    const today = vnDayString();
    const storedDay = localStorage.getItem("nhai.todayDay");
    let todayCount = readNum("nhai.today");
    if (storedDay !== today) todayCount = 0;
    todayCount += n;
    writeNum("nhai.today", todayCount);
    try {
      localStorage.setItem("nhai.todayDay", today);
    } catch {
      /* silent */
    }

    // heat: { "YYYY-MM-DD": xp } — hôm nay cộng vào
    const heat = readJSON<Record<string, number>>("nhai.heat", {});
    heat[today] = (heat[today] || 0) + n;
    writeJSON("nhai.heat", heat);

    // streak: tăng nếu hôm nay liền sau ngày heat gần nhất, reset nếu đứt
    const days = Object.keys(heat).sort();
    const last = days.length >= 2 ? days[days.length - 2] : null;
    const streak = readNum("nhai.streak");
    if (todayCount === n) {
      // lần đầu cộng hôm nay
      if (last === dayOffset(today, -1) || last === today || streak === 0) {
        writeNum("nhai.streak", last === today ? streak : streak + 1);
      } else {
        writeNum("nhai.streak", 1);
      }
    }

    dispatchProgress();
  }

  /* ---------- feedback ---------- */

  getFeedback(): FeedbackEntry[] {
    return readJSON<FeedbackEntry[]>("nhai.feedback", []).filter(
      (e): e is FeedbackEntry => !!e && typeof e === "object" && typeof e.text === "string"
    );
  }

  appendFeedback(entry: FeedbackEntry): void {
    const list = this.getFeedback();
    list.push(entry);
    writeJSON("nhai.feedback", list);
  }

  /* ---------- pageDone ---------- */

  private readPageDone(): Record<string, number> {
    return readJSON<Record<string, number>>("nhai.pageDone", {});
  }

  getPageDone(book: string, page: string): boolean {
    return this.readPageDone()[`${book}/${page}`] === 1;
  }

  markPageDone(book: string, page: string): void {
    const map = this.readPageDone();
    map[`${book}/${page}`] = 1;
    writeJSON("nhai.pageDone", map);
  }

  listPageDone(book?: string): string[] {
    const map = this.readPageDone();
    return Object.keys(map)
      .filter((k) => (book ? k.startsWith(`${book}/`) : true))
      .sort();
  }

  /* ---------- SRS ---------- */

  private readSrsItems(): Record<string, SrsItem> {
    return readJSON<Record<string, SrsItem>>(SRS_ITEMS_KEY, {});
  }

  private writeSrsItems(items: Record<string, SrsItem>): void {
    writeJSON(SRS_ITEMS_KEY, items);
    this.syncSrsNewCounter(items);
  }

  private syncSrsNewCounter(items?: Record<string, SrsItem>): void {
    const map = items || this.readSrsItems();
    const n = Object.values(map).filter((it) => it.status === "new").length;
    writeNum(SRS_NEW_KEY, n);
  }

  getSrs(key: string): SrsItem | null {
    const item = this.readSrsItems()[key];
    return item && typeof item === "object" && typeof item.status === "string" ? item : null;
  }

  /* sp1-personal-tools Task 5 — đọc toàn bộ SRS items cho dashboard /review. */
  getAllSrs(): SrsItem[] {
    try {
      const v = JSON.parse(localStorage.getItem("nhai.srs.items") || "{}");
      return v && typeof v === "object" ? Object.values(v as Record<string, SrsItem>) : [];
    } catch {
      return [];
    }
  }

  toggleSrs(key: string): boolean {
    const items = this.readSrsItems();
    if (items[key]) {
      delete items[key];
      this.writeSrsItems(items);
      return false;
    }
    items[key] = newSrsItem(key);
    this.writeSrsItems(items);
    return true;
  }

  addSrsBatch(keys: string[]): number {
    const items = this.readSrsItems();
    let added = 0;
    for (const key of keys) {
      if (items[key]) continue;
      items[key] = newSrsItem(key);
      added++;
    }
    if (added > 0) this.writeSrsItems(items);
    return added;
  }

  countSrsNew(): number {
    return readNum(SRS_NEW_KEY);
  }

  /* ---------- battle best ---------- */

  getBattleBest(ctx: string): { correct: number; timeMs: number } | null {
    return readJSON<{ correct: number; timeMs: number } | null>(`nhai.battle.best.${ctx}`, null);
  }

  saveBattleBest(ctx: string, correct: number, timeMs: number): boolean {
    const best = this.getBattleBest(ctx);
    const isBetter = !best || correct > best.correct || (correct === best.correct && timeMs < best.timeMs);
    if (isBetter) writeJSON(`nhai.battle.best.${ctx}`, { correct, timeMs });
    return isBetter;
  }

  getToday(): number {
    return readNum("nhai.today", 0);
  }

  /* ---------- roadmap ---------- */

  getRoadmapDone(): number[] {
    const arr = readJSON<number[]>("nhai.roadmap.pinyin", []);
    return Array.isArray(arr) ? arr : [];
  }

  markRoadmapSession(n: number): void {
    const done = this.getRoadmapDone();
    if (!done.includes(n)) {
      done.push(n);
      done.sort((a, b) => a - b);
      writeJSON("nhai.roadmap.pinyin", done);
    }
  }

  getRoadmapLearnSeen(): number[] {
    return readNumArray(ROADMAP_LEARN_SEEN_KEY);
  }

  markRoadmapLearnSeen(n: number): void {
    const seen = new Set(this.getRoadmapLearnSeen());
    if (seen.has(n)) return;
    seen.add(n);
    writeNumArray(ROADMAP_LEARN_SEEN_KEY, [...seen].sort((a, b) => a - b));
    dispatchProgress();
  }

  /* ---------- migration 3 format SRS cũ ---------- */

  migrateLegacySrs(): void {
    const items = this.readSrsItems();

    // Format 1: "nhai.srs.w.<book>.<page>.<i>" = "1" → status "new"
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        const m = LEGACY_WORD_RE.exec(k);
        if (m && localStorage.getItem(k) === "1") {
          const key = `${m[1]}.${m[2]}.${m[3]}`;
          if (!items[key]) items[key] = newSrsItem(key, "new");
        }
      }
    } catch {
      /* silent */
    }

    // Format 2: "nhai.srs.st" = JSON { key → status }
    const stMap = readJSON<Record<string, unknown>>("nhai.srs.st", {});
    if (stMap && typeof stMap === "object") {
      for (const [key, v] of Object.entries(stMap)) {
        const status = toSrsStatus(v);
        if (!status) continue;
        // format có lastReviewedAt (format 3) mới hơn → không đè
        if (items[key]?.lastReviewedAt) continue;
        if (!items[key]) items[key] = newSrsItem(key, status);
        else items[key].status = status;
      }
    }

    // Format 3: "nhai.srs.st.<key>" = status + "nhai.srs.t.<key>" = epoch ms → có lastReviewedAt
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith("nhai.srs.st.")) continue;
        const key = k.slice("nhai.srs.st.".length);
        const status = toSrsStatus(localStorage.getItem(k));
        if (!status) continue;
        const tRaw = localStorage.getItem(`nhai.srs.t.${key}`);
        const lastReviewedAt = tRaw ? parseInt(tRaw, 10) : NaN;
        const item: SrsItem = items[key] || newSrsItem(key, status);
        item.status = status;
        if (!Number.isNaN(lastReviewedAt)) item.lastReviewedAt = lastReviewedAt;
        items[key] = item;
      }
    } catch {
      /* silent */
    }

    this.writeSrsItems(items);
  }

  /* ---------- streak (sp1-personal-tools Task 1) ---------- */

  getStreak(): number {
    return readNum("nhai.streak");
  }

  /* sp1-personal-tools Task 6 — heat map cho /progress: JSON parse nhai.heat, hỏng → null. */
  getHeat(): Record<string, number> | null {
    try {
      const raw = localStorage.getItem("nhai.heat");
      if (!raw) return null;
      const v = JSON.parse(raw) as Record<string, number>;
      return v && typeof v === "object" ? v : null;
    } catch {
      return null;
    }
  }

  /* ---------- decks CRUD — shape mảng [{ id, name, rows, updatedAt }] của clone ---------- */

  private deckKey(kind: NotebookKind): string {
    return kind === "grammar" ? "nhai.notebooks" : "nhai.decks";
  }

  listDecks(kind: NotebookKind): DeckItem[] {
    const v = readJSON<DeckItem[] | null>(this.deckKey(kind), null);
    return Array.isArray(v) ? v : [];
  }

  getDeckItem(kind: NotebookKind, id: string): DeckItem | null {
    return this.listDecks(kind).find((d) => d.id === id) ?? null;
  }

  createDeck(kind: NotebookKind, name: string): DeckItem {
    const item: DeckItem = {
      id: "nb-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      name,
      rows: [],
      updatedAt: new Date().toISOString(),
    };
    this.saveDecks(kind, [item, ...this.listDecks(kind)]);
    dispatchProgress();
    return item;
  }

  renameDeck(kind: NotebookKind, id: string, name: string): void {
    this.saveDecks(
      kind,
      this.listDecks(kind).map((d) => (d.id === id ? { ...d, name, updatedAt: new Date().toISOString() } : d))
    );
    dispatchProgress();
  }

  deleteDeck(kind: NotebookKind, id: string): void {
    this.saveDecks(kind, this.listDecks(kind).filter((d) => d.id !== id));
    dispatchProgress();
  }

  private saveDecks(kind: NotebookKind, items: DeckItem[]): void {
    writeJSON(this.deckKey(kind), items);
  }

  /* ---------- vocabBook (nhai.vocabBook) ---------- */

  getVocabBook(): VocabBookEntry[] {
    const v = readJSON<VocabBookEntry[] | null>("nhai.vocabBook", null);
    return Array.isArray(v) ? v : [];
  }

  addToVocabBook(entry: VocabBookEntry): boolean {
    if (this.getVocabBook().some((v) => v.hanzi === entry.hanzi)) return false;
    writeJSON("nhai.vocabBook", [...this.getVocabBook(), entry]);
    dispatchProgress();
    return true;
  }
}

/* ---------- singleton + React hook ---------- */

export const progressStore: ProgressStoreApi = new ProgressStore();

export function useProgress(): ProgressSnapshot {
  const [xp, setXp] = useState(progressStore.getXp());
  useEffect(() => {
    const sync = () => setXp(progressStore.getXp());
    window.addEventListener(PROGRESS_EVENT, sync);
    return () => window.removeEventListener(PROGRESS_EVENT, sync);
  }, []);
  return { xp };
}
