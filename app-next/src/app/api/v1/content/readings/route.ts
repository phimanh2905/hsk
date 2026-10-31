import { handleContentReadings } from "@/server/api/content";

export const dynamic = "force-dynamic";

export const GET = () => handleContentReadings();
