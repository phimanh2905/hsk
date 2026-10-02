"use client";

import { useEffect, useState } from "react";
import { leaderboardData, initials, formatXp } from "@/content/leaderboard";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

type Tab = "xp" | "battle";

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

export default function LeaderboardPage() {
  // Mount-gate: SSR/pre-mount luôn render tab "xp" (khớp HTML prerender), sau mount
  // mới đọc ?tab= từ URL — tránh hydration mismatch khi mở trực tiếp ?tab=battle.
  const [tab, setTab] = useState<Tab>("xp");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "battle") setTab("battle");
  }, []);

  function selectTab(next: Tab) {
    setTab(next); // đổi tab không fetch, không reload (giữ clone/js/leaderboard.js)
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <main className="mx-auto max-w-[760px] px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight mb-4">Bảng xếp hạng</h1>

      <div className="flex gap-2 mb-3" role="tablist" aria-label="Loại bảng xếp hạng">
        <Chip selected={tab === "xp"} onClick={() => selectTab("xp")} role="tab" aria-selected={tab === "xp"}>
          XP tổng
        </Chip>
        <Chip selected={tab === "battle"} onClick={() => selectTab("battle")} role="tab" aria-selected={tab === "battle"}>
          Đấu trí tháng
        </Chip>
      </div>

      <p className="text-sm text-text-secondary mb-5">Top 10 học viên chăm nhất — mỗi câu trả lời đúng +1 XP.</p>

      <ol className="space-y-2 mb-8">
        {tab === "battle"
          ? leaderboardData.battle.map((r, i) => <Row key={r.name} rank={i + 1} name={r.name} rightText={r.score} rightSub={r.time} />)
          : leaderboardData.xp.map((r, i) => <Row key={r.name} rank={i + 1} name={r.name} rightText={formatXp(r.points)} />)}
      </ol>

      <Card className="p-5">
        <h2 className="font-extrabold mb-2">Cách tính điểm</h2>
        <p className="text-sm text-text-secondary mb-2">XP = mỗi câu trả lời đúng ở các chế độ Flashcard, Trắc nghiệm và các bài luyện tập (mỗi câu +1). Điểm được đồng bộ khi bạn đăng nhập.</p>
        <p className="text-sm text-text-secondary">Bảng xếp hạng cập nhật tối đa 10 phút một lần. Khi bằng điểm, ai đạt trước xếp trước.</p>
      </Card>
    </main>
  );
}
