"use client";

/* Modal phím tắt (port div#keysModal [data-od-id="shortcuts-modal"]
   của opendesign lesson.html). */

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { Kbd } from "./kbd";

const SHORTCUTS: { label: string; key: string }[] = [
  { label: "Lật / xem nghĩa · phát lại audio", key: "Space" },
  { label: "Chưa thuộc · lặp sau 1 phút", key: "1" },
  { label: "Mơ hồ · lặp sau 5 phút", key: "2" },
  { label: "Đã thuộc · từ tiếp theo", key: "3" },
  { label: "Phát lại âm thanh chữ Hán", key: "R" },
  { label: "Thoát bài học", key: "Esc" },
];

export function ShortcutsModal({
  open,
  onClose,
  className,
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="keys-modal-title"
      className={cn("max-w-[400px] rounded-[20px]", className)}
    >
      <h2 id="keys-modal-title" className="text-base font-extrabold">
        Phím tắt học nhanh
      </h2>
      <div className="my-3 mb-4 grid gap-2 text-[13px] text-text-secondary">
        {SHORTCUTS.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-3">
            <span>{s.label}</span>
            <Kbd>{s.key}</Kbd>
          </div>
        ))}
      </div>
      <Button type="button" variant="secondary" className="min-h-12 w-full" onClick={onClose}>
        Đã hiểu
      </Button>
    </Dialog>
  );
}
