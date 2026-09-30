"use client";

/* RadicalsClient — deck flashcard 214 bộ thủ + grid theo số nét, port clone/js/radicals.js
   (PLAN-04 + PLAN-20, SPEC-04 §1, SPEC-20). Autoplay timers nằm trong useEffect cleanup
   thay cho timer registry window của clone (NHAI_RAD). */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { radicals } from "@/content/radicals";
import { shuffle } from "@/lib/pinyin-utils";
import { useTts } from "@/lib/tts/use-tts";
import { useKeyboard } from "@/lib/use-keyboard";
import AutoplayModal, { type AutoplayCfg } from "./autoplay-modal";

/* Nghĩa chứa chữ Hán → link sang /hanzi/<char> (route chưa có — link only) */
export function MeaningText({ text }: { text: string }) {
  const parts = text.split(/([\u4e00-\u9fff]+)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        /[\u4e00-\u9fff]/.test(p) ? (
          <Link key={i} href={`/hanzi/${p}`} className="text-nhai-accent hover:underline">
            {p}
          </Link>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

export default function RadicalsClient() {
  const { speak } = useTts();

  const [order, setOrder] = useState<number[]>(() => radicals.map((_, i) => i));
  const [index, setIndex] = useState(0); // vị trí trong order
  const [flipped, setFlipped] = useState(false);
  const [cfg, setCfg] = useState<AutoplayCfg | null>(null); // null = autoplay tắt
  const [modalOpen, setModalOpen] = useState(false);

  const pos = order[index] ?? 0;
  const r = radicals[pos] ?? radicals[0];
  const total = radicals.length;

  // lật lại mặt trước khi sang thẻ khác (port paint() reset flipped)
  useEffect(() => {
    setFlipped(false);
  }, [index]);

  // giữ snapshot cho autoplay engine (tránh phụ thuộc stale closure)
  const stateRef = useRef({ order, index, cfg });
  stateRef.current = { order, index, cfg };

  /* Autoplay engine — port runCycle: flip sau flipSec → speak repeat lần cách 400ms
     → sang thẻ kế sau nextSec. Cleanup xoá sạch interval/timeout (thay R.timer registry). */
  useEffect(() => {
    if (!cfg) return;
    const c0: AutoplayCfg = cfg;
    let nextTimer: ReturnType<typeof setTimeout> | undefined;
    const speakTimers: ReturnType<typeof setTimeout>[] = [];
    const flipTimer = setTimeout(() => {
      setFlipped(true);
      const { order: o, index: i, cfg: c } = stateRef.current;
      const cc: AutoplayCfg = c ?? c0;
      if (cc.speakOn) {
        const cur = radicals[o[i] ?? 0];
        for (let k = 0; k < cc.repeat; k++) {
          speakTimers.push(setTimeout(() => speak(cur.char, { lang: "zh-CN" }), k * 400));
        }
      }
      nextTimer = setTimeout(() => {
        setIndex((i) => (i + 1) % stateRef.current.order.length);
      }, cc.nextSec * 1000);
    }, c0.flipSec * 1000);
    return () => {
      clearTimeout(flipTimer);
      if (nextTimer) clearTimeout(nextTimer);
      speakTimers.forEach(clearTimeout);
    };
  }, [cfg, index, speak]);

  const stopAutoplay = () => setCfg(null);

  const go = (delta: number, wrap: boolean) => {
    setIndex((i) => {
      let n = i + delta;
      if (n >= total) n = wrap ? 0 : total - 1;
      if (n < 0) n = wrap ? total - 1 : 0;
      return n;
    });
  };

  const prev = () => {
    stopAutoplay();
    go(-1, false);
  };
  const next = () => {
    stopAutoplay();
    go(1, false);
  };
  const mark = () => {
    stopAutoplay();
    go(1, true);
  };

  // phím tắt ←/A ↓/X ↑/Z →/D (port radicals.js:229-243)
  useKeyboard({
    ArrowLeft: prev,
    a: prev,
    ArrowDown: mark,
    x: mark,
    ArrowUp: mark,
    z: mark,
    ArrowRight: next,
    d: next,
  });

  const doShuffle = () => {
    stopAutoplay();
    setOrder((o) => shuffle(o));
    setIndex(0);
  };

  const speakCur = () => speak(r.char, { lang: "zh-CN" });

  const openAutoplay = () => {
    stopAutoplay();
    setModalOpen(true);
  };
  const startAutoplay = (c: AutoplayCfg) => {
    setModalOpen(false);
    setCfg(c);
  };

  // grid nhóm theo số nét — tính runtime (port radicals.js:245-249)
  const groups = useMemo(() => {
    const g = new Map<number, typeof radicals>();
    for (const rad of radicals) {
      const list = g.get(rad.strokes) ?? [];
      list.push(rad);
      g.set(rad.strokes, list);
    }
    return [...g.entries()].sort((a, b) => a[0] - b[0]);
  }, []);

  const jumpToRadical = (radicalIndex: number) => {
    stopAutoplay();
    const idx = order.indexOf(radicalIndex);
    if (idx === -1) {
      setOrder(radicals.map((_, i) => i));
      setIndex(radicalIndex);
    } else {
      setIndex(idx);
    }
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      document.querySelector("[data-card]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    speak(radicals[radicalIndex].char, { lang: "zh-CN" });
  };

  return (
    <div>
      {/* hàng control */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="pill text-xs py-0.5 font-bold" data-counter>
          {index + 1} / {total}
        </span>
        <button
          type="button"
          data-auto
          className={cfg ? "pill pill-active px-3 py-2 text-sm" : "btn-ghost px-3 py-2 text-sm"}
          title={cfg ? "Dừng tự động phát thẻ" : "Cài đặt tự động phát thẻ"}
          onClick={() => (cfg ? stopAutoplay() : openAutoplay())}
        >
          {cfg ? "⏸ Dừng" : "⚙ Tự động"}
        </button>
        <button type="button" data-shuffle className="btn-ghost px-3 py-2 text-sm" onClick={doShuffle}>
          🔀 Xáo trộn
        </button>
        <button
          type="button"
          data-speak
          className="btn-ghost w-10 h-10 ml-auto"
          title="Phát âm chữ Hán"
          onClick={speakCur}
        >
          🔊
        </button>
      </div>

      {/* thẻ 3D flip */}
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
          <div
            className="flip-face card shadow-neo absolute inset-0 flex flex-col items-center justify-center p-4"
            style={{ backfaceVisibility: "hidden" }}
          >
            <span className="pill text-xs py-0.5 mb-3">
              Bộ thủ #{r.i} · {r.strokes} nét
            </span>
            <h2 className="zh text-6xl sm:text-7xl font-extrabold">{r.char}</h2>
            <span className="text-xs text-nhai-muted mt-4">Click để lật</span>
          </div>
          {flipped && (
            <div
              className="flip-face flip-back card shadow-neo bg-[#f7e9c8] absolute inset-0 flex flex-col items-center justify-center p-4"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <span className="pill text-xs py-0.5">{r.hanViet}</span>
              <h2 className="zh text-5xl mt-3 font-extrabold">
                {r.char} <span className="text-base font-bold text-nhai-muted">· {r.strokes} nét</span>
              </h2>
              <p className="text-lg mt-2 text-center">
                <MeaningText text={r.meaning} />
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4 nút nav */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <button type="button" className="btn-ghost px-8 py-2.5 text-sm font-extrabold" onClick={prev}>
          ‹ Trước
        </button>
        <button
          type="button"
          className="px-8 py-2.5 text-sm font-extrabold rounded-lg text-white bg-[#c03922] hover:opacity-90 transition-opacity"
          onClick={mark}
        >
          ✕ Chưa thuộc
        </button>
        <button
          type="button"
          className="px-8 py-2.5 text-sm font-extrabold rounded-lg text-white bg-[#2e7d32] hover:opacity-90 transition-opacity"
          onClick={mark}
        >
          ✓ Đã thuộc
        </button>
        <button type="button" className="btn-ghost px-8 py-2.5 text-sm font-extrabold" onClick={next}>
          Sau ›
        </button>
      </div>

      {/* grid theo số nét */}
      <div className="mt-10 space-y-6" id="radical-groups">
        {groups.map(([st, list]) => (
          <div key={st}>
            <h3 className="font-extrabold mb-2">
              {st} nét ({list.length} bộ)
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {list.map((rad) => (
                <button
                  key={rad.i}
                  type="button"
                  className="card p-2 text-center hover:-translate-y-0.5 transition-transform"
                  title={rad.meaning}
                  onClick={() => jumpToRadical(radicals.indexOf(rad))}
                >
                  <span className="zh block text-3xl font-extrabold leading-tight">{rad.char}</span>
                  <span className="block text-xs font-bold mt-1">{rad.hanViet}</span>
                  <span className="block text-[10px] text-nhai-muted font-semibold">Bộ #{rad.i}</span>
                  <span className="hidden sm:block text-[10px] text-nhai-muted mt-0.5 line-clamp-2">
                    {rad.meaning.slice(0, 24)}
                    {rad.meaning.length > 24 ? "…" : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && <AutoplayModal onStart={startAutoplay} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
