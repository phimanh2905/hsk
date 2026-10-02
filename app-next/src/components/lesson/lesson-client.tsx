"use client";

/* LessonClient — khung trang bài học, port clone/js/lesson.js:110-226
   (sidebar chế độ + tabs Từ vựng/Ví dụ + khu mode). */

import { useState } from "react";
import { LessonProvider, useLesson } from "./lesson-provider";
import type { LessonItem, LessonMode } from "./lesson-provider";
import { modeRegistry, modeLabels, modeOrder } from "./modes";
import { pinyinLine } from "@/lib/pinyin-utils";
import { useTts } from "@/lib/tts/use-tts";
import { progressStore } from "@/lib/store/progress-store";
import { useToastSafe } from "@/components/shell/toast-provider";
import WordList from "./word-list";

/* Item có câu ví dụ RIÊNG không? Custom deck (C10) fallback example.zh = hanzi
   khi row không có exampleZh — coi như không có ví dụ (khớp clone example:null). */
function hasOwnExample(w: LessonItem): boolean {
  return Boolean(w.example) && w.example.zh !== w.hanzi;
}

function ExampleTab() {
  const { items } = useLesson();
  const { speak } = useTts();
  return (
    <div id="tab-examples" className="space-y-2">
      {items
        .filter(hasOwnExample)
        .map((w) => (
          <div key={w.itemKey} className="card p-3 flex items-start justify-between gap-3">
            <div>
              <div className="zh text-lg font-bold">{w.example.zh}</div>
              <div className="text-xs text-[var(--nhai-muted)] mt-0.5">
                {pinyinLine(w.example.pinyinPerChar)}
              </div>
              <div className="text-sm mt-1">→ {w.example.vi}</div>
            </div>
            <button
              type="button"
              className="btn-ghost w-10 h-10 shrink-0"
              title="Phát âm câu ví dụ"
              onClick={() => speak(w.example.zh)}
            >
              🔊
            </button>
          </div>
        ))}
    </div>
  );
}

/* "Thêm cả bài vào ôn tập" — port clone/js/lesson.js:130-140, idempotent qua
   progressStore.addSrsBatch (spec 10 §3.2: từ đã có trong SRS không thêm lại). */
function AddAllButton() {
  const { items } = useLesson();
  const toast = useToastSafe();
  return (
    <button
      type="button"
      id="btn-add-all"
      className="btn-ghost w-full px-3 py-2 text-sm"
      onClick={() => {
        const added = progressStore.addSrsBatch(items.map((it) => it.itemKey));
        toast(added > 0 ? `Đã thêm ${added} từ vào ôn tập` : "Tất cả từ đã có trong bộ ôn tập");
        // nhai:progress để Topbar update (đồng bộ nhai.srs.new như clone)
        window.dispatchEvent(new CustomEvent("nhai:progress"));
      }}
    >
      ⭐ Thêm cả bài vào ôn tập
    </button>
  );
}

