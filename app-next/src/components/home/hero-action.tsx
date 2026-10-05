"use client";

/* Hero — card hành động chính (port .hero của opendesign index.html, spec 2026-10-04).
   2 tab Lesson/SRS: lesson = bài vocab kế tiếp (logic ContinueCard cũ, giờ qua useHomeSummary);
   srs = số từ đến hạn. Watermark glyph + progress gradient jade→vermilion. */

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Play, ICON_STROKE } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { useHomeSummary } from "@/lib/home-summary";

/* CTA là <Link> (mock dùng điều hướng) — 2 hằng class thay cho Button size lg. */
const btnPrimary = "inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-transparent bg-action-primary px-6 text-[15px] font-semibold text-white hover:bg-action-primary-hover active:bg-action-primary-active focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2";
const btnGhost = "inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-border-default bg-surface-muted px-6 text-[15px] font-semibold text-text-primary hover:bg-surface-elevated hover:border-border-strong focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2";

type HeroTab = "lesson" | "srs";

export default function HeroAction() {
  const s = useHomeSummary();
  const [tab, setTab] = useState<HeroTab>("lesson");

  if (!s.mounted) return null;

  const isSrs = tab === "srs";
  const lesson = s.lesson;
  const srsPct = s.srsTotal > 0 ? Math.round(((s.srsTotal - s.srsDue) / s.srsTotal) * 100) : 0;

  return (
    <section
      aria-label="Hành động tiếp theo"
      className="relative overflow-hidden rounded-card border border-border-default bg-surface-elevated p-5 shadow-xs md:p-[22px]"
    >
      {/* watermark hanzi + wash gradient cuối card (port .hero-watermark + .hero::after) */}
      <span
        aria-hidden="true"
        className="zh pointer-events-none absolute -top-6 right-2 select-none text-[140px] font-extrabold leading-none text-text-primary opacity-[0.055] md:text-[210px]"
      >
        {isSrs ? "复" : "学"}
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[color-mix(in_srgb,var(--surface-muted)_55%,transparent)]"
      />

      <div className="relative z-[1] flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-muted px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">
          <span
            aria-hidden="true"
            className={
              "h-[7px] w-[7px] rounded-full " +
              (isSrs
                ? "bg-learning-streak shadow-[0_0_0_4px_color-mix(in_srgb,var(--hz-amber)_18%,transparent)]"
                : "bg-learning-mastered shadow-[0_0_0_4px_color-mix(in_srgb,var(--hz-jade)_18%,transparent)]")
            }
          />
          {isSrs ? `ÔN TẬP SRS · ${s.srsDue} TỪ ĐẾN HẠN` : lesson ? `ĐANG HỌC · BÀI ${parseInt(lesson.pageId.replace("lesson-", ""), 10) || 1}` : "BẮT ĐẦU HÀNH TRÌNH"}
        </span>
      </div>

      {isSrs || lesson ? (
        <>
          <h2 className="relative z-[1] mt-3 max-w-[22ch] text-xl font-bold leading-snug tracking-tight md:text-2xl">
            {isSrs ? (
              <>
                {s.srsDue} từ cần củng cố trí nhớ <span className="zh">复习</span>
              </>
            ) : (
              <>
                {lesson!.title} <span className="zh">学</span>
              </>
            )}
          </h2>
          <p className="relative z-[1] mt-2 text-[13.5px] text-text-secondary">
            {isSrs ? (
              <>
                Tỉ lệ nhớ <b className="text-text-primary">{s.recallPct}%</b> ·{" "}
                <b className="text-text-primary">{s.srsDue} từ</b> đến hạn hôm nay
              </>
            ) : (
              <>
                Tiến độ: <b className="text-text-primary">{lesson!.pct}%</b> hoàn thành
              </>
            )}
          </p>
          <div className="relative z-[1] my-4.5">
            <Progress
              value={isSrs ? srsPct : lesson!.pct}
              ariaLabel="Tiến độ bài học"
              gradient
              className="h-2"
            />
          </div>
          <div className="relative z-[1] flex flex-wrap items-center gap-3">
            <Link href={isSrs ? "/review" : `/lesson/${lesson!.book}/${lesson!.pageId}`} className={btnPrimary}>
              <Play size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="fill-current" />
              {isSrs ? "Ôn tập Flashcard ngay" : "Tiếp tục bài học"}
            </Link>
            <Link href="/my-vocab" className={btnGhost}>
              <BookOpen size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
              {isSrs ? "Xem sổ tay từ vựng" : "Xem danh sách từ"}
            </Link>
            <SegmentedTabs
              className="ml-auto w-full sm:ml-auto sm:w-auto"
              label="Chuyển trạng thái hero"
              tabs={[
                { key: "lesson", label: "Bài học" },
                { key: "srs", label: `Ôn tập SRS · ${s.srsDue}` },
              ]}
              value={tab}
              onChange={setTab}
            />
          </div>
        </>
      ) : (
        /* fallback: chưa có data — mời bắt đầu (Review Focus #1) */
        <div className="relative z-[1] mt-3">
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">
            Bắt đầu hành trình HSK của bạn <span className="zh">学</span>
          </h2>
          <p className="mt-2 text-[13.5px] text-text-secondary">Chọn khóa học đầu tiên — mỗi ngày một chút là đủ.</p>
          <Link href="/course" className={`${btnPrimary} mt-4`}>
            Bắt đầu ngay
          </Link>
          <SegmentedTabs
            className="mt-4"
            label="Chuyển trạng thái hero"
            tabs={[
              { key: "lesson", label: "Bài học" },
              { key: "srs", label: `Ôn tập SRS · ${s.srsDue}` },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
      )}
    </section>
  );
}
