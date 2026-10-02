"use client";
/* SpeakText (D4) — ví dụ "字 HV pinyin" kèm nút nghe (IconButton + Volume2),
   port từ clone/js/sound-rules.js:35-77 (button data-speak, click → NHAI.speak(text, "zh-CN")).
   Client nhỏ nhúng trong trang SSG. */

import type { ReactNode } from "react";
import { useTts } from "@/lib/tts/use-tts";
import { IconButton } from "@/components/ui/icon-button";
import { Volume2 } from "@/components/ui/icon";

export default function SpeakText({
  text,
  className = "",
  children,
}: {
  text: string;
  className?: string;
  children: ReactNode;
}) {
  const { speak } = useTts();
  return (
    <span className={`inline-flex items-baseline gap-1.5 mr-3 ${className}`}>
      {children}
      <IconButton
        label={`Nghe: ${text}`}
        variant="ghost"
        className="self-center"
        onClick={() => speak(text)}
      >
        <Volume2 size={16} strokeWidth={1.5} aria-hidden="true" />
      </IconButton>
    </span>
  );
}
