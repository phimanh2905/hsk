"use client";

/* BottomNav — điều hướng mobile (lg:hidden), thay drawer sidebar ở Task 3.
   5 mục chính, active = text-action-primary theo usePathname (prefix match, "/" exact). */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, GraduationCap, Home, RotateCcw, User, type LucideIcon } from "@/components/ui/icon";

const ITEMS: ReadonlyArray<{ href: string; label: string; Icon: LucideIcon; exact?: boolean }> = [
  { href: "/", label: "Trang chủ", Icon: Home, exact: true },
  { href: "/lesson", label: "Học", Icon: GraduationCap },
  { href: "/review", label: "Ôn tập", Icon: RotateCcw },
  { href: "/reading", label: "Đọc", Icon: BookOpen },
  { href: "/progress", label: "Hồ sơ", Icon: User },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="lg:hidden fixed bottom-0 inset-x-0 z-[450] bg-surface-elevated border-t border-border-default"
    >
      <div className="flex items-stretch justify-around">
        {ITEMS.map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium " +
                (active ? "text-action-primary" : "text-text-secondary")
              }
            >
              <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
