"use client";
import Link from "next/link";
import { LoginGate } from "@/components/personal/login-gate";
import { Heatmap } from "@/components/stats/heatmap";
import { useProgress, progressStore } from "@/lib/store/progress-store";
import { computeStreak, vnDay } from "@/lib/stats/heatmap";
import { Zap, Trophy, Flame, BookOpen, CircleCheck, Target, ICON_STROKE } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import type { LucideIcon } from "@/components/ui/icon";

/* Port renderLoggedIn từ clone/js/progress.js:155-212.
   UPG-2: rank = 14594 − xp là công thức placeholder — sẽ thay bằng rank từ server. */

const LINK_BTN =
  "inline-flex items-center justify-center rounded-control border font-semibold min-h-11 px-4 text-sm " +
  "bg-action-primary text-white border-transparent hover:bg-action-primary-hover active:bg-action-primary-active " +
  "focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2";

export default function ProgressClient() {
  const { xp } = useProgress();
  const rank = xp > 0 ? 14594 - xp : 14594;
  const heat = progressStore.getHeat() ?? {};
  const streak = Math.max(progressStore.getStreak(), computeStreak(heat, vnDay(new Date())));
  const knownWords = progressStore.getAllSrs().filter((s) => s.status === "learned" || s.status === "known").length;
  // UPG-2: clone đếm page có page_dones ≥ 2 skill; SP1 đếm mỗi page đã done (value = 1 per <book>/<page>).
  const doneLessons = progressStore.listPageDone().length;
  const todayCount = readToday();

  return (
    <LoginGate pageSub="Tiến độ học của bạn sẽ được đồng bộ sau khi đăng nhập.">
      {/* Card Điểm của bạn */}
      <Card className="p-6 mb-6">
        <div className="flex items-start gap-4 flex-wrap">
          <span
            className="w-12 h-12 rounded-control bg-learning-streak/15 border border-border-default flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Zap size={22} strokeWidth={ICON_STROKE} className="text-learning-streak" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold">Điểm của bạn</h2>
            <div className="text-5xl font-extrabold text-action-primary leading-tight">{xp}</div>
            <p className="text-xs text-text-secondary">Mỗi câu trả lời đúng +1 điểm</p>
          </div>
          <div className="ml-auto flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Trophy size={16} strokeWidth={ICON_STROKE} className="text-learning-streak" aria-hidden="true" />
              <span className="text-sm font-semibold">Dạng xếp hạng</span>
              <Chip className="bg-learning-streak/15 text-learning-streak border-learning-streak/40 font-extrabold">
                #{rank}
              </Chip>
            </div>
            <Link href="/leaderboard" className={LINK_BTN}>
              Xem bảng xếp hạng →
            </Link>
          </div>
        </div>
      </Card>
      {/* Thống kê học tập */}
      <h2 className="text-xl font-extrabold mb-3">Thống kê học tập</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Flame} iconCls="text-learning-streak" label="Chuỗi ngày học" value={String(streak)} sub="Học hôm nay để bắt đầu chuỗi" />
        <StatCard icon={BookOpen} iconCls="text-action-primary" label="Từ đã thuộc" value={String(knownWords)} sub="trên tổng 9789 từ" />
        <StatCard icon={CircleCheck} iconCls="text-learning-mastered" label="Bài hoàn thành" value={`${doneLessons}/153`} sub="Xong khi học đủ 2 chế độ" />
        <StatCard icon={Target} iconCls="text-learning-due" label="Hôm nay" value={`${todayCount} câu`} sub="Số câu trả lời đúng trong ngày" />
      </div>
      {/* Lịch học */}
      <Heatmap real={progressStore.getHeat()} />
    </LoginGate>
  );
}

function StatCard({ icon: IconCmp, iconCls, label, value, sub }: {
  icon: LucideIcon;
  iconCls: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <IconCmp size={18} strokeWidth={ICON_STROKE} className={iconCls} aria-hidden="true" />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <div className="text-3xl font-extrabold">{value}</div>
      <p className="text-xs text-text-secondary">{sub}</p>
    </Card>
  );
}

function readToday(): number {
  return progressStore.getToday();
}
