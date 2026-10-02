"use client";

/* Port từ clone/js/pinyin.js:1-124 — ma trận thanh mẫu × vận mẫu, filter pills, popup 4 thanh.
   D1 theo SPEC-04 §2. */

import { useState } from "react";
import {
  pinyinInitials,
  pinyinFinals,
  pinyinValid,
} from "@/content/pinyin";
import ToneDialog from "./tone-dialog";
import { Chip } from "@/components/ui/chip";

export default function MatrixClient() {
  const [filter, setFilter] = useState<string | null>(null); // null = "Tất cả"
  const [selected, setSelected] = useState<string | null>(null);

  const rows = filter === null ? pinyinInitials : [filter];

  return (
    <div>
      {/* ---- filter pills ---- */}
      <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Lọc theo thanh mẫu">
        <Chip selected={filter === null} onClick={() => setFilter(null)}>
          Tất cả
        </Chip>
        {pinyinInitials.map((ini) => (
          <Chip
            key={ini}
            selected={filter === ini}
            onClick={() => setFilter(ini)}
          >
            {ini}
          </Chip>
        ))}
      </div>

      {/* ---- bảng ma trận ---- */}
      <div className="overflow-x-auto rounded-card border border-border-default bg-surface-elevated shadow-xs p-0">
        <table className="border-collapse w-full">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border border-border-default bg-surface-paper px-2 py-1.5 text-xs font-bold whitespace-nowrap">
                /
              </th>
              {pinyinFinals.map((f) => (
                <th
                  key={f}
                  className="border border-border-default bg-surface-paper px-2 py-1.5 text-xs font-bold whitespace-nowrap"
                >
                  {f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((ini) => (
              <tr key={ini}>
                <th className="sticky left-0 z-10 bg-surface-elevated border border-border-default px-2 py-1.5 text-sm font-extrabold">
                  {ini}
                </th>
                {pinyinFinals.map((f) => {
                  const syl = pinyinValid[ini]?.[f];
                  return (
                    <td key={f} className="border border-border-default p-0">
                      {syl ? (
                        <button
                          type="button"
                          onClick={() => setSelected(syl)}
                          className="flex items-center justify-center w-full h-full min-w-[44px] min-h-11 py-1 hover:bg-surface-paper transition-colors"
                        >
                          <span className="text-sm sm:text-base font-bold">{syl}</span>
                        </button>
                      ) : (
                        <span
                          className="opacity-25 select-none flex items-center justify-center w-full h-full min-w-[44px] min-h-11 py-1"
                          aria-hidden="true"
                        >
                          <span className="text-sm text-text-secondary">·</span>
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <ToneDialog syllable={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
