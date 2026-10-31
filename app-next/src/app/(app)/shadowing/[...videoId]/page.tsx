import type { Metadata } from "next";
import ShadowingRemote from "./shadowing-remote";
import { shadowingVideos } from "@/content/shadowing";

/* T7 — catch-all: video audio có id chứa "/" ("hsk1/lesson-1") → params là
   mảng segment, join lại thành id gốc. YouTube id 1 segment giữ nguyên.

   SSG: generateStaticParams từ dataset seed (src/content/shadowing.ts,
   build-time import — nguồn truth của content_shadowing_videos); data render
   client-fetch qua /api/v1/content/shadowing?video= trong ShadowingRemote. */
export const dynamicParams = false;

export function generateStaticParams(): { videoId: string[] }[] {
  return shadowingVideos.map((v) => ({ videoId: v.id.split("/") }));
}

export async function generateMetadata({ params }: { params: Promise<{ videoId: string | string[] }> }): Promise<Metadata> {
  const { videoId } = await params;
  const id = Array.isArray(videoId) ? videoId.join("/") : videoId;
  const video = shadowingVideos.find((v) => v.id === id);
  return { title: video ? `${video.title} | Shadowing | Bye HSK` : "Shadowing | Bye HSK" };
}

export default async function ShadowingVideoPage({ params }: { params: Promise<{ videoId: string | string[] }> }) {
  const { videoId } = await params;
  const id = Array.isArray(videoId) ? videoId.join("/") : videoId;
  return (
    <div className="hz-breakout pb-28 lg:pb-6">
      {/* pt-0 + header studio -mt-6: header dính sát topbar, bù đúng py-6 của (app)/layout */}
      <div className="mx-auto max-w-[1280px] px-4 pt-0 pb-4 lg:px-6">
        <ShadowingRemote key={id} videoId={id} />
      </div>
    </div>
  );
}
