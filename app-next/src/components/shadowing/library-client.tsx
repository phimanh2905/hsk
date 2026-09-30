"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/shell/toast-provider";
import type { ShadowingPlaylist, ShadowingVideo } from "@/content/shadowing";
import VideoCard from "./video-card";

export default function LibraryClient({ playlists, videos }: { playlists: ShadowingPlaylist[]; videos: ShadowingVideo[] }) {
  const toast = useToast();
  const cat = useSearchParams().get("cat");
  const shown = cat ? playlists.filter((p) => p.slug === cat) : playlists;
  return (
    <div>
      {cat && (
        <div className="mb-4">
          <Link href="/shadowing" className="text-sm font-semibold text-nhai-muted hover:text-nhai-main">← Tất cả nhóm</Link>
        </div>
      )}
      {shown.map((pl) => {
        const vids = videos.filter((v) => v.playlistId === pl.slug);
        return (
          <section className="mb-10" key={pl.slug}>
            <h2 className="text-xl md:text-2xl font-extrabold">
              {pl.name} <span className="text-nhai-muted font-bold text-base">({pl.total} bài học)</span>
            </h2>
            <p className="text-sm text-nhai-muted mt-0.5">{pl.desc}</p>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); toast("Sẽ có sớm"); }}
              className="inline-block mt-1 text-xs font-extrabold tracking-wide text-nhai-main hover:underline"
            >XEM TẤT CẢ →</a>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
              {vids.map((v, i) => <VideoCard key={v.id} video={v} gradIndex={pl.slug === "daihuaxiyou" ? i : i + 2} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
