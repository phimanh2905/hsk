import { handleReadingDraftsGet } from "@/server/api/reading";

export const dynamic = "force-dynamic";

export const GET = (req: Request) => handleReadingDraftsGet(req);
