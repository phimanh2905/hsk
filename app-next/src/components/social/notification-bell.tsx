"use client";

import { useEffect, useRef, useState } from "react";

/* 3 thông báo demo cứng — port NOTIFS từ clone/js/shell.js:254-258 (UPG-2 sẽ thay bằng GET /users/notifications) */
const NOTIFS = [
  { icon: "📘", text: "Bài mới: HSK 1 — Bài 1 Đồ ăn đã mở", href: "/reading" },
  { icon: "🔔", text: "Nhắc học: hoàn thành 10 từ ôn tập hôm nay", href: "/review" },
  { icon: "🏆", text: "Bạn đã vào top 10 Bảng xếp hạng XP tuần này", href: "/leaderboard?tab=xp" },
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
      <button type="button" className="btn-ghost w-9 h-9" title="Thông báo" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        🔔
      </button>
      {open ? (
        <div className="card shadow-neo fixed right-4 top-16 w-80 p-1 z-[500]">
          <div className="px-3 py-2 text-sm font-extrabold border-b-2 border-[var(--nhai-border)] mb-1">Thông báo</div>
          {NOTIFS.map((n) => (
            <a key={n.href} href={n.href} className="block px-3 py-2.5 rounded-md text-sm hover:bg-[var(--nhai-soft)] border-b border-[var(--nhai-border)] last:border-b-0">
              <span aria-hidden="true">{n.icon}</span> {n.text}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
