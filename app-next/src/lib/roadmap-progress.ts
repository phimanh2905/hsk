"use client";

/* Derive trạng thái trạm serpentine từ progressStore (spec 2026-10-04 §5).
   Thuần + mount-gate SSR-safe như lib/home-summary.ts. */

import { useEffect, useState } from "react";
import { roadmapLevels, type RoadmapLevel, type Station } from "@/content/roadmap-stations";
import { progressStore, type StationProgress } from "@/lib/store/progress-store";

export type StationState = "done" | "active" | "locked";

export type StationView = {
  station: Station;
  state: StationState;
  pct: number; // 0–100
  stars: number; // 0–3
};

export const PASS_PCT = 80;

/** Lộ trình Pinyin có 8 buổi (/roadmap/pinyin) — nền tảng cho level hsk-1. */
export const PINYIN_SESSIONS = 8;

export function deriveStationStates(
  level: RoadmapLevel,
  record: Record<string, StationProgress>,
  lessonDone?: (book: string, page: string) => boolean,
): StationView[] {
  // Tuần tự thuần theo thứ tự content: station đầu chưa done = active,
  // mọi station sau = locked. Milestone là 1 mắt xích bình thường — sửa bug
  // Trạm 6 không bao giờ mở (spec 2026-10-28 §4).
  let activeAssigned = false;
  return level.stations.map((station) => {
    const rec = record[station.id] ?? null;
    // Task 5: pct trạm = max(record, % bài done theo progressStore) — chỉ khi
    // trạm có lessons; trạm curated không lessons (milestone "m") giữ hành vi cũ.
    let pct = rec?.pct ?? 0;
    if (lessonDone) {
      const stationLessons = station.lessons ?? (station.lesson ? [station.lesson] : []);
      if (stationLessons.length > 0) {
        const done = stationLessons.filter((l) => lessonDone(l.book, l.page)).length;
        pct = Math.max(pct, Math.round((done / stationLessons.length) * 100));
      }
    }
    if (pct >= PASS_PCT) {
      return { station, state: "done" as const, pct, stars: rec?.stars ?? 0 };
    }
    if (!activeAssigned) {
      activeAssigned = true;
      return { station, state: "active" as const, pct, stars: rec?.stars ?? 0 };
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

/** Trạng thái cổng vào level: locked (chưa đạt) / open (được học) / exempt (pinyin xong, miễn gate). */
export type GateStatus = "locked" | "open" | "exempt";

/** ID gate trong bye.roadmap.gates.v1 — KHÔNG phải levelId ("hsk1" ≠ "hsk-1");
    EntryGate setRoadmapGate("hsk1") cũng dùng id này (Task 10 fix: gateStatus
    tra cứu theo levelId nên cổng không bao giờ mở dù đã pass). */
export const GATE_STORE_ID = "hsk1";

/** Store tối thiểu gateStatus cần (progressStore thỏa cấu trúc này). */
export type GateStore = {
  getRoadmapDone(): number[];
  getStationProgress(id: string): Record<string, StationProgress>;
  getRoadmapGate(id: string): { pct: number; at: number } | null;
};

/** Chỉ hsk-1 có gate (nền tảng pinyin). pinyinDoneCount ≥ 8 → exempt thay gate. */
export function gateStatus(levelId: string, store: GateStore, pinyinDoneCount: number): GateStatus {
  if (levelId !== "hsk-1") return "open";
  if (pinyinDoneCount >= PINYIN_SESSIONS) return "exempt";
  const gate = store.getRoadmapGate(GATE_STORE_ID);
  if (gate != null && gate.pct >= PASS_PCT) return "open";
  return "locked";
}

export function overallRoadmapPct(store: {
  getRoadmapDone(): number[];
  getStationProgress(id: string): Record<string, StationProgress>;
  /** Optional (Task 5 fix): % bài học đã học (markPageDone, chưa có station record)
      phải tính vào % toàn lộ trình — đồng bộ với banner level (spec §3.5). */
  getPageDone?(book: string, page: string): boolean;
}): number {
  // Task 5: trung bình có trọng số trên mọi level available — pinyin weight 8,
  // level khác weight = số trạm lesson; pct level = bannerSummary (bỏ hard-code hsk-2).
  const pinyinDone = store.getRoadmapDone().length;
  const doneCheck =
    store.getPageDone != null ? (book: string, page: string) => store.getPageDone!(book, page) : undefined;
  let weightSum = 0;
  let weightedPctSum = 0;
  for (const level of roadmapLevels) {
    if (level.status !== "available") continue;
    let weight: number;
    let pct: number;
    if (level.id === "pinyin") {
      weight = PINYIN_SESSIONS;
      pct = Math.round((pinyinDone / PINYIN_SESSIONS) * 100);
    } else {
      weight = level.stations.filter((s) => s.kind === "lesson").length;
      if (weight === 0) continue;
      const views = deriveStationStates(level, store.getStationProgress(level.id), doneCheck);
      pct = bannerSummary(level, views).pct;
    }
    weightSum += weight;
    weightedPctSum += weight * pct;
  }
  return weightSum > 0 ? Math.round(weightedPctSum / weightSum) : 0;
}

/* mounted=false trước effect → view rỗng khi SSR, không đọc localStorage lúc render.
   lessonDone (Task 5): merge % bài done của progressStore — chỉ bật sau mount. */
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
  const lessonDone = (book: string, page: string): boolean => {
    try {
      return progressStore.getPageDone(book, page);
    } catch {
      return false;
    }
  };
  return { views: deriveStationStates(level, record, mounted ? lessonDone : undefined), mounted };
}
