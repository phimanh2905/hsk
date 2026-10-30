"use client";

/* HybridStore — bọc ProgressStore (spec 2026-10-24 Wave 4). localStorage-first:
   mọi ghi vẫn vào ProgressStore ngay; module này patch các method mutate trên
   singleton progressStore (own-property shadow prototype) để đánh dirty + debounce
   5s POST /api/v1/sync. Guest thuần local (dirty tích tụ, không fetch). Login lần
   đầu: merge-push 2 chiều. Response merge ngược bằng luật sync-merge (số max,
   timestamp theo updatedAt, tombstone deleted_at). */

import {
  mergeLesson,
  mergeReadingDrafts,
  mergeReadingProgress,
  mergeReviewLogs,
  mergeSrs,
  mergeStudyDay,
  type SyncDraftRecord,
  type SyncLessonRecord,
  type SyncPayload,
  type SyncReadingRecord,
  type SyncReviewLogRecord,
  type SyncSrsRecord,
  type SyncStudyDayRecord,
} from "./sync-merge";
import { isMature } from "@/lib/stats/review";
import { isSavedReadingDraft, normalizeSrsItem, progressStore, type SavedReadingDraft, type SrsItem } from "./progress-store";

export type SyncDomain = "srs" | "studyDay" | "lessonProgress" | "reviewLogs" | "readingProgress" | "readingDrafts";

const DIRTY_KEY = "bye.sync.dirty";
const TOMBSTONE_KEY = "bye.sync.tombstones";
const DEBOUNCE_MS = 5000;
const TOMBSTONE_TTL_MS = 90 * 24 * 3600 * 1000;
const REVIEW_LOGS_KEY = "bye.review.logs";
const HEAT_CORRECT_KEY = "bye.heat.correct";
const REVIEW_LOGS_BATCH = 1000; // cap server 1000/batch (zod max)
const LOGSENT_KEY = "bye.sync.logsent"; // con trỏ: max reviewedAt đã POST thành công

const SRS_ITEMS_KEY = "bye.srs.items";
const HEAT_KEY = "bye.heat";
const PAGE_DONE_KEY = "bye.pageDone";
const STATIONS_KEY = "bye.roadmap.stations.v1";
const READING_PROGRESS_KEY = "nhai.reading.progress";
const READING_DRAFTS2_KEY = "nhai.reading.drafts2";

/* Method → domain: chỉ những method ghi data thuộc 4 bảng sync. setWordNote/
   toggleWordStar... nằm ngoài phạm vi (wordMeta chưa có bảng) — KHÔNG patch. */
const PATCHES: Array<[keyof typeof progressStore, SyncDomain[]]> = [
  ["toggleSrs", ["srs"]],
  ["addSrsBatch", ["srs"]],
  ["recordReview", ["srs", "studyDay", "reviewLogs"]], // SM-2 item + correct counter + review log
  ["migrateLegacySrs", ["srs"]],
  ["addXp", ["studyDay"]],
  ["markPageDone", ["lessonProgress"]],
  ["setStationProgress", ["lessonProgress"]],
  ["saveReadingProgress", ["readingProgress"]],
  ["upsertReadingDraft", ["readingDrafts"]],
  ["removeReadingDraft", ["readingDrafts"]], // tombstone nằm trên record — không cần recordTombstone riêng
];

let inited = false;
let loggedIn = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const dirty = new Set<SyncDomain>();
/* Version của từng domain: tăng mỗi lần domain bị đánh dirty. Dùng để phát hiện
   "domain bị mutate TRONG LÚC POST đang bay" — khi đó payload snapshot cũ KHÔNG
   chứa thay đổi mới, nên KHÔNG được clear dirty (nếu clear → mất dữ liệu vĩnh viễn:
   ví dụ grade xảy ra trong lúc merge-push login đang bay → srs bị xóa khỏi dirty
   → item có reviewCount mới không bao giờ được gửi lên server). */
