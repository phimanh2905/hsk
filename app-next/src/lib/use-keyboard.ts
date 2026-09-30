"use client";

/* useKeyboard — phím tắt toàn cục cho lesson mode, port onKey của clone/js/lesson-flashcard.js:155-164.
   Key map là event.key ("ArrowLeft", "a", "x"...). Bỏ qua khi target là input/textarea/select
   hoặc contentEditable (đang gõ text thì không trigger phím tắt). */

import { useEffect, useRef } from "react";

export function useKeyboard(handlers: Record<string, (e: KeyboardEvent) => void>): void {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable)) return;
      ref.current[e.key]?.(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
