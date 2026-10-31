import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

/* Env của Worker. Prod: worker entry set qua setWorkerEnv(env) đúng 1 lần ở đầu
   fetch handler. Dev (`next dev`): fallback getCloudflareContext() — plugin dev
   của OpenNext cung cấp bindings qua wrangler.dev.jsonc (initOpenNextCloudflareForDev
   trong next.config.ts, guard NODE_ENV === "development"). */

export interface WorkerEnv {
  DB?: D1Database;
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
  BETTER_AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  AI_UPSTREAM_URL?: string;
  AI_UPSTREAM_KEY?: string;
  CONTENT_LLM_BASE_URL?: string;
  CONTENT_LLM_KEY?: string;
  CONTENT_LLM_MODEL?: string;
  DEV_LOGIN_SECRET?: string;
  [key: string]: unknown;
}

let workerEnv: WorkerEnv | null = null;

export function setWorkerEnv(env: WorkerEnv): void {
  workerEnv = env;
}

export function resetWorkerEnvForTest(): void {
  workerEnv = null;
}

export function getEnv(): WorkerEnv {
  if (workerEnv) return workerEnv;
  const { env } = getCloudflareContext();
  return env as WorkerEnv;
}
