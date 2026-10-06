"use client";
/* Engine speechSynthesis (Web Speech API) — tầng cuối của chuỗi fallback.
   Port nguyên văn logic use-tts.ts cũ: chunk 200, pickVoice theo bye.voice,
   cancel có điều kiện (iOS nuốt utterance), không retry setTimeout (mất gesture). */
import type { TtsSpeakOptions } from "./types";

const CHUNK = 200;

export function chunkText(text: string): string[] {
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

export interface WebspeechEngine {
  speak(text: string, opts?: TtsSpeakOptions): void;
  cancel(): void;
  dispose(): void;
}

export function createWebspeechEngine(
  onSpeakingChange: (speaking: boolean) => void
): WebspeechEngine {
  const voicesCache: SpeechSynthesisVoice[] = [];
  const synth = () => window.speechSynthesis;

  /* iOS/Safari nạp voice bất đồng bộ — nhớ danh sách voice zh mỗi khi báo sẵn sàng. */
  const cache = () => {
    voicesCache.length = 0;
    voicesCache.push(...synth().getVoices().filter((v) => /^zh/i.test(v.lang)));
  };
  cache();
  synth().addEventListener?.("voiceschanged", cache);

  const pickVoice = (lang: string): SpeechSynthesisVoice | null => {
    let pref: string | null = null;
    try {
      pref = localStorage.getItem("bye.voice");
    } catch {
      pref = null;
    }
    const voicePref = pref || "female";
    const zh = synth().getVoices().filter((v) => /^zh/i.test(v.lang));
    // getVoices() có lúc rỗng dù voiceschanged đã báo xong -> dùng cache đã nhớ
    const voices = zh.length ? zh : voicesCache;
    const re = voicePref === "male" ? /male|daniel|tington/i : /female|mei|tingting|hui/i;
    return voices.find((v) => re.test(v.name)) ?? voices[0] ?? null;
  };

  return {
    speak(text, opts) {
      const lang = opts?.lang ?? "zh-CN";
      const rate = opts?.rate ?? 1;
      const voice = pickVoice(lang);
      const chunks = chunkText(text);
      /* Chỉ cancel khi thật sự đang phát — iOS Safari nuốt utterance nếu cancel()
         gọi liền speak() trong cùng một tick. */
      if (synth().speaking || synth().pending) synth().cancel();
      onSpeakingChange(true);
      const finish = () => {
        onSpeakingChange(false);
        opts?.onEnd?.();
      };
      chunks.forEach((t, i) => {
        const u = new SpeechSynthesisUtterance(t);
        u.lang = lang;
        u.rate = rate;
        if (voice && lang.startsWith("zh")) u.voice = voice;
        if (i === chunks.length - 1) {
          u.onend = finish;
          u.onerror = finish;
        }
        synth().speak(u);
      });
    },
    cancel() {
      synth().cancel();
      onSpeakingChange(false);
    },
    dispose() {
      synth().removeEventListener?.("voiceschanged", cache);
      this.cancel();
    },
  };
}
