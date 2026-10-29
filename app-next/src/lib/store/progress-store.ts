"use client";

/* ProgressStore — LocalStorage-backed progress store (Task 6).
   Keys giữ tương thích với app cũ (clone/js): bye.xp, bye.today, bye.heat,
   bye.streak, bye.pageDone, bye.feedback, bye.srs.* , bye.battle.best.*, bye.roadmap.pinyin.
   Mọi getter bọc try/catch trả mặc định khi JSON hỏng (như clone/js/review.js). */

import { useEffect, useState } from "react";

import { applyGrade, INIT_EASE } from "@/lib/stats/review";

/* Nguồn sự thật của SrsItem/SrsStatus/Grade là lib/stats/review (W5.1) —
   progress-store chỉ re-export để caller cũ không đổi import. */
export type { SrsItem, SrsStatus, Grade } from "@/lib/stats/review";
import type { SrsItem, SrsStatus, Grade } from "@/lib/stats/review";

/* Review log (W5.1) — key bye.review.logs, cap 2000 entry (cũ nhất bị cắt). */
export type ReviewLog = {
  cardType: "vocab" | "grammar";
  itemKey: string;
  rating: 1 | 2 | 3 | 4; // 1 Again · 2 Hard · 3 Good · 4 Easy
  durationMs: number;
  reviewedAt: number;
};

export type FeedbackEntry = { text: string; at: string };

export type DeckRow = { hanzi: string; pinyin?: string; hanviet?: string; meaning?: string };

export type DeckItem = { id: string; name: string; rows: DeckRow[]; updatedAt: string };

export type NotebookKind = "vocab" | "grammar";

export type VocabBookEntry = { hanzi: string; pinyin: string; vi: string };

export type GrammarMeta = { saved?: 1 };

/* Meta theo từng Hán tự (Sổ tay từ vựng — spec 2026-10-05 §2.2), key bye.wordMeta */
export type WordMeta = { star?: 1; note?: string };

/* Kết quả luyện viết 1 Hán tự (Wave 0 W0.2 — Hanzi Studio draw quiz), key bye.hanzi.quiz */
export type HanziQuizRec = {
  attempts: number; // tổng số lần hoàn thành quiz
  best: number;     // điểm tốt nhất 0-100 (% nét đúng); Wave 0 caller chưa truyền score → best 0
  last: number;     // epoch ms lần hoàn thành gần nhất
};

/* Bản nháp bài đọc (Wave 0 W0.4 — /reading auto-save), key bye.reading.drafts */
export type ReadingDraft = { text: string; at: string };

/* Kết quả quiz bài đọc (spec 2026-10-30 §4.4), key nhai.reading.progress:
   Record<readingId, {correct, total, attempts, completedAt}> — correct giữ max. */
export type ReadingProgressRec = { correct: number; total: number; attempts: number; completedAt: string };

/* Stats chép chính tả per video/line (Task 2), key bye.shadowing.dictStats.<videoId> */
export type DictLineStat = { lastScore: number; errors: number; replays: number };
export type DictStats = Record<string, DictLineStat>;

export type ProgressSnapshot = { xp: number };

export type StationProgress = { pct: number; stars: 0 | 1 | 2 | 3 };

/* Cổng đầu vào (Roadmap Journey v2) — kết quả kiểm tra tốt nhất per gate id,
   key bye.roadmap.gates.v1: Record<gateId, { pct, at }> */
