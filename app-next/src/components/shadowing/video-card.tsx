import Link from "next/link";
import type { ShadowingVideo } from "@/content/shadowing";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Play, ICON_STROKE } from "@/components/ui/icon";

/* Thumbnail overlay gradients — đã token hoá (không còn hex trong component).
   text-white chỉ dùng trên overlay ảnh thumbnail (được design system cho phép). */
export const GRADS = [
  "linear-gradient(135deg,var(--hz-vermilion),var(--hz-vermilion-700))",
  "linear-gradient(135deg,var(--feature-ai),color-mix(in srgb,var(--hz-purple) 65%,black))",
  "linear-gradient(135deg,var(--action-primary),color-mix(in srgb,var(--hz-jade) 65%,black))",
  "linear-gradient(135deg,var(--learning-streak),color-mix(in srgb,var(--hz-amber) 65%,black))",
  "linear-gradient(135deg,var(--hz-purple),color-mix(in srgb,var(--hz-purple) 55%,black))",
];
export function posterChar(title: string): string {
  const m = title.replace(/[【「]/g, "").match(/[\u4e00-\u9fff]/);
  return m ? m[0] : "片";
}
export default function VideoCard({ video, gradIndex, playlistName }: { video: ShadowingVideo; gradIndex: number; playlistName?: string }) {
  const views = video.views + (video.viewsSuffix || "");
  return (
    <Link href={`/shadowing/${video.id}`} className="block hover:-translate-y-0.5 transition-transform">
      <Card className="overflow-hidden p-0">
        <div className="relative w-full aspect-video flex items-center justify-center" style={{ background: GRADS[gradIndex % GRADS.length] }}>
          <span className="zh text-6xl font-extrabold text-white/20 select-none">{posterChar(video.title)}</span>
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            <span className="bg-black/60 text-white text-[11px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1">
              <Play size={10} strokeWidth={ICON_STROKE} aria-hidden="true" /> {views}
            </span>
            <span className="bg-action-danger text-white text-[11px] font-bold px-1.5 py-0.5 rounded">{video.hsk}</span>
            <span className="bg-black/60 text-white/90 text-[11px] font-bold px-1.5 py-0.5 rounded">YouTube</span>
          </div>
          <span className="absolute right-2 bottom-2 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">{video.duration}</span>
        </div>
        <div className="p-3">
          <h3 className="font-bold leading-snug line-clamp-2">{video.title}</h3>
          {playlistName && <p className="text-xs text-text-secondary mt-1">{playlistName}</p>}
          <Chip className="min-h-6 px-2 text-[11px] font-bold mt-2">Shadowing</Chip>
        </div>
      </Card>
    </Link>
  );
}
