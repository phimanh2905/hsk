"use client";

/* Danh sách toàn bộ từ — port #listPanel của mock: bảng 6 cột (≥720px) + mcards
   (<720px), cùng 1 map row. Status pill + dot từ status; mem qua MemSegs. */
import { Volume2 } from "@/components/ui/icon";
import type { VocabRow } from "@/lib/my-vocab";
import { cn } from "@/lib/cn";
import { MemSegs } from "./mem-segs";

const STATUS_META: Record<VocabRow["status"], { cls: string; label: string; dot: string }> = {
  master: { cls: "border-jade-line bg-jade-wash text-jade-ink", label: "Master", dot: "🟢" },
  study: { cls: "border-amber-line bg-amber-wash text-amber-ink", label: "Đang ôn", dot: "🟡" },
  new: { cls: "border-rose-line bg-rose-wash text-rose-ink", label: "Mới học", dot: "🔴" },
};

function SrsPill({ status }: { status: VocabRow["status"] }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("whitespace-nowrap rounded-full border px-[11px] py-[3px] text-[11px] font-extrabold", m.cls)}>
      {m.dot} {m.label}
    </span>
  );
}

export function VocabTable({
  rows, onOpen, onSpeak,
}: {
  rows: VocabRow[];
  onOpen: (zh: string) => void;
  onSpeak: (zh: string) => void;
}) {
  return (
    <section data-od-id="vocab-table" aria-label="Danh sách từ" className="overflow-hidden rounded-card border border-border-subtle bg-surface-elevated/80 shadow-xs backdrop-blur-sm">
      {/* bảng ≥720px */}
      <div className="hidden overflow-x-auto min-[720px]:block">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Hán tự", "Pinyin", "Âm Hán-Việt & Nghĩa", "HSK", "Trạng thái", "Thao tác"].map((h) => (
                <th key={h} className="whitespace-nowrap border-b border-border-subtle px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.07em] text-text-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr
                key={w.zh}
                onClick={() => onOpen(w.zh)}
                className="cursor-pointer border-b border-border-subtle transition-colors last:border-0 hover:bg-surface-muted"
              >
                <td className="zh whitespace-nowrap px-3 py-2.5 text-[22px] font-bold text-text-primary">{w.zh}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{w.py || "—"}</td>
                <td className="px-3 py-2.5">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">{w.hv || "—"}</div>
                  <div className="text-text-secondary">{w.vi || "—"}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{w.hsk}</td>
                <td className="px-3 py-2.5"><MemSegs status={w.status} /></td>
                <td className="px-3 py-2.5">
                  <span className="flex gap-1.5">
                    <button
                      type="button"
                      aria-label={`Nghe ${w.zh}`}
                      onClick={(e) => { e.stopPropagation(); onSpeak(w.zh); }}
                      className="grid h-9 w-9 place-items-center rounded-[10px] text-text-secondary hover:border hover:border-border-subtle hover:bg-surface-muted hover:text-action-primary"
                    >
                      <Volume2 size={15} strokeWidth={2} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Chi tiết ${w.zh}`}
                      onClick={(e) => { e.stopPropagation(); onOpen(w.zh); }}
                      className="grid h-9 w-9 place-items-center rounded-[10px] text-[15px] font-extrabold text-text-secondary hover:border hover:border-border-subtle hover:bg-surface-muted hover:text-action-primary"
                    >
                      ⋮
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="p-[30px] text-center text-[13.5px] text-text-secondary">Không có từ nào khớp bộ lọc.</div>
        )}
      </div>

      {/* mcards <720px — cùng map row */}
      <div className="grid gap-2.5 p-3.5 min-[720px]:hidden">
        {rows.map((w) => (
          <div
            key={w.zh}
            data-mcard
            onClick={() => onOpen(w.zh)}
            className="cursor-pointer rounded-[14px] border border-border-subtle bg-surface-muted px-3.5 py-3"
          >
            <div className="flex items-center gap-2.5">
              <span className="zh text-[21px] font-bold text-text-primary">{w.zh}</span>
              <span className="text-xs text-text-secondary">{w.py}</span>
              <span className="ml-auto flex gap-1.5">
                <button
                  type="button"
                  aria-label={`Nghe ${w.zh}`}
                  onClick={(e) => { e.stopPropagation(); onSpeak(w.zh); }}
                  className="grid h-9 w-9 place-items-center rounded-[10px] text-text-secondary hover:text-action-primary"
                >
                  <Volume2 size={15} strokeWidth={2} aria-hidden="true" />
                </button>
              </span>
            </div>
            <div className="mt-0.5 text-[13px] text-text-secondary">{w.vi} · {w.hsk}</div>
            <div className="mt-2.5 flex items-center gap-2">
              <SrsPill status={w.status} />
              <span className="text-xs text-text-secondary">{w.last}</span>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="p-[30px] text-center text-[13.5px] text-text-secondary">Không có từ nào khớp bộ lọc.</div>
        )}
      </div>
    </section>
  );
}
