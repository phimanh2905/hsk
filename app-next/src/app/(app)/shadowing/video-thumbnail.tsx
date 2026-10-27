"use client";
/* Thumbnail YouTube cho card grid + hero daily-pick. onError → fallback gradient
   (placeholder 2 chữ đầu title) — fallback cũng dùng cho type "audio". */
import { useState } from "react";
import type { ShadowingVideo } from "@/content/shadowing";

export function VideoThumbnail({ video, big = false }: { video: ShadowingVideo; big?: boolean }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = video.type === "youtube" && !imgFailed;

  return (
    <>
      {showImg && (
        <img
          src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {!showImg && (
        <span
          className={`hanzi absolute inset-0 flex items-center justify-center ${
            big ? "text-8xl" : "text-5xl"
          } text-white/20 select-none pointer-events-none hz-thumb-gradient`}
        >
          {video.title.slice(0, 2)}
        </span>
      )}
    </>
  );
}
