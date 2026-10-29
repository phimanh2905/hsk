"use client";
import { useCallback, useEffect, useRef } from "react";

export type StaticAudioOptions = { rate?: number };

type StaticAudioArgs = { onError?: (url: string, rate: number) => void };

/* Singleton HTMLAudioElement dùng chung mọi mount — chỉ 1 clip phát tại 1 thời điểm.
   play() mới dừng clip cũ (pause + reset currentTime — KHÔNG đụng src: gán src=""
   theo spec HTML kích hoạt resource selection và tự phát event "error") rồi đổi src.
   Lỗi load/play (vd 404 tone 5 không được render) gọi onError để caller fallback
   sang useTts.speak — chỉ khi url lỗi trùng url của request hiện tại (lastUrl):
   event "error" đến trễ (clip cũ đã bị thay) hoặc ended (hết clip tự nhiên) không
   được tính là lỗi. So sánh dùng pathname chuẩn hoá (a.src là URL tuyệt đối ở
   browser thật, chuỗi tương đối ở jsdom — normalize cả hai về pathname để guard
   hoạt động đúng ở cả hai). Một request chỉ fallback đúng 1 lần (404 thật bắn cả
   event "error" lẫn reject play()). onError giữ trong ref để StrictMode re-render
   không attach listener lại. */
let audio: HTMLAudioElement | null = null;
let lastUrl = "";
let handledErrorUrl: string | null = null;

function getAudio(): HTMLAudioElement {
  if (!audio) audio = new Audio();
  return audio;
}

function stopCurrent(a: HTMLAudioElement) {
  a.pause();
  a.currentTime = 0;
}

/* test-only: singleton + request state là module-level nên Vitest cần reset */
export function _resetStaticAudioForTest() {
  audio = null;
  lastUrl = "";
  handledErrorUrl = null;
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
      /* a.src là URL tuyệt đối ở browser thật (vd https://site/audio/x.mp3) nhưng
         chuỗi tương đối như gán ở jsdom — chuẩn hoá về pathname trước khi so sánh
         với lastUrl (luôn tương đối) để guard không thành no-op ở production. */
      const url = new URL(a.src, window.location.href).pathname;
      if (url !== lastUrl || handledErrorUrl === url) return;
      handledErrorUrl = url;
      stopCurrent(a);
      onErrorRef.current?.(url, rateRef.current);
    };
    /* hết clip tự nhiên: chỉ reset vị trí, không đụng src (tránh error event) */
    const handleEnded = () => {
      a.currentTime = 0;
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
    lastUrl = url;
    handledErrorUrl = null;
    /* playbackRate < 1 mặc định đổi cả pitch (giọng thấp khó nghe) — giữ pitch gốc */
    a.preservesPitch = true;
    a.playbackRate = rate;
    a.src = url;
    /* jsdom: HTMLMediaElement.play() trả undefined (không phải Promise) — chỉ
       bắt lỗi khi có promise; lỗi load vẫn xử lý qua event "error" */
    const p = a.play() as Promise<void> | undefined;
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        if (lastUrl !== url || handledErrorUrl === url) return;
        handledErrorUrl = url;
        stopCurrent(a);
        onErrorRef.current?.(url, rate);
      });
    }
  }, []);

  const stop = useCallback(() => stopCurrent(getAudio()), []);

  useEffect(() => () => stopCurrent(getAudio()), []);

  return { play, stop };
}
