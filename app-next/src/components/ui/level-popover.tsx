"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { ChevronDown, Check, ICON_STROKE } from "@/components/ui/icon";

const LEVELS = ["HSK 1", "HSK 2", "HSK 3", "HSK 4"] as const;
const GOAL_KEY = "bye.goal";

/* Popover chọn mục tiêu HSK — port .level-btn/.pop của opendesign_hsk/app-shell.html
   (spec 2026-10-04 §4.4). Dùng role=menu/menuitemradio + aria-checked, key localStorage
   "bye.goal" (mock dùng "hanzi:level" — cơ chế demo, không port). */
export function LevelPopover({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<string>("HSK 2");
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /* Đọc bye.goal lúc mount — setState nằm trong callback sync() (pattern useHomeSummary)
     để không dính react-hooks/set-state-in-effect; server vẫn render "HSK 2" → không lệch hydration. */
  useEffect(() => {
    const sync = () => {
      try {
        setLevel(localStorage.getItem(GOAL_KEY) ?? "HSK 2");
      } catch {
        /* localStorage bị chặn → giữ mặc định */
      }
    };
    sync();
  }, []);

  /* Click ngoài + Escape đóng (Review Focus #4). */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    /* F1: Escape đóng popover → trả focus về trigger, không rơi xuống <body>
       (cùng ý với focus restore của command-palette.tsx).
       F3 (final review): popover khi mở là chủ nhân duy nhất của Escape — đăng ký
       capture + stopPropagation để Escape không rò xuống các listener document/window
       khác (hotkey lesson qua useKeyboard trên window, exit modal, palette), tránh
       "bấm Escape vừa đóng popover vừa mở exit modal" trên /lesson flash mode. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const choose = (l: string) => {
    setLevel(l);
    setOpen(false);
    /* F1: chọn mục làm item đang focus bị unmount → trả focus về trigger. */
    triggerRef.current?.focus();
    try {
      localStorage.setItem(GOAL_KEY, l);
    } catch {
      /* silent */
    }
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Đổi cấp độ HSK"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-border-default bg-surface-elevated pl-3 pr-2.5 text-[13px] font-bold text-text-primary hover:border-border-strong"
      >
        <span className="h-2 w-2 rounded-full bg-learning-mastered" aria-hidden="true" />
        <span className="hidden min-[900px]:inline">Mục tiêu:</span>
        {level}
        <ChevronDown size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Cấp độ HSK"
          className="absolute top-[calc(100%+8px)] right-0 z-50 w-52 overflow-hidden rounded-control border border-border-default bg-surface-elevated p-1 shadow-md"
        >
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitemradio"
              aria-checked={l === level}
              onClick={() => choose(l)}
              className="flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-left text-[13px] font-semibold text-text-primary hover:bg-surface-muted"
            >
              <span className="h-2 w-2 rounded-full bg-learning-mastered" aria-hidden="true" />
              {l}
              {l === level && <span className="ml-auto text-[11px] text-text-secondary">· đang học</span>}
              <Check
                size={14}
                strokeWidth={ICON_STROKE}
                aria-hidden="true"
                className={cn("ml-auto", l === level ? "" : "hidden")}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
