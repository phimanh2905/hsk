"use client";

/* Client island trang /roadmap (spec 2026-10-04 §6): state level theo ?level=,
   drawer theo stationId; mọi số derive từ useRoadmapProgress (SSR-safe). */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RoadmapTopbar } from "@/components/roadmap/roadmap-topbar";
import { MilestoneBanner } from "@/components/roadmap/milestone-banner";
import { SerpentinePath } from "@/components/roadmap/serpentine-path";
import { StationDrawer } from "@/components/roadmap/station-drawer";
import { getRoadmapLevel, type LevelId, type RoadmapLevel } from "@/content/roadmap-stations";
import { bannerSummary, overallRoadmapPct, useRoadmapProgress } from "@/lib/roadmap-progress";
import { progressStore } from "@/lib/store/progress-store";
import { ReviewCard } from "@/components/roadmap/review-card";
import { useToastSafe } from "@/components/shell/toast-provider";

/* Lộ trình Pinyin có 8 buổi (/roadmap/pinyin) — nền tảng cho level hsk-1. */
const PINYIN_SESSIONS = 8;

export default function RoadmapClient({ levels }: { levels: RoadmapLevel[] }) {
  const search = useSearchParams();
  const router = useRouter();
  const toast = useToastSafe();
  // ?level= sai/garbage → fallback hsk-2 (Review Focus #3)
  const level = getRoadmapLevel(search.get("level") ?? "") ?? getRoadmapLevel("hsk-2")!;
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const { views, mounted } = useRoadmapProgress(level);
  // HSK 1 không có station → tiến độ thật đọc từ store Pinyin, mount-gate (không đọc localStorage lúc render)
  const [pinyinDone, setPinyinDone] = useState(0);
  const [overall, setOverall] = useState(0);
  useEffect(() => {
    if (!mounted) return;
    const sync = () => {
      try {
        setPinyinDone(progressStore.getRoadmapDone().length);
      } catch {
        setPinyinDone(0);
      }
      try {
        setOverall(overallRoadmapPct(progressStore));
      } catch {
        setOverall(0);
      }
    };
    sync();
    window.addEventListener("bye:progress", sync);
    return () => window.removeEventListener("bye:progress", sync);
  }, [mounted]);
  const pinyinPct = Math.round((pinyinDone / PINYIN_SESSIONS) * 100);

  const summary = bannerSummary(level, views);
  const headerPct = mounted ? overall : 0;
  const doneCount = views.filter((v) => v.station.kind === "lesson" && v.state === "done").length;
  const lessonTotal = views.filter((v) => v.station.kind === "lesson").length;
  const activeView = views.find((v) => v.state === "active" && v.station.kind === "lesson") ?? null;
  const drawerView = views.find((v) => v.station.id === drawerId) ?? null;
  // Tiếp tục học: bài active có lesson → /lesson; không (milestone) → /course/hsk2; hết → không link
  const continueLesson = activeView?.station.lesson;
  const continueHref = activeView
    ? continueLesson
      ? `/lesson/${continueLesson.book}/${continueLesson.page}`
      : "/course/hsk2"
    : null;
  const allDone = views.length > 0 && views.every((v) => v.state === "done");

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
    const v = views.find((x) => x.station.id === id);
    const lesson = v?.station.lesson;
    router.push(lesson ? `/lesson/${lesson.book}/${lesson.page}` : "/course/hsk2");
  };

  return (
    <>
      <RoadmapTopbar levels={levels} value={level.id} onLevelChange={changeLevel} pct={headerPct} />
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
            pct={pinyinPct}
            ariaLabel={`Tiến độ ${level.title}`}
            currentLabel={
              pinyinDone === 0
                ? "Chưa bắt đầu · mở lộ trình Pinyin"
                : `Đã hoàn thành ${pinyinDone}/${PINYIN_SESSIONS} buổi · ôn tập giữ streak`
            }
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
              allDone ? (
                <>🎉 Hoàn thành toàn bộ trạm</>
              ) : summary.currentTitle ? (
                <>Trạm hiện tại: <b>{summary.currentTitle}</b></>
              ) : (
                "Chưa bắt đầu"
              )
            }
            endLabel={
              <span className="flex flex-col items-end gap-0.5">
                {continueHref && (
                  <Link href={continueHref} className="font-bold text-action-primary">
                    Tiếp tục học →
                  </Link>
                )}
                {activeView && summary.remainingToMilestone != null && (
                  <span>
                    Còn <b>{summary.remainingToMilestone} bài</b> tới mốc
                  </span>
                )}
              </span>
            }
          />
        )}
        <ReviewCard />
        {level.status !== "upcoming" && level.stations.length > 0 && (
          <SerpentinePath views={views} onOpen={openDrawer} onContinue={onContinue} />
        )}
        <StationDrawer view={drawerView} level={level} open={drawerId !== null} onClose={closeDrawer} />
      </main>
    </>
  );
}
