"use client";

/* Card trạm (port .station của opendesign_hsk/roadmap.html) — 4 biến thể:
   done (3 sao), active (float-badge + mini-bar + CTA), locked (mờ), milestone
   (diamond gem trophy). Connector nét đứt card→node port qua after: pseudo
   (.station::after), mobile <760px thu 13px. */
import { Play, Star, Trophy, ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { StationView } from "@/lib/roadmap-progress";

function connectorClasses(side: "left" | "right"): string {
  return cn(
    "relative after:absolute after:top-1/2 after:border-t-2 after:border-dashed after:border-border-default after:content-['']",
    side === "left"
      ? "after:right-[-25px] after:w-[25px] max-[760px]:after:right-auto max-[760px]:after:left-[-13px] max-[760px]:after:w-[13px]"
      : "after:left-[-25px] after:w-[25px] max-[760px]:after:left-[-13px] max-[760px]:after:w-[13px]",
  );
}

export function StationCard({
  view,
  side,
  onOpen,
  onContinue,
}: {
  view: StationView;
  side: "left" | "right";
  onOpen: (stationId: string) => void;
  onContinue: (stationId: string) => void;
}) {
  const { station, state, pct, stars } = view;
  const base = cn(
    "w-full max-w-[340px] max-[760px]:max-w-none rounded-card border bg-surface-elevated p-4 text-left shadow-xs",
    "transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-md",
    connectorClasses(side),
    state === "active" && "border-2 border-action-primary",
    state === "locked" && "cursor-not-allowed bg-surface-muted opacity-85",
  );

  // Milestone: diamond gem + tiêu đề MILESTONE (port .mile-diamond)
  if (station.kind === "milestone") {
    return (
      <button type="button" onClick={() => onOpen(station.id)} className={base}>
        <span className="flex items-center gap-2.5">
          <span className="grid h-11 w-11 shrink-0 rotate-45 place-items-center rounded-xl border border-learning-streak bg-amber-wash">
            <Trophy size={18} strokeWidth={ICON_STROKE} className="-rotate-45 text-learning-streak" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-extrabold">MILESTONE: Ôn tập chặng &amp; Mini test</span>
            <span className="mt-1 block text-[12.5px] text-text-secondary">{station.meta}</span>
          </span>
        </span>
      </button>
    );
  }

  // Active: div vì bên trong có CTA button (như mock .station.current)
  if (state === "active") {
    return (
      <div className={base}>
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-action-primary px-3 py-1 text-[11px] font-extrabold tracking-[0.06em] text-white">
          <Star size={11} className="fill-current" aria-hidden="true" />
          {station.no.toUpperCase()} ĐANG HỌC · {pct}%
        </span>
        <h3 className="text-sm leading-snug">
          {station.title} <span className="zh font-bold text-text-secondary">{station.zh}</span>
        </h3>
        <p className="mt-1 text-[12.5px] text-text-secondary">
          Tiến độ: <b className="text-text-primary">{pct}%</b>
        </p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ring-track">
          <div className="h-full rounded-full bg-jade" style={{ width: `${pct}%` }} />
        </div>
        <button
          type="button"
          onClick={() => onContinue(station.id)}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-action-primary bg-action-primary px-4 text-[13.5px] font-bold text-white hover:bg-action-primary-hover"
        >
          <Play size={13} className="fill-current" aria-hidden="true" />
          Vào bài học
        </button>
      </div>
    );
  }

  // Done / locked: cả card là button mở drawer
  return (
    <button type="button" onClick={() => onOpen(station.id)} className={base}>
      <h3 className="text-sm leading-snug">
        {station.no}: {station.title} <span className="zh font-bold text-text-secondary">{station.zh}</span>
      </h3>
      <p className="mt-1 text-[12.5px] text-text-secondary">{station.meta}</p>
      {state === "done" && (
        <span className="mt-2 flex gap-0.5 text-amber-ink" aria-label={`Đạt ${stars}/3 sao`}>
          {[0, 1, 2].map((i) => (
            <Star key={i} size={13} className={cn(i < stars ? "fill-current" : "opacity-30")} aria-hidden="true" />
          ))}
        </span>
      )}
    </button>
  );
}
