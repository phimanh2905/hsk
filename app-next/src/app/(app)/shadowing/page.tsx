import type { Metadata } from "next";
import ShadowingLibrary from "./shadowing-library";

export const metadata: Metadata = {
  title: "Shadowing | Bye HSK",
  description: "Chọn video để luyện nghe, bắt chước phát âm hoặc viết chính tả.",
};

/* SSG: page tĩnh; videos + subtitles client-fetch qua /api/v1/content/shadowing
   (trong ShadowingLibrary). */
export default function ShadowingPage() {
  return (
    <main>
      <ShadowingLibrary />
    </main>
  );
}
