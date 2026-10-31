import { handleReadingDraftPatch, handleReadingDraftDelete } from "@/server/api/reading";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleReadingDraftPatch(req, { id });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleReadingDraftDelete(req, { id });
}