const dirtyVersion: Record<SyncDomain, number> = {
  srs: 0,
  studyDay: 0,
  lessonProgress: 0,
  reviewLogs: 0,
  readingProgress: 0,
  readingDrafts: 0,
};
let dirtySeq = 0;

type Tombstones = {
  srs: Record<string, number>;
  lessonProgress: Record<string, number>;
  readingDrafts: Record<string, number>;
};

/* ---------- helpers (copy pattern progress-store) ---------- */

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

function readTombstones(): Tombstones {
  const raw = readJSON<Partial<Tombstones>>(TOMBSTONE_KEY, {});
  const cutoff = Date.now() - TOMBSTONE_TTL_MS;
  const out: Tombstones = { srs: {}, lessonProgress: {}, readingDrafts: {} };
  for (const domain of ["srs", "lessonProgress", "readingDrafts"] as const) {
    const map = raw[domain];
    if (!map || typeof map !== "object") continue;
    for (const [k, at] of Object.entries(map)) {
      if (typeof at !== "number") continue;
      if (at < cutoff) continue; // tombstone quá 90 ngày — bỏ
      out[domain][k] = at;
    }
  }
  return out;
}

function recordTombstone(domain: "srs" | "lessonProgress" | "readingDrafts", key: string): void {
  const tombs = readTombstones();
  tombs[domain][key] = Date.now();
  writeJSON(TOMBSTONE_KEY, tombs);
}

function clearTombstone(domain: "srs" | "lessonProgress" | "readingDrafts", key: string): void {
  const tombs = readTombstones();
  if (!(key in tombs[domain])) return;
  delete tombs[domain][key];
  writeJSON(TOMBSTONE_KEY, tombs);
}

/* Đọc raw drafts (bao gồm tombstone — record tự mang deletedAt) vì
   progressStore.getReadingDrafts() lọc tombstone. */
function readLocalReadingDrafts(): SavedReadingDraft[] {
  const v = readJSON<unknown>(READING_DRAFTS2_KEY, []);
  return Array.isArray(v) ? v.filter(isSavedReadingDraft) : [];
}

function readLastSentLogAt(): number {  const v = readJSON<number>(LOGSENT_KEY, 0);
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
}

function writeLastSentLogAt(at: number): void {
  writeJSON(LOGSENT_KEY, at);
}

function persistDirty(): void {
  const obj: Partial<Record<SyncDomain, 1>> = {};
  for (const d of dirty) obj[d] = 1;
  writeJSON(DIRTY_KEY, obj);
}

function restoreDirty(): void {
  const obj = readJSON<Partial<Record<SyncDomain, 1>>>(DIRTY_KEY, {});
  for (const d of ["srs", "studyDay", "lessonProgress", "reviewLogs", "readingProgress", "readingDrafts"] as const) {
    if (obj[d]) {
      dirty.add(d);
      dirtyVersion[d] = ++dirtySeq; // version mới → flush đang bay không xóa nhầm
    }
  }
}

/** Đánh dirty + tăng version (không schedule) — dùng khi cần giữ cờ qua flush đang bay. */
function bumpDirty(d: SyncDomain): void {
  dirty.add(d);
  dirtyVersion[d] = ++dirtySeq;
}

function markDirty(d: SyncDomain): void {
  bumpDirty(d);
  persistDirty();
  schedule();
}

function schedule(): void {
  if (!loggedIn || dirty.size === 0) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, DEBOUNCE_MS);
}

/* ---- snapshot local → payload (chỉ domain dirty) ---- */

function countKnown(book: string, lesson: string): number {
  // W5.1 SM-2: knownCount = số từ đã mature trong bài (status known cũ đã chuẩn hóa thành review).
  const prefix = `${book}.${lesson}.`;
  return progressStore
    .getAllSrs()
    .filter((it) => it.key.startsWith(prefix) && isMature(it)).length;
}

