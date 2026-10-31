import { handleExamResultsGet, handleExamResultsPost } from "@/server/api/exam";

export const dynamic = "force-dynamic";

export const GET = (req: Request) => handleExamResultsGet(req);
export const POST = (req: Request) => handleExamResultsPost(req);
