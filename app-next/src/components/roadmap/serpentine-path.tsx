"use client";

/* Serpentine path (port .path-wrap của opendesign_hsk/roadmap.html):
   spine nét đứt giữa, grid [1fr 72px 1fr] xen kẽ trái/phải (side suy ra từ
   index — spec §4), <760px thu còn [56px 1fr] 1 cột. */
import { StationCard } from "./station-card";
import { StationNode } from "./station-node";
import type { StationView } from "@/lib/roadmap-progress";
import { cn } from "@/lib/cn";

export function SerpentinePath({
  views,
  onOpen,
  onContinue,
}: {
  views: StationView[];
  onOpen: (stationId: string) => void;
  onContinue: (stationId: string) => void;
}) {
  return (
    <div className="relative pt-2">
      {/* spine — aria-hidden, mobile dịch về left 28px (= 56px/2) */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 top-0 w-0 -translate-x-1/2 border-l-2 border-dashed border-border-default max-[760px]:left-7 max-[760px]:translate-x-0"
      />
      <div className="relative flex flex-col gap-1">
        {views.map((v, i) => {
          const side = i % 2 === 0 ? ("left" as const) : ("right" as const);
          const nodeLabel =
            v.station.kind === "milestone"
              ? `Milestone ôn tập chặng — ${v.state === "locked" ? "đang khóa" : v.state === "active" ? "đang học" : "hoàn thành"}`
              : `${v.station.no}: ${v.station.title} — ${v.state === "locked" ? "đang khóa" : v.state === "active" ? "đang học" : "hoàn thành"}`;
          const card = (
            <StationCard view={v} side={side} onOpen={onOpen} onContinue={onContinue} />
          );
          const slotClass =
            "min-w-0 max-[760px]:col-start-2 max-[760px]:row-start-1 max-[760px]:justify-self-stretch";
          return (
            <div
              key={v.station.id}
              className="grid min-h-[132px] grid-cols-[1fr_72px_1fr] items-center max-[760px]:min-h-0 max-[760px]:grid-cols-[56px_1fr] max-[760px]:py-2.5"
            >
              <div className={cn(slotClass, side === "left" && "justify-self-end")}>
                {side === "left" ? card : null}
              </div>
              <div className="relative z-[1] flex justify-center max-[760px]:col-start-1 max-[760px]:row-start-1">
                <StationNode
                  state={v.state}
                  milestone={v.station.kind === "milestone"}
                  label={nodeLabel}
                  onClick={() => onOpen(v.station.id)}
                />
              </div>
              <div className={cn(slotClass, side === "right" && "justify-self-start")}>
                {side === "right" ? card : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
