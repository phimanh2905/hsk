import { handleNotebookEntryPatch, handleNotebookEntryDelete } from "@/server/api/notebook";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleNotebookEntryPatch(req, { id });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleNotebookEntryDelete(req, { id });
}