export type RoadmapGateRec = { pct: number; at: number };

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
  recordReview(key: string, grade: Grade, now?: number, durationMs?: number): SrsItem | null;
  appendReviewLog(entry: ReviewLog): void;
  getReviewLogs(): ReviewLog[];
  addCorrect(n: number): void;
  getHeatCorrect(): Record<string, number>;
  countSrsNew(): number;
  getBattleBest(ctx: string): { correct: number; timeMs: number } | null;
  saveBattleBest(ctx: string, correct: number, timeMs: number): boolean;
  getPinyinLabBest(): number;
  recordPinyinLabResult(correct: number): void;
  getRoadmapDone(): number[];
  markRoadmapSession(n: number): void;
  getRoadmapLearnSeen(): number[];
  markRoadmapLearnSeen(n: number): void;
  getStationProgress(levelId: string): Record<string, StationProgress>;
  setStationProgress(levelId: string, stationId: string, rec: StationProgress): void;
  getRoadmapGate(id: string): RoadmapGateRec | null;
  setRoadmapGate(id: string, pct: number): void;
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
  getGrammarMeta(): Record<string, GrammarMeta>;
  toggleGrammarSaved(id: string): boolean;
  getWordMeta(): Record<string, WordMeta>;
  toggleWordStar(hanzi: string): boolean;
  setWordNote(hanzi: string, note: string): void;
  getHanziQuiz(ch: string): HanziQuizRec | null;
  listHanziQuiz(): Record<string, HanziQuizRec>;
  recordHanziQuiz(ch: string, score?: number): void;
  getSoundRulesBest(): number;
  recordSoundRulesResult(correct: number): void;
  getReadingDrafts(): ReadingDraft[];
  saveReadingDraft(text: string): void;
  getReadingProgress(): Record<string, ReadingProgressRec>;
  saveReadingProgress(id: string, correct: number, total: number): ReadingProgressRec;
  getDictStats(videoId: string): DictStats;
  recordDictCheck(videoId: string, lineN: number, score: number, errors: number): void;
  recordReplay(videoId: string, lineN: number): void;
}

const PROGRESS_EVENT = "bye:progress";
const SRS_ITEMS_KEY = "bye.srs.items";
const SRS_NEW_KEY = "bye.srs.new";
const REVIEW_LOGS_KEY = "bye.review.logs";
const HEAT_CORRECT_KEY = "bye.heat.correct";
const REVIEW_LOGS_CAP = 2000;
const LEGACY_WORD_RE = /^bye\.srs\.w\.([a-z0-9-]+)\.(.+)\.(\d+)$/;
/* Status parse cho migration: gồm cả giá trị cũ (learned/known) — chuẩn hóa sang
   format 4 diễn ra trong readSrsItems qua normalizeSrsItem. */
const RAW_STATUS: readonly string[] = ["new", "learning", "learned", "known", "review", "relearning"];
/* Mapping status cũ → format 4: learned = ôn vừa (7 ngày), known = ôn lâu (21 ngày). */
const LEGACY_STATUS_INTERVAL: Partial<Record<string, { status: SrsStatus; intervalDays: number }>> = {
  learned: { status: "review", intervalDays: 7 },
  known: { status: "review", intervalDays: 21 },
};

/* Migration format 4 (W5.1) — hàm thuần: item thiếu ease/intervalDays/lapses hoặc
   status cũ → chuẩn hóa; trả { item, changed } để caller chỉ ghi lại khi có đổi. */
export function normalizeSrsItem(it: SrsItem): { item: SrsItem; changed: boolean } {
  const statusRaw = typeof it.status === "string" ? it.status : "";
  const legacy = LEGACY_STATUS_INTERVAL[statusRaw];
  const status: SrsStatus = legacy ? legacy.status : (RAW_STATUS.includes(statusRaw) ? (statusRaw as SrsStatus) : "new");
  const mappedInterval = legacy ? legacy.intervalDays : null;
  const ease = typeof it.ease === "number" && Number.isFinite(it.ease) ? it.ease : INIT_EASE;
  const intervalDays =
    mappedInterval != null ? mappedInterval
    : typeof it.intervalDays === "number" && Number.isFinite(it.intervalDays) ? it.intervalDays
    : 0;
  const lapses = typeof it.lapses === "number" && Number.isFinite(it.lapses) ? it.lapses : 0;
  const item: SrsItem = { ...it, status, ease, intervalDays, lapses };
  const changed =
    item.status !== it.status || item.ease !== it.ease || item.intervalDays !== it.intervalDays || item.lapses !== it.lapses;
  return { item, changed };
}

