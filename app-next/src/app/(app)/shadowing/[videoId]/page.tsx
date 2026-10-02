import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { shadowingVideoById, shadowingSubtitles, relatedVideos, shadowingVideos } from "@/content/shadowing";
import VideoPlayer from "@/components/shadowing/video-player";
import VideoCard from "@/components/shadowing/video-card";
import Link from "next/link";
import type { SubtitleSentence } from "@/content/shadowing";

export function generateStaticParams() {
  return shadowingVideos.map((v) => ({ videoId: v.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ videoId: string }> }): Promise<Metadata> {
  const { videoId } = await params;
  const video = shadowingVideoById(videoId);
  return { title: video ? `${video.title} | Shadowing | Nhai HSK` : "Shadowing | Nhai HSK" };
}
const FALLBACK_SUBS = (durSec: number): SubtitleSentence[] => [
  { n: 1, start: 0, end: durSec || 60, parts: [{ zh: "(Video này chưa có bản chép — đang cập nhật.)" }], pinyin: "", vi: "" },
];

export default async function ShadowingVideoPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  const video = shadowingVideoById(videoId);
  if (!video) notFound();
  const subs = shadowingSubtitles[video.id] ?? FALLBACK_SUBS(video.durSec);
  const rel = relatedVideos(video.id);
  return (
    <main>
      <div className="mb-2">
        <Link href="/shadowing" className="text-sm font-semibold text-nhai-muted hover:text-nhai-main">‹ Shadowing</Link>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold">{video.title}</h1>
        <span className="pill pill-active text-xs font-bold">{video.hsk}</span>
        <span className="pill text-xs font-bold">{video.duration}</span>
        <span className="pill text-xs font-bold">▶ {video.views + (video.viewsSuffix || "")} lượt xem</span>
      </div>
      <VideoPlayer video={video} subtitles={subs} />
      {rel.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-extrabold mb-3">Video liên quan</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {rel.map((v, i) => <VideoCard key={v.id} video={v} gradIndex={i + 1} />)}
          </div>
        </section>
      )}
    </main>
  );
}
