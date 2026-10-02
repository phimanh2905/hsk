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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import {
  CircleCheck,
  FastForward,
  Settings,
  Shuffle,
  Volume2,
  X,
} from "@/components/ui/icon";

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
  useEffect(() => {
    autoRef.current = { autoplayCfg, item, index, total };
  }, [autoplayCfg, item, index, total]);
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
      <Button type="button" data-dir variant="ghost" size="sm" onClick={() => setDir(dir === "zh-vi" ? "vi-zh" : "zh-vi")}>
        {dir === "zh-vi" ? "ZH → VI" : "VI → ZH"}
      </Button>
      <Chip data-auto selected={auto} onClick={() => setAuto(!auto)}>
        <FastForward size={16} strokeWidth={1.5} aria-hidden="true" />
        Tự động
      </Chip>
      <Chip data-shuffle selected={shuffled} onClick={doShuffle}>
        <Shuffle size={16} strokeWidth={1.5} aria-hidden="true" />
        Xáo trộn
      </Chip>
      <div className="relative">
        <IconButton
          label="Cài đặt tự động phát"
          data-autoplay-cfg
          onClick={() => setCfgOpen(!cfgOpen)}
        >
          <Settings size={20} strokeWidth={1.5} />
        </IconButton>
        {cfgOpen && (
          <Card className="absolute z-10 mt-1 p-3 text-sm space-y-2 w-44">
            <div className="font-extrabold">Tự động phát</div>
            <div className="flex gap-1">
              {([2, 3, 5] as IntervalSec[]).map((s) => (
                <Chip
                  key={s}
                  selected={autoplayCfg.intervalSec === s}
                  onClick={() => setAutoplayCfg((c) => ({ ...c, intervalSec: s }))}
                >
                  {s}s
                </Chip>
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
          </Card>
        )}
      </div>
      <span className="ml-auto flex items-center gap-2">
        {status && (
          <Chip
            data-status
            className="text-xs"
            tone={status === "known" ? "correct" : "neutral"}
            icon={status === "known" ? <CircleCheck size={16} strokeWidth={1.5} aria-hidden="true" /> : undefined}
          >
            {status === "known" ? "Đã thuộc" : "Chưa thuộc"}
          </Chip>
        )}
        <IconButton
          label="Phát âm chữ Hán"
          data-speak
          onClick={() => speak(item.hanzi, { lang: "zh-CN" })}
        >
          <Volume2 size={20} strokeWidth={1.5} />
        </IconButton>
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
            data-face="front"
            className="flip-face absolute inset-0 flex flex-col items-center justify-center p-4 bg-surface-elevated border border-border-default rounded-card shadow-xs"
            style={{ backfaceVisibility: "hidden" }}
          >
            <Chip className="text-xs mb-3">{item.pos}</Chip>
            {dir === "zh-vi" ? (
              <h2 className="zh text-[48px] sm:text-[64px] font-extrabold leading-tight">{item.hanzi}</h2>
            ) : (
              <h2 className="text-4xl sm:text-5xl font-extrabold text-center">{item.meaning}</h2>
            )}
            <span className="text-[18px] text-text-secondary mt-2">
              {dir === "vi-zh" ? item.pinyin : ""}
            </span>
            <span className="text-xs text-text-secondary mt-4">Click để lật</span>
          </div>
          {/* mặt sau — nền vàng nhạt (SPEC-14 §5); render khi flipped */}
          {flipped && (
            <div
              data-face="back"
              className="flip-face flip-back absolute inset-0 flex flex-col items-center justify-center p-4 bg-feedback-warning/20 border border-border-default rounded-card shadow-xs"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <h2 className="zh text-[64px] font-extrabold leading-tight">{item.hanzi}</h2>
              <Chip className="text-xs mt-3">Cụm từ</Chip>
              {dir === "zh-vi" ? (
                <>
                  <p className="text-[18px] font-bold mt-2">{item.pinyin}</p>
                  <p className="text-base font-extrabold text-action-primary mt-1">{item.hanViet}</p>
                </>
              ) : (
                <>
                  <p className="text-[18px] font-bold mt-2">{item.hanViet}</p>
                  <p className="text-base font-extrabold text-action-primary mt-1">{item.pinyin}</p>
                </>
              )}
              <p className="text-base mt-1 text-center">{item.meaning}</p>
            </div>
          )}
        </div>
      </div>

      {/* 4 nút nav NGOÀI card, hàng riêng dưới card (SPEC-14 §4) */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6 no-print">
        <Button type="button" variant="ghost" onClick={prev}>
          ‹ Trước
        </Button>
        <Button type="button" variant="danger" onClick={markUnknownCur}>
          <X size={16} strokeWidth={1.5} aria-hidden="true" />
          Chưa thuộc
        </Button>
        <Button type="button" variant="primary" onClick={markKnownCur}>
          <CircleCheck size={16} strokeWidth={1.5} aria-hidden="true" />
          Đã thuộc
        </Button>
        <Button type="button" variant="ghost" onClick={next}>
          Sau ›
        </Button>
      </div>
    </div>
  );
}
