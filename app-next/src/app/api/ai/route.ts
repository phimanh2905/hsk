import { handleAi, __resetRateLimitForTest } from "@/server/api/ai";

export const dynamic = "force-dynamic";

export const POST = (req: Request) => handleAi(req);
export { __resetRateLimitForTest };
