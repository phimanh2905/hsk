import type { Metadata } from "next";
import { Suspense } from "react";
import { shadowingPlaylists, shadowingVideos } from "@/content/shadowing";
import LibraryClient from "@/components/shadowing/library-client";

export const metadata: Metadata = {
  title: "Shadowing | Nhai HSK",
  description: "Chọn video để luyện nghe, bắt chước phát âm hoặc viết chính tả.",
};

export default function ShadowingPage() {
  return (
    <main>
      <h1 className="text-3xl font-extrabold">Shadowing &amp; Chép chính tả</h1>
      <p className="text-nhai-muted mt-1">Chọn video để luyện nghe, bắt chước phát âm hoặc viết chính tả.</p>
      <Suspense fallback={null}>
        <LibraryClient playlists={shadowingPlaylists} videos={shadowingVideos} />
      </Suspense>
    </main>
  );
}