function computePayload(): SyncPayload {
  const tombs = readTombstones();
  const srs: SyncSrsRecord[] = dirty.has("srs")
    ? progressStore
        .getAllSrs()
        .map((it) => ({
          key: it.key,
          status: it.status,
          dueAt: it.dueAt,
          reviewCount: it.reviewCount,
          lastReviewedAt: it.lastReviewedAt,
          ease: it.ease,
          intervalDays: it.intervalDays,
          lapses: it.lapses,
          updatedAt: it.updatedAt,
          deletedAt: tombs.srs[it.key] ?? null,
        }))
        .concat(
          // item đã xóa local (không còn trong getAllSrs) — gửi tombstone đứng yên
          Object.entries(tombs.srs)
            .filter(([k]) => !progressStore.getSrs(k))
            .map(([key, deletedAt]) => ({
              key,
              status: "new" as const,
              dueAt: null,
              reviewCount: 0,
              lastReviewedAt: null,
              ease: 2.5,
              intervalDays: 0,
              lapses: 0,
              updatedAt: deletedAt,
              deletedAt,
            }))
        )
    : [];
  const studyDay: SyncStudyDayRecord[] = [];
  if (dirty.has("studyDay")) {
    // union ngày có xp (bye.heat) và ngày có correct (bye.heat.correct) —
    // recordReview ghi correct không nhất thiết kèm xp
    const heat = progressStore.getHeat() ?? {};
    const correct = progressStore.getHeatCorrect() ?? {};
    const dates = new Set([...Object.keys(heat), ...Object.keys(correct)]);
    const now = Date.now();
    for (const date of dates) {
      studyDay.push({ date, xp: heat[date] ?? 0, correct: correct[date] ?? 0, updatedAt: now });
    }
  }
  const lessonProgress: SyncLessonRecord[] = [];
  if (dirty.has("lessonProgress")) {
    for (const bp of progressStore.listPageDone()) {
      const slash = bp.indexOf("/");
      const book = bp.slice(0, slash);
      const lesson = bp.slice(slash + 1);
      lessonProgress.push({
        book,
        lesson,
        modes: {},
        knownCount: countKnown(book, lesson),
        updatedAt: Date.now(),
        deletedAt: tombs.lessonProgress[bp] ?? null,
      });
    }
    // station progress: mỗi (levelId, stationId) → 1 row, modes = { pct, stars }
    // (đọc trực tiếp localStorage "bye.roadmap.stations.v1" — progressStore chỉ expose theo levelId)
    const all = readJSON<Record<string, Record<string, { pct: number; stars: 0 | 1 | 2 | 3 }>>>(STATIONS_KEY, {});
    for (const [book, stations] of Object.entries(all)) {
      for (const [lesson, rec] of Object.entries(stations)) {
        if (!rec || typeof rec !== "object") continue;
        lessonProgress.push({
          book,
          lesson,
          modes: { pct: rec.pct, stars: rec.stars },
          knownCount: 0,
          updatedAt: Date.now(),
          deletedAt: tombs.lessonProgress[`${book}/${lesson}`] ?? null,
        });
      }
    }
  }
  // W5.2: reviewLogs — gửi OLDEST-FIRST tối đa 1000 entry/batch (cap server zod),
  // chỉ những log CHƯA gửi (reviewedAt > con trỏ bye.sync.logsent); phần còn lại
  // giữ dirty → flush sau gửi nốt (tránh vòng lặp vô hạn khi local > 1000).
  const reviewLogs: SyncReviewLogRecord[] = dirty.has("reviewLogs")
    ? progressStore
        .getReviewLogs()
        .filter((l) => l.reviewedAt > readLastSentLogAt())
        .sort((a, b) => a.reviewedAt - b.reviewedAt)
        .slice(0, REVIEW_LOGS_BATCH)
        .map((l) => ({
          itemKey: l.itemKey,
          cardType: l.cardType,
          rating: l.rating,
          durationMs: l.durationMs,
          reviewedAt: l.reviewedAt,
        }))
    : [];
  // Spec 2026-10-30 §4.4 — readingProgress: ReadingProgressRec không giữ updatedAt
  // local (localStorage) → chụp payload dùng Date.now() hiện tại.
  const readingProgress: SyncReadingRecord[] = dirty.has("readingProgress")
    ? Object.entries(progressStore.getReadingProgress()).map(([readingId, rec]) => ({
        readingId,
        correct: rec.correct,
        total: rec.total,
        attempts: rec.attempts,
        completedAt: rec.completedAt,
        updatedAt: Date.now(),
      }))
    : [];
  // Spec 2026-10-30 §4.3 — readingDrafts: đọc raw (record tự mang deletedAt).
  const readingDrafts: SyncDraftRecord[] = dirty.has("readingDrafts")
    ? readLocalReadingDrafts().map((d) => ({ ...d, deletedAt: d.deletedAt ?? null }))
    : [];
  return { srs, studyDay, lessonProgress, reviewLogs, readingProgress, readingDrafts };
}

