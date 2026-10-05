"use client";

import { useState } from "react";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { MemBar } from "./mem-bar";
import { Search, Volume2, Pencil } from "@/components/ui/icon";
import type { ReviewableWord } from "@/lib/srs-session";

type Filter = "all" | "urgent" | "new";

const MINI =
  "grid h-8 w-8 place-items-center rounded-[8px] border border-transparent bg-surface-muted text-text-secondary transition-colors hover:border-border-default hover:bg-surface-elevated hover:text-text-primary";

function RowActions({ w, onListen, onStroke }: { w: ReviewableWord; onListen: (zh: string) => void; onStroke: (zh: string) => void }) {
  return (
    <span className="flex gap-1.5">
      <button type="button" className={MINI} aria-label={`Nghe ${w.zh}`} onClick={() => onListen(w.zh)}>
        <Volume2 size={15} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <button type="button" className={MINI} aria-label={`Xem nét viết ${w.zh}`} onClick={() => onStroke(w.zh)}>
        <Pencil size={15} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </span>
  );
}

/* Vocab inspector (mock .panel, spec §3): seg filter + search local + bảng (≥md) / cards (<md)
   từ CÙNG mảng pool — không lệch dữ liệu giữa 2 render. */
export function VocabInspector({ words, onListen, onStroke }: {
  words: ReviewableWord[];
  onListen: (zh: string) => void;
  onStroke: (zh: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const urgentCount = words.filter((w) => w.mem < 55).length;
  const pool = words.filter((w) => {
    if (filter === "urgent" && w.mem >= 55) return false;
    if (filter === "new" && !w.isNew) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!`${w.zh}${w.pinyin}${w.meaning}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <section aria-label="Từ cần ôn" className="overflow-hidden rounded-card border border-border-default bg-surface-elevated shadow-xs">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border-default p-4">
        <SegmentedTabs<Filter>
          label="Lọc từ vựng"
          value={filter}
          onChange={setFilter}
          tabs={[
            { key: "all", label: `Tất cả (${words.length})` },
            { key: "urgent", label: `Cấp bách (${urgentCount})` },
            { key: "new", label: "Từ mới" },
          ]}
        />
        <label className="ml-auto flex h-10 min-w-44 items-center gap-2 rounded-full border border-border-default bg-surface-muted px-3.5 md:ml-0 md:w-full md:max-w-72">
          <Search size={15} strokeWidth={1.5} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm từ, pinyin, nghĩa…"
            aria-label="Tìm từ vựng"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-text-secondary/70"
          />
        </label>
      </div>

      {/* bảng ≥md */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Hán tự", "Pinyin", "Nghĩa", "Độ bền trí nhớ", "Lần ôn cuối", "Thao tác"].map((h) => (
                <th key={h} className="border-b border-border-default px-3 py-2.5 text-left text-[11px] font-extrabold tracking-wider text-text-secondary/80">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pool.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="p-7 text-center text-[13.5px] text-text-secondary">
                    Không có từ nào khớp bộ lọc hiện tại.
                  </div>
                </td>
              </tr>
            ) : (
              pool.map((w) => (
                <tr key={w.key} className="transition-colors hover:bg-surface-muted">
                  <td className="zh whitespace-nowrap px-3 py-2.5 text-[19px] font-bold">{w.zh}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{w.pinyin}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{w.meaning}</td>
                  <td className="px-3 py-2.5"><MemBar value={w.mem} /></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[12.5px] text-text-secondary">{w.lastLabel}</td>
                  <td className="px-3 py-2.5"><RowActions w={w} onListen={onListen} onStroke={onStroke} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* cards <md — cùng pool */}
      <div className="grid gap-2.5 p-3.5 md:hidden">
        {pool.length === 0 && (
          <div className="p-7 text-center text-[13.5px] text-text-secondary">Không có từ nào khớp bộ lọc hiện tại.</div>
        )}
        {pool.map((w) => (
          <div key={w.key} className="rounded-[14px] border border-border-default bg-surface-muted p-3">
            <div className="flex items-center gap-2.5">
              <span className="zh text-xl font-bold">{w.zh}</span>
              <span className="text-[12.5px] text-text-secondary">{w.pinyin}</span>
              <span className="ml-auto"><RowActions w={w} onListen={onListen} onStroke={onStroke} /></span>
            </div>
            <div className="mt-0.5 text-[13px] text-text-secondary">{w.meaning} · {w.lastLabel}</div>
            <div className="mt-2.5 flex items-center"><MemBar value={w.mem} className="flex-1 min-w-0" /></div>
          </div>
        ))}
      </div>
    </section>
  );
}
