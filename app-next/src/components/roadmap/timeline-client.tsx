"use client";

/* Timeline 8 buổi khoá tuần tự — port từ clone/js/roadmap-pinyin.js (PLAN-21)
   + SPEC-21 §A: node dọc xen kẽ trái/phải trên desktop, 1 cột mobile.
   Trạng thái: sessionStatus(getRoadmapDone(), n) — mount-gate như SessionClient
   (SSG-safe: chỉ đọc localStorage sau mount). Locked: Lock icon + card mờ + tooltip hover.
   Unlock qua Bài kiểm tra của buổi trước (Task 27 ghi markRoadmapSession). */

import { useEffect, useState } from "react";
import Link from "next/link";
import { roadmapSessions } from "@/content/roadmap";
import { progressStore } from "@/lib/store/progress-store";
import { sessionStatus, type SessionStatus } from "@/lib/roadmap-status";
import { Lock, CircleCheck, Clock, Flag, ICON_STROKE } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

const TOTAL = 8;

export default function TimelineClient(): React.JSX.Element {
  const [mounted, setMounted] = useState(false);
  const [done, setDone] = useState<number[]>([]);

  useEffect(() => {
    setMounted(true);
    setDone(progressStore.getRoadmapDone());
  }, []);

  return (
    <div className="relative mt-10">
      {/* Đường dọc: mobile lệch trái theo circle; desktop giữa */}
      <div
        className="absolute top-2 bottom-2 left-7 md:left-1/2 md:-translate-x-1/2 w-0.5 bg-border-default"
        aria-hidden="true"
      />
      <div className="relative">
        {roadmapSessions.map((s, i) => {
          const st: SessionStatus = mounted ? sessionStatus(done, s.n) : s.n === 1 ? "current" : "locked";
          const left = i % 2 === 0;

          const circleCls =
            st === "done"
              ? "border-2 border-feedback-success text-feedback-success bg-surface-elevated"
              : st === "current"
                ? "border-4 border-action-primary text-action-primary bg-surface-elevated font-extrabold"
                : "border-2 border-border-default text-text-secondary bg-surface-paper";
          const circleText =
            st === "done" ? (
              <CircleCheck size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
            ) : st === "current" ? (
              s.n
            ) : (
              <Lock size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
            );

          const interactive = st !== "locked";
          const Inner = (
            <>
              {st === "current" ? (
                <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-action-primary text-white rounded-full px-2 py-0.5 mb-1">
                  Bạn đang ở đây
                </span>
              ) : null}
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">
                  {s.n}. {s.title}
                </h3>
                <span className="text-xs text-text-secondary shrink-0 inline-flex items-center gap-1">
                  <Clock size={12} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  {s.minutes} phút
                </span>
              </div>
              <p className="text-sm text-text-secondary mt-1 mb-2">{s.desc}</p>
              {st === "done" ? (
                <span className="text-xs font-bold text-feedback-success">✓ Hoàn thành</span>
              ) : st === "current" ? (
                <span className="text-xs font-bold text-action-primary">Chưa hoàn thành bài kiểm tra</span>
              ) : (
                <span className="text-xs text-text-secondary inline-flex items-center gap-1">
                  <Lock size={12} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  Buổi chưa mở khoá
                </span>
              )}
            </>
          );

          return (
            <div
              key={s.n}
              className="group relative flex items-start gap-4 mb-6 md:mb-8 md:min-h-[6.5rem]"
            >
              {/* Circle: mobile inline; desktop trên đường giữa */}
              <div
                className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center text-lg md:absolute md:left-1/2 md:-translate-x-1/2 md:top-4 ${circleCls}`}
              >
                {circleText}
              </div>

              {/* Card: xen kẽ trái/phải trên desktop (±3rem), mobile full-width */}
              <div
                className={`relative flex-1 md:flex-none md:w-[calc(50%-3.5rem)] z-10 ${
                  left ? "md:-translate-x-12" : "md:translate-x-12"
                }`}
              >
                {interactive ? (
                  <Link
                    href={`/roadmap/pinyin/session/${s.n}`}
                    className={cn(
                      "block cursor-pointer rounded-card border-2 p-4 bg-surface-elevated shadow-xs hover:shadow-md transition-shadow",
                      st === "current" ? "border-action-primary" : "border-border-default",
                    )}
                  >
                    {Inner}
                  </Link>
                ) : (
                  <div className="block rounded-card border-2 border-border-default p-4 bg-surface-elevated shadow-xs opacity-60 cursor-not-allowed">
                    {Inner}
                  </div>
                )}
                {st === "locked" ? (
                  <span className="hidden group-hover:block absolute z-20 left-16 md:left-auto md:right-full md:mr-3 top-0 w-64 rounded-card border border-border-default bg-surface-elevated p-3 text-xs leading-snug shadow-md">
                    Buổi chưa mở khoá — Hoàn thành Bài kiểm tra của Buổi {s.n - 1} để mở Buổi {s.n}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Kết thúc timeline */}
      <div className="flex flex-col items-center gap-1 mt-2">
        <div className="inline-flex items-center gap-2 border-2 border-action-primary rounded-control px-6 py-3 font-extrabold bg-surface-elevated shadow-xs">
          <Flag size={16} strokeWidth={ICON_STROKE} className="text-action-primary" aria-hidden="true" />
          {TOTAL} buổi · Hoàn thành chặng
        </div>
        <p className="text-sm text-text-secondary">
          Bạn mới học {(mounted ? done.length : 0)}/{TOTAL} buổi
        </p>
      </div>
    </div>
  );
}