/* cardType heuristic cho review log (UPG-2): key có shape <book>.<page>.<i>
   (regex như itemKeyKind) là vocab, trừ deck/notebook; còn lại grammar. */
function cardTypeFromKey(key: string): "vocab" | "grammar" {
  const m = /^([^.]+)\.([^.]+)\.\d+$/.exec(key);
  if (!m || m[1] === "deck" || m[1] === "nb") return "grammar";
  return "vocab";
}

const RATING_BY_GRADE: Record<Grade, 1 | 2 | 3 | 4> = { again: 1, hard: 2, good: 3, easy: 4 };

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

/* Roadmap "đã đọc tab Học" — key riêng khỏi bye.roadmap.pinyin (buổi đã
   hoàn thành) nhưng CÙNG họ progress → phải nằm trong store để HybridStore
   (SP2) đồng bộ được, không đọc localStorage trực tiếp ở component. */
const ROADMAP_LEARN_SEEN_KEY = "bye.roadmap.learnSeen";

/* Lộ trình serpentine (spec 2026-10-04): Record<levelId, Record<stationId, {pct, stars}>> */
const ROADMAP_STATIONS_KEY = "bye.roadmap.stations.v1";

/* Cổng đầu vào HSK (Roadmap Journey v2): Record<gateId, { pct, at }> — best-of theo pct */
const ROADMAP_GATES_KEY = "bye.roadmap.gates.v1";

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
    ease: INIT_EASE,
    intervalDays: 0,
    lapses: 0,
  };
}

function toSrsStatus(v: unknown): SrsStatus | null {
  return RAW_STATUS.includes(v as string) ? (v as SrsStatus) : null;
}

export class ProgressStore implements ProgressStoreApi {
  /* ---------- XP / heat / streak / today ---------- */

  getXp(): number {
    return readNum("bye.xp");
  }

  addXp(n: number): void {
    const xp = this.getXp() + n;
    writeNum("bye.xp", xp);

    const today = vnDayString();
    const storedDay = localStorage.getItem("bye.todayDay");
    let todayCount = readNum("bye.today");
    if (storedDay !== today) todayCount = 0;
    todayCount += n;
    writeNum("bye.today", todayCount);
    try {
      localStorage.setItem("bye.todayDay", today);
    } catch {
      /* silent */
    }

    // heat: { "YYYY-MM-DD": xp } — hôm nay cộng vào
    const heat = readJSON<Record<string, number>>("bye.heat", {});
    heat[today] = (heat[today] || 0) + n;
    writeJSON("bye.heat", heat);

    // streak: tăng nếu hôm nay liền sau ngày heat gần nhất, reset nếu đứt
    const days = Object.keys(heat).sort();
    const last = days.length >= 2 ? days[days.length - 2] : null;
    const streak = readNum("bye.streak");
    if (todayCount === n) {
      // lần đầu cộng hôm nay
      if (last === dayOffset(today, -1) || last === today || streak === 0) {
        writeNum("bye.streak", last === today ? streak : streak + 1);
      } else {
        writeNum("bye.streak", 1);
      }
    }

    dispatchProgress();
  }

  /* ---------- feedback ---------- */

  getFeedback(): FeedbackEntry[] {
    return readJSON<FeedbackEntry[]>("bye.feedback", []).filter(
      (e): e is FeedbackEntry => !!e && typeof e === "object" && typeof e.text === "string"
    );
  }

  appendFeedback(entry: FeedbackEntry): void {
    const list = this.getFeedback();
    list.push(entry);
    writeJSON("bye.feedback", list);
  }

  /* ---------- pageDone ---------- */

  private readPageDone(): Record<string, number> {
    return readJSON<Record<string, number>>("bye.pageDone", {});
  }

