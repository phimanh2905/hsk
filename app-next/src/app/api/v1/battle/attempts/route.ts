import { handleBattleAttempts } from "@/server/api/battle";

export const dynamic = "force-dynamic";

export const POST = (req: Request) => handleBattleAttempts(req);
