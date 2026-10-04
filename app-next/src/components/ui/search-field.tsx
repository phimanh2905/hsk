"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Search, ICON_STROKE } from "@/components/ui/icon";

/* Ô tìm kiếm topbar (port .search của opendesign index.html).
   Enter → /dictionary?q= (dictionary-client.tsx đã đọc useSearchParams "q").
   ⌘K/Ctrl+K focus — behaviour của mock, giữ nguyên. */
export function SearchField({ className }: { className?: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <label
      className={cn(
        "flex h-10 min-w-0 flex-1 items-center gap-2 rounded-control border border-border-default bg-surface-muted px-3",
        className,
      )}
    >
      <Search size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="shrink-0 text-text-secondary" />
      <input
        ref={inputRef}
        type="search"
        placeholder="Tìm từ vựng, bài học, ngữ pháp…"
        aria-label="Tìm kiếm"
        className="w-full border-0 bg-transparent text-[13.5px] text-text-primary outline-none placeholder:text-text-secondary"
        onKeyDown={(e) => {
          const q = e.currentTarget.value.trim();
          if (e.key === "Enter" && q) router.push("/dictionary?q=" + encodeURIComponent(q));
        }}
      />
      <kbd className="hidden shrink-0 rounded border border-border-default bg-surface-elevated px-1.5 py-0.5 font-mono text-[11px] text-text-secondary md:block">
        ⌘K
      </kbd>
    </label>
  );
}
