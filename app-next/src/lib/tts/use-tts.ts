"use client";
import { useCallback, useRef, useState, useEffect } from "react";

const CHUNK = 200;
const SAFARI_RETRY_MS = 15_000;

function chunkText(text: string): string[] {
  if (text.length <= CHUNK) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > 0) {
    let cut = Math.min(CHUNK, rest.length);
    const dot = rest.lastIndexOf("。", cut);
    const comma = rest.lastIndexOf("，", cut);
    const brk = Math.max(dot, comma);
    if (brk > 0) cut = brk + 1;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  return parts;
}

export function useTts() {
  const [speaking, setSpeaking] = useState(false);
  const chunksRef = useRef<SpeechSynthesisUtterance[]>([]);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRef = useRef<() => void>(() => {});

  const cancel = useCallback(() => {
    if (retryRef.current) clearTimeout(retryRef.current);
    retryRef.current = null;
    window.speechSynthesis.cancel();
    chunksRef.current = [];
    setSpeaking(false);
  }, []);
  cancelRef.current = cancel;

  useEffect(() => () => cancelRef.current(), []); // dọn dẹp khi unmount (C1)

  const makeUtterance = (t: string, lang: string, rate: number, voice: SpeechSynthesisVoice | null) => {
    const u = new SpeechSynthesisUtterance(t);
    u.lang = lang;
    u.rate = rate;
    if (voice && lang.startsWith("zh")) u.voice = voice;
    return u;
  };

  const speak = useCallback(
    (text: string, opts?: { lang?: "zh-CN" | "vi-VN"; rate?: number; onEnd?: () => void }) => {
      cancel();
      const lang = opts?.lang ?? "zh-CN";
      const rate = opts?.rate ?? 1;
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("zh")) ?? null;
      const chunks = chunkText(text);
      setSpeaking(true);
      chunks.forEach((t, i) => {
        const u = makeUtterance(t, lang, rate, voice);
        if (i === chunks.length - 1) {
          u.onend = () => {
            setSpeaking(false);
            opts?.onEnd?.();
          };
        }
        chunksRef.current.push(u);
        window.speechSynthesis.speak(u);
      });
      // Safari đôi khi nuốt speak() — nếu sau ~15s vẫn "đang nói" mà không có utterance active thì thử lại
      retryRef.current = setTimeout(() => {
        if (speaking && !window.speechSynthesis.speaking) {
          chunks.forEach((t) => window.speechSynthesis.speak(makeUtterance(t, lang, rate, voice)));
        }
      }, SAFARI_RETRY_MS);
    },
    [cancel, speaking]
  );

  return { speak, cancel, speaking };
}
