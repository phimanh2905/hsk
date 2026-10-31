import { handleContentShadowing } from "@/server/api/content";

export const dynamic = "force-dynamic";

export const GET = (req: Request) => handleContentShadowing(req);
