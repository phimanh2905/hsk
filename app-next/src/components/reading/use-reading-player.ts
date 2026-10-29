"use client";

/* useReadingPlayer — hook phát âm bài reading, Task 7 của plan 2026-10-30-reading-library.
   Spec: docs/superpowers/specs/2026-10-30-reading-library-design.md §4.2.

   Hai chế độ (quyết định theo `hasAudio = sentences.every(s => s.audio)`):
   - MP3: mỗi câu có `audio` → tạo AudioLike qua `makeAudio` (DI cho test), theo dõi
     currentTime, onended chuyển/replay câu.
   - Fallback TTS: có ít nhất 1 câu thiếu audio → delegate toàn bộ sang `useKaraoke`
     (cùng interface trả ra; seekGlobal là no-op vì TTS không seek được).

   Lưu ý: `sentences[].audio` là URL ĐẦY ĐỦ (hook không ghép basePath — caller tự ghép).
   Timing curTime dùng setInterval 100ms (chọn setInterval thay vì rAF vì jsdom + fake
   timer dễ stub; 100ms đủ mượt cho highlight ký tự). */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKaraoke } from "./karaoke";

export type PlayerSentence = {
  zh: string;
  py: string | null;
  vi: string;
  /** URL ĐẦY ĐỦ của file mp3, hoặc null nếu câu không có audio. */
  audio: string | null;
  /** Thời lượng ước lượng (giây) để hiển thị progress khi chưa load metadata. */
  durSec: number;
};

/** tập con HTMLAudioElement mà hook cần — stub được inject qua makeAudio phải khớp. */
export type AudioLike = {
  play: () => void | Promise<void>;
  pause: () => void;
  currentTime: number;
  playbackRate: number;
  addEventListener: (type: "ended", cb: () => void) => void;
  removeEventListener: (type: "ended", cb: () => void) => void;
};

export type MakeAudio = (src: string) => AudioLike;

export type CharPos = { row: number; char: number } | null;

export type ReadingPlayerApi = {
  playing: boolean;
  curIdx: number;
  charPos: CharPos;
  rate: number;
  loopSentence: boolean;
  curTime: number;
  duration: number;
  hasAudio: boolean;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seekSentence: (i: number) => void;
  seekGlobal: (t: number) => void;
  setRate: (r: number) => void;
  setLoopSentence: (b: boolean) => void;
};

const DEFAULT_MAKE_AUDIO: MakeAudio = (src) => new Audio(src) as unknown as AudioLike;

/* ---- Trọng số ký tự (charWeights) ----
   Han = 1, số/latin = 1.5, khác (dấu câu) = 0.2. */
export function charWeight(ch: string): number {
  if (/\p{Script=Han}/u.test(ch)) return 1;
  if (/[0-9a-zA-Z]/.test(ch)) return 1.5;
  return 0.2;
}

export function charWeights(zh: string): number[] {
  return Array.from(zh).map(charWeight);
}

/** Vị trí ký tự (index trong Array.from(zh)) tại thời điểm t giây trong câu. */
export function charPosFromTime(zh: string, t: number): number {
  if (t <= 0) return 0;
  let acc = 0;
  const w = charWeights(zh);
  for (let i = 0; i < w.length; i++) {
    acc += w[i];
    if (t < acc) return i;
  }
  return Math.max(0, w.length - 1);
}

