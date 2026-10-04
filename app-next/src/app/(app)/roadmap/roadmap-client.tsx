"use client";

/* Client island trang /roadmap (spec 2026-10-04 §6): state level theo ?level=,
   drawer theo stationId; mọi số derive từ useRoadmapProgress (SSR-safe). */
import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RoadmapTopbar } from "@/components/roadmap/roadmap-topbar";
import { MilestoneBanner } from "@/components/roadmap/milestone-banner";
import { SerpentinePath } from "@/components/roadmap/serpentine-path";
import { StationDrawer } from "@/components/roadmap/station-drawer";
import { getRoadmapLevel, type LevelId, type RoadmapLevel } from "@/content/roadmap-stations";
import { bannerSummary, useRoadmapProgress } from "@/lib/roadmap-progress";
import { useToastSafe } from "@/components/shell/toast-provider";

export default function RoadmapClient({ levels }: { levels: RoadmapLevel[] }) {
  const search = useSearchParams();
  const router = useRouter();
  const toast = useToastSafe();
  // ?level= sai/garbage → fallback hsk-2 (Review Focus #3)
  const level = getRoadmapLevel(search.get("level") ?? "") ?? getRoadmapLevel("hsk-2")!;
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const { views, mounted } = useRoadmapProgress(level);

  const summary = bannerSummary(level, views);
  const doneCount = views.filter((v) => v.station.kind === "lesson" && v.state === "done").length;
  const lessonTotal = views.filter((v) => v.station.kind === "lesson").length;
  const activeView = views.find((v) => v.state === "active" && v.station.kind === "lesson") ?? null;
  const drawerView = views.find((v) => v.station.id === drawerId) ?? null;

  const closeDrawer = useCallback(() => setDrawerId(null), []);

  const changeLevel = (id: LevelId) => {
    router.replace(`/roadmap?level=${id}`, { scroll: false });
    toast(`Đã chuyển sang ${getRoadmapLevel(id)?.label ?? id}`);
  };

  const openDrawer = (id: string) => {
    const v = views.find((x) => x.station.id === id);
    if (v && v.state === "locked" && activeView) {
      toast(`Trạm đang khóa — xong ${activeView.station.no} để mở`);
    }
    setDrawerId(id);
  };

  const onContinue = (id: string) => {
    const no = views.find((v) => v.station.id === id)?.station.no ?? "bài học";
    toast(`Vào ${no} — chúc học tốt!`);
  };

  return (
    <>
      <RoadmapTopbar levels={levels} value={level.id} onLevelChange={changeLevel} pct={mounted ? summary.pct : 0} />
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-6 pb-20 pt-4 max-[640px]:px-4">
        {level.status === "upcoming" ? (
          <MilestoneBanner
            kicker={level.kicker}
            title={level.title}
            sub={<>Lộ trình <b>sắp ra mắt</b> · Demo hiện tập trung HSK 1–3</>}
            pct={0}
            ariaLabel={`Tiến độ ${level.title}`}
            currentLabel={<>Trạng thái: <b>Chưa mở</b></>}
            endLabel="Theo dõi cập nhật"
          />
        ) : level.stations.length === 0 ? (
          <MilestoneBanner
            kicker={level.kicker}
            title={level.title}
            sub={<>Nền tảng <b>Pinyin &amp; nét cơ bản</b> — 8 buổi phát âm</>}
            pct={100}
            ariaLabel={`Tiến độ ${level.title}`}
            currentLabel="Đã hoàn thành · ôn tập giữ streak"
            endLabel={
              <Link href="/roadmap/pinyin" className="font-bold text-action-primary">
                Xem lộ trình Pinyin →
              </Link>
            }
          />
        ) : (
          <MilestoneBanner
            kicker={level.kicker}
            title={level.title}
            sub={<>Đã đạt: <b>{doneCount}/{lessonTotal} bài</b> hoàn thành ({summary.pct}%)</>}
            pct={summary.pct}
            ariaLabel={`Tiến độ ${level.title}`}
            currentLabel={
              summary.currentTitle ? (
                <>Trạm hiện tại: <b>{summary.currentTitle}</b></>
              ) : (
                "Chưa bắt đầu"
              )
            }
            endLabel={
              summary.remainingToMilestone != null ? (
                <>Còn <b>{summary.remainingToMilestone} bài</b> tới mốc kiểm tra</>
              ) : null
            }
          />
        )}
        {level.status !== "upcoming" && level.stations.length > 0 && (
          <SerpentinePath views={views} onOpen={openDrawer} onContinue={onContinue} />
        )}
        <StationDrawer view={drawerView} open={drawerId !== null} onClose={closeDrawer} />
      </main>
    </>
  );
}
