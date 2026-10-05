"use client";

/* SidebarNav — port .sidebar của opendesign_hsk/app-shell.html (spec 2026-10-04 §4.2).
   Desktop lg: fixed 256px; dưới lg: off-canvas drawer mở qua event "nhai:open-nav"
   (hamburger ở topbar + nút More ở bottom-nav), đóng bằng scrim / Escape / click link.
   Active: nền action-primary/10 + rail trái 3px — dùng aria-current="page" thay class .active. */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, BookmarkCheck, Brain, Compass, Home, Pencil, Printer, Settings,
  Volume2, AudioLines, ICON_STROKE, type LucideIcon,
} from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { useHomeSummary } from "@/lib/home-summary";
import { useSession } from "@/lib/use-session";
import { useLoginModal } from "./login-modal";

const OPEN_NAV_EVENT = "nhai:open-nav";

const GROUPS: ReadonlyArray<{
  title: string;
  items: ReadonlyArray<{ href: string; label: string; Icon: LucideIcon; badge?: "srs" }>;
}> = [
  {
    title: "HỌC TẬP CỐT LÕI",
    items: [
      { href: "/", label: "Trang chủ", Icon: Home },
      { href: "/roadmap", label: "Lộ trình HSK", Icon: Compass },
      { href: "/review", label: "Ôn tập SRS", Icon: Brain, badge: "srs" },
    ],
  },
  {
    title: "KỸ NĂNG & LUYỆN TẬP",
    items: [
      { href: "/hanzi", label: "Hanzi Studio", Icon: Pencil },
      { href: "/shadowing", label: "Luyện nói & Đọc", Icon: AudioLines },
      { href: "/pinyin", label: "Bảng âm Pinyin", Icon: Volume2 },
    ],
  },
  {
    title: "CÁ NHÂN & CÔNG CỤ",
    items: [
      { href: "/my-vocab", label: "Sổ tay từ vựng", Icon: BookmarkCheck },
      { href: "/progress", label: "Thống kê tiến độ", Icon: BarChart3 },
      { href: "/create-file", label: "Tạo tập viết in", Icon: Printer },
    ],
  },
] as const;

export default function SidebarNav() {
  const pathname = usePathname();
  const { srsDue, mounted } = useHomeSummary();
  const { loggedIn, name } = useSession();
  const { openLogin } = useLoginModal();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openNav = () => setOpen(true);
    window.addEventListener(OPEN_NAV_EVENT, openNav);
    return () => window.removeEventListener(OPEN_NAV_EVENT, openNav);
  }, []);

  /* Escape đóng drawer + khoá scroll body khi mở. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  /* Đóng drawer khi route đổi mà KHÔNG qua link sidebar (router.push từ topbar, redirect).
     Gate bằng ref pathname trước đó: lần mount đầu prev === pathname → return sớm, không setState thừa. */
  const prevPath = useRef(pathname);
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    setOpen(false);
  }, [pathname]);

  const close = () => setOpen(false);
  const initials = (name.trim() || "T").slice(0, 2).toUpperCase();

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={close}
          className="fixed inset-0 z-[425] bg-black/50 lg:hidden"
        />
      )}
      <nav
        aria-label="Điều hướng chính"
        data-open={open ? "true" : "false"}
        className={
          "fixed inset-y-0 left-0 z-[430] flex w-64 flex-col border-r border-border-default " +
          "bg-[color-mix(in_srgb,var(--surface-elevated)_95%,transparent)] backdrop-blur-xl " +
          "transition-transform duration-300 lg:translate-x-0 " +
          // Đóng/mở exclusive: closed = trượt ra ngoài, open = trượt vào.
          (open ? "translate-x-0 shadow-md" : "-translate-x-full")
        }
      >
        {/* Brand — glyph 奈 của app (mock dùng 汉) */}
        <Link href="/" className="flex items-center gap-2.5 px-4 pb-3.5 pt-4">
          <span className="zh grid h-10 w-10 place-items-center rounded-control bg-text-primary text-[23px] font-extrabold leading-none text-surface-paper dark:bg-action-primary dark:text-white">
            奈
          </span>
          <span className="leading-tight">
            <b className="block text-[15px] font-bold">Nhai</b>
            <small className="block text-[11px] tracking-[0.08em] text-text-secondary">HSK LEARNING</small>
          </span>
        </Link>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {GROUPS.map((g) => (
            <div key={g.title} className="mt-6 first:mt-0">
              <h4 className="px-2.5 pb-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-text-secondary">
                {g.title}
              </h4>
              <ul className="flex flex-col gap-0.5">
                {g.items.map(({ href, label, Icon, badge }) => {
                  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
                  return (
                    <li key={href} className="relative">
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        onClick={close}
                        className={
                          "relative flex min-h-11 items-center gap-2.5 rounded-[12px] py-2 pl-3.5 pr-2.5 text-[13.5px] transition-colors " +
                          (active
                            ? "bg-action-primary/10 font-semibold text-action-primary"
                            : "font-medium text-text-secondary hover:bg-surface-muted hover:text-text-primary")
                        }
                      >
                        {active && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-action-primary"
                          />
                        )}
                        <Icon size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
                        {label}
                        {badge === "srs" && mounted && srsDue > 0 && (
                          <span className="ml-auto rounded-full bg-action-primary/10 px-2 py-0.5 text-[11px] font-bold text-action-primary">
                            {srsDue}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer — user-card session-driven + settings (event đã có listener) */}
        <div className="flex items-center gap-2.5 border-t border-border-default p-3">
          {loggedIn ? (
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-learning-mastered text-[13px] font-bold text-white">
                {initials}
              </span>
              <span className="min-w-0 leading-tight">
                <b className="block truncate text-[13px] font-bold">{name}</b>
                <small className="block truncate text-[11px] text-text-secondary">HSK 2 · Chặng 1/3</small>
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={openLogin}
              className="min-h-11 flex-1 rounded-control border border-border-default bg-surface-muted text-[13px] font-bold text-text-primary hover:bg-surface-elevated"
            >
              Đăng nhập
            </button>
          )}
          <IconButton
            label="Cài đặt"
            onClick={() => window.dispatchEvent(new CustomEvent("nhai:open-settings"))}
          >
            <Settings size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </IconButton>
        </div>
      </nav>
    </>
  );
}
