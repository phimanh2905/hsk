import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/* Schema better-auth (bảng chuẩn, không tự định nghĩa lại — spec 00 §3.1).
   Sinh từ getAuthTables() của better-auth 1.7.7, chuyển sang Drizzle SQLite cho D1. */

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_userId_idx").on(t.userId)]
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("account_userId_idx").on(t.userId)]
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)]
);

/* Tiến độ luyện shadowing theo user×video (spec §5.1). `linesDone` = số câu
   đã được chấm (thu âm hoặc chép chính tả đúng) — dùng cho pill "Đang luyện · a/N câu". */
export const shadowingProgress = sqliteTable(
  "shadowing_progress",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    videoId: text("videoId").notNull(),
    status: text("status", { enum: ["new", "mid", "done"] }).notNull().default("mid"),
    score: integer("score"),
    seconds: integer("seconds").notNull().default(0),
    linesDone: integer("linesDone").notNull().default(0),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("shadowing_progress_user_video_uq").on(t.userId, t.videoId)]
);

/* Entries sổ tay /notebook (spec §3.1). `id` do client sinh (crypto.randomUUID)
   để sync-on-login idempotent; `payload` là JSON theo zod schema lib/notebook/payload. */
export const notebookEntries = sqliteTable(
  "notebook_entries",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["wrong", "chars", "personal"] }).notNull(),
    tag: text("tag").notNull(),
    tagTone: text("tagTone", { enum: ["red", "lav", "per"] }).notNull().default("red"),
    payload: text("payload").notNull(),
    saved: integer("saved", { mode: "boolean" }).notNull().default(false),
    hsk: text("hsk"),
    source: text("source", { enum: ["auto", "manual"] }).notNull().default("manual"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => [index("notebook_entries_user_created_idx").on(t.userId, t.createdAt)]
);
/* ================= Content datasets (spec dehardcode §4.2) =================
   Bảng content_* tách khỏi auth/user. Cấu trúc lồng (mảng words) lưu JSON —
   đọc nhiều/ghi hiếm, giữ 1:1 với type bên app. `ord` giữ thứ tự lesson/row
   vì SELECT từ D1 không bảo toàn thứ tự key của object gốc. */

export const contentVocabs = sqliteTable(
  "content_vocabs",
  {
    book: text("book").notNull(),
    pageId: text("page_id").notNull(),
    ord: integer("ord").notNull(),
    title: text("title").notNull(),
    words: text("words", { mode: "json" }).$type<VocabWordRow[]>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.book, t.pageId] })]
);

/* Shape khớp VocabWord (src/content/vocab.ts) — khai báo structurally thay vì
   import để schema.ts không phụ thuộc content module. */
type VocabWordRow = {
  hanzi: string;
  pinyin: string;
  hanViet: string;
  meaning: string;
  pos: string;
  example: { zh: string; pinyinPerChar: { c: string; py: string }[]; vi: string };
};

export const contentGrammars = sqliteTable(
  "content_grammars",
  {
    id: text("id").primaryKey(),
    level: text("level").notNull(), // "HSK 1".."HSK 5"
    ord: integer("ord").notNull(),
    title: text("title").notNull(),
    hz: text("hz").notNull(),
    topic: text("topic").notNull(),
    def: text("def").notNull(),
    formula: text("formula", { mode: "json" }).$type<GrammarFormulaRow[]>().notNull(),
    pitfall: text("pitfall", { mode: "json" }).$type<[string, string, string]>().notNull(),
    ex: text("ex", { mode: "json" }).$type<{ hz: string; py: string; vi: string }[]>().notNull(),
  },
  (t) => [index("content_grammars_level_idx").on(t.level)]
);

/* Shape khớp GrammarPoint (src/content/grammar-points.ts) — khai báo structurally
   thay vì import để schema.ts không phụ thuộc content module. */
type GrammarFormulaRow = [label: string, isKey?: "key"];

export const contentShadowingPlaylists = sqliteTable("content_shadowing_playlists", {
  id: text("id").primaryKey(),
  ord: integer("ord").notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  total: integer("total").notNull(),
  desc: text("desc").notNull(),
  channel: text("channel").notNull(),
});

