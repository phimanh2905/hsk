"use client";

/* Derive trạng thái trạm serpentine từ progressStore (spec 2026-10-04 §5).
   Thuần + mount-gate SSR-safe như lib/home-summary.ts. */

import { useEffect, useState } from "react";
import type { RoadmapLevel, Station } from "@/content/roadmap-stations";
import { progressStore, type StationProgress } from "@/lib/store/progress-store";

export type StationState = "done" | "active" | "locked";

export type StationView = {
  station: Station;
  state: StationState;
  pct: number; // 0–100
  stars: number; // 0–3
};

export function deriveStationStates(
  level: RoadmapLevel,
  record: Record<string, StationProgress>,
): StationView[] {
  let allLessonsDone = true;
  const base = level.stations.map((station) => {
    const rec = record[station.id] ?? null;
    if (station.kind === "milestone") {
      return { station, rec, done: rec != null && rec.pct >= 100, isLesson: false };
    }
    const done = rec != null && rec.pct >= 100;
    if (!done) allLessonsDone = false;
    return { station, rec, done, isLesson: true };
  });

  let activeAssigned = false;
  return base.map(({ station, rec, done, isLesson }) => {
    if (!isLesson) {
      // Milestone chỉ mở khi toàn bộ lesson xong (Review Focus #4)
      if (done && allLessonsDone) return { station, state: "done", pct: 100, stars: rec?.stars ?? 0 };
      if (allLessonsDone) return { station, state: "active", pct: 0, stars: 0 };
      return { station, state: "locked", pct: 0, stars: 0 };
    }
    if (done) return { station, state: "done", pct: 100, stars: rec?.stars ?? 0 };
    if (!activeAssigned) {
      activeAssigned = true;
      return { station, state: "active", pct: rec?.pct ?? 0, stars: rec?.stars ?? 0 };
    }
    return { station, state: "locked", pct: 0, stars: 0 };
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
  const current = views.find((v) => v.state === "active" && v.station.kind === "lesson") ?? null;
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
    window.addEventListener("nhai:progress", sync);
    return () => window.removeEventListener("nhai:progress", sync);
  }, [level.id]);
  return { views: deriveStationStates(level, record), mounted };
}
