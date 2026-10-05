"use client";

/* Mode Dance (C7) — Hanzi Dance, port clone/js/lesson-dance.js.
   3 pill chọn nhạc; bấm "Bắt đầu" (user gesture) mới tạo AudioContext +
   oscillator loop (gain 0.03, đổi tần số theo beat bằng setInterval 220ms).
   Cleanup: useEffect return clearInterval + ctx.close() (như addCleanup của clone).
   Gõ đúng pinyin qua checkTyped (Task 14) → nhân vật nhảy (animate-bounce 600ms)
   + addXp(1) + sang từ kế; sai → đứng im viền đỏ. */

import { useEffect, useRef, useState } from "react";
import { useLesson } from "../lesson-provider";
import { shuffle } from "@/lib/pinyin-utils";
import { progressStore } from "@/lib/store/progress-store";
import { checkTyped } from "./typing";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CircleCheck, CircleX, Music, Music2, PartyPopper } from "@/components/ui/icon";

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

  // thứ tự từ xáo trộn mỗi lượt (port BYE.shuffle ở render của clone)
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
      setFeedback({ ok: true, text: "Đúng! Nhảy lên nào!" });
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
          <h2 className="text-3xl font-extrabold flex items-center justify-center gap-2">
            <Music size={24} strokeWidth={1.5} aria-hidden="true" className="text-action-primary" />
            Hanzi Dance
          </h2>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {MUSIC.map((m) => (
              <Chip
                key={m.id}
                data-music={m.id}
                selected={music === m.id}
                onClick={() => pickMusic(m.id)}
              >
                <Music2 size={16} strokeWidth={1.5} aria-hidden="true" />
                {m.label}
              </Chip>
            ))}
          </div>
          <p className="text-sm text-text-secondary mt-4">
            Gõ đúng cách đọc của từ → nhân vật của bạn nhảy; sai thì đứng im. Lượt này có {total} từ trong bài.
          </p>
          <p className="text-5xl mt-4" aria-hidden="true">
            <span className={jumping ? "animate-bounce inline-block" : "inline-block"}>
              <Music2 size={48} strokeWidth={1.5} className="text-action-primary" />
            </span>{" "}
            <span className="inline-block">
              <Music2 size={48} strokeWidth={1.5} className="text-feature-ai" />
            </span>
          </p>
          <Button type="button" data-start className="mt-5 text-lg" onClick={start}>
            Bắt đầu
          </Button>
        </div>
      )}

      {playing && (
        <div data-play>
          <Chip className="text-xs">{pos + 1} / {order.length}</Chip>
          <p data-hanzi className="zh text-[64px] font-extrabold leading-tight mt-2">{item.hanzi}</p>
          <p className="text-sm text-text-secondary mt-1">{item.meaning} — {item.pos}</p>
          <div className="text-6xl mt-4" data-dancers aria-hidden="true">
            <span className={jumping ? "animate-bounce inline-block" : "inline-block"}>
              <Music2 size={48} strokeWidth={1.5} className="text-action-primary" />
            </span>{" "}
            <span className="inline-block">
              <Music2 size={48} strokeWidth={1.5} className="text-feature-ai" />
            </span>
          </div>
          <div className="flex gap-2 mt-5">
            <input
              type="text"
              data-input
              className={
                "flex-1 min-h-11 rounded-control border px-3 py-2 bg-surface-elevated text-text-primary font-mono focus:outline-none focus:ring-3 ring-action-focus ring-offset-2 " +
                (wrong ? "border-feedback-error shake" : "border-border-default")
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
            <Button type="button" data-skip variant="ghost" size="sm" onClick={skip}>
              Bỏ qua
            </Button>
          </div>
          <p
            data-fb
            className={
              "inline-flex items-center gap-1 text-sm font-bold mt-2 h-5 " +
              (feedback?.ok ? "text-feedback-success" : feedback ? "text-feedback-error" : "")
            }
          >
            {feedback?.ok && <CircleCheck size={16} strokeWidth={1.5} aria-hidden="true" />}
            {feedback && !feedback.ok && <CircleX size={16} strokeWidth={1.5} aria-hidden="true" />}
            {feedback?.text ?? ""}
          </p>
        </div>
      )}

      {finished && (
        <div data-done>
          <p className="mb-3" aria-hidden="true">
            <PartyPopper size={40} strokeWidth={1.5} className="text-action-primary" />
          </p>
          <p className="text-xl font-extrabold">Hết lượt — Xuất sắc!</p>
          <p className="text-sm text-text-secondary mt-1">
            Bạn đã nhảy qua hết {total} từ của bài.
          </p>
          <Button type="button" data-again className="mt-4" onClick={start}>
            Nhảy tiếp
          </Button>
        </div>
      )}
    </div>
  );
}
