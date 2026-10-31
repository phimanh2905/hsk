"use client";

/* ShadowingRemote — SSG gate cho /shadowing/[...videoId]: fetch video + subtitles
   qua /api/v1/content/shadowing?video=<id> on-mount (page tĩnh, không đọc D1 lúc
   build). Render ShadowingStudio khi data về; skeleton trong lúc loading. */
import { useEffect, useState } from "react";
import Link from "next/link";
import ShadowingStudio from "./shadowing-studio";
import type { ShadowingVideo, SubtitleSentence } from "@/content/shadowing";

/* Video không có subtitle thật → 1 câu tổng hợp (giữ fallback của page cũ). */
function fallbackSubs(durSec: number): SubtitleSentence[] {
  return [
    { n: 1, start: 0, end: durSec || 60, parts: [{ zh: "(Video này chưa có bản chép — đang cập nhật.)" }], pinyin: "", vi: "" },
  ];
}

export default function ShadowingRemote({ videoId }: { videoId: string }) {
  const [loaded, setLoaded] = useState<{ video: ShadowingVideo; subtitles: SubtitleSentence[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/content/shadowing?video=${encodeURIComponent(videoId)}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ video: ShadowingVideo; subtitles: SubtitleSentence[] }>;
      })
      .then((d) => {
        if (!cancelled) setLoaded({ video: d.video, subtitles: d.subtitles.length > 0 ? d.subtitles : fallbackSubs(d.video.durSec) });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  if (error) {
    return (
      <div className="mx-auto max-w-[760px] pt-10 text-center" role="alert">
        <p>Video không tồn tại hoặc lỗi tải dữ liệu.</p>
        <Link
          href="/shadowing"
          className="inline-flex min-h-11 items-center justify-center rounded-control border border-transparent bg-action-primary px-5 font-semibold text-white hover:bg-action-primary-hover mt-4"
        >
          Về thư viện shadowing
        </Link>
      </div>
    );
  }
  if (!loaded) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4 pt-4">
        <div className="aspect-video max-h-[60vh] w-full animate-pulse rounded-card bg-surface-muted" />
        <div className="h-10 animate-pulse rounded-card bg-surface-muted" />
        <div className="h-40 animate-pulse rounded-card bg-surface-muted" />
      </div>
    );
  }
  return <ShadowingStudio video={loaded.video} subtitles={loaded.subtitles} />;
}
