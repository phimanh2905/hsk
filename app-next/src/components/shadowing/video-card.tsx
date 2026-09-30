import Link from "next/link";
import type { ShadowingVideo } from "@/content/shadowing";

export const GRADS = [
  "linear-gradient(135deg,#c23b22,#6b1d10)",
  "linear-gradient(135deg,#2563eb,#1e3a8a)",
  "linear-gradient(135deg,#0d9488,#134e4a)",
  "linear-gradient(135deg,#b45309,#78350f)",
  "linear-gradient(135deg,#7c3aed,#4c1d95)",
];
export function posterChar(title: string): string {
  const m = title.replace(/[【「]/g, "").match(/[\u4e00-\u9fff]/);
  return m ? m[0] : "片";
}
export default function VideoCard({ video, gradIndex, playlistName }: { video: ShadowingVideo; gradIndex: number; playlistName?: string }) {
  const views = video.views + (video.viewsSuffix || "");
  return (
    <Link href={`/shadowing/${video.id}`} className="card shadow-neo block overflow-hidden hover:-translate-y-0.5 transition-transform">
      <div className="relative w-full aspect-video flex items-center justify-center" style={{ background: GRADS[gradIndex % GRADS.length] }}>
        <span className="zh text-6xl font-extrabold text-white/20 select-none">{posterChar(video.title)}</span>
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          <span className="bg-black/60 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">▶ {views}</span>
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: "#dc2626" }}>{video.hsk}</span>
          <span className="bg-black/60 text-white/90 text-[11px] font-bold px-1.5 py-0.5 rounded">YouTube</span>
        </div>
        <span className="absolute right-2 bottom-2 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">{video.duration}</span>
      </div>
      <div className="p-3">
        <h3 className="font-bold leading-snug line-clamp-2">{video.title}</h3>
        {playlistName && <p className="text-xs text-[var(--nhai-muted)] mt-1">{playlistName}</p>}
        <span className="pill text-[11px] font-bold mt-2 inline-block">Shadowing</span>
      </div>
    </Link>
  );
}
