"use client";

/* Thư viện bài đọc theo level HSK1–5 (Task 9, plan 2026-10-30-reading-library) +
   tab "Bài của tôi" — bài tạo-AI (Task 6, plan 2026-10-30-reading-ai-mine).
   Data từ D1 qua loadReadings(); Mine đọc draft từ progressStore. Mở bài →
   ReadingPlayer (Task 8) — draft không có audio → fallback TTS của player. */

import { useCallback, useEffect, useRef, useState } from "react";
import { loadReadings, __resetReadingsCache } from "@/lib/content/readings-client";
import type { ReadingDoc } from "@/lib/content/readings";
import { ReadingPlayer } from "@/components/reading/reading-player";
import { ToastProvider } from "@/components/shell/toast-provider";
import { LoginProvider, LoginModal } from "@/components/shell/login-modal";
import { MinePanel } from "@/app/(app)/reading/mine-panel";
import { BookOpen, Check, ChevronLeft, ChevronRight, Lightbulb } from "@/components/ui/icon";
import { ICON_STROKE } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";
import {
  progressStore,
  type ReadingProgressRec,
  type SavedReadingDraft,
} from "@/lib/store/progress-store";

const LEVELS = ["hsk1", "hsk2", "hsk3", "hsk4", "hsk5"] as const;

/* Draft AI không có audio/độ dài → map về ReadingDoc: player tự fallback TTS
   và ẩn seek (durSec = 0). */
function draftToDoc(draft: SavedReadingDraft): ReadingDoc {
  return {
    id: draft.id,
    level: "",
    ord: 0,
    title: draft.title,
    titleVi: "",
    sentences: draft.doc.sentences.map((s) => ({ ...s, audio: null, durSec: 0 })),
    vocab: draft.doc.vocab,
    questions: draft.doc.questions,
    audioDir: "",
    chars: draft.chars,
    durationSec: 0,
  };
}

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/* ---------- callout thu gọn (giữ nguyên từ bản cũ) ---------- */
function Callout() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="mb-4 p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left font-bold hover:bg-surface-paper"
        aria-expanded={open}
      >
        <Lightbulb size={18} strokeWidth={ICON_STROKE} className="text-learning-streak shrink-0" aria-hidden="true" />
        <span className="flex-1">Phương pháp đọc hiểu hiệu quả nhất (6 bước với 1 bài)</span>
        <span className="text-sm text-text-secondary">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <ol className="list-decimal ml-5 space-y-1 text-sm text-text-secondary">
            <li>Đọc lướt cả bài một lần để nắm đại ý, không cần hiểu từng chữ.</li>
            <li>Bật audio đọc cả bài, vừa nghe vừa nhìn chữ — đừng dừng lại.</li>
            <li>Đọc từng câu: bấm nút phát, theo dõi chữ sáng, bắt chước ngữ điệu (shadowing).</li>
            <li>Mở bản dịch và pinyin, đối chiếu với những chỗ mình hiểu sai.</li>
            <li>Tìm từ vựng mới, bấm nút ngôi sao để thêm vào sổ tay và ôn lại sau.</li>
            <li>Ngày hôm sau nghe lại bài đó một lần — bạn sẽ hiểu sâu hơn hẳn.</li>
          </ol>
        </div>
      )}
    </Card>
  );
}

/* ---------- 1 card bài đọc ---------- */
function ReadingCard({
  doc, done, onOpen, fixedWidth = true,
}: { doc: ReadingDoc; done: boolean; onOpen: () => void; fixedWidth?: boolean }) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onOpen}
      className={cn(
        "shrink-0 snap-start flex-col items-stretch gap-1 p-2 h-auto",
        fixedWidth ? "w-[200px]" : "w-full",
      )}
    >
      <span className="relative flex aspect-video items-center justify-center overflow-hidden rounded-control bg-surface-muted p-2">
        <span className="zh text-xl font-bold line-clamp-2 text-center">{doc.title}</span>
        {done && (
          <span className="absolute right-1 top-1 flex items-center gap-0.5 rounded-full bg-success-soft px-1.5 py-0.5 text-[10px] font-bold text-feedback-success">
            <Check size={10} strokeWidth={2.5} aria-hidden="true" />
            Done
          </span>
        )}
      </span>
      <span className="text-xs text-text-secondary line-clamp-1 text-left">{doc.titleVi}</span>
      <span className="text-xs text-text-secondary text-left">
        {fmtTime(doc.durationSec)} · {doc.chars} chữ
      </span>
    </Button>
  );
}

