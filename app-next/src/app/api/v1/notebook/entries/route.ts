import { handleNotebookEntriesGet, handleNotebookEntriesPost, rowToApi } from "@/server/api/notebook";

export const dynamic = "force-dynamic";

// rowToApi re-export để giữ API cũ của route (test + [id] route từng import từ đây)
export { rowToApi };

export const GET = (req: Request) => handleNotebookEntriesGet(req);
export const POST = (req: Request) => handleNotebookEntriesPost(req);
