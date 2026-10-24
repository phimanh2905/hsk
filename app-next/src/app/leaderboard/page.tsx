"use client";

import { useEffect, useState } from "react";
import { leaderboardData, initials, formatXp } from "@/content/leaderboard";
import {
  fetchBattleLeaderboard,
  type LessonLeaderboardItem,
  type MonthLeaderboardItem,
} from "@/lib/battle/leaderboard-client";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

/* Tab "battle" ăn data thật GET /api/v1/battle/leaderboard?scope=month (W6.2).
   Tab "xp" vẫn dùng mock src/content/leaderboard.ts — XP thật chưa có trong wave này. */

type Tab = "xp" | "battle" | "lesson";

function Row({ rank, name, rightText, rightSub }: { rank: number; name: string; rightText: string; rightSub?: string }) {
  return (
    <li>
      <Card className="p-4 flex items-center gap-3">
        <span className="w-10 shrink-0 text-center font-extrabold">#{rank}</span>
        <span className="w-10 h-10 shrink-0 rounded-full bg-action-primary text-white flex items-center justify-center text-sm font-extrabold">{initials(name)}</span>
        <span className="font-semibold min-w-0 truncate">{name}</span>
        <span className="ml-auto shrink-0 text-right">
          <span className="font-extrabold text-action-primary">{rightText}</span>
          {rightSub ? <span className="block text-xs text-text-secondary">{rightSub}</span> : null}
        </span>
      </Card>
    </li>
  );
}

function fmtDuration(ms: number): string {
  const sec = ms / 1000;
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(1);
  return `${m}:${Number(s) < 10 ? "0" : ""}${s}`;
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <Card className="p-4 flex items-center gap-3 animate-pulse">
            <span className="w-10 shrink-0 text-center font-extrabold text-transparent">##</span>
            <span className="w-10 h-10 shrink-0 rounded-full bg-surface-elevated" />
            <span className="h-4 w-32 rounded bg-surface-elevated" />
            <span className="ml-auto h-4 w-12 rounded bg-surface-elevated" />
          </Card>
        </li>
      ))}
    </>
  );
}

export default function LeaderboardPage() {
  // Mount-gate: SSR/pre-mount luôn render tab "xp" (khớp HTML prerender), sau mount
  // mới đọc ?tab= từ URL — tránh hydration mismatch khi mở trực tiếp ?tab=battle.
  const [tab, setTab] = useState<Tab>("xp");
  // per-lesson BXH: chỉ hiện tab "Bài này" khi URL có cả ?book= & ?page=
  const [lesson, setLesson] = useState<{ book: string; page: string } | null>(null);
  const [monthRows, setMonthRows] = useState<MonthLeaderboardItem[] | null>(null);
  const [lessonRows, setLessonRows] = useState<LessonLeaderboardItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t === "battle") setTab("battle");
    const book = params.get("book");
    const page = params.get("page");
    if (book && page) {
      setLesson({ book, page });
      if (t === "lesson") setTab("lesson");
    }
  }, []);

  function selectTab(next: Tab) {
    setTab(next); // đổi tab không fetch, không reload (giữ clone/js/leaderboard.js)
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  /* fetch khi vào tab battle/lesson (mount-gate + lần đầu chọn tab) */
  useEffect(() => {
    if (tab === "battle" && monthRows === null) {
      fetchBattleLeaderboard("month")
        .then((d) => {
          setMonthRows((d as { items: MonthLeaderboardItem[] }).items);
          setLoadError(false);
        })
        .catch(() => setLoadError(true));
    }
    if (tab === "lesson" && lesson && lessonRows === null) {
      fetchBattleLeaderboard("lesson", { book: lesson.book, page: lesson.page })
        .then((d) => {
          setLessonRows((d as { items: LessonLeaderboardItem[] }).items);
          setLoadError(false);
        })
        .catch(() => setLoadError(true));
    }
  }, [tab, lesson, monthRows, lessonRows]);

  return (
    <main className="mx-auto max-w-[760px] px-4 py-6 pb-20 lg:pb-6">
      <h1 className="text-3xl font-extrabold tracking-tight mb-4">Bảng xếp hạng</h1>

      <div className="flex gap-2 mb-3" role="tablist" aria-label="Loại bảng xếp hạng">
        <Chip selected={tab === "xp"} onClick={() => selectTab("xp")} role="tab" aria-selected={tab === "xp"}>
          XP tổng
        </Chip>
        <Chip selected={tab === "battle"} onClick={() => selectTab("battle")} role="tab" aria-selected={tab === "battle"}>
          Đấu trí tháng
        </Chip>
        {lesson && (
          <Chip selected={tab === "lesson"} onClick={() => selectTab("lesson")} role="tab" aria-selected={tab === "lesson"}>
            Bài này
          </Chip>
        )}
      </div>

      <p className="text-sm text-text-secondary mb-5">Top 10 học viên chăm nhất — mỗi câu trả lời đúng +1 XP.</p>

      <ol className="space-y-2 mb-8" data-leaderboard-list>
        {tab === "battle" ? (
          monthRows === null ? (
            loadError ? (
              <li>
                <Card className="p-4 text-sm text-text-secondary">Chưa tải được bảng xếp hạng — thử lại sau.</Card>
              </li>
            ) : (
              <SkeletonRows />
            )
          ) : monthRows.length === 0 ? (
            <li>
              <Card className="p-4 text-sm text-text-secondary">Chưa có ai thi Đấu trí trong tháng này.</Card>
            </li>
          ) : (
            monthRows.map((r, i) => (
              <Row key={r.name} rank={i + 1} name={r.name} rightText={String(r.totalScore)} rightSub={r.lessonsPlayed + " bài"} />
            ))
          )
        ) : tab === "lesson" && lesson ? (
          lessonRows === null ? (
            loadError ? (
              <li>
                <Card className="p-4 text-sm text-text-secondary">Chưa tải được bảng xếp hạng — thử lại sau.</Card>
              </li>
            ) : (
              <SkeletonRows />
            )
          ) : lessonRows.length === 0 ? (
            <li>
              <Card className="p-4 text-sm text-text-secondary">Chưa có ai thi bài này — hãy là người đầu tiên!</Card>
            </li>
          ) : (
            lessonRows.map((r, i) => (
              <Row key={r.name} rank={i + 1} name={r.name} rightText={String(r.score)} rightSub={`${r.correct}/${r.total} câu — ${fmtDuration(r.durationMs)}`} />
            ))
          )
        ) : (
          leaderboardData.xp.map((r, i) => <Row key={r.name} rank={i + 1} name={r.name} rightText={formatXp(r.points)} />)
        )}
      </ol>

      <Card className="p-5">
        <h2 className="font-extrabold mb-2">Cách tính điểm</h2>
        <p className="text-sm text-text-secondary mb-2">XP = mỗi câu trả lời đúng ở các chế độ Flashcard, Trắc nghiệm và các bài luyện tập (mỗi câu +1). Điểm được đồng bộ khi bạn đăng nhập.</p>
        <p className="text-sm text-text-secondary">Bảng xếp hạng cập nhật tối đa 10 phút một lần. Khi bằng điểm, ai đạt trước xếp trước.</p>
      </Card>
    </main>
  );
}
