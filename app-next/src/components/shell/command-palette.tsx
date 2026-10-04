"use client";

/* Command palette ⌘K — port .palette của opendesign_hsk/app-shell.html (spec 2026-10-04 §4.4).
   Nguồn: route tĩnh + tiêu đề từ content/vocab; lọc substring, tối đa 8 kết quả.
   ⌘K/Ctrl+K do Topbar điều khiển (truyền open) — component này chỉ lo hiển thị.
   Palette con chỉ mount khi open → query tự reset mỗi lần mở (thay vì setState trong effect). */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildCommandIndex } from "./command-index";
import { CornerDownLeft, Search, ICON_STROKE } from "@/components/ui/icon";

const MAX_RESULTS = 8;

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <Palette onClose={onClose} />;
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const index = useMemo(() => buildCommandIndex(), []);

  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const needle = q.trim().toLowerCase();
  /* Lọc theo label + group + href như mock gộp (x.t + x.s) — "roadmap" ra "Lộ trình HSK",
     "pinyin" ra "Bảng âm Pinyin", "hsk" ra mọi bài. */
  const results = needle
    ? index.filter((it) => `${it.label} ${it.group} ${it.href}`.toLowerCase().includes(needle)).slice(0, MAX_RESULTS)
    : index.slice(0, MAX_RESULTS);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm nhanh"
      className="fixed inset-0 z-[460] flex items-start justify-center bg-black/50 p-4 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="w-[min(560px,92vw)] overflow-hidden rounded-card border border-border-default bg-surface-elevated shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-border-default px-4">
          <Search size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="shrink-0 text-text-secondary" />
          <input
            ref={inputRef}
            type="text"
            aria-label="Tìm kiếm"
            placeholder="Tìm trang hoặc từ vựng…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) go(results[0].href);
            }}
            className="h-12 w-full border-0 bg-transparent text-[14px] text-text-primary outline-none placeholder:text-text-secondary"
          />
          <kbd className="shrink-0 rounded border border-border-default px-1.5 py-0.5 text-[11px] text-text-secondary">Esc</kbd>
        </div>
        <ul className="max-h-[45vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-[13px] text-text-secondary">Không tìm thấy kết quả.</li>
          )}
          {results.map((it) => (
            <li key={it.href + it.label}>
              <a
                href={it.href}
                onClick={(e) => {
                  e.preventDefault();
                  go(it.href);
                }}
                className="flex min-h-11 items-center gap-3 rounded-control px-3 text-[13.5px] text-text-primary hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-3 ring-action-focus"
              >
                <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10.5px] font-bold uppercase text-text-secondary">
                  {it.group}
                </span>
                <span className="min-w-0 flex-1 truncate">{it.label}</span>
                <CornerDownLeft size={14} strokeWidth={ICON_STROKE} aria-hidden="true" className="text-text-secondary" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
