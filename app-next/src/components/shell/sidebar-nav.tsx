"use client";

/* SidebarNav — port clone/js/shell.js renderSidebar (SPEC-10).
   8 mục, dropdown con, active đỏ theo usePathname, mobile hamburger. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type SubItem = { label: string; href: string };
type NavItem = {
  label: string;
  icon: string;
  href?: string;
  sub?: SubItem[];
};

const NAV: NavItem[] = [
  { label: "Trang chủ", icon: "🏠", href: "/" },
  {
    label: "Nền tảng",
    icon: "📚",
    sub: [
      { label: "Bảng Pinyin", href: "/pinyin" },
      { label: "Luyện Pinyin", href: "/pinyin/practice" },
      { label: "214 Bộ Thủ", href: "/radicals" },
      { label: "Quy tắc chuyển âm", href: "/sound-rules" },
    ],
  },
  {
    label: "Cá nhân hoá",
    icon: "🎯",
    sub: [
      { label: "Ôn tập", href: "/review" },
      { label: "Tiến độ học", href: "/progress" },
      { label: "Sổ tay từ vựng", href: "/my-vocab" },
    ],
  },
  {
    label: "Tra từ điển",
    icon: "🔍",
    sub: [
      { label: "Tra từ điển", href: "/dictionary" },
      { label: "Phân tích Hán tự", href: "/hanzi" },
    ],
  },
  { label: "Shadowing", icon: "🎧", href: "/shadowing" },
  { label: "Bài khoá", icon: "📖", href: "/course" },
  { label: "Luyện thi chứng chỉ", icon: "📝", href: "/certificate-test" },
  { label: "Tạo file", icon: "🖨️", href: "/create-file" },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (it: NavItem) => {
    if (it.href) return pathname === it.href;
    return (it.sub || []).some((s) => pathname === s.href || pathname.startsWith(s.href + "/"));
  };

  const itemCls = (active: boolean) =>
    "w-14 py-1.5 rounded-lg border-2 flex flex-col items-center gap-0.5 text-[10px] font-semibold leading-tight text-center " +
    (active
      ? "bg-[var(--nhai-soft)] border-[var(--nhai-border)] text-[var(--nhai-main)]"
      : "border-transparent text-[var(--nhai-muted)] hover:text-[var(--nhai-main)] hover:border-[var(--nhai-border)]");

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
              <span className="text-lg" aria-hidden="true">
                {it.icon}
              </span>
              <span>{it.label} ›</span>
            </button>
            {openGroup === i && (
              <div className="card shadow-neo p-1 z-[500] fixed left-[76px] w-52">
                {it.sub.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    onClick={() => {
                      setOpenGroup(null);
                      setMobileOpen(false);
                    }}
                    className={
                      "block px-3 py-2 rounded-md text-sm font-medium hover:bg-[var(--nhai-soft)] whitespace-nowrap" +
                      (pathname === s.href ? " bg-[var(--nhai-soft)] text-[var(--nhai-main)]" : "")
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
          <span className="text-lg" aria-hidden="true">
            {it.icon}
          </span>
          <span>{it.label}</span>
        </Link>
      );
    });

  return (
    <>
      {/* desktop rail 72px */}
      <aside
        data-sidebar
        className="hidden lg:flex fixed left-0 top-0 h-full w-[72px] z-[400] flex-col items-center gap-1 py-3 bg-[var(--nhai-card)] border-r-2 border-[var(--nhai-border)] overflow-y-auto"
      >
        <Link href="/" className="flex flex-col items-center gap-1 mb-2 shrink-0" title="Nhai HSK — Trang chủ">
          <span className="w-9 h-9 rounded-md bg-[var(--nhai-main)] text-white flex items-center justify-center text-lg font-extrabold zh">
            奈
          </span>
          <span className="text-[10px] font-extrabold tracking-tight">
            Nhai<span className="text-[var(--nhai-main)]">HSK</span>
          </span>
        </Link>
        {renderItems()}
      </aside>

      {/* mobile hamburger */}
      <button
        type="button"
        className="lg:hidden fixed left-3 bottom-4 z-[450] btn-main w-11 h-11 rounded-full"
        aria-label="Mở menu"
        onClick={() => setMobileOpen((v) => !v)}
      >
        ☰
      </button>
      {mobileOpen && (
        <div
          data-mobile-nav
          className="lg:hidden fixed inset-0 z-[440] bg-black/40"
          onClick={() => setMobileOpen(false)}
        >
          <nav
            className="absolute left-0 top-0 h-full w-60 bg-[var(--nhai-card)] border-r-2 border-[var(--nhai-border)] p-3 flex flex-col gap-1 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {renderItems()}
          </nav>
        </div>
      )}
    </>
  );
}
