import { handleReadingQuota } from "@/server/api/reading";

export const dynamic = "force-dynamic";

export const GET = (req: Request) => handleReadingQuota(req);
