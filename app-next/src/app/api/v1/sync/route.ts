import { handleSync } from "@/server/api/sync";

export const dynamic = "force-dynamic";

export const POST = (req: Request) => handleSync(req);
