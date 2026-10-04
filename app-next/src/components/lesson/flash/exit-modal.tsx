"use client";

/* Modal xác nhận thoát bài học (port div#exitModal [data-od-id="exit-modal"]
   của opendesign lesson.html). "Về lộ trình" → /roadmap như location.href='roadmap.html'. */

import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function ExitModal({
  open,
  onClose,
  lessonTitle,
  className,
}: {
  open: boolean;
  onClose: () => void;
  lessonTitle?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      role="alertdialog"
      labelledBy="exit-modal-title"
      className={cn("max-w-[400px] rounded-[20px]", className)}
    >
      <h2 id="exit-modal-title" className="text-base font-extrabold">
        Rời khỏi {lessonTitle ?? "bài học"}?
      </h2>
      <p className="mt-2 mb-4 text-[13.5px] text-text-secondary">
        Tiến độ đã được lưu · streak hôm nay vẫn giữ. Quay lại lộ trình để tiếp tục sau.
      </p>
      <div className="flex gap-2.5">
        <Button type="button" variant="secondary" className="min-h-12 flex-1" onClick={onClose}>
          Ở lại học
        </Button>
        <Button
          type="button"
          variant="danger"
          className="min-h-12 flex-1"
          onClick={() => router.push("/roadmap")}
        >
          Về lộ trình
        </Button>
      </div>
    </Dialog>
  );
}
