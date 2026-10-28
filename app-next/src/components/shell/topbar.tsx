"use client";

/* Topbar v2 — port .topbar của opendesign_hsk/app-shell.html (spec 2026-10-04 §4.3).
   Breadcrumb + SearchTrigger (⌘K → CommandPalette) + LevelPopover
   + StreakPill + theme. Brand & avatar chuyển sang SidebarNav theo mock.
   Key mục tiêu HSK do LevelPopover sở hữu duy nhất — Topbar không đọc/ghi. */

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Moon, Search, Sun, ICON_STROKE } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { LevelPopover } from "@/components/ui/level-popover";
import { StreakPill } from "@/components/ui/streak-pill";
import { useHomeSummary } from "@/lib/home-summary";
import { useTheme } from "./theme-provider";
import { CommandPalette } from "./command-palette";
import { pageTitle } from "./breadcrumb";

export default function Topbar() {
  const pathname = usePathname();
  const { streak, mounted } = useHomeSummary();
  const { theme, setTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  /* Trang studio shadowing tự nhận context video qua event (title/hsk/topic) —
     topbar là chủ sở hữu hiển thị, bar studio riêng đã bỏ (gộp 2 header thành 1). */
  const [studioCtx, setStudioCtx] = useState<{ title: string } | null>(null);
  const isStudio = pathname.startsWith("/shadowing/") && pathname !== "/shadowing";

  useEffect(() => {
    const onCtx = (e: Event) => {
      const d = (e as CustomEvent<{ title: string }>).detail;
      setStudioCtx(d ?? null);
    };
    window.addEventListener("bye:studio-title", onCtx);
    return () => {
      window.removeEventListener("bye:studio-title", onCtx);
      setStudioCtx(null);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border-default bg-[color-mix(in_srgb,var(--surface-elevated)_80%,transparent)] backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-4 md:px-6">
          <div className="min-w-0 flex-1 lg:max-w-[42%] lg:flex-none">
            {isStudio && studioCtx ? (
              <div className="flex min-w-0 items-center gap-1.5">
                <Link
                  href="/shadowing"
                  aria-label="Về Thư viện Shadowing"
                  className="inline-flex shrink-0 items-center gap-0.5 rounded-control px-1.5 py-1 text-[12px] font-bold text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-3 ring-action-focus"
                >
                  <ChevronLeft size={13} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  Thư viện
                </Link>
                <span className="hanzi min-w-0 truncate text-[14px] font-extrabold leading-tight">{studioCtx.title}</span>
              </div>
            ) : (
              <div className="truncate text-[14px] font-extrabold leading-tight">{pageTitle(pathname)}</div>
            )}
          </div>

          {/* Trigger mở CommandPalette — palette là "ô search thật" (overlay full).
              Semantic search sau này cũng vào đây, không cần input inline trên topbar. */}
          <IconButton label="Tìm kiếm" onClick={() => setPaletteOpen(true)} className="ml-auto lg:ml-0">
            <Search size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </IconButton>

          <div className="ml-auto hidden shrink-0 lg:block">
            <LevelPopover />
          </div>
          {mounted && <StreakPill days={streak} className="hidden shrink-0 lg:inline-flex" />}
          <IconButton label="Chuyển chế độ sáng tối" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? (
              <Sun size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
            ) : (
              <Moon size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
            )}
          </IconButton>
        </div>
      </header>
      {/* C1: palette phải nằm NGOÀI <header> — <header> có backdrop-blur-xl nên nó trở thành
          containing block của mọi con position:fixed, palette (fixed inset-0) sẽ bị giới hạn
          trong dải 64px của header. Vẫn thuộc component Topbar nên state của Topbar giữ nguyên. */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}