import { json } from "@/server/api/json";
import { getAuth } from "@/lib/auth";
import { handleDevLogin } from "@/server/api/auth";
import { handleAi } from "@/server/api/ai";
import {
  handleContentVocab,
  handleContentVocabMeta,
  handleContentVocabLesson,
  handleContentGrammar,
  handleContentShadowing,
  handleContentReadings,
} from "@/server/api/content";
import { handleSync } from "@/server/api/sync";
import {
  handleNotebookEntriesGet,
  handleNotebookEntriesPost,
  handleNotebookEntryPatch,
  handleNotebookEntryDelete,
} from "@/server/api/notebook";
import { handleShadowingProgressGet, handleShadowingProgressVideo } from "@/server/api/shadowing-progress";
import { handleBattleAttempts, handleBattleLeaderboard } from "@/server/api/battle";
import { handleExamResultsGet, handleExamResultsPost } from "@/server/api/exam";
import {
  handleReadingDraftsGet,
  handleReadingDraftPatch,
  handleReadingDraftDelete,
  handleReadingGenerate,
  handleReadingQuota,
} from "@/server/api/reading";

export type ApiHandler = (req: Request, params: Record<string, string>) => Promise<Response> | Response;

interface Route { method: string; segments: string[]; handler: ApiHandler }

function compile(pattern: string): string[] {
  return pattern.split("/").filter(Boolean);
}

function match(pattern: string[], segs: string[]): Record<string, string> | null {
  const wildcard = pattern[pattern.length - 1] === "*";
  if (wildcard ? segs.length < pattern.length - 1 : segs.length !== pattern.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i];
    if (p === "*") return params;
    const s = segs[i];
    if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(s);
    else if (p !== s) return null;
  }
  return params;
}

export class Router {
  private routes: Route[] = [];

  private add(method: string, pattern: string, handler: ApiHandler): void {
    this.routes.push({ method, segments: compile(pattern), handler });
  }
  get(p: string, h: ApiHandler) { this.add("GET", p, h); return this; }
  post(p: string, h: ApiHandler) { this.add("POST", p, h); return this; }
  put(p: string, h: ApiHandler) { this.add("PUT", p, h); return this; }
  patch(p: string, h: ApiHandler) { this.add("PATCH", p, h); return this; }
  delete(p: string, h: ApiHandler) { this.add("DELETE", p, h); return this; }
  all(p: string, h: ApiHandler) { this.add("*", p, h); return this; }

  async handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const segs = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    // HEAD chạy handler GET rồi strip body (giữ status + headers).
    const method = req.method === "HEAD" ? "GET" : req.method;
    let allow: string[] | null = null;
    for (const r of this.routes) {
      // decodeURIComponent trong match() ném URIError cho path malformed (%zz):
      // bắt ngay đây vì handle() nằm ngoài try/catch của caller (worker 1101).
      let params: Record<string, string> | null;
      try {
        params = match(r.segments, segs);
      } catch (err) {
        if (err instanceof URIError) return json({ error: "invalid path" }, { status: 400 });
        throw err;
      }
      if (!params) continue;
      if (r.method !== "*" && r.method !== method) {
        // path khớp pattern nhưng method sai: ghi lại để trả 405 + Allow thay vì 404.
        (allow ??= []).push(r.method);
        continue;
      }
      try {
        const res = await r.handler(req, params);
        if (req.method === "HEAD") {
          return new Response(null, { status: res.status, headers: res.headers });
        }
        return res;
      } catch (err) {
        console.error("[worker]", url.pathname, err);
        return json({ error: "Lỗi máy chủ" }, { status: 500 });
      }
    }
    if (allow?.length) {
      return json({ error: "method not allowed" }, {
        status: 405,
        headers: { allow: allow.join(", ") },
      });
    }
    return json({ error: "not found" }, { status: 404 });
  }
}

/* 21 API route theo bảng §5 spec (static-first-api-worker-design).
   dev-login đăng ký TRƯỚC auth wildcard để không bị catch-all che mất. */
export function buildRouter(): Router {
  const r = new Router();
  // better-auth mount (basePath /api/v1/auth) + dev-login QA
  r.post("/api/v1/auth/dev-login", handleDevLogin);
  r.all("/api/v1/auth/*", (req) => getAuth().handler(req));

  // AI chat proxy
  r.post("/api/ai", handleAi);

  // Content datasets (public, cache CDN)
  r.get("/api/v1/content/vocab", handleContentVocab);
  r.get("/api/v1/content/vocab-meta", handleContentVocabMeta);
  r.get("/api/v1/content/vocab-lesson", handleContentVocabLesson);
  r.get("/api/v1/content/grammar", handleContentGrammar);
  r.get("/api/v1/content/shadowing", handleContentShadowing);
  r.get("/api/v1/content/readings", handleContentReadings);

  // User progress sync
  r.post("/api/v1/sync", handleSync);

  // Notebook entries
  r.get("/api/v1/notebook/entries", handleNotebookEntriesGet);
  r.post("/api/v1/notebook/entries", handleNotebookEntriesPost);
  r.patch("/api/v1/notebook/entries/:id", handleNotebookEntryPatch);
  r.delete("/api/v1/notebook/entries/:id", handleNotebookEntryDelete);

  // Shadowing progress
  r.get("/api/v1/shadowing/progress", handleShadowingProgressGet);
  r.put("/api/v1/shadowing/progress/:videoId", handleShadowingProgressVideo);

  // Battle
  r.post("/api/v1/battle/attempts", handleBattleAttempts);
  r.get("/api/v1/battle/leaderboard", handleBattleLeaderboard);

  // Exam results
  r.get("/api/v1/exam/results", handleExamResultsGet);
  r.post("/api/v1/exam/results", handleExamResultsPost);

  // Reading drafts / generate / quota
  r.get("/api/v1/reading/drafts", handleReadingDraftsGet);
  r.patch("/api/v1/reading/drafts/:id", handleReadingDraftPatch);
  r.delete("/api/v1/reading/drafts/:id", handleReadingDraftDelete);
  r.post("/api/v1/reading/generate", handleReadingGenerate);
  r.get("/api/v1/reading/quota", handleReadingQuota);
  return r;
}
