"use client";
/* Bảng Pinyin 405 âm tiết (/pinyin/bang-am). Desktop: ma trận initial × final
   (scroll ngang khi hẹp). Mobile (<md): nhóm chip theo hàng initial — cùng một
   ô render 2 lần trong DOM, ẩn bằng CSS (hidden md:block / md:hidden) để
   hydration-safe: buildSyllableTable là data thuần tĩnh, server và client
   render giống hệt nhau. Dialog qua state nội bộ; deep-link ?sy=<base>
   đọc/ghi bằng history.replaceState (SSG-safe). */
import { useEffect, useRef, useState } from "react";
import { buildSyllableTable, type SyllableCell } from "@/lib/pinyin/syllable-table-data";
import { SyllableDialog } from "./syllable-dialog";

const table = buildSyllableTable();

export function SyllableTable({ initialSy }: { initialSy?: string | null }) {
  const [open, setOpen] = useState<SyllableCell | null>(null);
  const bootedRef = useRef(false);

  /* Mount: đọc ?sy → mở sẵn dialog (không tự phát audio). */
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    const sy = initialSy ?? new URLSearchParams(window.location.search).get("sy");
    if (!sy) return;
    for (const cell of table.cells.values()) {
      if (cell.base === sy) {
        setOpen(cell);
        return;
      }
    }
  }, [initialSy]);

  const openCell = (cell: SyllableCell) => {
    setOpen(cell);
    window.history.replaceState(null, "", `/pinyin/bang-am?sy=${cell.base}`);
  };
  const closeCell = () => {
    setOpen(null);
    window.history.replaceState(null, "", "/pinyin/bang-am");
  };

  const cellButton = (cell: SyllableCell) => (
    <button
      key={`${cell.initial}|${cell.final}`}
      type="button"
      onClick={() => openCell(cell)}
      aria-label={`âm tiết ${cell.base}`}
      className={`zh min-h-[44px] min-w-[44px] cursor-pointer rounded-control border px-2 py-1 text-sm font-bold transition-colors ${
        open?.base === cell.base
          ? "border-action-primary bg-action-primary text-white"
          : "border-border-subtle bg-surface-paper text-text-primary hover:bg-surface-muted"
      }`}
    >
      {cell.base}
    </button>
  );

  return (
    <div>
      {/* Desktop: bảng ma trận */}
      <div
        data-testid="syllable-table-desktop"
        className="hidden overflow-x-auto rounded-card border border-border-subtle bg-surface-elevated p-3 shadow-xs md:block"
      >
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface-elevated px-2 py-1 text-left text-xs text-text-secondary">
                声母＼韵母
              </th>
              {table.finals.map((f) => (
                <th key={f} className="zh min-w-[48px] px-2 py-1 text-xs font-bold text-text-secondary">
                  {f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.initials.map((ini) => (
              <tr key={ini}>
                <th className="sticky left-0 z-10 bg-surface-elevated px-2 py-1 text-left text-sm font-bold text-text-primary">
                  <span className="zh">{ini}</span>
                  {ini === "Ø" && (
                    <span className="ml-1 text-[10px] font-normal text-text-secondary">
                      không thanh mẫu
                    </span>
                  )}
                </th>
                {table.finals.map((f) => {
                  const cell = table.cells.get(`${ini}|${f}`);
                  return (
                    <td key={f} className="p-0.5">
                      {cell ? (
                        cellButton(cell)
                      ) : (
                        <span className="block min-h-[44px] min-w-[44px]" aria-hidden="true" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: nhóm theo initial, chip wrap */}
      <div data-testid="syllable-table-mobile" className="flex flex-col gap-4 md:hidden">
        {table.initials.map((ini) => (
          <section
            key={ini}
            className="rounded-card border border-border-subtle bg-surface-elevated p-3 shadow-xs"
          >
            <h3 className="mb-2 text-sm font-bold text-text-primary">
              <span className="zh">{ini}</span>
              {ini === "Ø" && (
                <span className="ml-1 text-[10px] font-normal text-text-secondary">
                  không thanh mẫu
                </span>
              )}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {table.finals.map((f) => {
                const cell = table.cells.get(`${ini}|${f}`);
                return cell ? cellButton(cell) : null;
              })}
            </div>
          </section>
        ))}
      </div>

      {open && <SyllableDialog cell={open} onClose={closeCell} />}
    </div>
  );
}
