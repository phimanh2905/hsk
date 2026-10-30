"use client";

/* Tab "Bài của tôi" trong /reading (Task 6, plan 2026-10-30-reading-ai-mine).
   Tạo bài AI qua POST /api/v1/reading/generate (quota 3/ngày), danh sách draft
   từ localStorage (progressStore), rename inline + delete 2 bước. */

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Pencil, Trash2 } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { Textarea } from "@/components/ui/textarea";
import { useToastSafe } from "@/components/shell/toast-provider";
import { useLoginModal } from "@/components/shell/login-modal";
import { useSession } from "@/lib/use-session";
import {
  progressStore,
  type SavedReadingDraft,
} from "@/lib/store/progress-store";

const MAX_CHARS = 3000;
const MIN_CHARS = 100;

/* Client validate khớp server assertValidInput (Task 1): strip khoảng trắng,
   100–3000 ký tự, tỉ lệ chữ Hán ≥ 30%. */
function validateInput(text: string): string | null {
  const stripped = text.replace(/\s+/g, "");
  const len = stripped.length;
  if (len < MIN_CHARS) return `Văn bản cần ít nhất ${MIN_CHARS} ký tự (hiện ${len} sau khi bỏ khoảng trắng)`;
  if (len > MAX_CHARS) return `Văn bản tối đa ${MAX_CHARS} ký tự`;
  const han = text.match(/\p{Script=Han}/gu)?.length ?? 0;
  if (len > 0 && han / len < 0.3) return "Văn bản chưa đủ tiếng Trung";
  return null;
}

/* Quota chip: fetch 1 lần lúc mount (login) — create thành công sẽ remount qua key. */
function QuotaChip() {
  const [label, setLabel] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/reading/quota");
      if (!res.ok) return;
      const j = (await res.json()) as { used: number; limit: number };
      setLabel(j.used > 0 ? `Còn ${j.limit - j.used}/${j.limit} lượt` : `Còn ${j.limit}/${j.limit} lượt`);
    } catch {
      /* fetch fail → giữ ẩn chip */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (label === null) return null;
  return (
    <span className="shrink-0 rounded-full border border-border-default bg-surface-elevated px-2.5 py-1 text-xs font-semibold text-text-secondary">
      {label}
    </span>
  );
}

/* 1 card draft: title + meta + rename inline + delete 2 bước. */
function DraftCard({
  draft, onOpen, onChanged,
}: { draft: SavedReadingDraft; onOpen: () => void; onChanged: () => void }) {
  const [renaming, setRenaming] = useState(false);
  const [value, setValue] = useState(draft.title);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  const saveRename = () => {
    const title = value.trim();
    if (title.length >= 1 && title.length <= 255) {
      progressStore.upsertReadingDraft({ ...draft, title, updatedAt: Date.now() });
      onChanged();
    }
    setRenaming(false);
  };

  if (renaming) {
    return (
      <input
        type="text"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => setRenaming(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") saveRename();
          if (e.key === "Escape") setRenaming(false);
        }}
        maxLength={255}
        aria-label="Tên bài mới"
        className="w-full rounded-control border border-border-default bg-surface-elevated px-3 py-2 text-text-primary focus:outline-none focus:ring-3 ring-action-focus"
      />
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="secondary"
        onClick={onOpen}
        className="h-auto min-w-0 flex-1 flex-col items-stretch gap-0.5 p-3 text-left"
      >
        <span className="zh line-clamp-1 font-bold">{draft.title}</span>
        <span className="text-xs text-text-secondary">
          {draft.chars} chữ ·{" "}
          {new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(draft.createdAt)}
        </span>
      </Button>
      <IconButton
        label="Đổi tên"
        className="shrink-0"
        onClick={() => {
          setValue(draft.title);
          setConfirming(false);
          setRenaming(true);
        }}
      >
        <Pencil size={16} aria-hidden="true" />
      </IconButton>
      {confirming ? (
        <IconButton
          label="Xóa?"
          variant="solid"
          className="shrink-0 bg-action-danger text-white hover:opacity-90"
          onClick={() => {
            progressStore.removeReadingDraft(draft.id);
            onChanged();
            setConfirming(false);
          }}
        >
          <Trash2 size={16} aria-hidden="true" />
        </IconButton>
      ) : (
        <IconButton label="Xóa bài" className="shrink-0" onClick={() => setConfirming(true)}>
          <Trash2 size={16} aria-hidden="true" />
        </IconButton>
      )}
    </div>
  );
}

