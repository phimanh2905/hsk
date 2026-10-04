"use client";

/* LessonClient — khung trang bài học, port opendesign lesson.html:
   LessonTopbar (mọi mode) → mode Flash render FlashStage (main.stage), các mode khác
   giữ layout cũ. Sidebar chế độ + WordList giữ nguyên (spec §4). */

import { useState } from "react";
import { LessonProvider, useLesson } from "./lesson-provider";
import type { LessonItem, LessonMode } from "./lesson-provider";
import { modeRegistry, modeLabels, modeOrder } from "./modes";
import { pinyinLine } from "@/lib/pinyin-utils";
import { useTts } from "@/lib/tts/use-tts";
import { progressStore } from "@/lib/store/progress-store";
import { useToastSafe } from "@/components/shell/toast-provider";
import WordList from "./word-list";
import FlashStage from "./flash/flash-stage";
import { LessonTopbar } from "./flash/lesson-topbar";
import { ExitModal } from "./flash/exit-modal";
import { ShortcutsModal } from "./flash/shortcuts-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import { ChevronLeft, ChevronRight, Printer, Star, Volume2 } from "@/components/ui/icon";

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
          <Card key={w.itemKey} className="p-3 flex items-start justify-between gap-3">
            <div>
              <div className="zh text-lg font-bold">{w.example.zh}</div>
              <div className="text-xs text-text-secondary mt-0.5">
                {pinyinLine(w.example.pinyinPerChar)}
              </div>
              <div className="text-sm mt-1">→ {w.example.vi}</div>
            </div>
            <IconButton
              label="Phát âm câu ví dụ"
              className="shrink-0"
              onClick={() => speak(w.example.zh)}
            >
              <Volume2 size={20} strokeWidth={1.5} />
            </IconButton>
          </Card>
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
    <Button
      type="button"
      id="btn-add-all"
      variant="secondary"
      className="w-full"
      onClick={() => {
        const added = progressStore.addSrsBatch(items.map((it) => it.itemKey));
        toast(added > 0 ? `Đã thêm ${added} từ vào ôn tập` : "Tất cả từ đã có trong bộ ôn tập");
        // nhai:progress để Topbar update (đồng bộ nhai.srs.new như clone)
        window.dispatchEvent(new CustomEvent("nhai:progress"));
      }}
    >
      <Star size={16} strokeWidth={1.5} aria-hidden="true" />
      Thêm cả bài vào ôn tập
    </Button>
  );
}

