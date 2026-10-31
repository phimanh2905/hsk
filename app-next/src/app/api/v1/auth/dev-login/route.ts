import { handleDevLogin } from "@/server/api/auth";

export const dynamic = "force-dynamic";

export const POST = (req: Request) => handleDevLogin(req);