export function MinePanel({ onOpen }: { onOpen: (draft: SavedReadingDraft) => void }) {
  const toast = useToastSafe();
  const { openLogin } = useLoginModal();
  const { loggedIn } = useSession();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [quotaKey, setQuotaKey] = useState(0);
  const [drafts, setDrafts] = useState<SavedReadingDraft[]>([]);

  useEffect(() => {
    setDrafts(progressStore.getReadingDrafts());
  }, []);

  const refreshDrafts = () => setDrafts(progressStore.getReadingDrafts());

  const create = async () => {
    if (pending) return;
    const err = validateInput(text);
    if (err) {
      toast(err);
      return;
    }
    if (!loggedIn) {
      openLogin();
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/v1/reading/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const j = (await res.json().catch(() => null)) as
        | { draft?: { id: string; title: string; textZh: string; doc: SavedReadingDraft["doc"]; chars: number; createdAt: number; updatedAt: number }; remaining?: number; error?: string; nextAt?: number }
        | null;
      if (res.ok && j?.draft) {
        const saved: SavedReadingDraft = {
          ...j.draft,
          doc: {
            ...j.draft.doc,
            questions: j.draft.doc.questions.map((q) => ({ ...q, evidence: q.evidence ?? [] })),
          },
        };
        progressStore.upsertReadingDraft(saved);
        setDrafts(progressStore.getReadingDrafts());
        toast("Đã lưu vào Bài của tôi");
        setQuotaKey((k) => k + 1); // remount QuotaChip → refresh
        setText("");
        onOpen(saved);
      } else if (res.status === 429 && j?.nextAt) {
        const time = new Intl.DateTimeFormat("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Ho_Chi_Minh",
        }).format(j.nextAt);
        toast(`Bạn đã hết lượt tạo bài hôm nay, quay lại sau ${time}`);
      } else {
        toast(j?.error ?? "Không tạo được bài đọc, thử lại sau");
      }
    } catch {
      toast("Không tạo được bài đọc, thử lại sau");
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">Tạo bài đọc bằng AI</h2>
        {loggedIn && <QuotaChip key={quotaKey} />}
      </div>

      <Card className="mb-6 p-4">
        <Textarea
          value={text}
          maxLength={MAX_CHARS}
          onChange={(e) => setText(e.target.value)}
          placeholder="Dán văn bản tiếng Trung (100–3000 ký tự) để tạo bài đọc có dịch, từ vựng và quiz."
          rows={6}
          className="w-full resize-y"
          aria-label="Văn bản tiếng Trung"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-text-secondary">
            {text.length}/{MAX_CHARS}
          </span>
          <Button type="button" onClick={create} loading={pending}>
            {pending && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
            Tạo bài đọc
          </Button>
        </div>
      </Card>

      <h2 className="mb-2 text-lg font-extrabold">Bài đã lưu</h2>
      {drafts.length === 0 ? (
        <p className="text-text-secondary">Chưa có bài nào. Tạo bài đầu tiên ở trên nhé.</p>
      ) : (
        <div className="space-y-2">
          {drafts.map((d) => (
            <DraftCard key={d.updatedAt + d.id} draft={d} onOpen={() => onOpen(d)} onChanged={refreshDrafts} />
          ))}
        </div>
      )}
    </div>
  );
}
