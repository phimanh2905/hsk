"use client";

/* Port từ clone/js/pinyin.js:1-124 — ma trận thanh mẫu × vận mẫu, filter pills, popup 4 thanh.
   D1 theo SPEC-04 §2. */

import { useEffect, useState } from "react";
import {
  pinyinInitials,
  pinyinFinals,
  pinyinValid,
  pinyinExamples,
} from "@/content/pinyin";
import ToneDialog from "./tone-dialog";

export default function MatrixClient() {
  const [filter, setFilter] = useState<string | null>(null); // null = "Tất cả"
  const [selected, setSelected] = useState<string | null>(null);

  const rows = filter === null ? pinyinInitials : [filter];

  return (
    <div>
      {/* ---- filter pills ---- */}
      <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Lọc theo thanh mẫu">
        <button
          type="button"
          onClick={() => setFilter(null)}
          className={`pill text-sm ${filter === null ? "pill-active" : "btn-ghost"}`}
        >
          Tất cả
        </button>
        {pinyinInitials.map((ini) => (
          <button
            key={ini}
            type="button"
            onClick={() => setFilter(ini)}
            className={`pill text-sm ${filter === ini ? "pill-active" : "btn-ghost"}`}
          >
            {ini}
          </button>
        ))}
      </div>

      {/* ---- bảng ma trận ---- */}
      <div className="overflow-x-auto card shadow-neo p-0">
        <table className="border-collapse w-full">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-2 border-nhai-border bg-nhai-soft px-2 py-1.5 text-xs font-bold whitespace-nowrap">
                /
              </th>
              {pinyinFinals.map((f) => (
                <th
                  key={f}
                  className="border-2 border-nhai-border bg-nhai-soft px-2 py-1.5 text-xs font-bold whitespace-nowrap"
                >
                  {f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((ini) => (
              <tr key={ini}>
                <th className="sticky left-0 z-10 bg-nhai-card border-2 border-nhai-border px-2 py-1.5 text-sm font-extrabold">
                  {ini}
                </th>
                {pinyinFinals.map((f) => {
                  const syl = pinyinValid[ini]?.[f];
                  return (
                    <td key={f} className="border border-nhai-border p-0">
                      {syl ? (
                        <button
                          type="button"
                          onClick={() => setSelected(syl)}
                          className="grid-cell w-full h-full min-w-[44px] py-1 hover:bg-nhai-soft transition-colors"
                        >
                          <span className="text-sm sm:text-base font-bold">{syl}</span>
                        </button>
                      ) : (
                        <span
                          className="grid-cell zh-faded select-none flex items-center justify-center w-full h-full min-w-[44px] py-1"
                          aria-hidden="true"
                        >
                          <span className="text-sm text-nhai-muted">·</span>
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
