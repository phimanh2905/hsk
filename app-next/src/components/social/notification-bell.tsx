"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BookOpen, Trophy, ICON_STROKE, type LucideIcon } from "@/components/ui/icon";

/* 3 thông báo demo cứng — port NOTIFS từ clone/js/shell.js:254-258 (UPG-2 sẽ thay bằng GET /users/notifications) */
const NOTIFS: Array<{ icon: LucideIcon; text: string; href: string }> = [
  { icon: BookOpen, text: "Bài mới: HSK 1 — Bài 1 Đồ ăn đã mở", href: "/reading" },
  { icon: Bell, text: "Nhắc học: hoàn thành 10 từ ôn tập hôm nay", href: "/review" },
  { icon: Trophy, text: "Bạn đã vào top 10 Bảng xếp hạng XP tuần này", href: "/leaderboard?tab=xp" },
];

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-control min-h-11 min-w-11 text-text-secondary hover:text-action-primary"
        title="Thông báo"
        aria-label="Thông báo"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} strokeWidth={ICON_STROKE} />
      </button>
      {open ? (
        <div className="bg-surface-elevated border border-border-default shadow-md rounded-card fixed right-4 top-16 w-80 p-1 z-[500]">
          <div className="px-3 py-2 text-sm font-extrabold border-b border-border-default mb-1">
            Thông báo
          </div>
          {NOTIFS.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="flex items-start gap-2 px-3 py-2.5 rounded-control text-sm hover:bg-action-primary/10 border-b border-border-subtle last:border-b-0"
            >
              <n.icon size={16} strokeWidth={ICON_STROKE} className="mt-0.5 shrink-0 text-text-secondary" aria-hidden="true" />
              {n.text}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
