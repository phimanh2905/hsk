"use client";

import { useState } from "react";
import { leaderboardData, initials, formatXp } from "@/content/leaderboard";

type Tab = "xp" | "battle";

function Row({ rank, name, rightText, rightSub }: { rank: number; name: string; rightText: string; rightSub?: string }) {
  const medal = rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : "#" + rank;
  return (
    <li>
      <div className="card px-4 py-3 flex items-center gap-3">
        <span className="w-10 shrink-0 text-center font-extrabold">{medal}</span>
        <span className="w-10 h-10 shrink-0 rounded-full bg-[var(--nhai-main)] text-white flex items-center justify-center text-sm font-extrabold">{initials(name)}</span>
        <span className="font-semibold min-w-0 truncate">{name}</span>
        <span className="ml-auto shrink-0 text-right">
          <span className="font-extrabold text-[var(--nhai-main)]">{rightText}</span>
          {rightSub ? <span className="block text-xs text-[var(--nhai-muted)]">{rightSub}</span> : null}
        </span>
      </div>
    </li>
  );
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "xp";
    const t = new URLSearchParams(window.location.search).get("tab");
    return t === "battle" ? "battle" : "xp";
  });

  function selectTab(next: Tab) {
    setTab(next); // đổi tab không fetch, không reload (giữ clone/js/leaderboard.js)
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight mb-4">Bảng xếp hạng</h1>

      <div className="flex gap-2 mb-3" role="tablist" aria-label="Loại bảng xếp hạng">
        <button type="button" role="tab" aria-selected={tab === "xp"} onClick={() => selectTab("xp")} className={tab === "xp" ? "pill-active" : "pill"}>
          XP tổng
        </button>
        <button type="button" role="tab" aria-selected={tab === "battle"} onClick={() => selectTab("battle")} className={tab === "battle" ? "pill-active" : "pill"}>
          Đấu trí tháng
        </button>
      </div>

      <p className="text-sm text-[var(--nhai-muted)] mb-5">Top 10 học viên chăm nhất — mỗi câu trả lời đúng +1 XP.</p>

      <ol className="space-y-2 mb-8">
        {tab === "battle"
          ? leaderboardData.battle.map((r, i) => <Row key={r.name} rank={i + 1} name={r.name} rightText={r.score} rightSub={r.time} />)
          : leaderboardData.xp.map((r, i) => <Row key={r.name} rank={i + 1} name={r.name} rightText={formatXp(r.points)} />)}
      </ol>

      <section className="card shadow-neo p-5">
        <h2 className="font-extrabold mb-2">Cách tính điểm</h2>
        <p className="text-sm text-[var(--nhai-muted)] mb-2">XP = mỗi câu trả lời đúng ở các chế độ Flashcard, Trắc nghiệm và các bài luyện tập (mỗi câu +1). Điểm được đồng bộ khi bạn đăng nhập.</p>
        <p className="text-sm text-[var(--nhai-muted)]">Bảng xếp hạng cập nhật tối đa 10 phút một lần. Khi bằng điểm, ai đạt trước xếp trước.</p>
      </section>
    </main>
  );
}
