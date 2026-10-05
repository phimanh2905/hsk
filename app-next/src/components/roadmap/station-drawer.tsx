"use client";

/* Right drawer chi tiết trạm (port .drawer + .overlay + JS drawer của
   opendesign_hsk/roadmap.html). KHÔNG tái dụng ui/dialog (Dialog là overlay
   giữa màn hình). Audio nối useTts thật; launch buttons toast "sắp ra mắt"
   (spec §8, non-goal phase 1). */
import { useEffect, useRef, useState } from "react";
import {
  HelpCircle,
  ICON_STROKE,
  MonitorPlay,
  PencilLine,
  Volume2,
  X,
} from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { Chip } from "@/components/ui/chip";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { useTts } from "@/lib/tts/use-tts";
import { useToastSafe } from "@/components/shell/toast-provider";
import type { StationView } from "@/lib/roadmap-progress";
import type { Station } from "@/content/roadmap-stations";

const LAUNCH = [
  { act: "Học Flashcard", Icon: MonitorPlay },
  { act: "Luyện viết Hanzi", Icon: PencilLine },
  { act: "Thi trắc nghiệm Quiz", Icon: HelpCircle },
] as const;

function statusLabel(v: StationView): string {
  if (v.state === "done") return `HOÀN THÀNH · ${v.station.no.toUpperCase()}`;
  if (v.state === "active") return `ĐANG HỌC · ${v.station.no.toUpperCase()}`;
  return `ĐANG KHÓA · ${v.station.kind === "milestone" ? "MILESTONE" : `BÀI ${v.station.id}`}`;
}

export function StationDrawer({
  view,
  open,
  onClose,
}: {
  view: StationView | null;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"vocab" | "gram">("vocab");
  const { speak } = useTts();
  const toast = useToastSafe();
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

  // Mở drawer luôn về tab Từ vựng (như mock: mode='vocab' trong openDrawer)
  useEffect(() => {
    if (open) setTab("vocab");
  }, [open]);

  const station = view?.station ?? null;
  const state = view?.state ?? "locked";

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
                {state === "active"
                  ? `${station.vocab.length} từ vựng · ${view.pct}% hoàn thành · ${station.gram.length} điểm ngữ pháp`
                  : station.meta}
              </p>
            </div>
            <SegmentedTabs
              className="mx-5 mt-3.5"
              label="Tổng quan trạm"
              tabs={[
                { key: "vocab" as const, label: "Từ vựng mới" },
                { key: "gram" as const, label: "Ngữ pháp trọng tâm" },
              ]}
              value={tab}
              onChange={setTab}
            />
            <div className="flex-1 overflow-y-auto px-5 py-3.5">
              {tab === "vocab" ? <VocabList view={view} onSpeak={speak} /> : <GramList station={station} />}
            </div>
            <div className="grid gap-2 border-t border-border-default px-5 pb-5 pt-3.5">
              {LAUNCH.map(({ act, Icon }) => (
                <button
                  key={act}
                  type="button"
                  onClick={() => toast(`${act} — sắp ra mắt trong bản demo`)}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-control border border-border-default bg-surface-muted text-[13.5px] font-bold hover:-translate-y-px hover:border-border-strong hover:bg-surface-elevated"
                >
                  <Icon size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  {act}
                </button>
              ))}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function VocabList({ view, onSpeak }: { view: StationView; onSpeak: (zh: string) => void }) {
  const locked = view.state === "locked";
  return (
    <div>
      {locked && (
        <p className="mb-2.5 text-[12.5px] text-text-secondary">
          Xem trước khi mở khóa · audio đầy đủ sau khi hoàn thành trạm trước.
        </p>
      )}
      {view.station.vocab.map(([zh, py, vn]) => (
        <div
          key={zh}
          className="mb-2 flex items-center gap-2.5 rounded-control border border-border-default bg-surface-muted px-3 py-2.5"
        >
          <button
            type="button"
            onClick={() => onSpeak(zh)}
            aria-label={`Nghe phát âm ${zh}`}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border-default bg-surface-elevated hover:border-action-primary hover:text-action-primary"
          >
            <Volume2 size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </button>
          <span className="min-w-0">
            <span className="zh block text-base font-bold">{zh}</span>
            <span className="block text-xs text-text-secondary">{py}</span>
          </span>
          <span className="ml-auto text-right text-xs text-text-secondary">{vn}</span>
        </div>
      ))}
      {view.state === "active" && (
        <p className="mt-1 text-xs text-text-secondary">
          Danh sách rút gọn {view.station.vocab.length} từ · mở bài học để xem đủ + audio chuẩn.
        </p>
      )}
    </div>
  );
}

function GramList({ station }: { station: Station }) {
  return (
    <div>
      {station.gram.map(([name, desc]) => (
        <div key={name} className="mb-2 rounded-control border border-border-default bg-surface-muted p-3">
          <b className="block text-[13px]">{name}</b>
          <span className="text-[12.5px] text-text-secondary">{desc}</span>
        </div>
      ))}
      <p className="mt-1 text-xs text-text-secondary">
        Chế độ học: Flashcard · Quiz · Viết Hanzi — lưu tiến độ về dashboard.
      </p>
    </div>
  );
}
