"use client";
import Link from "next/link";
import { LoginGate } from "@/components/personal/login-gate";
import { Heatmap } from "@/components/stats/heatmap";
import { useProgress, progressStore } from "@/lib/store/progress-store";
import { computeStreak, vnDay } from "@/lib/stats/heatmap";

/* Port renderLoggedIn từ clone/js/progress.js:155-212.
   UPG-2: rank = 14594 − xp là công thức placeholder — sẽ thay bằng rank từ server. */
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
      <div className="card shadow-neo p-6 mb-6">
        <div className="flex items-start gap-4 flex-wrap">
          <span className="w-12 h-12 rounded-lg bg-[#ffe9a8] border-2 border-[var(--nhai-border)] flex items-center justify-center text-2xl shrink-0" aria-hidden="true">⚡</span>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold">Điểm của bạn</h2>
            <div className="text-5xl font-extrabold text-[var(--nhai-main)] leading-tight">{xp}</div>
            <p className="text-xs text-[var(--nhai-muted)]">Mỗi câu trả lời đúng +1 điểm</p>
          </div>
          <div className="ml-auto flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" aria-hidden="true">🏆</span>
              <span className="text-sm font-semibold">Dạng xếp hạng</span>
              <span className="pill bg-[#ffe9a8] font-extrabold">#{rank}</span>
            </div>
            <Link href="/leaderboard" className="btn-main px-4 py-2 text-sm">Xem bảng xếp hạng →</Link>
          </div>
        </div>
      </div>
      {/* Thống kê học tập */}
      <h2 className="text-xl font-extrabold mb-3">Thống kê học tập</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🔥" label="Chuỗi ngày học" value={String(streak)} sub="Học hôm nay để bắt đầu chuỗi" />
        <StatCard icon="📖" label="Từ đã thuộc" value={String(knownWords)} sub="trên tổng 9789 từ" />
        <StatCard icon="✅" label="Bài hoàn thành" value={`${doneLessons}/153`} sub="Xong khi học đủ 2 chế độ" />
        <StatCard icon="🎯" label="Hôm nay" value={`${todayCount} câu`} sub="Số câu trả lời đúng trong ngày" />
      </div>
      {/* Lịch học */}
      <Heatmap real={progressStore.getHeat()} />
    </LoginGate>
  );
}

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div className="card shadow-neo p-4">
      <div className="flex items-center gap-2 mb-2">
        <span aria-hidden="true">{icon}</span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <div className="text-3xl font-extrabold">{value}</div>
      <p className="text-xs text-[var(--nhai-muted)]">{sub}</p>
    </div>
  );
}

function readToday(): number {
  return progressStore.getToday();
}
