import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getShadowingSubtitlesByVideo, getShadowingVideoById } from "@/lib/content/shadowing";
import type { SubtitleSentence } from "@/content/shadowing";
import ShadowingStudio from "./shadowing-studio";

/* Content đọc D1 qua content layer → page luôn dynamic (không query lúc build,
   generateStaticParams đã bỏ). */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ videoId: string }> }): Promise<Metadata> {
  const { videoId } = await params;
  const video = await getShadowingVideoById(videoId);
  return { title: video ? `${video.title} | Shadowing | Bye HSK` : "Shadowing | Bye HSK" };
}
const FALLBACK_SUBS = (durSec: number): SubtitleSentence[] => [
  { n: 1, start: 0, end: durSec || 60, parts: [{ zh: "(Video này chưa có bản chép — đang cập nhật.)" }], pinyin: "", vi: "" },
];

export default async function ShadowingVideoPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  const video = await getShadowingVideoById(videoId);
  if (!video) notFound();
  const subs = (await getShadowingSubtitlesByVideo(video.id)) ?? FALLBACK_SUBS(video.durSec);
  return (
    <div className="hz-breakout pb-28 lg:pb-6">
      <div className="mx-auto max-w-[1280px] px-4 lg:px-6 py-4">
        <ShadowingStudio video={video} subtitles={subs} />
      </div>
    </div>
  );
}
