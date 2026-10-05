import { sql } from "drizzle-orm";
import {
  index,
  integer,
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