/* ---- merge ngược server → local (ghi TRỰC TIẾP localStorage, KHÔNG qua
       method patched để không tái đánh dirty vòng lặp) ---- */

function srsItemToSync(it: SrsItem, deletedAt: number | null): SyncSrsRecord {
  return {
    key: it.key,
    status: it.status,
    dueAt: it.dueAt,
    reviewCount: it.reviewCount,
    lastReviewedAt: it.lastReviewedAt,
    ease: it.ease,
    intervalDays: it.intervalDays,
    lapses: it.lapses,
    updatedAt: it.updatedAt,
    deletedAt,
  };
}

function applyServerPayload(server: SyncPayload): void {
  const tombs = readTombstones();
  let srsDirty = false;

  for (const rec of server.srs) {
    if (!rec || typeof rec.key !== "string") continue;
    const localItem = progressStore.getSrs(rec.key);
    const tombAt = tombs.srs[rec.key] ?? null;
    const localRec: SyncSrsRecord | null = localItem
      ? srsItemToSync(localItem, tombAt)
      : tombAt != null
        ? {
            key: rec.key,
            status: "new",
            dueAt: null,
            reviewCount: 0,
            lastReviewedAt: null,
            ease: 2.5,
            intervalDays: 0,
            lapses: 0,
            updatedAt: tombAt,
            deletedAt: tombAt,
          }
        : null;
    const merged = localRec ? mergeSrs(rec, localRec) : rec;
    if (merged.deletedAt != null) {
      // tombstone thắng → xóa local item + ghi tombstone mới hơn (nếu có)
      if (localItem) {
        const items = readJSON<Record<string, SrsItem>>(SRS_ITEMS_KEY, {});
        delete items[rec.key];
        writeJSON(SRS_ITEMS_KEY, items);
        srsDirty = true;
      }
      if (tombAt == null || merged.deletedAt > tombAt) {
        tombs.srs[rec.key] = merged.deletedAt;
        writeJSON(TOMBSTONE_KEY, tombs);
      }
    } else if (!localItem || merged.updatedAt > localItem.updatedAt) {
      const items = readJSON<Record<string, SrsItem>>(SRS_ITEMS_KEY, {});
      // status legacy (learned/known từ payload cũ) chuẩn hóa SM-2 trước khi ghi local
      items[rec.key] = normalizeSrsItem({
        key: rec.key,
        status: merged.status,
        dueAt: merged.dueAt,
        reviewCount: merged.reviewCount,
        lastReviewedAt: merged.lastReviewedAt,
        ease: merged.ease,
        intervalDays: merged.intervalDays,
        lapses: merged.lapses,
        updatedAt: merged.updatedAt,
      } as SrsItem).item;
      writeJSON(SRS_ITEMS_KEY, items);
      srsDirty = true;
    }
  }

  const heat = readJSON<Record<string, number>>(HEAT_KEY, {});
  let heatDirty = false;
  for (const rec of server.studyDay) {
    if (!rec || typeof rec.date !== "string") continue;
    const mergedXp = Math.max(heat[rec.date] ?? 0, rec.xp);
    if (mergedXp !== (heat[rec.date] ?? 0)) heatDirty = true;
    heat[rec.date] = mergedXp;
  }
  if (heatDirty) writeJSON(HEAT_KEY, heat);

  const pageDone = readJSON<Record<string, number>>(PAGE_DONE_KEY, {});
  const stations = readJSON<Record<string, Record<string, { pct: number; stars: 0 | 1 | 2 | 3 }>>>(STATIONS_KEY, {});
  let pageDirty = false;
  for (const rec of server.lessonProgress) {
    if (!rec || typeof rec.book !== "string" || typeof rec.lesson !== "string") continue;
    const bp = `${rec.book}/${rec.lesson}`;
    const tombAt = tombs.lessonProgress[bp] ?? null;
    const deletedWins = rec.deletedAt != null && (tombAt == null || rec.deletedAt >= tombAt);
    if (deletedWins) {
      if (pageDone[bp]) {
        delete pageDone[bp];
        pageDirty = true;
      }
      const st = stations[rec.book];
      if (st && st[rec.lesson]) {
        delete st[rec.lesson];
        pageDirty = true;
      }
      if (tombAt == null || rec.deletedAt! > tombAt) {
        tombs.lessonProgress[bp] = rec.deletedAt!;
        writeJSON(TOMBSTONE_KEY, tombs);
      }
      continue;
    }
    if (tombAt != null && rec.updatedAt <= tombAt) continue; // tombstone local mới hơn — bỏ qua
    // station progress (modes có pct) → merge vào bye.roadmap.stations.v1
    if (typeof rec.modes?.pct === "number") {
      const local = stations[rec.book]?.[rec.lesson];
      const localRec: SyncLessonRecord = {
        book: rec.book,
        lesson: rec.lesson,
        modes: local ? { pct: local.pct, stars: local.stars } : {},
        knownCount: 0,
        updatedAt: 0,
        deletedAt: tombAt,
      };
      const merged = mergeLesson(rec, localRec);
      if (!merged.deletedAt) {
        stations[rec.book] = {
          ...(stations[rec.book] ?? {}),
          [rec.lesson]: {
            pct: merged.modes.pct ?? rec.modes.pct,
            stars: (merged.modes.stars ?? 0) as 0 | 1 | 2 | 3,
          },
        };
        pageDirty = true;
      }
    } else if (!pageDone[bp]) {
      // lesson done ở thiết bị khác → đánh done local
      pageDone[bp] = 1;
      pageDirty = true;
    }
  }
  if (pageDirty) {
    writeJSON(PAGE_DONE_KEY, pageDone);
    writeJSON(STATIONS_KEY, stations);
  }

  // W5.2: reviewLogs — merge ngược append-only (union theo khóa), ghi thẳng localStorage
  let logsDirty = false;
  if (Array.isArray(server.reviewLogs) && server.reviewLogs.length) {
    const local = progressStore.getReviewLogs();
    const merged = mergeReviewLogs(local, server.reviewLogs); // local thắng khi trùng khóa
    if (merged.length !== local.length) {
      writeJSON(REVIEW_LOGS_KEY, merged.slice(-2000)); // cap như progress-store
      logsDirty = true;
    }
  }

  // Spec 2026-10-30 §4.4: readingProgress — merge ngược vào nhai.reading.progress.
  // Local rec không có updatedAt → correct/attempts merge max counter (không bao giờ
  // bị hạ). total/completedAt: local có thể mới hơn server (bản ghi local do lần
  // luyện này sinh, server trả snapshot chậm hơn) — guard reverse-merge lùi total:
  // total lấy max(local, server); completedAt giữ local khi local không thua kém
  // server (local.total ≥ server.total && local.attempts ≥ server.attempts).
  const readingProgress = readJSON<Record<string, { correct: number; total: number; attempts: number; completedAt: string }>>(
    READING_PROGRESS_KEY,
    {}
  );
  let readingDirty = false;
  if (Array.isArray(server.readingProgress)) for (const rec of server.readingProgress) {
    if (!rec || typeof rec.readingId !== "string") continue;
    const local = readingProgress[rec.readingId];
    const localTotal = local && typeof local.total === "number" ? local.total : 0;
    const localAttempts = local && typeof local.attempts === "number" ? local.attempts : 0;
    const localCompletedAt = local && typeof local.completedAt === "string" ? local.completedAt : "";
    const localSync: SyncReadingRecord = {
      readingId: rec.readingId,
      correct: local && typeof local.correct === "number" ? local.correct : 0,
      total: localTotal,
      attempts: localAttempts,
      completedAt: localCompletedAt,
      updatedAt: 0,
    };
    const merged = mergeReadingProgress(rec, localSync);
    const keepLocalCompletedAt = !!local && localTotal >= rec.total && localAttempts >= rec.attempts;
    const next = {
      correct: merged.correct,
      total: Math.max(merged.total, localTotal),
      attempts: merged.attempts,
      completedAt: keepLocalCompletedAt && localCompletedAt ? localCompletedAt : merged.completedAt,
    };
    if (!local || local.correct !== next.correct || local.attempts !== next.attempts || local.total !== next.total) {
      readingProgress[rec.readingId] = next;
      readingDirty = true;
    }
  }
  if (readingDirty) writeJSON(READING_PROGRESS_KEY, readingProgress);

  // Spec 2026-10-30 §4.3: readingDrafts — merge per-id (updatedAt thắng, tombstone
  // deletedAt >= updatedAt bản sống), ghi thẳng localStorage không qua method patched.
  let draftsDirty = false;
  if (Array.isArray(server.readingDrafts)) {
    const localDrafts = readLocalReadingDrafts();
    for (const rec of server.readingDrafts) {
      if (!rec || typeof rec.id !== "string" || !rec.doc || typeof rec.doc !== "object") continue;
      const local = localDrafts.find((d) => d.id === rec.id);
      if (!local) {
        // tombstone mà local không có gì để xóa → bỏ qua, khỏi giữ rác
        if (rec.deletedAt != null) continue;
        localDrafts.push({ ...rec, deletedAt: undefined });
        draftsDirty = true;
        continue;
      }
      const merged = mergeReadingDrafts(rec, { ...local, deletedAt: local.deletedAt ?? null });
      const next: SavedReadingDraft =
        merged.deletedAt != null
          ? { ...local, title: merged.title, textZh: merged.textZh, doc: merged.doc, chars: merged.chars, deletedAt: merged.deletedAt }
          : { ...local, title: merged.title, textZh: merged.textZh, doc: merged.doc, chars: merged.chars, deletedAt: undefined, updatedAt: merged.updatedAt };
      if (JSON.stringify(next) !== JSON.stringify(local)) {
        localDrafts[localDrafts.findIndex((d) => d.id === rec.id)] = next;
        draftsDirty = true;
      }
    }
    if (draftsDirty) writeJSON(READING_DRAFTS2_KEY, localDrafts);
  }

  if (srsDirty || pageDirty || heatDirty || logsDirty || readingDirty || draftsDirty) {
    // merge ngược đổi dữ liệu local → bắn event để heatmap/my-vocab... re-render
    try {
      window.dispatchEvent(new CustomEvent("bye:progress"));
    } catch {
      /* silent */
    }
  }
}

