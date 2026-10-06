import type { Metadata } from "next";
import { getShadowingSubtitles, getShadowingVideos } from "@/lib/content/shadowing";
import ShadowingLibrary from "./shadowing-library";

export const metadata: Metadata = {
  title: "Shadowing | Bye HSK",
  description: "Chọn video để luyện nghe, bắt chước phát âm hoặc viết chính tả.",
};

/* Content đọc D1 qua content layer → page luôn dynamic (không query lúc build).
   Page serialize videos + subtitles vào client island (lọc/TTS/toast chạy client). */
export const dynamic = "force-dynamic";

export default async function ShadowingPage() {
  const [videos, subtitlesByVideo] = await Promise.all([getShadowingVideos(), getShadowingSubtitles()]);
  return (
    <main>
      <ShadowingLibrary videos={videos} subtitlesByVideo={subtitlesByVideo} />
    </main>
  );
}
