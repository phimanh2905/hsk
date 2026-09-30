"use client";
/* SpeakText (D4) — ví dụ "字 HV pinyin" bấm để nghe, port từ clone/js/sound-rules.js:35-77
   (button data-speak, click → NHAI.speak(text, "zh-CN")). Client nhỏ nhúng trong trang SSG. */

import type { ReactNode } from "react";
import { useTts } from "@/lib/tts/use-tts";

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
    <button
      type="button"
      onClick={() => speak(text)}
      title={`Nghe: ${text}`}
      className={`inline-flex items-baseline gap-1.5 mr-3 hover:text-nhai-main ${className}`}
    >
      {children}
    </button>
  );
}
