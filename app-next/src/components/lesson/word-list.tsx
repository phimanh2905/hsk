"use client";

/* WordList — danh sách từ cuối trang + ⭐ SRS, port clone/js/lesson.js:229-280
   (srsId/toggle) + clone/js/lesson.js:130-140. item_key chuẩn <book>.<page>.<index>
   (Task 6). Toast tự bọc ToastProvider để mount đơn lẻ (test) vẫn hiện toast. */

import { useState } from "react";
import { useLesson } from "./lesson-provider";
import { progressStore } from "@/lib/store/progress-store";
import { pinyinLine } from "@/lib/pinyin-utils";
import { useTts } from "@/lib/tts/use-tts";
import { ToastProvider, useToastSafe } from "@/components/shell/toast-provider";

function WordListInner() {
  const { items } = useLesson();
  const { speak } = useTts();
  const toast = useToastSafe();
  // trạng thái ⭐ khởi tạo 1 lần từ store, cập nhật khi bấm (như renderWordList của clone)
  const [starred, setStarred] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((it) => [it.itemKey, progressStore.getSrs(it.itemKey) !== null]))
  );

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
        <li key={w.itemKey} className="card p-3 sm:p-4" data-testid="word-item">
          <div className="flex items-start gap-3">
            <span className="font-extrabold text-lg w-6 shrink-0 text-[var(--nhai-muted)]">{w.index + 1}.</span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="zh text-2xl font-extrabold">{w.hanzi}</span>
                <span className="pill text-xs py-0.5">{w.pos}</span>
                <span className="text-sm font-bold">{w.pinyin}</span>
                <span className="text-sm font-extrabold text-[var(--nhai-main)]">{w.hanViet}</span>
              </div>
              <div className="text-sm mt-1 font-semibold">{w.meaning}</div>
              {w.example && (
                <>
                  <div className="text-sm mt-1.5">
                    <span className="zh font-semibold">{w.example.zh}</span>{" "}
                    <span className="text-xs text-[var(--nhai-muted)]">{pinyinLine(w.example.pinyinPerChar)}</span>
                  </div>
                  <div className="text-xs text-[var(--nhai-muted)] mt-0.5">→ {w.example.vi}</div>
                </>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-1 shrink-0 no-print">
              <button
                type="button"
                data-act="report"
                className="btn-ghost w-9 h-9 text-sm"
                title="Báo lỗi"
                onClick={() => toast("Cảm ơn bạn! Báo lỗi đã được ghi nhận.")}
              >
                ⚠️
              </button>
              <button
                type="button"
                data-act="srs"
                className={"btn-ghost w-9 h-9 text-sm " + (starred[w.itemKey] ? "text-yellow-500" : "")}
                title="Thêm vào bộ thẻ ôn tập"
                onClick={() => toggleStar(w.itemKey)}
              >
                ⭐
              </button>
              <button
                type="button"
                data-act="speak"
                className="btn-ghost w-9 h-9 text-sm"
                title="Phát âm từ"
                onClick={() => speak(w.hanzi)}
              >
                🔊
              </button>
            </div>
          </div>
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
