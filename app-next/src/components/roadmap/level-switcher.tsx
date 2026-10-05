"use client";

/* Level switcher topbar (port .levels của opendesign_hsk/roadmap.html) —
   mỏng bọc SegmentedTabs, giữ aria-pressed của primitive (spec §8). */
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import type { LevelId } from "@/content/roadmap-stations";

export function LevelSwitcher({
  levels,
  value,
  onChange,
  className,
}: {
  levels: ReadonlyArray<{ id: LevelId; label: string }>;
  value: LevelId;
  onChange: (id: LevelId) => void;
  className?: string;
}) {
  return (
    <SegmentedTabs
      label="Chọn cấp độ HSK"
      tabs={levels.map((l) => ({ key: l.id, label: l.label }))}
      value={value}
      onChange={onChange}
      className={className}
    />
  );
}
