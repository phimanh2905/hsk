"use client";

/* Modal tạo deck — port #deckModal của mock: input tên (maxlength 40, Enter submit). */
import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DeckModal({
  open, onClose, onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");

  useEffect(() => { if (!open) setName(""); }, [open]);

  const submit = () => {
    if (!name.trim()) return;
    onCreate(name.trim());
    setName("");
  };

  return (
    <Dialog open={open} onClose={onClose} labelledBy="deck-modal-title" className="max-w-[400px] p-[22px]">
      <h2 id="deck-modal-title" className="text-base font-bold text-text-primary">Tạo Deck mới</h2>
      <Input
        aria-label="Tên deck"
        maxLength={40}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); submit(); } }}
        placeholder="Tên deck, ví dụ: Từ vựng phỏng vấn…"
        className="my-3"
      />
      <div className="flex gap-2.5">
        <Button type="button" variant="secondary" className="min-h-12 flex-1" onClick={onClose}>Hủy</Button>
        <Button type="button" className="min-h-12 flex-1" onClick={submit}>Tạo deck</Button>
      </div>
    </Dialog>
  );
}
