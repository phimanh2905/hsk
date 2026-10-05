"use client";

/* WordList — danh sách từ cuối trang + SRS (star), port clone/js/lesson.js:229-280
   (srsId/toggle) + clone/js/lesson.js:130-140. item_key chuẩn <book>.<page>.<index>
   (Task 6). Toast tự bọc ToastProvider để mount đơn lẻ (test) vẫn hiện toast. */

import { useEffect, useState } from "react";
import { useLesson } from "./lesson-provider";
import { progressStore } from "@/lib/store/progress-store";
import { pinyinLine } from "@/lib/pinyin-utils";
import { useTts } from "@/lib/tts/use-tts";
import { ToastProvider, useToastSafe } from "@/components/shell/toast-provider";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import { Star, TriangleAlert, Volume2 } from "@/components/ui/icon";

function WordListInner() {
  const { items } = useLesson();
  const { speak } = useTts();
  const toast = useToastSafe();
  const readStarred = () =>
    Object.fromEntries(items.map((it) => [it.itemKey, progressStore.getSrs(it.itemKey) !== null]));
  // trạng thái star khởi tạo 1 lần từ store, cập nhật khi bấm (như renderWordList của clone)
  const [starred, setStarred] = useState<Record<string, boolean>>(readStarred);

  /* recordReview/grade và AddAllButton bắn "nhai:progress" → đọc lại store để ngôi sao
     không bị stale sau khi chấm điểm ở màn flash (trước: chỉ đọc 1 lần lúc mount). */
  useEffect(() => {
    const sync = () => setStarred(readStarred());
    window.addEventListener("nhai:progress", sync);
    return () => window.removeEventListener("nhai:progress", sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const toggleStar = (itemKey: string) => {
    const added = progressStore.toggleSrs(itemKey);
    setStarred((s) => ({ ...s, [itemKey]: added }));
    toast(added ? "Đã thêm vào ôn tập" : "Đã bỏ khỏi ôn tập");
    // nhai:progress để Topbar/ô đếm SRS update (như clone cập nhật nhai.srs.new)
    window.dispatchEvent(new CustomEvent("nhai:progress"));
  };

  return (
    <ul id="word-list" className="space-y-2">
      {items.map((w) => (
        <li key={w.itemKey} data-testid="word-item">
          <Card className="p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <span className="font-extrabold text-lg w-6 shrink-0 text-text-secondary">{w.index + 1}.</span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="zh text-[32px] font-extrabold leading-tight">{w.hanzi}</span>
                  <Chip className="text-xs">{w.pos}</Chip>
                  <span className="text-[16px] text-text-secondary">{w.pinyin}</span>
                  <span className="text-[16px] font-extrabold text-action-primary">{w.hanViet}</span>
                </div>
                <div className="text-sm mt-1 font-semibold">{w.meaning}</div>
                {/* example.zh === hanzi là fallback của custom deck (C10) → không có ví dụ riêng để hiện */}
                {w.example && w.example.zh !== w.hanzi && (
                  <>
                    <div className="text-sm mt-1.5">
                      <span className="zh font-semibold">{w.example.zh}</span>{" "}
                      <span className="text-xs text-text-secondary">{pinyinLine(w.example.pinyinPerChar)}</span>
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">→ {w.example.vi}</div>
                  </>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-1 shrink-0 no-print">
                <IconButton
                  label="Báo lỗi"
                  data-act="report"
                 
                  onClick={() => toast("Cảm ơn bạn! Báo lỗi đã được ghi nhận.")}
                >
                  <TriangleAlert size={18} strokeWidth={1.5} />
                </IconButton>
                <IconButton
                  label="Thêm vào bộ thẻ ôn tập"
                  data-act="srs"
                 
                  onClick={() => toggleStar(w.itemKey)}
                >
                  <Star
                    size={18}
                    strokeWidth={1.5}
                    className={starred[w.itemKey] ? "text-learning-streak" : undefined}
                  />
                </IconButton>
                <IconButton
                  label="Phát âm từ"
                  data-act="speak"
                 
                  onClick={() => speak(w.hanzi)}
                >
                  <Volume2 size={18} strokeWidth={1.5} />
                </IconButton>
              </div>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export default function WordList() {
  return (
    <ToastProvider>
      <WordListInner />
    </ToastProvider>
  );
}
