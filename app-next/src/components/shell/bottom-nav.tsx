"use client";

/* BottomNav — port .bottomnav của opendesign index.html (spec 2026-10-04).
   5 mục Home/Roadmap/Hanzi/Practice/Profile, hiện < md (mock: <760px).
   Active: icon màu action-primary + aria-current=page theo usePathname. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, PenTool, RotateCcw, User, type LucideIcon } from "@/components/ui/icon";

const ITEMS: ReadonlyArray<{ href: string; label: string; Icon: LucideIcon; exact?: boolean }> = [
  { href: "/", label: "Home", Icon: Home, exact: true },
  { href: "/roadmap", label: "Roadmap", Icon: Map },
  { href: "/hanzi", label: "Hanzi", Icon: PenTool },
  { href: "/review", label: "Practice", Icon: RotateCcw },
  { href: "/progress", label: "Profile", Icon: User },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="md:hidden fixed bottom-0 inset-x-0 z-[450] border-t border-border-default bg-[color-mix(in_srgb,var(--surface-elevated)_94%,transparent)] backdrop-blur-xl"
    >
      <div className="mx-auto grid max-w-[560px] grid-cols-5 px-2 pt-1.5 pb-[calc(8px+env(safe-area-inset-bottom))]">
        {ITEMS.map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                "flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-control text-[10.5px] font-bold " +
                (active ? "text-text-primary [&>svg]:text-action-primary" : "text-text-secondary")
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
