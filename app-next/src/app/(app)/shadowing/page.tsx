import type { Metadata } from "next";
import { shadowingVideos, shadowingSubtitles } from "@/content/shadowing";
import ShadowingLibrary from "./shadowing-library";

export const metadata: Metadata = {
  title: "Shadowing | Bye HSK",
  description: "Chọn video để luyện nghe, bắt chước phát âm hoặc viết chính tả.",
};

//SSG thật: page serialize videos + subtitles vào client island (lọc/TTS/toast chạy client).
export default function ShadowingPage() {
  return (
    <main>
      <ShadowingLibrary videos={shadowingVideos} subtitlesByVideo={shadowingSubtitles} />
    </main>
  );
}