function LessonBody({ topbarTitle }: { topbarTitle: string }) {
  const { items, index, setIndex, mode, setMode, autoplay, toggleAutoplay } = useLesson();
  const [tab, setTab] = useState<"vocab" | "examples">("vocab");
  const [exitOpen, setExitOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const Mode = modeRegistry[mode];
  // customNoExample (clone/js/lesson.js:66,118): deck không có ví dụ nào → ẩn Đọc hiểu + Nghe ghép câu
  const hasExample = items.some(hasOwnExample);

  return (
    <div>
      {/* topbar bài học (port header[data-od-id="lesson-topbar"]) — dùng chung mọi mode */}
      <LessonTopbar
        title={topbarTitle}
        current={Math.min(index + 1, items.length)}
        total={items.length}
        autoplay={autoplay}
        onToggleAutoplay={toggleAutoplay}
        onExit={() => setExitOpen(true)}
        onShortcuts={() => setKeysOpen(true)}
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_240px]">
        {/* khu chính */}
        <div className="relative min-w-0">
          {mode === "flash" ? (
            /* flash SRS mới (port main.stage) — thay tabs + flashcard 3D cũ */
            <FlashStage onRequestExit={() => setExitOpen(true)} />
          ) : (
            <div className="relative">
              {/* Watermark bản đồ Việt Nam (SPEC-14 §1, port lesson.html:64) */}
              <img
                src="/assets/vietnam-map.svg"
                alt=""
                aria-hidden="true"
                data-watermark
                className="absolute left-8 top-1/3 opacity-[0.08] pointer-events-none select-none w-40"
              />

              {/* tabs — counter — controls của mode (giữ nguyên cho 6 mode cũ) */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 no-print">
                <div className="flex gap-1">
                  <Chip data-tab="vocab" selected={tab === "vocab"} onClick={() => setTab("vocab")}>
                    Từ vựng
                  </Chip>
                  <Chip data-tab="examples" selected={tab === "examples"} onClick={() => setTab("examples")}>
                    Ví dụ
                  </Chip>
                </div>
                <Chip className="text-xs" data-testid="mode-counter">
                  {Math.min(index + 1, items.length)} / {items.length}
                </Chip>
                <div id="mode-tools" className="flex flex-wrap items-center gap-2" />
              </div>

              {tab === "examples" ? (
                <ExampleTab />
              ) : (
                <div id="tab-vocab">
                  <div id="mode-content">{Mode ? <Mode /> : null}</div>

                  {/* điều hướng từ */}
                  <div className="flex items-center justify-between gap-2 mt-3 no-print">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === 0}
                      onClick={() => setIndex(Math.max(0, index - 1))}
                    >
                      <ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true" />
                      Trước
                    </Button>
                    <span className="zh text-[32px] font-extrabold" data-testid="current-word">
                      {items[index]?.hanzi}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index >= items.length - 1}
                      onClick={() => setIndex(Math.min(items.length - 1, index + 1))}
                    >
                      Sau
                      <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* danh sách từ cuối trang — luôn hiện (port lesson.js:229-280) */}
          <div className="mt-6">
            <WordList />
          </div>
        </div>

        {/* sidebar chế độ học (port lesson.js:110-141) — giữ nguyên */}
        <aside className="no-print">
          <Card className="p-3">
            <div className="text-sm font-extrabold mb-2">Chọn chế độ học</div>
            <div id="sidebar-modes">
              {modeOrder.map((id: LessonMode) => {
                // PLAN-12/customNoExample: deck tùy chỉnh không có ví dụ → ẩn Đọc hiểu + Nghe ghép câu
                if (!hasExample && (id === "reading" || id === "listen")) return null;
                const meta = modeLabels[id];
                const active = mode === id;
                return (
                  <Button
                    key={id}
                    type="button"
                    data-mode={id}
                    variant={active ? "primary" : "ghost"}
                    className={
                      "w-full justify-between mb-2 " +
                      (active ? "" : "border border-border-default")
                    }
                    onClick={() => setMode(id)}
                  >
                    <span>{meta.name}</span>
                    <span
                      className={
                        "text-xs font-bold whitespace-nowrap " +
                        (active ? "text-white/80" : "text-text-secondary")
                      }
                    >
                      {meta.badge}
                    </span>
                  </Button>
                );
              })}
            </div>
            <Button
              type="button"
              id="btn-print"
              variant="ghost"
              size="sm"
              className="w-full mb-2 border border-border-default"
              onClick={() => window.print()}
            >
              <Printer size={16} strokeWidth={1.5} aria-hidden="true" />
              In file
            </Button>
            <AddAllButton />
          </Card>
        </aside>
      </div>

      {/* modals dùng chung mọi mode (port #exitModal/#keysModal) */}
      <ExitModal open={exitOpen} onClose={() => setExitOpen(false)} lessonTitle={topbarTitle} />
      <ShortcutsModal open={keysOpen} onClose={() => setKeysOpen(false)} />
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
  const topbarTitle = book && num ? `Bài ${num}: ${heading}` : heading;
  return (
    <LessonProvider items={items ?? []} book={book} page={page} deckName={deckName}>
      <div className="mx-auto max-w-[880px]">
        <LessonBody topbarTitle={topbarTitle} />
      </div>
    </LessonProvider>
  );
}