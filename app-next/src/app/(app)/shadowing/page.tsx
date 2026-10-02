import type { Metadata } from "next";
import { Suspense } from "react";
import { shadowingPlaylists, shadowingVideos } from "@/content/shadowing";
import VideoCard from "@/components/shadowing/video-card";
import CatFilter from "@/components/shadowing/cat-filter";
import XemTatCa from "@/components/shadowing/xem-tat-ca";

export const metadata: Metadata = {
  title: "Shadowing | Nhai HSK",
  description: "Chọn video để luyện nghe, bắt chước phát âm hoặc viết chính tả.",
};

//SSG thật: 5 section render trực tiếp ở server, client chỉ phụ trách ?cat filter + toast.
export default function ShadowingPage() {
  return (
    <main>
      <h1 className="text-3xl font-extrabold">Shadowing &amp; Chép chính tả</h1>
      <p className="text-nhai-muted mt-1">Chọn video để luyện nghe, bắt chước phát âm hoặc viết chính tả.</p>
      <Suspense fallback={null}>
        <CatFilter playlists={shadowingPlaylists} />
      </Suspense>
      {shadowingPlaylists.map((pl) => {
        const vids = shadowingVideos.filter((v) => v.playlistId === pl.slug);
        return (
          <section className="mb-10" key={pl.slug} data-cat={pl.slug}>
            <h2 className="text-xl md:text-2xl font-extrabold">
              {pl.name} <span className="text-nhai-muted font-bold text-base">({pl.total} bài học)</span>
            </h2>
            <p className="text-sm text-nhai-muted mt-0.5">{pl.desc}</p>
            <XemTatCa />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
              {vids.map((v, i) => (
                <VideoCard key={v.id} video={v} gradIndex={pl.slug === "daihuaxiyou" ? i : i + 2} playlistName={pl.name} />
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
