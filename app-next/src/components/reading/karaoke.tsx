"use client";

/* Karaoke TTS cho /reading — port clone/js/reading.js:39-52 (tokenizer) + 276-344 (playFrom).
   Tự quản SpeechSynthesisUtterance để bắt onboundary/onend (useTts không hỗ trợ). */

import { useCallback, useEffect, useRef, useState } from "react";

export type KaraokeSentence = { zh: string; py: string | null; vi: string };

/* Tách câu: giữ dấu câu cuối (。！？!?…；) — verbatim reading.js:40-43 */
export function splitSentences(text: string): string[] {
  const m = String(text).match(/[^。！？!?…；;]+[。！？!?…；;]*/g) || [];
  return m.map((s) => s.trim()).filter(Boolean);
}

/* Dòng đầu ≤20 ký tự (và có ≥2 dòng) là title */
export function extractTitle(text: string): { title: string | null; body: string } {
  const lines = String(text)
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > 1 && lines[0].length <= 20) {
    return { title: lines[0], body: lines.slice(1).join("\n") };
  }
  return { title: null, body: text };
}

export function buildSentences(
  body: string,
  sentenceMap: Record<string, { zh: string; py: string; vi: string }>
): KaraokeSentence[] {
  return splitSentences(body).map((zh) => {
    const hit = sentenceMap[zh];
    return {
      zh,
      py: hit ? hit.py : null,
      vi: hit ? hit.vi : "(bản dịch demo — tính năng AI cần backend)",
    };
  });
}

export function useKaraoke(sentences: KaraokeSentence[]) {
  const [activeIdx, setActiveIdx] = useState(-1);
  const [playingAll, setPlayingAll] = useState(false);
  const [highlight, setHighlight] = useState<{ row: number; char: number } | null>(null);
  const genRef = useRef(0);
  const rateRef = useRef(1);
  const playingAllRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sentRef = useRef(sentences);
  sentRef.current = sentences;
  playingAllRef.current = playingAll;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => {
      clearTimeout(t);
      clearInterval(t);
    });
    timersRef.current = [];
  }, []);

  const stop = useCallback(() => {
    genRef.current++;
    clearTimers();
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* không có TTS */
    }
    setActiveIdx(-1);
    setPlayingAll(false);
    setHighlight(null);
  }, [clearTimers]);

  /* Phát 1 câu (chain=true nối câu tiếp).
     Có TTS: onboundary highlight theo charIndex, onend nối câu tiếp.
     Không TTS (hoặc lỗi): fallback timer ~260ms/ký tự ÷ rate; grace 2500ms chống treo. */
  const playFrom = useCallback(
    (i: number, chain: boolean) => {
      const list = sentRef.current;
      if (i >= list.length) {
        setActiveIdx(-1);
        setPlayingAll(false);
        setHighlight(null);
        return;
      }
      const myGen = ++genRef.current;
      setActiveIdx(i);
      setPlayingAll(chain || playingAllRef.current);

      const s = list[i];
      const len = Array.from(s.zh).length;
      let finished = false;
      let timer: ReturnType<typeof setInterval> | null = null;
      let grace: ReturnType<typeof setTimeout> | null = null;

      const done = () => {
        if (finished || myGen !== genRef.current) return;
        finished = true;
        clearTimers();
        setHighlight(null);
        if (chain) playFrom(i + 1, true);
        else {
          setActiveIdx(-1);
          setPlayingAll(false);
        }
      };

      // fallback / không có boundary: highlight tuần tự 260ms/ký tự ÷ rate
      let k = 0;
      timer = setInterval(() => {
        if (myGen !== genRef.current) {
          clearInterval(timer!);
          return;
        }
        k++;
        if (k >= len) {
          clearInterval(timer!);
          timer = null;
          if (!("speechSynthesis" in window)) {
            done();
            return;
          }
          // có TTS nhưng boundary không bắn: chờ onend, thêm grace chống treo
          if (grace === null) {
            grace = setTimeout(done, 2500);
            timersRef.current.push(grace);
          }
          return;
        }
        setHighlight({ row: i, char: k });
      }, 260 / rateRef.current);
      timersRef.current.push(timer);

      if ("speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(s.zh);
          u.lang = "zh-CN";
          u.rate = rateRef.current;
          const voiced = window.speechSynthesis.getVoices().filter((v) => /^zh/i.test(v.lang));
          if (voiced[0]) u.voice = voiced[0];
          u.onboundary = (e) => {
            if (myGen !== genRef.current) return;
            if (timer) {
              clearInterval(timer);
              timer = null;
            }
            setHighlight({ row: i, char: Math.min(e.charIndex || 0, len - 1) });
          };
          u.onend = done;
          u.onerror = done;
          window.speechSynthesis.speak(u);
        } catch {
          /* timer fallback vẫn chạy */
        }
      }
    },
    [clearTimers]
  );

  const setRate = useCallback((r: number) => {
    rateRef.current = r;
  }, []);

  // cleanup unmount: huỷ mọi timer + TTS
  useEffect(
    () => () => {
      genRef.current++;
      clearTimers();
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* không có TTS */
      }
    },
    [clearTimers]
  );

  return { activeIdx, playingAll, highlight, playFrom, stop, setRate };
}