function LessonBody() {
  const { items, mode, setMode, index, setIndex } = useLesson();
  const [tab, setTab] = useState<"vocab" | "examples">("vocab");
  const Mode = modeRegistry[mode];
  // customNoExample (clone/js/lesson.js:66,118): deck không có ví dụ nào → ẩn Đọc hiểu + Nghe ghép câu
  const hasExample = items.some(hasOwnExample);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
      {/* khu chính */}
      <div className="relative min-w-0">
        {/* Watermark bản đồ Việt Nam (SPEC-14 §1, port lesson.html:64) */}
        <img
          src="/assets/vietnam-map.svg"
          alt=""
          aria-hidden="true"
          data-watermark
          className="absolute left-8 top-1/3 opacity-[0.08] pointer-events-none select-none w-40"
        />

        {/* tabs — counter (giữa) — controls của mode (port lesson.js:196-226, SPEC-14 §3) */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 no-print">
          <div className="flex gap-1">
            <button
              type="button"
              data-tab="vocab"
              className={`pill ${tab === "vocab" ? "pill-active" : ""}`}
              onClick={() => setTab("vocab")}
            >
              Từ vựng
            </button>
            <button
              type="button"
              data-tab="examples"
              className={`pill ${tab === "examples" ? "pill-active" : ""}`}
              onClick={() => setTab("examples")}
            >
              Ví dụ
            </button>
          </div>
          <span className="pill text-xs" data-testid="mode-counter">
            {Math.min(index + 1, items.length)} / {items.length}
          </span>
          <div id="mode-tools" className="flex flex-wrap items-center gap-2">
            {/* controls của chế độ Flashcard được portal vào đây (port lesson.html #mode-tools) */}
          </div>
        </div>

        {tab === "examples" ? (
          <ExampleTab />
        ) : (
          <div id="tab-vocab">
            {/* khu mode — state machine C1: đổi mode đổi component, timer cleanup ở từng mode */}
            <div id="mode-content">
              <Mode />
            </div>

            {/* điều hướng từ */}
            <div className="flex items-center justify-between gap-2 mt-3 no-print">
              <button
                type="button"
                className="btn-ghost px-3 py-2"
                disabled={index === 0}
                onClick={() => setIndex(Math.max(0, index - 1))}
              >
                ← Trước
              </button>
              <span className="zh text-2xl font-extrabold" data-testid="current-word">
                {items[index]?.hanzi}
              </span>
              <button
                type="button"
                className="btn-ghost px-3 py-2"
                disabled={index >= items.length - 1}
                onClick={() => setIndex(Math.min(items.length - 1, index + 1))}
              >
                Sau →
              </button>
            </div>
          </div>
        )}

        {/* danh sách từ cuối trang — luôn hiện (port lesson.js:229-280) */}
        <div className="mt-6">
          <WordList />
        </div>
      </div>

      {/* sidebar chế độ học (port lesson.js:110-141) */}
      <aside className="no-print">
        <div className="card p-3">
          <div className="text-sm font-extrabold mb-2">Chọn chế độ học</div>
          <div id="sidebar-modes">
            {modeOrder.map((id: LessonMode) => {
              // PLAN-12/customNoExample: deck tùy chỉnh không có ví dụ → ẩn Đọc hiểu + Nghe ghép câu
              if (!hasExample && (id === "reading" || id === "listen")) return null;
              const meta = modeLabels[id];
              const active = mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  data-mode={id}
                  className={
                    "w-full flex items-center justify-between gap-2 px-3 py-2 mb-2 text-sm text-left rounded-lg border-2 " +
                    (active ? "btn-main" : "btn-ghost")
                  }
                  onClick={() => setMode(id)}
                >
                  <span>{meta.name}</span>
                  <span className={"text-xs font-bold whitespace-nowrap " + (active ? "" : "text-[var(--nhai-muted)]")}>
                    {meta.badge}
                  </span>
                </button>
              );
            })}
          </div>
          <button type="button" id="btn-print" className="btn-ghost w-full px-3 py-2 mb-2 text-sm" onClick={() => window.print()}>
            🖨️ In file
          </button>
          <AddAllButton />
        </div>
      </aside>
    </div>
  );
}

export default function LessonClient({
  items,
  book,
  page,
  deckName,
  title,
}: {
  items?: LessonItem[];
  book?: string;
  page?: string;
  deckName?: string;
  title?: string;
}) {
  const num = page ? (/^lesson-(\d+)$/.exec(page)?.[1] ?? page) : null;
  const heading = title ?? deckName ?? "Bài học";
  return (
    <LessonProvider items={items ?? []} book={book} page={page} deckName={deckName}>
      {/* header bài học (SPEC-14 §2, §6 — port clone/lesson.html:64-75) */}
      <div className="relative mb-4">
        {book && (
          <a
            href={`/course/${book}?skill=vocab`}
            className="text-sm font-bold text-[var(--nhai-muted)] hover:underline"
          >
            ← Danh sách bài
          </a>
        )}
        <div className="flex items-center gap-2 mt-2">
          {num && (
            <span
              data-badge="page"
              className="bg-black text-white px-2 py-0.5 rounded text-sm font-bold"
            >
              Bài {num}
            </span>
          )}
          <span className="pill text-xs">{items?.length ?? 0} từ vựng</span>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span data-mascot className="text-[44px] leading-none select-none" aria-hidden="true">
            🍅
          </span>
          <h1 className="text-3xl font-extrabold">
            <span className="bg-[#f5d76e]/50 rounded px-2">{heading}</span>
          </h1>
        </div>
      </div>
      <LessonBody />
    </LessonProvider>
  );
}
