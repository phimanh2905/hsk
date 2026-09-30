"use client";

/* F3/F4 — NotebookList khuôn chung SPEC-18 (my-vocab + my-grammar dùng 1 template, khác nhãn qua config).
   Port clone/js/notebook.js:1-213 (phần list). Store qua progressStore (Task 1),
   config từ @/content/notebooks (Task 4). Samples LUÔN render sau item user tạo (GAP-9). */

import { useCallback, useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { progressStore, type DeckItem } from "@/lib/store/progress-store";
import { notebooks, type NotebookSample } from "@/content/notebooks";
import { ToastProvider, useToast } from "@/components/shell/toast-provider";

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
    window.addEventListener("nhai:progress", sync);
    return () => window.removeEventListener("nhai:progress", sync);
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
      {/* header: mascot 🍅 + H1 + sub + CTA phải */}
      <section className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">🍅 {config.h1}</h1>
          <p className="text-[var(--nhai-muted)]">{config.sub}</p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: "create" })}
          className="btn-main rounded-full px-5 py-2.5 text-sm shrink-0"
        >
          {config.cta}
        </button>
      </section>

      {mounted && items.length === 0 && (
        <div className="card shadow-neo p-10 text-center mb-6">
          <div className="text-6xl mb-4" aria-hidden="true">
            📕
          </div>
          <h2 className="text-2xl font-extrabold mb-2">{config.empty}</h2>
          <p className="text-sm text-[var(--nhai-muted)] mb-5">{config.emptySub}</p>
          <button type="button" onClick={() => setModal({ mode: "create" })} className="btn-main px-5 py-2.5">
            {config.cta}
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {all.map((item) => {
          const isSample = !!(item as { sample?: boolean }).sample;
          const sampleItem = item as NotebookSample;
          const count = isSample ? sampleItem.count : item.rows.length;
          const unit = isSample ? sampleItem.unit : config.countUnit;
          return (
            <div key={item.id} className="card shadow-neo p-4 relative">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3>
                  <a href={`/notebook/${kind}/${item.id}`} className="font-extrabold hover:text-[var(--nhai-main)]">
                    {item.name}
                  </a>
                </h3>
                {isSample ? (
                  <span className="text-xs text-[var(--nhai-muted)] shrink-0 mt-1">Sổ mẫu</span>
                ) : (
                  <button
                    type="button"
                    aria-label="Tuỳ chọn"
                    className="shrink-0 h-7 w-7 rounded-full text-lg leading-none text-[var(--nhai-muted)] hover:bg-[var(--nhai-soft)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuFor(menuFor?.id === item.id ? null : item);
                    }}
                  >
                    ⋯
                  </button>
                )}
              </div>
              <p className="text-sm text-[var(--nhai-muted)]">
                {count} {unit}
              </p>
              <p className="text-xs text-[var(--nhai-muted)] mt-2">Sửa {fmtRelativeDate(item.updatedAt)}</p>

              {/* menu ⋯ — card dưới nút (port openCardMenu) */}
              {!isSample && menuFor?.id === item.id && (
                <div className="card shadow-neo absolute z-[550] w-40 p-1 text-sm right-2 top-9">
                  <button
                    type="button"
                    className="block w-full rounded px-3 py-1.5 text-left hover:bg-[var(--nhai-soft)]"
                    onClick={() => {
                      setMenuFor(null);
                      router.push(`/notebook/${kind}/${item.id}`);
                    }}
                  >
                    Mở
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded px-3 py-1.5 text-left hover:bg-[var(--nhai-soft)]"
                    onClick={() => {
                      setMenuFor(null);
                      setModal({ mode: "rename", item });
                    }}
                  >
                    Sửa tên
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded px-3 py-1.5 text-left text-red-600 hover:bg-[var(--nhai-soft)]"
                    onClick={() => deleteItem(item)}
                  >
                    Xoá
                  </button>
                </div>
              )}
            </div>
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
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="card shadow-neo relative w-full max-w-md p-5">
        <button
          type="button"
          aria-label="Đóng"
          onClick={onClose}
          className="absolute right-3 top-3 h-8 w-8 rounded-full text-xl leading-none text-[var(--nhai-muted)] hover:bg-[var(--nhai-soft)]"
        >
          ✕
        </button>
        <h3 className="text-xl font-extrabold mb-3 pr-8">{editing ? "Sửa tên" : config.modalTitle}</h3>
        <input
          type="text"
          autoFocus
          placeholder="Nhập tên sổ tay / bộ từ vựng…"
          className="w-full rounded-lg border-2 border-[var(--nhai-border)] bg-white p-2.5 mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost px-4 py-2 text-sm">
            Huỷ
          </button>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={submit}
            className="btn-main px-5 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editing ? "Lưu" : "Tạo"}
          </button>
        </div>
      </div>
    </div>
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
