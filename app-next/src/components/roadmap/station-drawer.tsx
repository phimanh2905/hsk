"use client";

/* Right drawer chi tiết trạm (port .drawer + .overlay + JS drawer của
   opendesign_hsk/roadmap.html). KHÔNG tái dụng ui/dialog (Dialog là overlay
   giữa màn hình). Task 8 (Roadmap Journey v2): body 3 tab —
   Ôn nhanh (warm-up từ trạm trước, không tính điểm) · Học (liệt kê bài,
   link /lesson, tick khi markPageDone) · Bài kiểm tra (StationQuiz; hsk-1
   gate qua EntryGate; trạm generator fetch vocab qua useStationVocab). */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, X } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { Chip } from "@/components/ui/chip";
import { StationQuiz } from "@/components/roadmap/station-quiz";
import { EntryGate } from "@/components/roadmap/entry-gate";
import { useStationVocab, type LessonRef } from "@/components/roadmap/use-station-vocab";
import { progressStore } from "@/lib/store/progress-store";
import { gateStatus, type GateStatus, type StationView } from "@/lib/roadmap-progress";
import { levelPool, sampleWarmupQuestions, type QuizQuestion, type StationPool } from "@/lib/station-quiz";
import type { Station, RoadmapLevel } from "@/content/roadmap-stations";

type DrawerTab = "review" | "study" | "quiz";

function statusLabel(v: StationView): string {
  if (v.state === "done") return `HOÀN THÀNH · ${v.station.no.toUpperCase()}`;
  if (v.state === "active") return `ĐANG HỌC · ${v.station.no.toUpperCase()}`;
  return `ĐANG KHÓA · ${v.station.kind === "milestone" ? "MILESTONE" : `BÀI ${v.station.id}`}`;
}

function stationLessons(station: Station): LessonRef[] {
  return station.lessons ?? (station.lesson ? [station.lesson] : []);
}

