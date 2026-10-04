"use client";

/* Sân khấu flash SRS (port main.stage của opendesign lesson.html):
   Flashcard + SrsDeck + StrokeStudio. Hotkeys Space/1/2/3/R/Esc (port keydown mockup)
   — bỏ qua khi có modal/sheet mở; autoplay 350ms khi sang từ mới (port render(n)). */

import { useEffect, useRef } from "react";
import { useLesson } from "../lesson-provider";
import { useTts } from "@/lib/tts/use-tts";
import { useKeyboard } from "@/lib/use-keyboard";
import { Flashcard } from "./flashcard";
import { SrsDeck } from "./srs-deck";
import { StrokeStudio } from "./stroke-studio";

/* có dialog/sheet mở → hotkeys học không chạy (guard như mockup: modals đang mở thì return) */
function anyModalOpen(): boolean {
  return (
    typeof document !== "undefined" &&
    Boolean(document.querySelector('[role="dialog"], [role="alertdialog"]'))
  );
}

export default function FlashStage({
  onRequestExit,
  strokeOpen,
  onStrokeOpen,
}: {
  onRequestExit: () => void;
  /** sheet nét chữ do LessonBody điều khiển (một overlay duy nhất: mở cái này thì đóng cái kia). */
  strokeOpen: boolean;
  onStrokeOpen: (v: boolean) => void;
}) {
  const { items, index, revealed, setRevealed, grade, done, autoplay } = useLesson();
  const { speak } = useTts();

  const item = items[index];
  const playWord = () => {
    if (item && !done) speak(item.hanzi, { lang: "zh-CN" });
  };

  /* autoplay: sang từ mới → 350ms sau phát âm; bỏ lần mount đầu (render(false) mockup) */
  const first = useRef(true);
  const autoRef = useRef({ autoplay, item, done });
  autoRef.current = { autoplay, item, done };
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const { autoplay: a, item: w, done: d } = autoRef.current;
    if (!a || !w || d) return;
    const id = setTimeout(() => speak(w.hanzi, { lang: "zh-CN" }), 350);
    return () => clearTimeout(id);
  }, [index, speak]);

  useKeyboard({
    " ": (e) => {
      if (anyModalOpen()) return;
      // done = màn hoàn thành: Space không re-reveal (nếu không, 1/2/3 sẽ chấm lại từ đã grade)
      if (done) return;
      e.preventDefault();
      if (!revealed) setRevealed(true);
      else playWord();
    },
    1: () => {
      if (!anyModalOpen()) grade(1);
    },
    2: () => {
      if (!anyModalOpen()) grade(2);
    },
    3: () => {
      if (!anyModalOpen()) grade(3);
    },
    r: () => {
      if (!anyModalOpen()) playWord();
    },
    R: () => {
      if (!anyModalOpen()) playWord();
    },
    Escape: () => {
      // sheet/modal tự đóng Esc riêng; chỉ mở exit modal khi không gì đang mở
      if (anyModalOpen()) return;
      onRequestExit();
    },
  });

  if (!item) return null;

  return (
    <div className="flex flex-col items-center gap-[18px]" data-testid="flash-stage">
      <Flashcard onOpenStroke={() => onStrokeOpen(true)} />
      {!done && <SrsDeck className="w-full max-w-[560px]" />}
      <StrokeStudio
        open={strokeOpen}
        onClose={() => onStrokeOpen(false)}
        word={item.hanzi}
        pinyin={item.pinyin}
      />
    </div>
  );
}
