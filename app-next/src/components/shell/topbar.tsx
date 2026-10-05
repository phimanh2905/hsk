"use client";

/* Topbar v2 — port .topbar của opendesign_hsk/app-shell.html (spec 2026-10-04 §4.3).
   Hamburger (mobile) + breadcrumb + SearchTrigger (⌘K → CommandPalette) + LevelPopover
   + StreakPill + theme. Brand & avatar chuyển sang SidebarNav theo mock.
   Key mục tiêu HSK do LevelPopover sở hữu duy nhất — Topbar không đọc/ghi. */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Moon, Search, Sun, ICON_STROKE } from "@/components/ui/icon";
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

  const today = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border-default bg-[color-mix(in_srgb,var(--surface-elevated)_80%,transparent)] backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-4 md:px-6">
          <button
            type="button"
            aria-label="Mở menu"
            onClick={() => window.dispatchEvent(new CustomEvent("bye:open-nav"))}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-control border border-border-default bg-surface-elevated text-text-primary lg:hidden"
          >
            <Menu size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1 lg:flex-none">
            <div className="truncate text-[14px] font-extrabold leading-tight">{pageTitle(pathname)}</div>
            {/* C2: ngày là dữ liệu thời gian — chỉ render sau mount để không lệch hydration
                (server UTC vs client ICT) và không đóng băng ngày lúc prerender (ruling mount-gate). */}
            {mounted && (
              <div className="hidden truncate text-[11px] capitalize text-text-secondary lg:block">{today}</div>
            )}
          </div>

          <button
            type="button"
            aria-label="Tìm kiếm"
            onClick={() => setPaletteOpen(true)}
            className="mx-auto flex min-h-11 w-auto max-w-[38vw] flex-1 items-center gap-2 rounded-control border border-border-default bg-surface-muted px-3 text-[13px] text-text-secondary lg:max-w-[288px]"
          >
            <Search size={15} strokeWidth={ICON_STROKE} aria-hidden="true" className="shrink-0" />
            <span className="truncate">Tìm từ vựng, bài học…</span>
            <kbd className="ml-auto hidden shrink-0 rounded-[6px] border border-border-default bg-surface-elevated px-1.5 py-0.5 text-[11px] md:block">⌘K</kbd>
          </button>

          <div className="ml-auto hidden shrink-0 lg:block">
            <LevelPopover />
          </div>
          {mounted && <StreakPill days={streak} unit="ngày" className="hidden shrink-0 lg:inline-flex" />}
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