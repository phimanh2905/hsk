import { handleReadingGenerate } from "@/server/api/reading";

export const dynamic = "force-dynamic";

export const POST = (req: Request) => handleReadingGenerate(req);
