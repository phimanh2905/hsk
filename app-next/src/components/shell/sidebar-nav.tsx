"use client";

/* SidebarNav — port clone/js/shell.js renderSidebar (SPEC-10).
   8 mục, dropdown con, active jade theo usePathname.
   Mobile: drawer mở từ topbar Menu (event "nhai:open-nav") — không còn nút floating. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  FileText,
  GraduationCap,
  Headphones,
  Home,
  Printer,
  Search,
  Target,
  X,
  ICON_STROKE,
  type LucideIcon,
} from "@/components/ui/icon";

type SubItem = { label: string; href: string };
type NavItem = {
  label: string;
  Icon: LucideIcon;
  href?: string;
  sub?: SubItem[];
};

const NAV: NavItem[] = [
  { label: "Trang chủ", Icon: Home, href: "/" },
  {
    label: "Nền tảng",
    Icon: GraduationCap,
    sub: [
      { label: "Bảng Pinyin", href: "/pinyin" },
      { label: "Luyện Pinyin", href: "/pinyin/practice" },
      { label: "214 Bộ Thủ", href: "/radicals" },
      { label: "Quy tắc chuyển âm", href: "/sound-rules" },
    ],
  },
  {
    label: "Cá nhân hoá",
    Icon: Target,
    sub: [
      { label: "Ôn tập", href: "/review" },
      { label: "Tiến độ học", href: "/progress" },
      { label: "Sổ tay từ vựng", href: "/my-vocab" },
    ],
  },
  {
    label: "Tra từ điển",
    Icon: Search,
    sub: [
      { label: "Tra từ điển", href: "/dictionary" },
      { label: "Phân tích Hán tự", href: "/hanzi" },
    ],
  },
  { label: "Shadowing", Icon: Headphones, href: "/shadowing" },
  { label: "Bài khoá", Icon: BookOpen, href: "/course" },
  { label: "Luyện thi chứng chỉ", Icon: FileText, href: "/certificate-test" },
  { label: "Tạo file", Icon: Printer, href: "/create-file" },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const open = () => setMobileOpen(true);
    window.addEventListener("nhai:open-nav", open);
    return () => window.removeEventListener("nhai:open-nav", open);
  }, []);

  const isActive = (it: NavItem) => {
    if (it.href) return pathname === it.href;
    return (it.sub || []).some((s) => pathname === s.href || pathname.startsWith(s.href + "/"));
  };

  const itemCls = (active: boolean) =>
    "w-14 min-h-11 rounded-control border border-transparent flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-semibold leading-tight text-center " +
    (active
      ? "bg-action-primary/10 text-action-primary"
      : "text-text-secondary hover:text-action-primary");

  const renderItems = () =>
    NAV.map((it, i) => {
      const active = isActive(it);
      if (it.sub) {
        return (
          <div key={it.label} className="relative">
            <button
              type="button"
              className={itemCls(active)}
              aria-expanded={openGroup === i}
              onClick={() => setOpenGroup(openGroup === i ? null : i)}
            >
              <it.Icon size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
              <span>{it.label} ›</span>
            </button>
            {openGroup === i && (
              <div className="bg-surface-elevated border border-border-default shadow-md rounded-card p-1 z-[500] fixed left-[76px] w-52">
                {it.sub.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    onClick={() => {
                      setOpenGroup(null);
                      setMobileOpen(false);
                    }}
                    className={
                      "block px-3 py-2 rounded-control text-sm font-medium hover:bg-action-primary/10 whitespace-nowrap" +
                      (pathname === s.href ? " bg-action-primary/10 text-action-primary" : "")
                    }
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      }
      return (
        <Link
          key={it.label}
          href={it.href as string}
          className={itemCls(active)}
          onClick={() => setMobileOpen(false)}
          title={it.label}
        >
          <it.Icon size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
          <span>{it.label}</span>
        </Link>
      );
    });

  return (
    <>
      {/* desktop rail 72px */}
      <aside
        data-sidebar
        className="hidden lg:flex fixed left-0 top-0 h-full w-[72px] z-[400] flex-col items-center gap-1 py-3 bg-surface-elevated border-r border-border-default overflow-y-auto"
      >
        <Link href="/" className="flex flex-col items-center gap-1 mb-2 shrink-0" title="Nhai HSK — Trang chủ">
          <span className="w-9 h-9 rounded-md bg-action-primary text-white flex items-center justify-center text-lg font-extrabold zh">
            奈
          </span>
          <span className="text-[10px] font-extrabold tracking-tight">
            Nhai<span className="text-action-primary">HSK</span>
          </span>
        </Link>
        {renderItems()}
      </aside>

      {/* mobile drawer — mở từ topbar Menu (event "nhai:open-nav") */}
      {mobileOpen && (
        <div
          data-mobile-nav
          className="lg:hidden fixed inset-0 z-[440] bg-black/40"
          onClick={() => setMobileOpen(false)}
        >
          <nav
            className="absolute left-0 top-0 h-full w-60 bg-surface-elevated border-r border-border-default p-3 flex flex-col gap-1 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2 pr-1">
              <span className="font-extrabold">Nhai HSK</span>
              <button
                type="button"
                className="inline-flex items-center justify-center min-h-11 min-w-11 text-text-secondary"
                aria-label="Đóng menu"
                onClick={() => setMobileOpen(false)}
              >
                <X size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </button>
            </div>
            {renderItems()}
          </nav>
        </div>
      )}
    </>
  );
}
