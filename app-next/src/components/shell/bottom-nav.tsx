"use client";

/* BottomNav — port .bottomnav của opendesign_hsk/app-shell.html (spec 2026-10-04 §4.5).
   5 mục: Home/Roadmap/Review/Hanzi/More; "More" mở drawer sidebar qua event "bye:open-nav".
   lg:hidden — dưới lg thì drawer + bottom-nav cùng tồn tại (đúng mock). */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, Ellipsis, Home, Map, PenTool, ICON_STROKE, type LucideIcon } from "@/components/ui/icon";
import { useHomeSummary } from "@/lib/home-summary";

const ITEMS: ReadonlyArray<{ href: string; label: string; Icon: LucideIcon; exact?: boolean; badge?: boolean }> = [
  { href: "/", label: "Home", Icon: Home, exact: true },
  { href: "/roadmap", label: "Roadmap", Icon: Map },
  { href: "/review", label: "Review", Icon: Brain, badge: true },
  { href: "/hanzi", label: "Hanzi", Icon: PenTool },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const { srsDue, mounted } = useHomeSummary();

  return (
    <nav
      aria-label="Điều hướng di động"
      className="fixed inset-x-0 bottom-0 z-[450] border-t border-border-default bg-[color-mix(in_srgb,var(--surface-elevated)_94%,transparent)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-[560px] grid-cols-5 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-1.5">
        {ITEMS.map(({ href, label, Icon, exact, badge }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                "relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-control text-[10.5px] font-bold " +
                (active ? "text-text-primary [&>svg]:text-action-primary" : "text-text-secondary")
              }
            >
              <Icon size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
              <span>{label}</span>
              {badge && mounted && srsDue > 0 && (
                <span className="absolute top-0.5 right-[calc(50%-22px)] grid h-4 min-w-4 place-items-center rounded-full bg-action-primary px-1 text-[10px] font-bold text-white">
                  {srsDue}
                </span>
              )}
            </Link>
          );
        })}
        <button
          type="button"
          aria-label="More"
          onClick={() => window.dispatchEvent(new CustomEvent("bye:open-nav"))}
          className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-control text-[10.5px] font-bold text-text-secondary"
        >
          <Ellipsis size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}