import { handleShadowingProgressVideo } from "@/server/api/shadowing-progress";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  return handleShadowingProgressVideo(req, { videoId });
}