/* ---------- 1 level section: hàng ngang scroll + 2 mũi tên khi tràn ---------- */
function LevelSection({
  level, docs, progress, onOpen, onSeeAll,
}: {
  level: string; docs: ReadingDoc[];
  progress: Record<string, ReadingProgressRec>;
  onOpen: (id: string) => void;
  onSeeAll: (level: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (el) setOverflow(el.scrollWidth > el.clientWidth);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, docs.length]);

  const n = docs.length;
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">
          HSK {level.replace("hsk", "")} <span className="text-sm font-normal text-text-secondary">({n} bài)</span>
        </h2>
        <Button type="button" variant="ghost" size="sm" onClick={() => onSeeAll(level)}>
          Xem tất cả
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {overflow && (
          <IconButton
            label="Cuộn trái"
            onClick={() => scrollerRef.current?.scrollBy({ left: -0.8 * scrollerRef.current.clientWidth, behavior: "smooth" })}
            className="shrink-0"
          >
            <ChevronLeft size={18} />
          </IconButton>
        )}
        <div ref={scrollerRef} className="flex min-w-0 flex-1 gap-3 overflow-x-auto snap-x pb-1">
          {docs.map((d) => (
            <ReadingCard key={d.id} doc={d} done={!!progress[d.id]} onOpen={() => onOpen(d.id)} />
          ))}
        </div>
        {overflow && (
          <IconButton
            label="Cuộn phải"
            onClick={() => scrollerRef.current?.scrollBy({ left: 0.8 * scrollerRef.current.clientWidth, behavior: "smooth" })}
            className="shrink-0"
          >
            <ChevronRight size={18} />
          </IconButton>
        )}
      </div>
    </section>
  );
}