export const contentShadowingVideos = sqliteTable(
  "content_shadowing_videos",
  {
    id: text("id").primaryKey(),
    ord: integer("ord").notNull(),
    title: text("title").notNull(),
    playlistId: text("playlist_id").notNull(),
    hsk: text("hsk").notNull(),
    views: integer("views").notNull(),
    viewsSuffix: text("views_suffix").notNull(),
    duration: text("duration").notNull(),
    durSec: integer("dur_sec").notNull(),
    plays: integer("plays").notNull(),
    topic: text("topic").notNull(),
    spd: integer("spd").notNull(),
  },
  (t) => [index("csv_playlist_idx").on(t.playlistId)]
);

export const contentShadowingSubtitles = sqliteTable("content_shadowing_subtitles", {
  videoId: text("video_id").primaryKey(),
  sentences: text("sentences", { mode: "json" })
    .$type<{ n: number; start: number; end: number; parts: { zh: string }[]; pinyin: string; vi: string }[]>()
    .notNull(),
});

/* ================= HybridStore sync (spec 2026-10-24 Wave 4) =================
   localStorage-first: client ghi local + debounce POST /api/v1/sync; server chỉ
   lưu + merge. updatedAt/deletedAt là EPOCH MS do client sinh (so sánh clock
   Conflict: counter max, modes per-key max, còn lại bản updatedAt lớn hơn thắng;
   tombstone deleted_at giữ 90 ngày rồi purge (route sync tự dọn). */

export const srsCards = sqliteTable(
  "srs_cards",
  {
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    key: text("key").notNull(), // SRS item key, vd "hsk1.u1.3"
    status: text("status", { enum: ["new", "learning", "review", "relearning"] }).notNull().default("new"),
    dueAt: integer("due_at"), // epoch ms
    reviewCount: integer("review_count").notNull().default(0),
    lastReviewedAt: integer("last_reviewed_at"), // epoch ms
    updatedAt: integer("updated_at").notNull(), // epoch ms — client clock
    deletedAt: integer("deleted_at"), // tombstone epoch ms
    /* SM-2 (Wave 5): hệ số ease kẹp [1.3, 3.0], init 2.5; interval hiện tại (ngày);
       lapses = số lần Again ở review/relearning. Chỉ số áp dụng cho status
       review/relearning; learning dùng due_at theo phút với interval_days = 0. */
    ease: real("ease").notNull().default(2.5),
    intervalDays: integer("interval_days").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
  },
  (t) => [uniqueIndex("srs_cards_user_key_uq").on(t.userId, t.key)]
);

export const studyDay = sqliteTable(
  "study_day",
  {
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD theo Asia/Ho_Chi_Minh (vnDayString)
    xp: integer("xp").notNull().default(0),
    correct: integer("correct").notNull().default(0), // Wave 5 ghi vào
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] })]
);

export const lessonProgress = sqliteTable(
  "lesson_progress",
  {
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    book: text("book").notNull(), // hsk1..hsk5 hoặc levelId roadmap
    lesson: text("lesson").notNull(), // pageId hoặc stationId
    modes: text("modes", { mode: "json" })
      .$type<Record<string, number>>()
      .notNull()
      .default(sql`'{}'`),
    knownCount: integer("known_count").notNull().default(0),
    updatedAt: integer("updated_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
    (t) => [primaryKey({ columns: [t.userId, t.book, t.lesson] })]
);

/* ================= Wave 5 — review logs (W5.2) =================
   Append-only log mọi lần ôn; sync 1 chiều push (merge append-only theo
   (user_id, item_key, reviewed_at)). Không tombstone, không merge field-wise. */
export const reviewLogs = sqliteTable(
  "review_logs",
  {
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    itemKey: text("item_key").notNull(), // SRS item key, vd "hsk1.u1.3"
    cardType: text("card_type", { enum: ["vocab", "grammar"] }).notNull(),
    rating: integer("rating").notNull(), // 1=Again 2=Hard 3=Good 4=Easy
    durationMs: integer("duration_ms").notNull(),
    reviewedAt: integer("reviewed_at").notNull(), // epoch ms client
  },
  (t) => [primaryKey({ columns: [t.userId, t.itemKey, t.reviewedAt] })]
);
