"use client";

/* Topbar — port markup topbar từ clone/TEMPLATE.html + clone/js/shell.js:359-363.
   Logo + seal đỏ, ⚡ xp (useProgress), data-bell-slot, nút Đăng nhập / avatar mock. */

import Link from "next/link";
import { useProgress } from "@/lib/store/progress-store";
import { useLoginModal, useMockLogin } from "./login-modal";
import { useToast } from "./toast-provider";
import NotificationBell from "@/components/social/notification-bell";

export default function Topbar() {
  const { xp } = useProgress();
  const { openLogin } = useLoginModal();
  const { loggedIn, name, logout } = useMockLogin();
  const toast = useToast();

  const initials = (name.trim() || "T").slice(0, 2).toUpperCase();

  return (
    <header className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b-2 border-[var(--nhai-border)] bg-[var(--nhai-card)]">
      <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
        <span className="w-8 h-8 rounded-md bg-[var(--nhai-main)] text-white flex items-center justify-center text-base font-extrabold zh">
          奈
        </span>
        <span>
          Nhai <span className="text-[var(--nhai-main)]">HSK</span>
        </span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <span
          className="hidden xl:inline-flex items-center gap-1 text-xs font-semibold text-[var(--nhai-muted)]"
          title="mỗi câu trả lời đúng +1"
        >
          ⚡ {xp} — mỗi câu trả lời đúng +1
        </span>
        <NotificationBell />
        {loggedIn ? (
          <>
            <span
              className="btn-ghost rounded-full w-9 h-9 inline-flex items-center justify-center font-bold"
              title={name}
            >
              {initials}
            </span>
            <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={logout}>
              Đăng xuất
            </button>
          </>
        ) : (
          <button type="button" className="btn-main px-3 py-2 text-sm" onClick={openLogin}>
            Đăng nhập
          </button>
        )}
        <button
          type="button"
          className="btn-ghost px-3 py-2 text-sm"
          onClick={() => window.dispatchEvent(new CustomEvent("nhai:open-settings"))}
        >
          ⚙️
        </button>
        <button
          type="button"
          className="btn-ghost px-3 py-2 text-sm md:hidden"
          onClick={() => toast("Dùng menu bên sidebar để điều hướng")}
        >
          ☰
        </button>
      </div>
    </header>
  );
}