let flushing: Promise<void> | null = null;

async function doFlush(): Promise<void> {
  if (!loggedIn || dirty.size === 0) return;
  const domains = [...dirty];
  // version tại thời điểm chụp payload — so sánh sau khi POST xong
  const marks = domains.map((d) => [d, dirtyVersion[d]] as const);
  const payload = computePayload();
  try {
    const res = await fetch("/api/v1/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    if (res.status === 401) {
      // session hết hạn — dừng retry loop, chờ hybridOnAuthChange khi login lại
      loggedIn = false;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      return;
    }
    if (!res.ok) throw new Error(String(res.status));
    const server = (await res.json()) as SyncPayload & { serverTime: number };
    applyServerPayload(server);
    // reviewLogs: con trỏ chỉ tiến theo max reviewedAt ĐÃ gửi trong POST này
    // (KHÔNG theo max local/server — tránh bỏ sót log local chưa gửi dưới con trỏ).
    // Log server-merge cũ hơn con trỏ không bao giờ pending lại; log server-merge
    // mới hơn con trỏ được gửi lại đúng 1 lần (upsert idempotent, vô hại).
    const sent = payload.reviewLogs;
    if (sent.length) {
      writeLastSentLogAt(Math.max(readLastSentLogAt(), sent[sent.length - 1].reviewedAt));
    }
    for (const [d, mark] of marks) {
      // domain bị mutate TRONG LÚC POST đang bay → payload cũ chưa chứa thay đổi
      // mới → giữ dirty, flush lại (nếu clear ở đây → mất dữ liệu vĩnh viễn).
      if (dirtyVersion[d] !== mark) continue;
      // reviewLogs: chỉ clear dirty khi KHÔNG còn log chưa gửi (so với con trỏ,
      // không so với tổng local — tránh flush vô hạn khi local > batch cap)
      if (d === "reviewLogs" && progressStore.getReviewLogs().some((l) => l.reviewedAt > readLastSentLogAt())) {
        continue;
      }
      dirty.delete(d);
    }
    persistDirty();
    if (dirty.size) schedule(); // còn dirty (vd reviewLogs quá batch) → tự hẹn flush tiếp
  } catch {
    schedule(); // giữ dirty, thử lại sau 5s nữa
  }
}

