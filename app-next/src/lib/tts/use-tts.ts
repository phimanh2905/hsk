"use client";
import { useCallback, useRef, useState, useEffect } from "react";

const CHUNK = 200;

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
  const speakingRef = useRef(false);
  const chunksRef = useRef<SpeechSynthesisUtterance[]>([]);
  const voicesCacheRef = useRef<SpeechSynthesisVoice[]>([]);
  const cancelRef = useRef<() => void>(() => {});

  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
    chunksRef.current = [];
    speakingRef.current = false;
    setSpeaking(false);
  }, []);
  cancelRef.current = cancel;

  useEffect(() => () => cancelRef.current(), []); // dọn dẹp khi unmount (C1)

  /* Chọn voice theo preference "bye.voice" (female/male), port shell.js:33-35 */
  const pickVoice = (lang: string): SpeechSynthesisVoice | null => {
    let pref: string | null = null;
    try {
      pref = localStorage.getItem("bye.voice");
    } catch {
      pref = null;
    }
    const voicePref = pref || "female";
    const zh = window.speechSynthesis
      .getVoices()
      .filter((v) => /^zh/i.test(v.lang));
    // getVoices() có lúc rỗng dù voiceschanged đã báo xong → dùng cache đã nhớ
    const voices = zh.length ? zh : voicesCacheRef.current;
    const re = voicePref === "male" ? /male|daniel|tington/i : /female|mei|tingting|hui/i;
    return voices.find((v) => re.test(v.name)) ?? voices[0] ?? null;
  };

  const makeUtterance = (t: string, lang: string, rate: number, voice: SpeechSynthesisVoice | null) => {
    const u = new SpeechSynthesisUtterance(t);
    u.lang = lang;
    u.rate = rate;
    if (voice && lang.startsWith("zh")) u.voice = voice;
    return u;
  };

  const speak = useCallback(
    (text: string, opts?: { lang?: "zh-CN" | "vi-VN"; rate?: number; onEnd?: () => void }) => {
      const lang = opts?.lang ?? "zh-CN";
      const rate = opts?.rate ?? 1;
      const voice = pickVoice(lang);
      const chunks = chunkText(text);
      const synth = window.speechSynthesis;
      /* Chỉ cancel khi thật sự đang có câu phát. iOS Safari nuốt utterance nếu
         cancel() gọi liền speak() trong cùng một tick — nên lúc im lặng thì đừng cancel. */
      if (synth.speaking || synth.pending) synth.cancel();
      chunksRef.current = [];
      speakingRef.current = true;
      setSpeaking(true);
      const finish = () => {
        chunksRef.current = [];
        speakingRef.current = false;
        setSpeaking(false);
        opts?.onEnd?.();
      };
      chunks.forEach((t, i) => {
        const u = makeUtterance(t, lang, rate, voice);
        if (i === chunks.length - 1) {
          u.onend = finish;
          u.onerror = finish;
        }
        chunksRef.current.push(u);
        synth.speak(u);
      });
    },
    []
  );

  /* iOS/Safari nạp danh sách voice bất đồng bộ — đọc getVoices() lúc mount thường ra
     rỗng, và có lúc voiceschanged đã báo xong nhưng getVoices() vẫn rỗng. Nhớ lại danh
     sách voice zh mỗi khi Safari báo sẵn sàng để không bị kẹt ở "không voice" cả phiên. */
  useEffect(() => {
    const s = window.speechSynthesis;
    const cache = () => {
      voicesCacheRef.current = s.getVoices().filter((v) => /^zh/i.test(v.lang));
    };
    cache();
    // jsdom/một số môi trường không có addEventListener trên speechSynthesis
    s.addEventListener?.("voiceschanged", cache);
    return () => {
      s.removeEventListener?.("voiceschanged", cache);
      voicesCacheRef.current = [];
    };
  }, []);

  return { speak, cancel, speaking };
}