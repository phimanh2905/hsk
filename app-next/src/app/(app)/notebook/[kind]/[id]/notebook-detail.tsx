"use client";

/* F5 — NotebookDetail: trang chi tiết sổ tay /notebook/[kind]/[id].
   Port clone/js/notebook.js:214-272 (renderDetail) + SPEC-18 §D.
   Bảng 4 cột (Chữ/Pinyin/Hán Việt/Nghĩa), fallback rows 3 tầng
   (user rows → sample rows → rows sample đầu), demo toast "Thêm từ"
   (SP1 port đúng hiện trạng — CRUD thật ở UPG-2). */

import { useEffect, type ReactElement } from "react";
import { progressStore, type NotebookKind } from "@/lib/store/progress-store";
import { notebooks, type NotebookRow } from "@/content/notebooks";
import { ToastProvider, useToast } from "@/components/shell/toast-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ICON_STROKE } from "@/components/ui/icon";

function NotebookDetailInner({ kind, id }: { kind: NotebookKind; id: string }): ReactElement {
  const config = notebooks[kind];
  const toast = useToast();

  /* Fallback rows 3 tầng — port notebook.js:229-234 (giữ fix round-1:
     `kind` từ params quyết định cả data lẫn storage qua progressStore.getDeckItem) */
  const user = progressStore.getDeckItem(kind, id);
  const sample = config.samples.find((s) => s.id === id) ?? null;
  const rows: NotebookRow[] =
    user && user.rows.length
      ? user.rows.map((r) => ({ hanzi: r.hanzi, pinyin: r.pinyin ?? "", hanviet: r.hanviet ?? "", meaning: r.meaning ?? "" }))
      : sample
        ? sample.rows
        : config.samples[0].rows;
  const title = user?.name ?? sample?.name ?? "Sổ tay";

  /* clone set document.title trong renderDetail — port sang effect */
  useEffect(() => {
    document.title = title + " | Bye HSK";
    return () => {
      document.title = "Bye HSK";
    };
  }, [title]);

  return (
    <div>
      <section className="mb-6 flex items-start justify-between gap-4">
        <div>
          <a
            href={kind === "grammar" ? "/my-grammar" : "/my-vocab"}
            className="text-sm text-text-secondary hover:text-action-primary"
          >
            ← {config.h1}
          </a>
          <h1 className="mb-2 mt-1 text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="text-text-secondary">{config.sub}</p>
        </div>
        <Button className="shrink-0 rounded-full px-5 py-2.5 text-sm" onClick={() => toast("Thêm từ vào sổ tay — sắp có (demo)")}>
          <Plus size={16} strokeWidth={ICON_STROKE} />
          Thêm từ
        </Button>
      </section>

      <Card className="overflow-x-auto p-2">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left">Chữ</th>
              <th className="px-3 py-2 text-left">Pinyin</th>
              <th className="px-3 py-2 text-left">Hán Việt</th>
              <th className="px-3 py-2 text-left">Nghĩa</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border-default">
                <td className="px-3 py-2 font-bold text-lg zh">{r.hanzi}</td>
                <td className="px-3 py-2">{r.pinyin}</td>
                <td className="px-3 py-2">{r.hanviet || ""}</td>
                <td className="px-3 py-2">{r.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* useToast cần provider → NotebookDetail tự bọc ToastProvider (khuôn dùng ở cả test lẫn route) */
export default function NotebookDetail({ kind, id }: { kind: NotebookKind; id: string }): ReactElement {
  return (
    <ToastProvider>
      <NotebookDetailInner kind={kind} id={id} />
    </ToastProvider>
  );
}
