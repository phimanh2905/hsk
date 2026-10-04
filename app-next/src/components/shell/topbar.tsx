"use client";

/* Topbar mới — port .topbar của opendesign index.html (spec 2026-10-04).
   Brand + SearchField (⌘K) + HSK goal switcher + StreakPill mini + theme toggle + avatar.
   Sidebar/menu drawer bị bỏ theo spec — bottom-nav + link trong trang lo điều hướng.
   Không còn NotificationBell (mock không có; file component giữ lại để tái dùng sau). */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Sun, ICON_STROKE } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { SearchField } from "@/components/ui/search-field";
import { StreakPill } from "@/components/ui/streak-pill";
import { useHomeSummary } from "@/lib/home-summary";
import { useSession } from "@/lib/use-session";
import { useTheme } from "./theme-provider";
import { useLoginModal } from "./login-modal";

const HSK_LEVELS = ["HSK 1", "HSK 2", "HSK 3", "HSK 4"];

export default function Topbar() {
  const { streak, mounted } = useHomeSummary();
  const { theme, setTheme } = useTheme();
  const { openLogin } = useLoginModal();
  const { loggedIn, name } = useSession();
  const [goal, setGoal] = useState("HSK 2");

  useEffect(() => {
    try {
      setGoal(localStorage.getItem("nhai.goal") ?? "HSK 2");
    } catch {
      /* im lặng */
    }
  }, []);

  const initials = (name.trim() || "T").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-[color-mix(in_srgb,var(--surface-paper)_88%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 md:px-6 md:py-3">
        <Link href="/" aria-label="Nhai home" className="flex shrink-0 items-center gap-2.5">
          <span className="zh grid h-9 w-9 place-items-center rounded-control bg-text-primary text-lg font-extrabold leading-none text-surface-paper dark:border dark:border-border-default dark:bg-surface-elevated dark:text-text-primary">
            奈
          </span>
          <span className="hidden min-[640px]:block text-[15px] font-bold leading-tight tracking-tight">
            Nhai
            <small className="block text-[11px] font-normal tracking-[0.08em] text-text-secondary">HSK LEARNING</small>
          </span>
        </Link>
        <SearchField className="hidden min-[900px]:flex" />
        <label className="hidden h-10 shrink-0 cursor-pointer items-center gap-2 rounded-control border border-border-default bg-surface-elevated pl-3 pr-2 text-[13px] font-bold min-[760px]:flex">
          <span className="h-2 w-2 rounded-full bg-learning-mastered" aria-hidden="true" />
          <span className="hidden min-[900px]:inline">Mục tiêu:</span>
          <select
            aria-label="Cấp độ HSK"
            value={goal}
            onChange={(e) => {
              setGoal(e.target.value);
              try {
                localStorage.setItem("nhai.goal", e.target.value);
              } catch {
                /* im lặng */
              }
            }}
            className="cursor-pointer border-0 bg-transparent font-bold text-text-primary outline-none"
          >
            {HSK_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {mounted && <StreakPill days={streak} className="hidden min-[760px]:inline-flex" />}
        <IconButton label="Chuyển chế độ sáng tối" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? (
            <Sun size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
          ) : (
            <Moon size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
          )}
        </IconButton>
        <button
          type="button"
          aria-label={loggedIn ? "Tài khoản" : "Đăng nhập"}
          title={loggedIn ? name || "Tài khoản" : "Đăng nhập"}
          onClick={() => (loggedIn ? window.dispatchEvent(new CustomEvent("nhai:open-settings")) : openLogin())}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-border-default bg-learning-mastered text-sm font-bold text-white"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
