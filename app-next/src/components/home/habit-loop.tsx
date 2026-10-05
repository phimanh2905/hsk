"use client";

/* Habit loop 3 bước (port section habit-loop của opendesign index.html, spec 2026-10-04).
   Status tone: doing (đang làm) / todo (cần làm) / idle (chưa bắt đầu) — Chip tones Task 3.
   Dữ liệu đồng bộ hero qua useHomeSummary (event bye:progress).
   Hydration gate: trước mounted mọi giá trị useHomeSummary là EMPTY → lesson=null,
   srsDue=0, tone idle — server/client render giống nhau (đã gate thêm srsDue). */

import Link from "next/link";
import { BookOpen, Headphones, Layers, ICON_STROKE } from "@/components/ui/icon";
import { Chip } from "@/components/ui/chip";
import { IconTile } from "@/components/ui/icon-tile";
import { Progress } from "@/components/ui/progress";
import { useHomeSummary } from "@/lib/home-summary";

const linkMini = "inline-flex min-h-11 items-center gap-1.5 text-[13px] font-bold text-text-primary underline underline-offset-[3px] hover:text-action-primary";

export default function HabitLoop() {
  const s = useHomeSummary();
  const lesson = s.mounted ? s.lesson : null;
  const srsDue = s.mounted ? s.srsDue : 0;
  const srsTone = !s.mounted ? "idle" : s.srsDue > 0 ? "todo" : "idle";

  return (
    <section aria-label="Vòng lặp thói quen mỗi ngày">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-bold tracking-tight">Vòng lặp 3 thói quen hôm nay</h3>
        <p className="text-[12.5px] text-text-secondary">Ước tính: ~15 phút hoàn thành</p>
      </div>
      <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2 max-md:-mx-4 max-md:px-4 md:grid md:grid-cols-3 md:gap-4">
        {/* Bước 1 — bài học mới */}
        <article className="flex min-w-[250px] snap-start shrink-0 flex-col gap-2.5 rounded-card border border-border-default bg-surface-elevated p-[18px] shadow-xs transition-transform hover:-translate-y-1 hover:shadow-md md:min-w-0">
          <div className="flex items-start justify-between">
            <span className="flex items-center gap-2">
              <span className="grid h-[22px] w-[22px] place-items-center rounded-full border border-border-default bg-surface-elevated text-[11px] font-extrabold text-text-secondary">1</span>
              <IconTile tone="vermilion"><BookOpen size={18} strokeWidth={ICON_STROKE} aria-hidden="true" /></IconTile>
            </span>
            <Chip tone={lesson ? "doing" : "idle"} className="min-h-7 px-2.5 text-[11px] font-bold tracking-[0.08em]">
              {lesson ? "ĐANG THỰC HIỆN" : "CHƯA BẮT ĐẦU"}
            </Chip>
          </div>
          <h4 className="text-[14.5px] leading-snug">Bài học mới <span className="zh">· 新课</span></h4>
          <p className="text-[13px] leading-relaxed text-text-secondary">
            {lesson ? <>Đang học: <b className="text-text-primary">{lesson.title}</b> · đồng bộ với Hero.</> : "Chưa có bài đang học — bắt đầu từ khóa học đầu tiên."}
          </p>
          {lesson && (
            <div className="mt-auto flex items-center gap-2.5 rounded-control border border-border-default bg-surface-muted px-3 py-2.5">
              <Progress value={lesson.pct} ariaLabel="Tiến độ bài" className="flex-1 h-1.5" />
              <span className="text-xs font-extrabold">{lesson.pct}%</span>
            </div>
          )}
          <Link href={lesson ? `/lesson/${lesson.book}/${lesson.pageId}` : "/course"} className={`${linkMini} mt-auto`}>
            {lesson ? "Xem tóm tắt bài →" : "Chọn khóa học →"}
          </Link>
        </article>

        {/* Bước 2 — SRS */}
        <article className="flex min-w-[250px] snap-start shrink-0 flex-col gap-2.5 rounded-card border border-border-default bg-surface-elevated p-[18px] shadow-xs transition-transform hover:-translate-y-1 hover:shadow-md md:min-w-0">
          <div className="flex items-start justify-between">
            <span className="flex items-center gap-2">
              <span className="grid h-[22px] w-[22px] place-items-center rounded-full border border-border-default bg-surface-elevated text-[11px] font-extrabold text-text-secondary">2</span>
              <IconTile tone="amber"><Layers size={18} strokeWidth={ICON_STROKE} aria-hidden="true" /></IconTile>
            </span>
            <Chip tone={srsTone} className="min-h-7 px-2.5 text-[11px] font-bold tracking-[0.08em]">
              {srsDue > 0 ? `CẦN LÀM · ${srsDue}` : srsTone === "todo" ? "CẦN LÀM" : "CHƯA CÓ TỪ ĐẾN HẠN"}
            </Chip>
          </div>
          <h4 className="text-[14.5px] leading-snug">Ôn tập ngắt quãng <span className="zh">· 复习</span></h4>
          <p className="text-[13px] leading-relaxed text-text-secondary">
            {srsDue > 0 ? (
              <>{srsDue} từ đến hạn hôm nay · Tỉ lệ nhớ <b className="text-text-primary">{s.recallPct}%</b>.</>
            ) : (
              "Không có từ đến hạn — hãy lưu thêm từ mới vào SRS."
            )}
          </p>
          <Link
            href="/review"
            className="mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-border-default bg-surface-muted text-[13.5px] font-bold text-text-primary hover:bg-surface-elevated hover:border-border-strong focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
          >
            Ôn tập ngay
          </Link>
        </article>

        {/* Bước 3 — shadowing */}
        <article className="flex min-w-[250px] snap-start shrink-0 flex-col gap-2.5 rounded-card border border-border-default bg-surface-elevated p-[18px] shadow-xs transition-transform hover:-translate-y-1 hover:shadow-md md:min-w-0">
          <div className="flex items-start justify-between">
            <span className="flex items-center gap-2">
              <span className="grid h-[22px] w-[22px] place-items-center rounded-full border border-border-default bg-surface-elevated text-[11px] font-extrabold text-text-secondary">3</span>
              <IconTile tone="jade"><Headphones size={18} strokeWidth={ICON_STROKE} aria-hidden="true" /></IconTile>
            </span>
            <Chip tone="idle" className="min-h-7 px-2.5 text-[11px] font-bold tracking-[0.08em]">CHƯA BẮT ĐẦU</Chip>
          </div>
          <h4 className="text-[14.5px] leading-snug">Phản xạ âm thanh <span className="zh">· 跟读</span></h4>
          <p className="text-[13px] leading-relaxed text-text-secondary">Shadowing theo video: nghe — nhại — so sánh.</p>
          <Link
            href="/shadowing"
            className="mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-border-default bg-surface-muted text-[13.5px] font-bold text-text-primary hover:bg-surface-elevated hover:border-border-strong focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
          >
            Bắt đầu · 2 phút
          </Link>
        </article>
      </div>
    </section>
  );
}