function ReadingClientInner({ initLevel }: { initLevel?: string }) {
  const [docs, setDocs] = useState<ReadingDoc[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string>(initLevel ?? "all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [openDraft, setOpenDraft] = useState<SavedReadingDraft | null>(null);
  const [tab, setTab] = useState<"library" | "mine">("library");
  const [progress, setProgress] = useState<Record<string, ReadingProgressRec>>({});

  useEffect(() => {
    if (typeof window !== "undefined" && initLevel === undefined) {
      const lv = new URLSearchParams(window.location.search).get("level");
      if (lv && LEVELS.includes(lv as (typeof LEVELS)[number])) setSelectedLevel(lv);
      if (new URLSearchParams(window.location.search).get("tab") === "mine") setTab("mine");
    }
  }, [initLevel]);

  const load = useCallback(() => {
    loadReadings()
      .then(setDocs)
      .catch(() => setLoadFailed(true));
  }, []);

  useEffect(() => {
    load();
    setProgress(progressStore.getReadingProgress());
  }, [load]);

  const chooseLevel = (lv: string) => {
    setSelectedLevel(lv);
    const url = lv === "all" ? "/reading" : `/reading?level=${lv}`;
    window.history.replaceState(null, "", url);
  };

  const chooseTab = (t: "library" | "mine") => {
    setTab(t);
    if (t === "mine") {
      window.history.replaceState(null, "", "/reading?tab=mine");
    } else {
      chooseLevel(selectedLevel);
    }
  };

  const handleComplete = useCallback(
    (id: string, correct: number, total: number) => {
      // Store là nguồn sự thật: lần đầu = chưa có record nào trước khi save.
      const first = !progressStore.getReadingProgress()[id];
      progressStore.saveReadingProgress(id, correct, total);
      setProgress(progressStore.getReadingProgress());
      if (first && total > 0 && correct / total >= 0.6) {
        progressStore.addXp(total * 10);
      }
    },
    [],
  );

  const openDoc = openId ? docs?.find((d) => d.id === openId) : undefined;

  /* ----- view bài ----- */
  if (openDoc || openDraft) {
    const isDraft = !openDoc;
    const doc = openDoc ?? draftToDoc(openDraft!);
    const docId = doc.id;
    return (
      <div className="mx-auto w-full max-w-[820px]">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => (isDraft ? setOpenDraft(null) : setOpenId(null))}
          className="mb-4"
        >
          ← Danh sách
        </Button>
        <ReadingPlayer doc={doc} onComplete={(c, t) => handleComplete(docId, c, t)} />
      </div>
    );
  }

  const byLevel = new Map<string, ReadingDoc[]>();
  (docs ?? []).forEach((d) => {
    const list = byLevel.get(d.level) ?? [];
    list.push(d);
    byLevel.set(d.level, list);
  });

  const tabs = ["all", ...LEVELS];
  const levelDocs = selectedLevel === "all" ? null : (byLevel.get(selectedLevel) ?? []);

  return (
    <div className="mx-auto w-full max-w-[820px]">
      {/* header */}
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-control border-2 border-border-strong bg-surface-elevated text-action-primary">
          <BookOpen size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />
        </span>
        <h1 className="text-3xl font-extrabold">Bài đọc</h1>
      </div>

      {/* tab library / mine */}
      <nav aria-label="Chọn nhóm bài" className="mb-4 flex gap-1 border-b border-border-default">
        {(
          [
            { key: "library", label: "Bài khoá" },
            { key: "mine", label: "Bài của tôi" },
          ] as const
        ).map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => chooseTab(t.key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-sm font-semibold transition-colors",
                active
                  ? "border-action-primary text-action-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "mine" && <MinePanel onOpen={setOpenDraft} />}

      {tab === "library" && <Callout />}

      {tab === "library" && (
        <>
        {/* tab level */}
        <nav aria-label="Chọn level" className="mb-5 flex gap-1 border-b border-border-default overflow-x-auto">
          {tabs.map((lv) => {
            const active = selectedLevel === lv;
            return (
              <button
                key={lv}
                type="button"
                onClick={() => chooseLevel(lv)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 border-b-2 px-3 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "border-action-primary text-action-primary"
                    : "border-transparent text-text-secondary hover:text-text-primary",
                )}
              >
                {lv === "all" ? "Tất cả" : `HSK ${lv.replace("hsk", "")}`}
              </button>
            );
          })}
        </nav>

      {/* loading skeleton */}
      {!docs && !loadFailed && (
        <div className="space-y-6" aria-hidden="true">
          {[0, 1].map((i) => (
            <Card key={i} className="p-4">
              <div className="mb-3 h-5 w-24 animate-pulse rounded bg-surface-muted" />
              <div className="flex gap-3 overflow-hidden">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="h-32 w-[200px] shrink-0 animate-pulse rounded-control bg-surface-muted" />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* error */}
      {loadFailed && (
        <Card className="p-6 text-center">
          <p className="mb-3 text-text-secondary">Không tải được bài đọc. Vui lòng thử lại.</p>
          <Button
            type="button"
            onClick={() => {
              __resetReadingsCache();
              setLoadFailed(false);
              load();
            }}
          >
            Thử lại
          </Button>
        </Card>
      )}

      {/* grid 1 level hoặc list các section */}
      {docs && !loadFailed && (
        levelDocs ? (
          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {levelDocs.map((d) => (
                <ReadingCard key={d.id} doc={d} done={!!progress[d.id]} onOpen={() => setOpenId(d.id)} fixedWidth={false} />
              ))}
            </div>
            {levelDocs.length === 0 && (
              <p className="text-text-secondary">Chưa có bài đọc cho level này.</p>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => chooseLevel("all")} className="mt-4">
              ← Danh sách
            </Button>
          </div>
        ) : (
          LEVELS.filter((lv) => byLevel.has(lv)).map((lv) => (
            <LevelSection
              key={lv}
              level={lv}
              docs={byLevel.get(lv)!}
              progress={progress}
              onOpen={setOpenId}
              onSeeAll={chooseLevel}
            />
          ))
        )
      )}
      </>
      )}
    </div>
  );
}

export default function ReadingClient({ initLevel }: { initLevel?: string }) {
  return (
    <ToastProvider>
      <LoginProvider>
        <ReadingClientInner initLevel={initLevel} />
        <LoginModal />
      </LoginProvider>
    </ToastProvider>
  );
}
