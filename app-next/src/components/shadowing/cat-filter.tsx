"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

//Client filter ?cat= — breadcrumb + ẩn section không khớp bằng CSS để các section
//do server render (SSG) vẫn nằm trong HTML prerender (G4.5).
export default function CatFilter({ playlists }: { playlists: { slug: string }[] }) {
  const cat = useSearchParams().get("cat");
  if (!cat) return null;
  return (
    <>
      <div className="mb-4">
        <Link href="/shadowing" className="text-sm font-semibold text-text-secondary hover:text-action-primary">← Tất cả nhóm</Link>
      </div>
      <style>{`section[data-cat]:not([data-cat="${playlists.some((p) => p.slug === cat) ? cat : "__none__"}"]){display:none}`}</style>
    </>
  );
}
