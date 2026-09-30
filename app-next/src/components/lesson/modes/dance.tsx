"use client";

/* Mode Dance (C7) — Hanzi Dance, port clone/js/lesson-dance.js.
   3 pill chọn nhạc; bấm "Bắt đầu" (user gesture) mới tạo AudioContext +
   oscillator loop (gain 0.03, đổi tần số theo beat bằng setInterval 220ms).
   Cleanup: useEffect return clearInterval + ctx.close() (như addCleanup của clone).
   Gõ đúng pinyin qua checkTyped (Task 14) → 🕺💃 nhảy (animate-bounce 600ms)
   + addXp(1) + sang từ kế; sai → đứng im viền đỏ. */

import { useEffect, useRef, useState } from "react";
import { useLesson } from "../lesson-provider";
import { shuffle } from "@/lib/pinyin-utils";
import { progressStore } from "@/lib/store/progress-store";
import { checkTyped } from "./typing";

const MUSIC = [
  { id: "langla", label: "Làng Lá", notes: [523.25, 587.33, 659.25, 587.33, 523.25, 440, 493.88, 523.25] },
  { id: "lamlang", label: "Lãm Làng", notes: [440, 493.88, 523.25, 587.33, 523.25, 493.88, 440, 392] },
  { id: "mine", label: "Nhạc của tôi", notes: [392, 440, 523.25, 440, 392, 349.23, 329.63, 392] },
] as const;

type MusicId = (typeof MUSIC)[number]["id"];

const JUMP_MS = 600;
const BEAT_MS = 220;

export default function DanceMode() {
  const { items } = useLesson();
  const total = items.length;

  // thứ tự từ xáo trộn mỗi lượt (port NHAI.shuffle ở render của clone)
  const [order, setOrder] = useState<number[]>(() => shuffle(items.map((_, i) => i)));
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [music, setMusic] = useState<MusicId>(MUSIC[0].id);
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [jumping, setJumping] = useState(false);
  const [wrong, setWrong] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noteIdxRef = useRef(0);
  const jumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const item = items[order[pos]] ?? items[0];

  /* dọn tài nguyên khi unmount (port ctx.addCleanup(stopMusic) + dead flag của clone) */
  useEffect(() => {
    return () => {
      stopMusic();
      if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current);
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
      const ctx = audioCtxRef.current;
      audioCtxRef.current = null;
      if (ctx && typeof ctx.close === "function") void ctx.close();
    };
  }, []);

  function ensureAudio(): AudioContext | null {
    if (audioCtxRef.current) return audioCtxRef.current;
    try {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      audioCtxRef.current = new AC();
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }

  function beep(ctx: AudioContext, freq: number, when: number, dur: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.03, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + dur);
  }

  function stopMusic() {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
  }

  function startMusic(id: MusicId = music) {
    const ctx = ensureAudio();
    if (!ctx) return;
    stopMusic();
    noteIdxRef.current = 0;
    const notes = MUSIC.find((m) => m.id === id)?.notes ?? MUSIC[0].notes;
    loopRef.current = setInterval(() => {
      beep(ctx, notes[noteIdxRef.current % notes.length], ctx.currentTime, 0.18);
      noteIdxRef.current++;
    }, BEAT_MS);
  }

  const pickMusic = (id: MusicId) => {
    setMusic(id);
    if (playing) startMusic(id);
    else {
      const ctx = ensureAudio();
      if (ctx) {
        const notes = MUSIC.find((m) => m.id === id)?.notes ?? MUSIC[0].notes;
        beep(ctx, notes[0], ctx.currentTime, 0.15);
      }
    }
  };

  const start = () => {
    setPlaying(true);
    setFinished(false);
    setPos(0);
    setOrder(shuffle(items.map((_, i) => i)));
    setTyped("");
    setFeedback(null);
    startMusic();
  };

  const advance = () => {
    if (pos >= order.length - 1) {
      setPlaying(false);
      stopMusic();
      setFinished(true);
    } else {
      setPos((p) => p + 1);
      setTyped("");
      setFeedback(null);
    }
  };

  const check = () => {
    if (!playing || !item) return;
    if (checkTyped(typed, item.pinyin)) {
      setFeedback({ ok: true, text: "✅ Đúng! Nhảy lên nào!" });
      setJumping(true);
      const ctx = ensureAudio();
      if (ctx) beep(ctx, 659.25, ctx.currentTime, 0.12);
      progressStore.addXp(1);
      jumpTimerRef.current = setTimeout(() => {
        setJumping(false);
        advance();
      }, JUMP_MS);
    } else {
      setFeedback({ ok: false, text: "Đứng im — gõ lại đi!" });
      setWrong(true);
      wrongTimerRef.current = setTimeout(() => setWrong(false), 400);
    }
  };

  const skip = () => advance();

  if (!item) return null;

  return (
    <div className="max-w-md mx-auto text-center">
      {!playing && !finished && (
        <div data-intro>
          <h2 className="text-3xl font-extrabold">🕺 Hanzi Dance</h2>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {MUSIC.map((m) => (
              <button
                key={m.id}
                type="button"
                data-music={m.id}
                className={`pill text-sm ${music === m.id ? "pill-active" : ""}`}
                onClick={() => pickMusic(m.id)}
              >
                <span aria-hidden="true">🎵 </span>
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-[var(--nhai-muted)] mt-4">
            Gõ đúng cách đọc của từ → nhân vật của bạn nhảy; sai thì đứng im. Lượt này có {total} từ trong bài.
          </p>
          <p className="text-5xl mt-4">
            <span className="bob">🕺</span> <span className="bob">💃</span>
          </p>
          <button type="button" data-start className="btn-main px-8 py-3 mt-5 text-lg" onClick={start}>
            Bắt đầu
          </button>
        </div>
      )}

      {playing && (
        <div data-play>
          <p className="pill text-xs py-0.5 inline-block">{pos + 1} / {order.length}</p>
          <p data-hanzi className="zh text-6xl font-extrabold mt-2">{item.hanzi}</p>
          <p className="text-sm text-[var(--nhai-muted)] mt-1">{item.meaning} — {item.pos}</p>
          <div className="text-6xl mt-4" data-dancers>
            <span className={jumping ? "animate-bounce inline-block" : "inline-block"}>🕺 💃</span>
          </div>
          <div className="flex gap-2 mt-5">
            <input
              type="text"
              data-input
              className={
                "flex-1 border-2 rounded-lg px-3 py-2.5 bg-[var(--nhai-bg)] font-mono " +
                (wrong ? "border-red-600 shake" : "border-[var(--nhai-border)]")
              }
              placeholder="Gõ pinyin (ni3 → nǐ)"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  check();
                }
              }}
            />
            <button type="button" data-skip className="btn-ghost px-3 py-2.5 text-sm" onClick={skip}>
              Bỏ qua
            </button>
          </div>
          <p data-fb className={"text-sm font-bold mt-2 h-5 " + (feedback?.ok ? "text-green-700" : feedback ? "text-red-600" : "")}>
            {feedback?.text ?? ""}
          </p>
        </div>
      )}

      {finished && (
        <div data-done>
          <p className="text-5xl mb-3">🕺💃🎉</p>
          <p className="text-xl font-extrabold">Hết lượt — Xuất sắc!</p>
          <p className="text-sm text-[var(--nhai-muted)] mt-1">
            Bạn đã nhảy qua hết {total} từ của bài.
          </p>
          <button type="button" data-again className="btn-main px-6 py-2.5 mt-4" onClick={start}>
            Nhảy tiếp
          </button>
        </div>
      )}
    </div>
  );
}
