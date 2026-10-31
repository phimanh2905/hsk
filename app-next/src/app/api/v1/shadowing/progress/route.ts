import { handleShadowingProgressGet } from "@/server/api/shadowing-progress";

export const dynamic = "force-dynamic";

export const GET = (req: Request) => handleShadowingProgressGet(req);