  getPageDone(book: string, page: string): boolean {
    return this.readPageDone()[`${book}/${page}`] === 1;
  }

  markPageDone(book: string, page: string): void {
    const map = this.readPageDone();
    map[`${book}/${page}`] = 1;
    writeJSON("bye.pageDone", map);
  }

  listPageDone(book?: string): string[] {
    const map = this.readPageDone();
    return Object.keys(map)
      .filter((k) => (book ? k.startsWith(`${book}/`) : true))
      .sort();
  }

  /* ---------- SRS ---------- */

  private readSrsItems(): Record<string, SrsItem> {
    const raw = readJSON<Record<string, SrsItem>>(SRS_ITEMS_KEY, {});
    if (!raw || typeof raw !== "object") return {};
    // Migration format 4 (W5.1): chuẩn hóa từng item, ghi lại khi có thay đổi (idempotent)
    let changed = false;
    const out: Record<string, SrsItem> = {};
    for (const [key, it] of Object.entries(raw)) {
      if (!it || typeof it !== "object") {
        changed = true;
        continue;
      }
      const { item, changed: c } = normalizeSrsItem(it as SrsItem);
      if (c) changed = true;
      out[key] = item;
    }
    if (changed) {
      writeJSON(SRS_ITEMS_KEY, out);
      this.syncSrsNewCounter(out);
    }
    return out;
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

  /* sp1-personal-tools Task 5 — đọc toàn bộ SRS items cho dashboard /review.
     Đi qua readSrsItems để được chuẩn hóa format 4 như mọi đường đọc khác. */
  getAllSrs(): SrsItem[] {
    try {
      return Object.values(this.readSrsItems());
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

  /* Review redesign §2.2 + W5.1 SM-2 — ghi grade ôn tập: SM-2 item + review log
     (+ correct counter khi good/easy). Key lạ → null, không ghi gì. */
  recordReview(key: string, grade: Grade, now: number = Date.now(), durationMs: number = 0): SrsItem | null {
    const items = this.readSrsItems();
    const cur = items[key];
    if (!cur) return null;
    items[key] = applyGrade(cur, grade, now);
    this.writeSrsItems(items);
    this.appendReviewLog({
      cardType: cardTypeFromKey(key),
      itemKey: key,
      rating: RATING_BY_GRADE[grade],
      durationMs,
      reviewedAt: now,
    });
    if (grade === "good" || grade === "easy") this.addCorrect(1); // addCorrect tự bắn bye:progress
    else dispatchProgress();
    return items[key];
  }

  /* ---------- review log + correct counter (W5.1) ---------- */

  getReviewLogs(): ReviewLog[] {
    const v = readJSON<ReviewLog[]>(REVIEW_LOGS_KEY, []);
    if (!Array.isArray(v)) return [];
    return v.filter(
      (l): l is ReviewLog =>
        !!l && typeof l === "object" && typeof l.itemKey === "string" && typeof l.reviewedAt === "number"
    );
  }

  appendReviewLog(entry: ReviewLog): void {
    const logs = this.getReviewLogs();
    logs.push(entry);
    writeJSON(REVIEW_LOGS_KEY, logs.slice(-REVIEW_LOGS_CAP));
  }

  addCorrect(n: number): void {
    const map = this.getHeatCorrect();
    const day = vnDayString();
    map[day] = (map[day] || 0) + n;
    writeJSON(HEAT_CORRECT_KEY, map);
    dispatchProgress();
  }

  getHeatCorrect(): Record<string, number> {
    const v = readJSON<Record<string, number>>(HEAT_CORRECT_KEY, {});
    return v && typeof v === "object" ? v : {};
  }

  countSrsNew(): number {
    return readNum(SRS_NEW_KEY);
  }

  /* ---------- battle best ---------- */

  getBattleBest(ctx: string): { correct: number; timeMs: number } | null {
    return readJSON<{ correct: number; timeMs: number } | null>(`bye.battle.best.${ctx}`, null);
  }

  saveBattleBest(ctx: string, correct: number, timeMs: number): boolean {
    const best = this.getBattleBest(ctx);
    const isBetter = !best || correct > best.correct || (correct === best.correct && timeMs < best.timeMs);
    if (isBetter) writeJSON(`bye.battle.best.${ctx}`, { correct, timeMs });
    return isBetter;
  }

  getToday(): number {
    return readNum("bye.today", 0);
  }

  /* ---------- Pinyin Lab (spec 2026-10-05 §7) ---------- */

  getPinyinLabBest(): number {
    return readNum("bye.pinyin.lab.best");
  }

  recordPinyinLabResult(correct: number): void {
    if (correct <= this.getPinyinLabBest()) return;
    writeNum("bye.pinyin.lab.best", correct);
    dispatchProgress();
  }

  /* ---------- roadmap ---------- */

  getRoadmapDone(): number[] {
    const arr = readJSON<number[]>("bye.roadmap.pinyin", []);
    return Array.isArray(arr) ? arr : [];
  }

  markRoadmapSession(n: number): void {
    const done = this.getRoadmapDone();
    if (!done.includes(n)) {
      done.push(n);
      done.sort((a, b) => a - b);
      writeJSON("bye.roadmap.pinyin", done);
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

  getStationProgress(levelId: string): Record<string, StationProgress> {
    try {
      const all = readJSON<Record<string, Record<string, StationProgress>>>(ROADMAP_STATIONS_KEY, {});
      return all[levelId] ?? {};
    } catch {
      return {};
    }
  }

  setStationProgress(levelId: string, stationId: string, rec: StationProgress): void {
    try {
      const all = readJSON<Record<string, Record<string, StationProgress>>>(ROADMAP_STATIONS_KEY, {});
      all[levelId] = { ...all[levelId], [stationId]: rec };
      writeJSON(ROADMAP_STATIONS_KEY, all);
      window.dispatchEvent(new CustomEvent(PROGRESS_EVENT));
    } catch {
      /* silent */
    }
  }

  /* ---------- gates (bye.roadmap.gates.v1 — Roadmap Journey v2, best-of theo pct) ---------- */

  getRoadmapGate(id: string): RoadmapGateRec | null {
    try {
      const all = readJSON<Record<string, RoadmapGateRec>>(ROADMAP_GATES_KEY, {});
      const rec = all[id];
      return rec && typeof rec === "object" && typeof rec.pct === "number" && typeof rec.at === "number" ? rec : null;
    } catch {
      return null;
    }
  }

  setRoadmapGate(id: string, pct: number): void {
    if (!id || typeof pct !== "number" || !Number.isFinite(pct)) return;
    try {
      const all = readJSON<Record<string, RoadmapGateRec>>(ROADMAP_GATES_KEY, {});
      const cur = all[id];
      if (cur && typeof cur.pct === "number" && pct <= cur.pct) return; // best-of — không hạ
      all[id] = { pct, at: Date.now() };
      writeJSON(ROADMAP_GATES_KEY, all);
      window.dispatchEvent(new CustomEvent(PROGRESS_EVENT));
    } catch {
      /* silent */
    }
  }

  /* ---------- migration 3 format SRS cũ ---------- */

  migrateLegacySrs(): void {
    const items = this.readSrsItems();

    // Format 1: "bye.srs.w.<book>.<page>.<i>" = "1" → status "new"
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

    // Format 2: "bye.srs.st" = JSON { key → status }
    const stMap = readJSON<Record<string, unknown>>("bye.srs.st", {});
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

    // Format 3: "bye.srs.st.<key>" = status + "bye.srs.t.<key>" = epoch ms → có lastReviewedAt
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith("bye.srs.st.")) continue;
        const key = k.slice("bye.srs.st.".length);
        const status = toSrsStatus(localStorage.getItem(k));
        if (!status) continue;
        const tRaw = localStorage.getItem(`bye.srs.t.${key}`);
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
    return readNum("bye.streak");
  }

  /* sp1-personal-tools Task 6 — heat map cho /progress: JSON parse bye.heat, hỏng → null. */
  getHeat(): Record<string, number> | null {
    try {
      const raw = localStorage.getItem("bye.heat");
      if (!raw) return null;
      const v = JSON.parse(raw) as Record<string, number>;
      return v && typeof v === "object" ? v : null;
    } catch {
      return null;
    }
  }

  /* ---------- decks CRUD — shape mảng [{ id, name, rows, updatedAt }] của clone ---------- */

  private deckKey(kind: NotebookKind): string {
    return kind === "grammar" ? "bye.notebooks" : "bye.decks";
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

  /* ---------- vocabBook (bye.vocabBook) ---------- */

  getVocabBook(): VocabBookEntry[] {
    const v = readJSON<VocabBookEntry[] | null>("bye.vocabBook", null);
    return Array.isArray(v) ? v : [];
  }

  addToVocabBook(entry: VocabBookEntry): boolean {
    if (this.getVocabBook().some((v) => v.hanzi === entry.hanzi)) return false;
    writeJSON("bye.vocabBook", [...this.getVocabBook(), entry]);
    dispatchProgress();
    return true;
  }

  /* ---------- grammar meta (bye.grammarMeta — spec 2026-10-05 §2.2) ---------- */

  getGrammarMeta(): Record<string, GrammarMeta> {
    return readJSON<Record<string, GrammarMeta>>("bye.grammarMeta", {});
  }

  toggleGrammarSaved(id: string): boolean {
    const all = this.getGrammarMeta();
    const saved = all[id]?.saved ? undefined : (1 as const);
    const next: GrammarMeta = { saved };
    if (!saved) delete all[id];
    else all[id] = next;
    writeJSON("bye.grammarMeta", all);
    dispatchProgress();
    return !!saved;
  }

  /* ---------- word meta (bye.wordMeta — spec 2026-10-05 §2.2) ---------- */

  getWordMeta(): Record<string, WordMeta> {
    return readJSON<Record<string, WordMeta>>("bye.wordMeta", {});
  }

  toggleWordStar(hanzi: string): boolean {
    const all = this.getWordMeta();
    const cur = all[hanzi] ?? {};
    const star: 1 | undefined = cur.star ? undefined : 1;
    const next: WordMeta = { ...cur, star };
    if (!next.star && !next.note) delete all[hanzi];
    else all[hanzi] = next;
    writeJSON("bye.wordMeta", all);
    dispatchProgress();
    return !!star;
  }

  setWordNote(hanzi: string, note: string): void {
    const all = this.getWordMeta();
    const cur = all[hanzi] ?? {};
    const trimmed = note.trim() ? note.trim() : undefined;
    const next: WordMeta = { ...cur, note: trimmed };
    if (!next.star && !next.note) delete all[hanzi];
    else all[hanzi] = next;
    writeJSON("bye.wordMeta", all);
    dispatchProgress();
  }

  /* ---------- hanzi quiz (bye.hanzi.quiz — Wave 0 W0.2) ---------- */

  private readHanziQuiz(): Record<string, HanziQuizRec> {
    const v = readJSON<Record<string, HanziQuizRec>>("bye.hanzi.quiz", {});
    return v && typeof v === "object" ? v : {};
  }

  getHanziQuiz(ch: string): HanziQuizRec | null {
    const rec = this.readHanziQuiz()[ch];
    return rec && typeof rec === "object" && typeof rec.attempts === "number" ? rec : null;
  }

  listHanziQuiz(): Record<string, HanziQuizRec> {
    return this.readHanziQuiz();
  }

  recordHanziQuiz(ch: string, score?: number): void {
    if (!ch) return;
    const all = this.readHanziQuiz();
    const cur = all[ch];
    all[ch] = {
      attempts: (typeof cur?.attempts === "number" ? cur.attempts : 0) + 1,
      best: Math.max(typeof cur?.best === "number" ? cur.best : 0, typeof score === "number" && score >= 0 ? score : 0),
      last: Date.now(),
    };
    writeJSON("bye.hanzi.quiz", all);
    dispatchProgress();
  }

  /* ---------- sound rules best (bye.soundrules.best — Wave 0 W0.3) ---------- */

  getSoundRulesBest(): number {
    return readNum("bye.soundrules.best");
  }

  recordSoundRulesResult(correct: number): void {
    if (correct <= this.getSoundRulesBest()) return;
    writeNum("bye.soundrules.best", correct);
    dispatchProgress();
  }

  /* ---------- reading drafts (bye.reading.drafts — Wave 0 W0.4) ---------- */

  getReadingDrafts(): ReadingDraft[] {
    const v = readJSON<ReadingDraft[]>("bye.reading.drafts", []);
    if (!Array.isArray(v)) return [];
    return v.filter(
      (d): d is ReadingDraft => !!d && typeof d === "object" && typeof d.text === "string" && typeof d.at === "string"
    );
  }

  saveReadingDraft(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    const drafts = this.getReadingDrafts();
    if (drafts[0]?.text === trimmed) return; // dán lại đúng bài gần nhất — không nhân bản
    drafts.unshift({ text: trimmed, at: new Date().toISOString() });
    writeJSON("bye.reading.drafts", drafts.slice(0, 5));
    dispatchProgress();
  }

  /* ---------- reading quiz progress (nhai.reading.progress — spec 2026-10-30 §4.4) ---------- */

  getReadingProgress(): Record<string, ReadingProgressRec> {
    const v = readJSON<Record<string, ReadingProgressRec>>("nhai.reading.progress", {});
    if (!v || typeof v !== "object") return {};
    const out: Record<string, ReadingProgressRec> = {};
    for (const [id, rec] of Object.entries(v)) {
      if (
        rec &&
        typeof rec === "object" &&
        typeof rec.correct === "number" &&
        typeof rec.total === "number" &&
        typeof rec.attempts === "number" &&
        typeof rec.completedAt === "string"
      ) {
        out[id] = rec;
      }
    }
    return out;
  }

  saveReadingProgress(id: string, correct: number, total: number): ReadingProgressRec {
    const all = this.getReadingProgress();
    const cur = all[id];
    const rec: ReadingProgressRec = {
      correct: Math.max(typeof cur?.correct === "number" ? cur.correct : 0, correct),
      total,
      attempts: (typeof cur?.attempts === "number" ? cur.attempts : 0) + 1,
      completedAt: new Date().toISOString(),
    };
    all[id] = rec;
    writeJSON("nhai.reading.progress", all);
    dispatchProgress();
    return rec;
  }

  /* ---------- dictation stats (bye.shadowing.dictStats.<videoId> — Task 2) ---------- */

  getDictStats(videoId: string): DictStats {
    return readJSON<DictStats>(`bye.shadowing.dictStats.${videoId}`, {});
  }

  recordDictCheck(videoId: string, lineN: number, score: number, errors: number): void {
    const key = String(lineN);
    const all = this.getDictStats(videoId);
    const prev = all[key] ?? { lastScore: 0, errors: 0, replays: 0 };
    all[key] = { lastScore: score, errors: prev.errors + errors, replays: prev.replays };
    writeJSON(`bye.shadowing.dictStats.${videoId}`, all);
  }

  recordReplay(videoId: string, lineN: number): void {
    const key = String(lineN);
    const all = this.getDictStats(videoId);
    const prev = all[key] ?? { lastScore: 0, errors: 0, replays: 0 };
    all[key] = { ...prev, replays: prev.replays + 1 };
    writeJSON(`bye.shadowing.dictStats.${videoId}`, all);
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
