"use client";
/* Engine Kokoro-82M-v1.1-zh qua fork @uzen/kokoro-js — G2P misaki zh bằng JS
   (tone sandhi 一/不/sandhi-3, đa âm tự, erhua). Model fetch từ HuggingFace,
   browser cache bằng Cache API; voice .bin tự host (public/kokoro/voices).

   Lib ML nạp từ bundle kín vendored tại /kokoro/vendor/kokoro.web.js (2.1MB,
   copy của node_modules/@uzen/kokoro-js/dist/kokoro.web.js — self-contained,
   không có bare import). Import theo URL + turbopackIgnore để Next SSR /
   OpenNext trace / esbuild KHÔNG nhìn thấy: nếu để bare specifier, entry Node
   của @huggingface/transformers kéo sharp/onnxruntime-node vào server bundle
   và opennextjs-cloudflare build vỡ ở CI. */
import {
  KOKORO_MODEL_ID,
  KOKORO_VOICE_PATH,
  TIER_CONFIG,
  VOICE_BY_PREF,
  getVoicePref,
  type TtsTier,
} from "./config";
import { loadKokoroBundle } from "./kokoro-loader";
import { chunkText } from "./webspeech-engine";
import { playSamples, stopPlayback } from "./playback";
import type { TtsSpeakOptions } from "./types";

export interface DownloadProgress {
  received: number;
  total: number;
}

export interface KokoroEngine {
  readonly tier: TtsTier;
  speak(text: string, opts?: TtsSpeakOptions): Promise<void>;
  cancel(): void;
}

interface RawAudioLike {
  audio: Float32Array;
  sampling_rate: number;
}

interface KokoroTtsLike {
  generate(text: string, opts: { voice: string; speed?: number }): Promise<RawAudioLike>;
}

export async function createKokoroEngine(
  tier: TtsTier,
  onProgress?: (p: DownloadProgress) => void
): Promise<KokoroEngine> {
  const { KokoroTTS } = await loadKokoroBundle();
  const cfg = TIER_CONFIG[tier];
  const tts = (await KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
    dtype: cfg.dtype,
    device: cfg.device,
    voicePath: KOKORO_VOICE_PATH,
    progress_callback: (p: { status?: string; loaded?: number; total?: number }) => {
      /* transformers.js báo nhiều status (init/download/progress/done) —
         chỉ status "progress" có cặp loaded/total đáng tin. */
      if (p.status === "progress" && p.total) {
        onProgress?.({ received: p.loaded ?? 0, total: p.total });
      }
    },
  })) as KokoroTtsLike;

  /* runId thay boolean: speak() mới tự hủy run cũ (bấm loa liên tiếp), và
     cancel() không thể bị "hồi sinh" bởi speak() đang treo ở await. */
  let runId = 0;

  return {
    tier,
    cancel() {
      runId++;
      stopPlayback();
    },
    async speak(text, opts) {
      const id = ++runId;
      const voice = VOICE_BY_PREF[getVoicePref()];
      const speed = opts?.rate ?? 1;
      for (const chunk of chunkText(text)) {
        if (id !== runId) return;
        const audio = await tts.generate(chunk, { voice, speed });
        if (id !== runId) return;
        await new Promise<void>((resolve) => {
          playSamples(audio.audio, audio.sampling_rate, () => resolve());
        });
      }
      if (id === runId) opts?.onEnd?.();
    },
  };
}
