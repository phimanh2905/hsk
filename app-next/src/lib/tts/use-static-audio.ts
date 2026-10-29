"use client";
import { useCallback, useEffect, useRef } from "react";

export type StaticAudioOptions = { rate?: number };

type StaticAudioArgs = { onError?: (url: string, rate: number) => void };

/* Singleton HTMLAudioElement dùng chung mọi mount — chỉ 1 clip phát tại 1 thời điểm.
   play() mới dừng clip cũ (pause + reset) rồi đổi src; lỗi load/play (vd 404 tone 5
   không được render) gọi onError để caller fallback sang useTts.speak.
   onError giữ trong ref để StrictMode re-render không attach listener lại. */
let audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!audio) audio = new Audio();
  return audio;
}

function stopCurrent(a: HTMLAudioElement) {
  a.pause();
  a.currentTime = 0;
  a.src = "";
}

/* test-only: singleton là module-level nên Vitest cần reset giữa các test */
export function _resetStaticAudioForTest() {
  audio = null;
}

export function useStaticAudio({ onError }: StaticAudioArgs = {}) {
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });
  const rateRef = useRef(1);

  useEffect(() => {
    const a = getAudio();
    const handleError = () => {
      const url = a.src;
      stopCurrent(a);
      onErrorRef.current?.(url, rateRef.current);
    };
    const handleEnded = () => {
      a.src = "";
    };
    a.addEventListener("error", handleError);
    a.addEventListener("ended", handleEnded);
    return () => {
      a.removeEventListener("error", handleError);
      a.removeEventListener("ended", handleEnded);
    };
  }, []);

  const play = useCallback((url: string, opts?: StaticAudioOptions) => {
    const a = getAudio();
    stopCurrent(a);
    const rate = opts?.rate ?? 1;
    rateRef.current = rate;
    /* playbackRate < 1 mặc định đổi cả pitch (giọng thấp khó nghe) — giữ pitch gốc */
    a.preservesPitch = true;
    a.playbackRate = rate;
    a.src = url;
    /* jsdom: HTMLMediaElement.play() trả undefined (không phải Promise) — chỉ
       bắt lỗi khi có promise; lỗi load vẫn xử lý qua event "error" */
    const p = a.play() as Promise<void> | undefined;
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        stopCurrent(a);
        onErrorRef.current?.(url, rate);
      });
    }
  }, []);

  const stop = useCallback(() => stopCurrent(getAudio()), []);

  useEffect(() => () => stopCurrent(getAudio()), []);

  return { play, stop };
}
