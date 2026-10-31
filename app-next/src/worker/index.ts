import { setWorkerEnv } from "@/lib/env";
import type { WorkerEnv } from "@/lib/env";
import { buildRouter } from "./router";

const router = buildRouter();

const worker = {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    setWorkerEnv(env);
    return router.handle(request);
  },
};

export default worker;