export function StationDrawer({
  view,
  level,
  open,
  onClose,
}: {
  view: StationView | null;
  level: RoadmapLevel;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<DrawerTab>("study");
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  // Focus close khi mở + focus trap + Escape + trả focus khi đóng (spec §8)
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>(
          "button, [href], input, [tabindex]:not([tabindex='-1'])",
        );
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restoreRef.current?.focus();
    };
  }, [open, onClose]);

  // Mở drawer luôn về tab Học (spec §3 — tab giữa là bước chính)
  useEffect(() => {
    if (open) setTab("study");
  }, [open]);

  /* Cổng đầu vào hsk-1 (Task 5/7): đọc gateStatus sau mount + nghe bye:progress
     (EntryGate setRoadmapGate bắn event) để refresh mà không cần prop mới. */
  const [gate, setGate] = useState<GateStatus>(level.id === "hsk-1" ? "locked" : "open");
  useEffect(() => {
    const sync = () => {
      try {
        setGate(gateStatus(level.id, progressStore, progressStore.getRoadmapDone().length));
      } catch {
        setGate(level.id === "hsk-1" ? "locked" : "open");
      }
    };
    sync();
    window.addEventListener("bye:progress", sync);
    return () => window.removeEventListener("bye:progress", sync);
  }, [level.id]);

  const station = view?.station ?? null;
  const state = view?.state ?? "locked";
  const stationIndex = station ? level.stations.findIndex((s) => s.id === station.id) : -1;
  const prevStation = stationIndex > 0 ? (level.stations[stationIndex - 1] ?? null) : null;
  const lessons = useMemo(() => (station ? stationLessons(station) : []), [station]);

  const tabs: Array<{ key: DrawerTab; label: string; meta?: string }> = [
    { key: "review", label: "Ôn nhanh" },
    { key: "study", label: "Học", meta: `≈ ${lessons.length * 8} phút` },
    { key: "quiz", label: "Bài kiểm tra", meta: "≈ 5 phút" },
  ];

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-50 bg-[rgba(17,19,24,0.45)] transition-opacity duration-[250ms]",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label="Chi tiết trạm học"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[420px] max-w-full flex-col border-l border-border-default bg-surface-elevated shadow-md transition-transform duration-[280ms] ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          open ? "translate-x-0" : "translate-x-[102%]",
        )}
      >
        {station && view && (
          <>
            <div className="px-5 pt-4">
              <div className="flex items-start justify-between gap-2.5">
                <Chip
                  tone={state === "active" ? "doing" : "todo"}
                  className="min-h-0 px-2.5 py-1 text-[11px] font-extrabold tracking-[0.08em]"
                >
                  {statusLabel(view)}
                </Chip>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Đóng chi tiết"
                  className="grid h-9 w-9 place-items-center rounded-control border border-border-default bg-surface-elevated hover:border-border-strong"
                >
                  <X size={15} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </div>
              <h2 className="mt-1.5 text-[17px] leading-snug">
                {station.kind === "lesson" ? `Bài ${station.id}: ` : ""}
                {station.title} <span className="zh text-action-primary">{station.zh}</span>
              </h2>
              <p className="mt-1.5 text-[12.5px] text-text-secondary">
                {station.vocab.length > 0
                  ? `${station.vocab.length} từ vựng · ${view.pct}% hoàn thành · ${station.gram.length} điểm ngữ pháp`
                  : `${view.pct}% hoàn thành · ${lessons.length} bài học`}
              </p>
            </div>
            <div
              role="group"
              aria-label="Tổng quan trạm"
              className="mx-5 mt-3.5 flex gap-0.5 rounded-full border border-border-default bg-surface-muted p-[3px]"
            >
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  data-testid={`drawer-tab-${t.key}`}
                  aria-pressed={t.key === tab}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "min-h-11 flex-1 rounded-full px-2 py-1 text-[12px] font-bold leading-tight transition-colors",
                    t.key === tab
                      ? "border border-border-default bg-surface-elevated text-text-primary shadow-xs"
                      : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  <span className="block">{t.label}</span>
                  {t.meta && (
                    <span className="block text-[10.5px] font-semibold text-text-secondary">{t.meta}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3.5">
              {tab === "review" ? (
                <ReviewTab prev={prevStation} />
              ) : tab === "study" ? (
                <StudyTab lessons={lessons} />
              ) : gate === "locked" ? (
                <EntryGate status="locked" onPass={refreshGate} />
              ) : (
                <QuizBody key={station.id} station={station} level={level} onClose={onClose} />
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );

  function refreshGate(): void {
    try {
      setGate(gateStatus(level.id, progressStore, progressStore.getRoadmapDone().length));
    } catch {
      /* giữ trạng thái cũ */
    }
  }
}

/* ---------- Tab Ôn nhanh (US5) ---------- */

function ReviewTab({ prev }: { prev: Station | null }) {
  if (!prev) {
    return <EmptyNote text="Bắt đầu chặng — không cần ôn." />;
  }
  if (prev.vocab.length > 0) {
    // Trạm trước curated: pool nhúng — warm-up 4 câu, không ghi progress.
    return <WarmupQuiz key={prev.id} pool={{ vocab: prev.vocab, gram: prev.gram }} />;
  }
  // Trạm trước generator (vocab rỗng): không fetch thêm — giữ scope Task 8.
  return <EmptyNote text="Buổi sau sẽ có ôn nhanh." />;
}

function WarmupQuiz({ pool }: { pool: StationPool }) {
  const questions = useMemo<QuizQuestion[]>(() => sampleWarmupQuestions(pool), [pool]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const q = questions[index];

  if (done || !q) {
    return (
      <div data-testid="warmup-done" className="py-6 text-center">
        <p className="text-[15px] font-extrabold">Hoàn tất ôn nhanh</p>
        <p className="mt-1 text-[12.5px] text-text-secondary">Không tính điểm — tiến độ không thay đổi.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[12.5px] text-text-secondary">
        Ôn 4 từ của {pool.vocab.length} từ trạm trước — không tính điểm.
      </p>
      <p data-testid="warmup-prompt" className="mt-2 text-[15px] leading-snug">
        {q.prompt}
      </p>
      <div className="mt-3 grid gap-2">
        {q.options.map((opt, i) => (
          <button
            key={`${index}-${i}`}
            type="button"
            aria-label={`warmup-opt-${i}`}
            onClick={() => setPicked(i)}
            className={cn(
              "flex min-h-11 items-center rounded-control border px-3 py-2 text-left text-[13.5px]",
              picked === i
                ? "border-jade bg-jade-wash font-bold"
                : "border-border-default bg-surface-muted hover:border-border-strong",
            )}
          >
            <span className="zh">{opt}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={picked === null}
        onClick={() => {
          if (index < questions.length - 1) {
            setIndex((i) => i + 1);
            setPicked(null);
          } else {
            setDone(true);
          }
        }}
        className="mt-3 flex min-h-11 w-full items-center justify-center rounded-control border border-action-primary bg-action-primary px-4 text-[13.5px] font-bold text-white disabled:opacity-50"
      >
        {index === questions.length - 1 ? "Kết thúc ôn" : "Câu tiếp"}
      </button>
    </div>
  );
}

/* ---------- Tab Học (US4) ---------- */

function StudyTab({ lessons }: { lessons: LessonRef[] }) {
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setReady(true);
    const sync = () => setTick((t) => t + 1);
    window.addEventListener("bye:progress", sync);
    return () => window.removeEventListener("bye:progress", sync);
  }, []);
  const isDone = (l: LessonRef): boolean => {
    try {
      return progressStore.getPageDone(l.book, l.page);
    } catch {
      return false;
    }
  };

  if (lessons.length === 0) {
    return <EmptyNote text="Trạm này không có bài học — vào “Bài kiểm tra” để ôn tổng hợp." />;
  }
  return (
    <div>
      <p className="mb-2.5 text-[12.5px] text-text-secondary">
        Mỗi bài ≈ 8 phút — mở bài học, hoàn thành sẽ tự tick.
      </p>
      {lessons.map((l, i) => {
        const done = ready && isDone(l); // đọc sau mount (SSR-safe) + re-read theo tick
        return (
          <Link
            key={`${l.book}.${l.page}`}
            href={`/lesson/${l.book}/${l.page}`}
            data-testid={`study-row-${i}`}
            className="mb-2 flex min-h-12 items-center gap-2.5 rounded-control border border-border-default bg-surface-muted px-3 py-2.5 hover:-translate-y-px hover:border-border-strong hover:bg-surface-elevated"
          >
            {done ? (
              <Check size={16} strokeWidth={2.6} aria-hidden="true" className="shrink-0 text-jade" data-testid="lesson-done" />
            ) : (
              <span
                aria-hidden="true"
                data-testid="lesson-todo"
                className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-border-strong text-[9px] text-text-secondary"
              >
                {i + 1}
              </span>
            )}
            <span className="min-w-0 flex-1 text-[13.5px] font-bold">Học bài {i + 1}</span>
            <span className="text-xs text-text-secondary">≈ 8 phút</span>
          </Link>
        );
      })}
    </div>
  );
}

/* ---------- Tab Bài kiểm tra (US5 + gate) ---------- */

/** Quiz body — hook fetch chỉ mount khi gate mở và tab quiz active. */
function QuizBody({ station, level, onClose }: { station: Station; level: RoadmapLevel; onClose: () => void }) {
  const lessons = stationLessons(station);
  const curated = station.vocab.length > 0;
  // Milestone generator: chỉ sample ≤4 bài (rng một lần theo mount — key=station.id)
  const [sampled] = useState<LessonRef[]>(() =>
    !curated && station.kind === "milestone" ? sampleLessonRefs(lessons, 4) : lessons,
  );
  const { pool, loading } = useStationVocab(curated ? [] : sampled);
  if (loading) {
    return (
      <p data-testid="quiz-loading" className="py-6 text-center text-[13.5px] text-text-secondary">
        Đang tải từ vựng…
      </p>
    );
  }
  if (!curated && pool.vocab.length === 0) {
    return (
      <p data-testid="quiz-empty" className="py-6 text-center text-[13.5px] text-text-secondary">
        Chưa tải được từ vựng — kiểm tra kết nối rồi thử lại.
      </p>
    );
  }
  const basePool: StationPool = curated
    ? levelPool(level)
    : {
        vocab: pool.vocab,
        gram: station.kind === "milestone" ? levelPool(level).gram : station.gram,
      };
  return (
    <StationQuiz
      station={station}
      level={level}
      pool={basePool}
      listenEvery={curated ? undefined : 4}
      onClose={onClose}
    />
  );
}

function sampleLessonRefs(lessons: LessonRef[], n: number): LessonRef[] {
  const a = [...lessons];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a.slice(0, n);
}

/* ---------- dùng chung ---------- */

function EmptyNote({ text }: { text: string }) {
  return <p className="py-6 text-center text-[13.5px] text-text-secondary">{text}</p>;
}