export function useReadingPlayer(
  sentences: PlayerSentence[],
  makeAudio: MakeAudio = DEFAULT_MAKE_AUDIO
): ReadingPlayerApi {
  const hasAudio = sentences.length > 0 && sentences.every((s) => s.audio);

  /* duration = Σ durSec (làm tròn 1 chữ số). Nếu mọi durSec = 0 (chưa metadata) →
     ước lượng 4s/câu, chỉ để hiển thị. */
  const duration = useMemo(() => {
    const sum = sentences.reduce((a, s) => a + s.durSec, 0);
    const d = sum > 0 ? sum : sentences.length * 4;
    return Math.round(d * 10) / 10;
  }, [sentences]);

  /* Prefix sum durSec → global time ↔ (câu i, offset). */
  const offsets = useMemo(() => {
    const out: number[] = [];
    let acc = 0;
    for (const s of sentences) {
      out.push(acc);
      acc += s.durSec;
    }
    return out;
  }, [sentences]);

  /* ---- state chung (cả 2 chế độ) ---- */
  const [rate, setRateState] = useState(1);
  const [loopSentence, setLoopSentenceState] = useState(false);

  /* ---- state MP3 ---- */
  const [playing, setPlaying] = useState(false);
  const [curIdx, setCurIdx] = useState(0);
  const [charPos, setCharPos] = useState<CharPos>(null);
  const [curTime, setCurTime] = useState(0);

  const rateRef = useRef(1);
  const loopRef = useRef(false);
  const playingRef = useRef(false);
  const curIdxRef = useRef(0);
  const sentencesRef = useRef(sentences);
  const offsetsRef = useRef(offsets);
  const makeAudioRef = useRef(makeAudio);
  sentencesRef.current = sentences;
  offsetsRef.current = offsets;
  makeAudioRef.current = makeAudio;

  const endedHandlerRef = useRef<((i: number) => void) | null>(null);
  const audiosRef = useRef<Map<number, AudioLike>>(new Map());

  const ensureAudio = useCallback((i: number): AudioLike | null => {
    const s = sentencesRef.current[i];
    if (!s?.audio) return null;
    let a = audiosRef.current.get(i);
    if (!a) {
      a = makeAudioRef.current(s.audio);
      a.playbackRate = rateRef.current; // rate áp cả audio tạo sau này
      a.addEventListener("ended", () => endedHandlerRef.current?.(i));
      audiosRef.current.set(i, a);
    }
    return a;
  }, []);

  /* Chuyển sang câu i: pause câu cũ, reset, giữ playing hiện tại. */
  const goTo = useCallback((i: number) => {
    const list = sentencesRef.current;
    if (i < 0 || i >= list.length) return;
    const prev = curIdxRef.current;
    if (prev !== i) audiosRef.current.get(prev)?.pause();
    curIdxRef.current = i;
    setCurIdx(i);
    const a = ensureAudio(i);
    if (a) a.currentTime = 0;
    setCurTime(offsetsRef.current[i] ?? 0);
    setCharPos({ row: i, char: 0 });
    if (playingRef.current) void a?.play();
  }, [ensureAudio]);

  const handleEnded = useCallback(
    (i: number) => {
      if (curIdxRef.current !== i) return;
      if (loopRef.current) {
        const a = audiosRef.current.get(i);
        if (a) {
          a.currentTime = 0;
          void a.play();
        }
        setCurTime(offsetsRef.current[i] ?? 0);
        setCharPos({ row: i, char: 0 });
        return;
      }
      if (i + 1 < sentencesRef.current.length) {
        goTo(i + 1); // playingRef còn true → tự play câu kế
      } else {
        // hết list → stop
        playingRef.current = false;
        setPlaying(false);
        setCharPos(null);
        setCurTime(offsetsRef.current[i] + (sentencesRef.current[i]?.durSec ?? 0));
      }
    },
    [goTo]
  );
  endedHandlerRef.current = handleEnded;

  const toggle = useCallback(() => {
    if (playingRef.current) {
      audiosRef.current.get(curIdxRef.current)?.pause();
      playingRef.current = false;
      setPlaying(false);
    } else {
      const a = ensureAudio(curIdxRef.current);
      playingRef.current = true;
      setPlaying(true);
      void a?.play();
    }
  }, [ensureAudio]);

  const seekSentence = useCallback(
    (i: number) => {
      const len = sentencesRef.current.length;
      if (len === 0) return;
      goTo(Math.max(0, Math.min(len - 1, i)));
    },
    [goTo]
  );

  const next = useCallback(() => {
    seekSentence(curIdxRef.current + 1);
  }, [seekSentence]);

  const prev = useCallback(() => {
    seekSentence(curIdxRef.current - 1);
  }, [seekSentence]);

  const seekGlobal = useCallback(
    (t: number) => {
      const offs = offsetsRef.current;
      if (offs.length === 0) return;
      const clamped = Math.max(0, t);
      let i = 0;
      for (let k = 0; k < offs.length; k++) if (clamped >= offs[k]) i = k;
      const local = Math.max(0, clamped - offs[i]);
      goTo(i); // nếu pause → không play, chỉ cập nhật curIdx/charPos
      const a = ensureAudio(i);
      if (a) a.currentTime = local;
      setCurTime(offs[i] + local);
      setCharPos({ row: i, char: charPosFromTime(sentencesRef.current[i].zh, local) });
    },
    [ensureAudio, goTo]
  );

  const setRate = useCallback((r: number) => {
    rateRef.current = r;
    setRateState(r);
    audiosRef.current.forEach((a) => {
      a.playbackRate = r;
    });
  }, []);

  const setLoopSentence = useCallback((b: boolean) => {
    loopRef.current = b;
    setLoopSentenceState(b);
  }, []);

  /* Tick curTime + charPos bằng setInterval 100ms (xem note đầu file). */
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const i = curIdxRef.current;
      const a = audiosRef.current.get(i);
      const s = sentencesRef.current[i];
      if (!a || !s) return;
      setCurTime((offsetsRef.current[i] ?? 0) + a.currentTime);
      setCharPos({ row: i, char: charPosFromTime(s.zh, a.currentTime) });
    }, 100);
    return () => clearInterval(id);
  }, [playing]);

  /* Đổi sentences (so theo audio-key, tránh reset khi caller truyền array mới mỗi render)
     → pause + bỏ cache audio + reset state. */
  const sentencesKey = useMemo(
    () => sentences.map((s) => s.audio ?? "-").join("\u0000") + "#" + sentences.length,
    [sentences]
  );
  useEffect(() => {
    playingRef.current = false;
    setPlaying(false);
    curIdxRef.current = 0;
    setCurIdx(0);
    setCharPos(null);
    setCurTime(0);
  }, [sentencesKey]);
  useEffect(
    () => () => {
      audiosRef.current.forEach((a) => a.pause());
      audiosRef.current.clear();
    },
    [sentencesKey]
  );

  /* ---- Fallback TTS: delegate useKaraoke, map ra interface chung ---- */
  const karaokeList = useMemo(
    () => sentences.map(({ zh, py, vi }) => ({ zh, py, vi })),
    [sentences]
  );
  const k = useKaraoke(karaokeList);

  if (!hasAudio) {
    const kIdx = k.activeIdx < 0 ? 0 : k.activeIdx;
    const clampIdx = (i: number) => Math.max(0, Math.min(sentences.length - 1, i));
    return {
      playing: k.playingAll,
      curIdx: kIdx,
      charPos: k.highlight,
      rate,
      loopSentence,
      curTime: offsets[kIdx] ?? 0,
      duration,
      hasAudio: false,
      toggle: () => {
        if (k.playingAll) k.stop();
        else k.playFrom(clampIdx(k.activeIdx < 0 ? 0 : k.activeIdx), true);
      },
      next: () => k.playFrom(clampIdx(kIdx + 1), true),
      prev: () => k.playFrom(clampIdx(kIdx - 1), true),
      seekSentence: (i: number) => k.playFrom(clampIdx(i), true),
      seekGlobal: () => {
        /* TTS không seek được — no-op (UI ẩn seek slider khi !hasAudio) */
      },
      setRate: (r: number) => {
        setRateState(r);
        k.setRate(r);
      },
      setLoopSentence: setLoopSentenceState,
    };
  }

  return {
    playing,
    curIdx,
    charPos,
    rate,
    loopSentence,
    curTime,
    duration,
    hasAudio: true,
    toggle,
    next,
    prev,
    seekSentence,
    seekGlobal,
    setRate,
    setLoopSentence,
  };
}
