"use client";

/* use-reader-audio — điều khiển SpeechSynthesis theo CÂU cho /reading (karaoke).
   Không dùng useTts vì cần u.onend để xích câu i → i+1 (useTts không có onboundary/onend per câu).
   Không giả lập theo giây: mỗi câu 1 utterance; hết câu → câu kế; hết bài → dừng.
   SSR/ môi trường thiếu speechSynthesis → mọi action no-op an toàn. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReadingWord } from "@/content/reading";

export type ReaderAudio = {
  playing: boolean;
  index: number;
  rate: number;
  play: (from?: number) => void;
  pause: () => void;
  seek: (i: number) => void;
  setRate: (r: number) => void;
};

function supported(): boolean {
  return typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";
}

export function useReaderAudio(sentences: ReadingWord[][]): ReaderAudio {
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [rate, setRateState] = useState(1);

  // Refs để closure onend luôn đọc giá trị mới nhất không cần re-đăng ký.
  const rateRef = useRef(1);
  const indexRef = useRef(0);
  const playingRef = useRef(false);

  const speak = useCallback(
    (start: number) => {
      if (!supported()) return;
      const run = (i: number) => {
        const sent = sentences[i];
        if (!sent) {
          setPlaying(false);
          return;
        }
        const u = new SpeechSynthesisUtterance(sent.map((w) => w.z).join(""));
        u.lang = "zh-CN";
        u.rate = rateRef.current;
        u.onend = () => {
          if (!playingRef.current || indexRef.current !== i) return; // đã pause/seek giữa chừng
          if (i + 1 < sentences.length) {
            indexRef.current = i + 1;
            setIndex(i + 1);
            run(i + 1);
          } else {
            playingRef.current = false;
            setPlaying(false);
          }
        };
        window.speechSynthesis.speak(u);
      };
      run(start);
    },
    [sentences],
  );

  const play = useCallback(
    (from?: number) => {
      const i = Math.min(Math.max(0, from ?? indexRef.current), Math.max(0, sentences.length - 1));
      if (supported()) window.speechSynthesis.cancel();
      indexRef.current = i;
      setIndex(i);
      playingRef.current = true;
      setPlaying(true);
      speak(i);
    },
    [speak, sentences.length],
  );

  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    if (supported()) window.speechSynthesis.cancel();
  }, []);

  const seek = useCallback(
    (i: number) => {
      const clamped = Math.min(Math.max(0, i), Math.max(0, sentences.length - 1));
      if (supported()) window.speechSynthesis.cancel();
      indexRef.current = clamped;
      setIndex(clamped);
      if (playingRef.current) speak(clamped);
    },
    [speak, sentences.length],
  );

  const setRate = useCallback(
    (r: number) => {
      rateRef.current = r;
      setRateState(r);
      // Đổi rate giữa chừng: áp dụng cho câu kế. Đơn giản (được phép theo design):
      // restart câu hiện tại nếu đang phát.
      if (playingRef.current && supported()) {
        window.speechSynthesis.cancel();
        speak(indexRef.current);
      }
    },
    [speak],
  );

  // Cleanup: hủy giọng đọc khi unmount.
  useEffect(() => {
    return () => {
      if (supported()) window.speechSynthesis.cancel();
    };
  }, []);

  return { playing, index, rate, play, pause, seek, setRate };
}
