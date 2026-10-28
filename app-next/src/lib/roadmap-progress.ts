"use client";

/* Derive trạng thái trạm serpentine từ progressStore (spec 2026-10-04 §5).
   Thuần + mount-gate SSR-safe như lib/home-summary.ts. */

import { useEffect, useState } from "react";
import { getRoadmapLevel, type RoadmapLevel, type Station } from "@/content/roadmap-stations";
import { progressStore, type StationProgress } from "@/lib/store/progress-store";

export type StationState = "done" | "active" | "locked";

export type StationView = {
  station: Station;
  state: StationState;
  pct: number; // 0–100
  stars: number; // 0–3
};

export const PASS_PCT = 80;

export function deriveStationStates(
  level: RoadmapLevel,
  record: Record<string, StationProgress>,
): StationView[] {
  // Tuần tự thuần theo thứ tự content: station đầu chưa done = active,
  // mọi station sau = locked. Milestone là 1 mắt xích bình thường — sửa bug
  // Trạm 6 không bao giờ mở (spec 2026-10-28 §4).
  let activeAssigned = false;
  return level.stations.map((station) => {
    const rec = record[station.id] ?? null;
    if (rec != null && rec.pct >= PASS_PCT) {
      return { station, state: "done" as const, pct: rec.pct, stars: rec.stars };
    }
    if (!activeAssigned) {
      activeAssigned = true;
      return { station, state: "active" as const, pct: rec?.pct ?? 0, stars: rec?.stars ?? 0 };
    }
    return { station, state: "locked" as const, pct: 0, stars: 0 };
  });
}

export type BannerSummary = {
  pct: number;
  currentTitle: string | null;
  remainingToMilestone: number | null;
};

export function bannerSummary(level: RoadmapLevel, views: StationView[]): BannerSummary {
  const lessons = views.filter((v) => v.station.kind === "lesson");
  const pct =
    lessons.length > 0
      ? Math.round(lessons.reduce((s, v) => s + v.pct, 0) / lessons.length)
      : 100;
  const current = views.find((v) => v.state === "active") ?? null;
  const milestoneIdx = level.stations.findIndex((s) => s.kind === "milestone");
  const remaining =
    milestoneIdx >= 0
      ? lessons.filter(
          (v) =>
            level.stations.findIndex((s) => s.id === v.station.id) < milestoneIdx &&
            v.state !== "done",
        ).length
      : null;
  return { pct, currentTitle: current ? `${current.station.no}: ${current.station.title}` : null, remainingToMilestone: remaining };
}

export function overallRoadmapPct(store: {
  getRoadmapDone(): number[];
  getStationProgress(id: string): Record<string, StationProgress>;
}): number {
  const PINYIN_SESSIONS = 8;
  const pinyinPct = Math.round((store.getRoadmapDone().length / PINYIN_SESSIONS) * 100);
  const hsk2 = getRoadmapLevel("hsk-2")!;
  const views = deriveStationStates(hsk2, store.getStationProgress(hsk2.id));
  const summary = bannerSummary(hsk2, views);
  return Math.round((pinyinPct + summary.pct) / 2);
}

/* mounted=false trước effect → view rỗng khi SSR, không đọc localStorage lúc render. */
export function useRoadmapProgress(level: RoadmapLevel): { views: StationView[]; mounted: boolean } {
  const [record, setRecord] = useState<Record<string, StationProgress>>({});
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const sync = () => {
      try {
        setRecord(progressStore.getStationProgress(level.id));
      } catch {
        setRecord({});
      }
    };
    sync();
    setMounted(true);
    window.addEventListener("bye:progress", sync);
    return () => window.removeEventListener("bye:progress", sync);
  }, [level.id]);
  return { views: deriveStationStates(level, record), mounted };
}
