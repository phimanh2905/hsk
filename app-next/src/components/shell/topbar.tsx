"use client";

/* Topbar — port markup topbar từ clone/TEMPLATE.html + clone/js/shell.js:359-363.
   Logo + seal, Zap xp (useProgress), bell, nút Đăng nhập / avatar mock.
   Menu mở drawer sidebar (event "nhai:open-nav") cho màn < lg (bottom-nav lo điều hướng nhanh). */

import Link from "next/link";
import { Menu, Settings, Zap, ICON_STROKE } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { useProgress } from "@/lib/store/progress-store";
import { useSession } from "@/lib/use-session";
import { useLoginModal } from "./login-modal";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/social/notification-bell";

export default function Topbar() {
  const { xp } = useProgress();
  const { openLogin } = useLoginModal();
  const { loggedIn, name, logout } = useSession();

  const initials = (name.trim() || "T").slice(0, 2).toUpperCase();

  return (
    <header className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-border-default bg-surface-elevated">
      <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
        <span className="w-8 h-8 rounded-md bg-action-primary text-white flex items-center justify-center text-base font-extrabold zh">
          奈
        </span>
        <span>
          Nhai <span className="text-action-primary">HSK</span>
        </span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <span
          className="hidden xl:inline-flex items-center gap-1 text-xs font-semibold text-text-secondary"
          title="mỗi câu trả lời đúng +1"
        >
          <Zap size={14} strokeWidth={ICON_STROKE} aria-hidden="true" /> {xp} — mỗi câu trả lời đúng +1
        </span>
        <NotificationBell />
        {loggedIn ? (
          <>
            <span
              className="inline-flex items-center justify-center rounded-full border border-border-default min-h-11 min-w-11 font-bold"
              title={name}
            >
              {initials}
            </span>
            <Button variant="ghost" size="sm" onClick={logout}>
              Đăng xuất
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={openLogin}>
            Đăng nhập
          </Button>
        )}
        <IconButton
          label="Cài đặt"
          onClick={() => window.dispatchEvent(new CustomEvent("nhai:open-settings"))}
        >
          <Settings size={18} strokeWidth={ICON_STROKE} />
        </IconButton>
        <IconButton
          label="Menu"
          className="lg:hidden"
          onClick={() => window.dispatchEvent(new CustomEvent("nhai:open-nav"))}
        >
          <Menu size={18} strokeWidth={ICON_STROKE} />
        </IconButton>
      </div>
    </header>
  );
}