/* In-flight guard: call trùng lúc flush đang chạy trả về cùng promise —
   tránh 2 POST song song và dirty bị xóa bởi snapshot cũ. */
function flush(): Promise<void> {
  if (flushing) return flushing;
  flushing = doFlush().finally(() => {
    flushing = null;
  });
  return flushing;
}

/* ---- lifecycle ---- */

function onUnload(): void {
  void hybridSyncNow();
}

function onVisibility(): void {
  // visibilitychange bắn cả khi tab focus lại — chỉ sync khi đang rời tab
  if (typeof document !== "undefined" && document.visibilityState === "hidden") void hybridSyncNow();
}

export function initHybridStore(): () => void {
  if (inited) return () => {};
  inited = true;
  for (const [method, domains] of PATCHES) {
    const original = (progressStore[method] as (...a: unknown[]) => unknown).bind(progressStore);
    (progressStore as unknown as Record<string, unknown>)[method] = (...args: unknown[]) => {
      const out = original(...args);
      if (method === "toggleSrs") {
        if (progressStore.getSrs(args[0] as string)) {
          clearTombstone("srs", args[0] as string); // toggle ON lại → item sống, tombstone cũ hết nghĩa
        } else {
          recordTombstone("srs", args[0] as string); // toggle OFF → tombstone
        }
      }
      for (const domain of domains) markDirty(domain);
      return out;
    };
  }
  restoreDirty();
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("visibilitychange", onVisibility);
  }
  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("visibilitychange", onVisibility);
    }
  };
}

/** Provider (Task 5) gọi mỗi khi state session đổi. */
export function hybridOnAuthChange(nextLoggedIn: boolean): void {
  if (nextLoggedIn && !loggedIn) {
    loggedIn = true;
    void hybridMergeOnLogin();
  } else if (!nextLoggedIn) {
    loggedIn = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  } else {
    loggedIn = nextLoggedIn;
  }
}

/** Merge-push 2 chiều lần đầu đăng nhập: POST toàn bộ local state → response
    merge ngược vào local. Gọi 1 lần per lần login. */
export async function hybridMergeOnLogin(): Promise<void> {
  bumpDirty("srs");
  bumpDirty("studyDay");
  bumpDirty("lessonProgress"); // push toàn bộ 2 chiều
  bumpDirty("reviewLogs");
  bumpDirty("readingProgress");
  bumpDirty("readingDrafts");
  persistDirty();
  await flush();
}

/** Đánh dirty thủ công (dùng khi code ngoài ProgressStore đổi data, ví dụ Wave 5). */
export function hybridMarkDirty(d: SyncDomain): void {
  markDirty(d);
}

/** Flush ngay toàn bộ dirty domain (dùng trước beforeunload / khi login). */
export function hybridSyncNow(): Promise<void> {
  return flush();
}
