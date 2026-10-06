"use client";

/* ScaffoldBar — chọn lớp trợ giúp đọc (port .scaffold bar của opendesign_hsk/reading.html)
   + checkbox "cuộn theo giọng đọc". Presentational, state do route/root giữ. */

import { SegmentedTabs } from "@/components/ui/segmented-tabs";

export type ScaffoldMode = "hanzi" | "pinyin" | "hanviet";

const MODES: ReadonlyArray<{ key: ScaffoldMode; label: string }> = [
  { key: "hanzi", label: "Hán tự" },
  { key: "pinyin", label: "Pinyin" },
  { key: "hanviet", label: "Hán Việt" },
];

export function ScaffoldBar({
  scaf,
  onScaf,
  follow,
  onFollow,
}: {
  scaf: ScaffoldMode;
  onScaf: (m: ScaffoldMode) => void;
  follow: boolean;
  onFollow: (v: boolean) => void;
}) {
  return (
    <div
      data-od-id="scaffold-bar"
      className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border-default bg-surface-elevated px-3 py-2"
    >
      <SegmentedTabs<ScaffoldMode>
        tabs={MODES}
        value={scaf}
        onChange={onScaf}
        label="Chế độ trợ giúp đọc"
      />
      <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-text-secondary select-none">
        <input
          type="checkbox"
          checked={follow}
          onChange={(e) => onFollow(e.target.checked)}
          className="h-4 w-4 accent-[color:var(--learning-mastered)]"
        />
        Cuộn theo giọng đọc
      </label>
    </div>
  );
}
