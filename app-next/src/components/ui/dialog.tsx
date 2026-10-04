import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Dialog({
  open,
  onClose,
  labelledBy,
  role = "dialog",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  role?: "dialog" | "alertdialog";
  className?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // "Nuốt" phím: listener window của FlashStage (useKeyboard) chạy sau ở cùng
      // event nên nếu không chặn, Esc đóng dialog lại mở luôn exit modal.
      e.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "bg-surface-elevated rounded-card border border-border-default shadow-md w-full max-w-md p-6",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
