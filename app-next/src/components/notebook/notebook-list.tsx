"use client";

/* F3/F4 — NotebookList khuôn chung SPEC-18 (my-vocab + my-grammar dùng 1 template, khác nhãn qua config).
   Port clone/js/notebook.js:1-213 (phần list). Store qua progressStore (Task 1),
   config từ @/content/notebooks (Task 4). Samples LUÔN render sau item user tạo (GAP-9). */

import { useCallback, useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { progressStore, type DeckItem } from "@/lib/store/progress-store";
import { notebooks, type NotebookSample } from "@/content/notebooks";
import { ToastProvider, useToast } from "@/components/shell/toast-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Notebook, MoreHorizontal, ICON_STROKE } from "@/components/ui/icon";

/* Port fmtDate clone/js/notebook.js:34-47 */
export function fmtRelativeDate(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const now = new Date();
    const days = Math.floor(
      (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
        86400000
    );
    if (days <= 0) return "Hôm nay";
    if (days === 1) return "Hôm qua";
    if (days < 30) return days + " ngày trước";
    return d.toLocaleDateString("vi-VN");
  } catch {
    return iso;
  }
}

type ModalState = null | { mode: "create" } | { mode: "rename"; item: DeckItem };

function NotebookListInner({ kind }: { kind: "vocab" | "grammar" }) {
  const config = notebooks[kind];
  const router = useRouter();
  const toast = useToast();

  const [mounted, setMounted] = useState(false); // mount-gate: SSR render store rỗng để khớp hydration
  const [items, setItems] = useState<DeckItem[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [menuFor, setMenuFor] = useState<DeckItem | null>(null);

  const sync = useCallback(() => setItems(progressStore.listDecks(kind)), [kind]);
  useEffect(() => {
    sync();
    setMounted(true);
    window.addEventListener("bye:progress", sync);
    return () => window.removeEventListener("bye:progress", sync);
  }, [sync]);

  const submitModal = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || !modal) return;
    if (modal.mode === "rename") {
      progressStore.renameDeck(kind, modal.item.id, trimmed);
      toast('Đã đổi tên thành "' + trimmed + '"');
    } else {
      progressStore.createDeck(kind, trimmed);
      toast("Đã tạo " + trimmed);
    }
    setModal(null);
  };

  const deleteItem = (item: DeckItem) => {
    if (!confirm('Xoá "' + item.name + '"?')) return;
    progressStore.deleteDeck(kind, item.id);
    toast("Đã xoá " + item.name);
    setMenuFor(null);
  };

  /* samples luôn sau item user tạo (GAP-9) */
  const all = [...items, ...config.samples];

  return (
    <div>
      {/* header: H1 + sub + CTA phải */}
      <section className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">{config.h1}</h1>
          <p className="text-text-secondary">{config.sub}</p>
        </div>
        <Button onClick={() => setModal({ mode: "create" })} className="rounded-full px-5 py-2.5 text-sm shrink-0">
          {config.cta}
        </Button>
      </section>

      {mounted && items.length === 0 && (
        <Card className="p-10 text-center mb-6">
          <Notebook size={48} strokeWidth={ICON_STROKE} className="mx-auto mb-4 text-text-secondary" aria-hidden="true" />
          <h2 className="text-2xl font-extrabold mb-2">{config.empty}</h2>
          <p className="text-sm text-text-secondary mb-5">{config.emptySub}</p>
          <Button onClick={() => setModal({ mode: "create" })} className="px-5 py-2.5">
            {config.cta}
          </Button>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {all.map((item) => {
          const isSample = !!(item as { sample?: boolean }).sample;
          const sampleItem = item as NotebookSample;
          const count = isSample ? sampleItem.count : item.rows.length;
          const unit = isSample ? sampleItem.unit : config.countUnit;
          return (
            <Card key={item.id} className="p-4 relative">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3>
                  <a href={`/notebook/${kind}/${item.id}`} className="font-extrabold hover:text-action-primary">
                    {item.name}
                  </a>
                </h3>
                {isSample ? (
                  <span className="text-xs text-text-secondary shrink-0 mt-1">Sổ mẫu</span>
                ) : (
                  <IconButton
                    label="Tuỳ chọn"
                    variant="ghost"
                    className="shrink-0 h-7 w-7 min-h-7 min-w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuFor(menuFor?.id === item.id ? null : item);
                    }}
                  >
                    <MoreHorizontal size={18} strokeWidth={ICON_STROKE} />
                  </IconButton>
                )}
              </div>
              <p className="text-sm text-text-secondary">
                {count} {unit}
              </p>
              <p className="text-xs text-text-secondary mt-2">Sửa {fmtRelativeDate(item.updatedAt)}</p>

              {/* menu ⋯ — card dưới nút (port openCardMenu) */}
              {!isSample && menuFor?.id === item.id && (
                <Card className="absolute z-[550] w-40 p-1 text-sm right-2 top-9">
                  <button
                    type="button"
                    className="block w-full rounded px-3 py-1.5 text-left hover:bg-surface-paper"
                    onClick={() => {
                      setMenuFor(null);
                      router.push(`/notebook/${kind}/${item.id}`);
                    }}
                  >
                    Mở
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded px-3 py-1.5 text-left hover:bg-surface-paper"
                    onClick={() => {
                      setMenuFor(null);
                      setModal({ mode: "rename", item });
                    }}
                  >
                    Sửa tên
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded px-3 py-1.5 text-left text-feedback-error hover:bg-surface-paper"
                    onClick={() => deleteItem(item)}
                  >
                    Xoá
                  </button>
                </Card>
              )}
            </Card>
          );
        })}
      </div>

      {modal && <NameModal modal={modal} config={config} onClose={() => setModal(null)} onSubmit={submitModal} />}
    </div>
  );
}

/* Modal tạo/sửa tên — port openModal clone/js/notebook.js:54-102 */
function NameModal({
  modal,
  config,
  onClose,
  onSubmit,
}: {
  modal: NonNullable<ModalState>;
  config: (typeof notebooks)["vocab"];
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const editing = modal.mode === "rename";
  const [name, setName] = useState(editing ? modal.item.name : "");

  const submit = () => {
    if (!name.trim()) return;
    onSubmit(name);
  };

  return (
    <Dialog open onClose={onClose} labelledBy="notebook-modal-title" className="p-5">
      <h3 id="notebook-modal-title" className="text-xl font-extrabold mb-3 pr-8">
        {editing ? "Sửa tên" : config.modalTitle}
      </h3>
      <Input
        type="text"
        autoFocus
        placeholder="Nhập tên sổ tay / bộ từ vựng…"
        className="w-full mb-4"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} className="px-4 py-2 text-sm">
          Huỷ
        </Button>
        <Button disabled={!name.trim()} onClick={submit} className="px-5 py-2 text-sm">
          {editing ? "Lưu" : "Tạo"}
        </Button>
      </div>
    </Dialog>
  );
}

/* useToast cần provider → NotebookList tự bọc ToastProvider (khuôn dùng ở cả test lẫn route) */
export function NotebookList({ kind }: { kind: "vocab" | "grammar" }): ReactElement {
  return (
    <ToastProvider>
      <NotebookListInner kind={kind} />
    </ToastProvider>
  );
}
