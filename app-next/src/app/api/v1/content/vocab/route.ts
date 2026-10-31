import { handleContentVocab } from "@/server/api/content";

export const dynamic = "force-dynamic";

export const GET = () => handleContentVocab();
