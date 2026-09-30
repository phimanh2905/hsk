"use client";

/* Mode Flashcard (C2) — port clone/js/lesson-flashcard.js + SPEC-02 §1, SPEC-14 §3–5.
   Thẻ 3D flip, toggle chiều ZH→VI/VI→ZH, xáo trộn (thứ tự local, không đổi items),
   tự động next theo autoplayCfg, phím tắt qua useKeyboard.
   Khác clone: mặt sau chỉ render khi flipped (React; clone dùng CSS backface). */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLesson } from "../lesson-provider";
import { useTts } from "@/lib/tts/use-tts";
import { shuffle } from "@/lib/pinyin-utils";
import { useKeyboard } from "@/lib/use-keyboard";

type Dir = "zh-vi" | "vi-zh";
type IntervalSec = 2 | 3 | 5;

export default function FlashcardMode() {
  const { items, index, setIndex, known, markKnown } = useLesson();
  const { speak } = useTts();

  const [flipped, setFlipped] = useState(false);
  const [dir, setDir] = useState<Dir>("zh-vi");
  const [auto, setAuto] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [autoplayCfg, setAutoplayCfg] = useState<{ intervalSec: IntervalSec; speakOn: boolean }>({
    intervalSec: 2,
    speakOn: true,
  });

  // thứ tự deck local — không đổi items gốc (port order của clone)
  const [order, setOrder] = useState<number[]>(() => items.map((_, i) => i));
  useEffect(() => {
    setOrder(items.map((_, i) => i));
    setShuffled(false);
  }, [items]);

  const realIndex = order[index] ?? index;
  const item = items[realIndex] ?? items[0];
  const total = items.length;

  // lật lại mặt trước khi sang thẻ khác / đổi chiều (port paint() reset flipped)
  useEffect(() => {
    setFlipped(false);
  }, [index, dir, realIndex]);

  // Tự động: interval theo autoplayCfg — speak (nếu bật) rồi next (port autoTimer + autoPlay)
  const autoRef = useRef({ autoplayCfg, item, index, total });
  autoRef.current = { autoplayCfg, item, index, total };
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      const { autoplayCfg: cfg, item: w, index: i, total: n } = autoRef.current;
      if (cfg.speakOn && w) speak(w.hanzi, { lang: "zh-CN" });
      setIndex(Math.min(n - 1, i + 1));
    }, autoplayCfg.intervalSec * 1000);
    return () => clearInterval(id);
  }, [auto, autoplayCfg.intervalSec, speak, setIndex]);

  const prev = () => setIndex(Math.max(0, index - 1));
  const next = () => setIndex(Math.min(total - 1, index + 1));
  const markKnownCur = () => {
    if (!item) return;
    markKnown(realIndex, "known");
    setIndex(Math.min(total - 1, index + 1));
  };
  const markUnknownCur = () => {
    if (!item) return;
    markKnown(realIndex, "unknown");
    setIndex(Math.min(total - 1, index + 1));
  };

  // phím tắt, port lesson-flashcard.js:155-163
  useKeyboard({
    ArrowLeft: prev,
    a: prev,
    ArrowDown: markUnknownCur,
    x: markUnknownCur,
    ArrowUp: markKnownCur,
    z: markKnownCur,
    ArrowRight: next,
    d: next,
  });

  const doShuffle = () => {
    setOrder((o) => shuffle(o));
    setShuffled(true);
    setIndex(0);
  };

  const status = item ? known[realIndex] : undefined;

  // SPEC-14 §3: controls đưa lên hàng trên (#mode-tools trong lesson-client, port lesson.html);
  // fallback render tại chỗ khi slot chưa có (test standalone / hydration trước).
  const [toolsSlot, setToolsSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setToolsSlot(document.getElementById("mode-tools"));
  }, []);

  if (!item) return null;

  const controls = (
    <div className="flex flex-wrap items-center gap-2 no-print">
        <button
          type="button"
          data-dir
          className="btn-ghost px-3 py-2 text-sm font-extrabold"
          onClick={() => setDir(dir === "zh-vi" ? "vi-zh" : "zh-vi")}
        >
          {dir === "zh-vi" ? "ZH → VI" : "VI → ZH"}
        </button>
        <button
          type="button"
          data-auto
          className={auto ? "pill pill-active px-3 py-2 text-sm" : "btn-ghost px-3 py-2 text-sm"}
          onClick={() => setAuto(!auto)}
        >
          ⏩ Tự động
        </button>
        <button
          type="button"
          data-shuffle
          className={shuffled ? "pill pill-active px-3 py-2 text-sm" : "btn-ghost px-3 py-2 text-sm"}
          onClick={doShuffle}
        >
          🔀 Xáo trộn
        </button>
        <div className="relative">
          <button
            type="button"
            data-autoplay-cfg
            className="btn-ghost px-3 py-2 text-sm"
            title="Cài đặt tự động phát"
            onClick={() => setCfgOpen(!cfgOpen)}
          >
            ⚙
          </button>
          {cfgOpen && (
            <div className="absolute z-10 mt-1 card p-3 text-sm space-y-2 w-44">
              <div className="font-extrabold">Tự động phát</div>
              <div className="flex gap-1">
                {([2, 3, 5] as IntervalSec[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={autoplayCfg.intervalSec === s ? "pill pill-active" : "pill"}
                    onClick={() => setAutoplayCfg((c) => ({ ...c, intervalSec: s }))}
                  >
                    {s}s
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoplayCfg.speakOn}
                  onChange={(e) => setAutoplayCfg((c) => ({ ...c, speakOn: e.target.checked }))}
                />
                Phát âm khi tự chạy
              </label>
            </div>
          )}
        </div>
        <span className="ml-auto flex items-center gap-2">
          {status && (
            <span data-status className="pill text-xs py-0.5">
              {status === "known" ? "Đã thuộc ✓" : "Chưa thuộc"}
            </span>
          )}
          <button
            type="button"
            data-speak
            className="btn-ghost w-10 h-10"
            title="Phát âm chữ Hán"
            onClick={() => speak(item.hanzi, { lang: "zh-CN" })}
          >
            🔊
          </button>
        </span>
      </div>
  );

  return (
    <div>
      {toolsSlot ? createPortal(controls, toolsSlot) : controls}

      {/* thẻ 3D flip (port flip-scene/flip-inner) */}
      <div
        data-card
        className="flip-scene w-full max-w-md mx-auto h-64 sm:h-72 cursor-pointer select-none"
        onClick={() => setFlipped(!flipped)}
        style={{ perspective: "1200px" }}
      >
        <div
          className="relative w-full h-full"
          style={{
            transformStyle: "preserve-3d",
            transition: "transform .5s",
            transform: flipped ? "rotateY(180deg)" : "none",
          }}
        >
          {/* mặt trước */}
          <div
            className="flip-face card shadow-neo absolute inset-0 flex flex-col items-center justify-center p-4"
            style={{ backfaceVisibility: "hidden" }}
          >
            <span className="pill text-xs py-0.5 mb-3">{item.pos}</span>
            {dir === "zh-vi" ? (
              <h2 className="zh text-5xl sm:text-6xl font-extrabold">{item.hanzi}</h2>
            ) : (
              <h2 className="text-4xl sm:text-5xl font-extrabold text-center">{item.meaning}</h2>
            )}
            <span className="text-sm font-semibold text-[var(--nhai-muted)] mt-2">
              {dir === "vi-zh" ? item.pinyin : ""}
            </span>
            <span className="text-xs text-[var(--nhai-muted)] mt-4">Click để lật</span>
          </div>
          {/* mặt sau — nền vàng nhạt #f7e9c8 (SPEC-14 §5); render khi flipped */}
          {flipped && (
            <div
              className="flip-face flip-back card shadow-neo bg-[#f7e9c8] absolute inset-0 flex flex-col items-center justify-center p-4"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <h2 className="zh text-6xl sm:text-7xl font-extrabold">{item.hanzi}</h2>
              <span className="pill text-xs py-0.5 mt-3">Cụm từ</span>
              {dir === "zh-vi" ? (
                <>
                  <p className="text-xl font-bold mt-2">{item.pinyin}</p>
                  <p className="text-lg font-extrabold text-[var(--nhai-main)]">{item.hanViet}</p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold mt-2">{item.hanViet}</p>
                  <p className="text-lg font-extrabold text-[var(--nhai-main)]">{item.pinyin}</p>
                </>
              )}
              <p className="text-base mt-1 text-center">{item.meaning}</p>
            </div>
          )}
        </div>
      </div>

      {/* 4 nút nav NGOÀI card, hàng riêng dưới card (SPEC-14 §4) */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6 no-print">
        <button type="button" className="btn-ghost px-8 py-2.5 text-sm font-extrabold" onClick={prev}>
          ‹ Trước
        </button>
        <button
          type="button"
          className="px-8 py-2.5 text-sm font-extrabold rounded-lg text-white bg-[#c03922] hover:opacity-90 transition-opacity"
          onClick={markUnknownCur}
        >
          ✕ Chưa thuộc
        </button>
        <button
          type="button"
          className="px-8 py-2.5 text-sm font-extrabold rounded-lg text-white bg-[#2e7d32] hover:opacity-90 transition-opacity"
          onClick={markKnownCur}
        >
          ✓ Đã thuộc
        </button>
        <button type="button" className="btn-ghost px-8 py-2.5 text-sm font-extrabold" onClick={next}>
          Sau ›
        </button>
      </div>
    </div>
  );
}
