"use client";

/* LessonClient — khung trang bài học, port clone/js/lesson.js:110-226
   (sidebar chế độ + tabs Từ vựng/Ví dụ + khu mode). */

import { useState } from "react";
import { LessonProvider, useLesson } from "./lesson-provider";
import type { LessonItem, LessonMode } from "./lesson-provider";
import { modeRegistry, modeLabels, modeOrder } from "./modes";
import { pinyinLine } from "@/lib/pinyin-utils";
import { useTts } from "@/lib/tts/use-tts";

function ExampleTab() {
  const { items } = useLesson();
  const { speak } = useTts();
  return (
    <div id="tab-examples" className="space-y-2">
      {items
        .filter((w) => w.example)
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

function LessonBody() {
  const { items, mode, setMode, index, setIndex } = useLesson();
  const [tab, setTab] = useState<"vocab" | "examples">("vocab");
  const Mode = modeRegistry[mode];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
      {/* khu chính */}
      <div className="min-w-0">
        {/* tabs + counter (port lesson.js:196-226) */}
        <div className="flex items-center justify-between gap-2 mb-3">
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
      </div>

      {/* sidebar chế độ học (port lesson.js:110-141) */}
      <aside className="no-print">
        <div className="card p-3">
          <div className="text-sm font-extrabold mb-2">Chọn chế độ học</div>
          <div id="sidebar-modes">
            {modeOrder.map((id: LessonMode) => {
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
          {/* TODO Task 18: thêm cả bài vào ôn tập qua progressStore.addSrsBatch */}
          <button type="button" id="btn-add-all" className="btn-ghost w-full px-3 py-2 text-sm">
            ⭐ Thêm cả bài vào ôn tập
          </button>
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
}: {
  items: LessonItem[];
  book?: string;
  page?: string;
  deckName?: string;
}) {
  return (
    <LessonProvider items={items} book={book} page={page} deckName={deckName}>
      <LessonBody />
    </LessonProvider>
  );
}
