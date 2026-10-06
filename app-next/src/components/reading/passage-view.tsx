"use client";

/* PassageView — canvas bài đọc theo câu (port .sent/.w/.wsep của opendesign_hsk/reading.html).
   Khác mock (chủ ý): câu đang phát chỉ TOGGLE class "playing" trên node câu có sẵn qua
   re-render của React — không repaint DOM mỗi giây. Font size qua CSS var --reader-size. */

import { Fragment } from "react";
import { cn } from "@/lib/cn";
import type { ReadingArticle, ReadingWord } from "@/content/reading";
import type { ScaffoldMode } from "./scaffold-bar";

export function PassageView({
  article,
  scaf,
  fontSize,
  playingIndex,
  onWordClick,
}: {
  article: ReadingArticle;
  scaf: ScaffoldMode;
  fontSize: number;
  playingIndex: number | null;
  onWordClick: (word: ReadingWord, rect: DOMRect) => void;
}) {
  return (
    <div
      data-od-id="reading-canvas"
      className="space-y-1"
      style={{ ["--reader-size" as string]: `${fontSize}px` }}
    >
      {article.sentences.map((sent, i) => (
        <p
          key={i}
          className={cn(
            "sent zh rounded-[10px] border-l-[3px] border-transparent px-3 py-1.5 [word-spacing:2px]",
            playingIndex === i && "playing border-l-[color:var(--hz-jade)] bg-jade-wash text-jade",
          )}
        >
          {sent.map((w, j) => (
            <Fragment key={j}>
              <span
                className="w inline-block cursor-pointer rounded-md px-1 text-center align-top hover:bg-surface-muted"
                onClick={(e) => onWordClick(w, e.currentTarget.getBoundingClientRect())}
              >
                <span
                  className="block"
                  style={{ fontSize: "var(--reader-size)", lineHeight: 2.2 }}
                >
                  {w.z}
                </span>
                {scaf === "pinyin" && (
                  <span className="block font-sans text-[11px] leading-tight text-text-secondary">
                    {w.p}
                  </span>
                )}
                {scaf === "hanviet" && (
                  <span className="hv block font-sans text-[11px] leading-tight text-text-secondary">
                    {w.h}
                  </span>
                )}
              </span>
              {j < sent.length - 1 && <span className="wsep inline-block w-2.5" aria-hidden="true" />}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}
