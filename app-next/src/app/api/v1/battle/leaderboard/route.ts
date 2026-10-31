import { handleBattleLeaderboard } from "@/server/api/battle";

export const dynamic = "force-dynamic";

export const GET = (req: Request) => handleBattleLeaderboard(req);
