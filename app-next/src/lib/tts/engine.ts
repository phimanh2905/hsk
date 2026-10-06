"use client";
/* Orchestrator 3 tầng (spec §4): WebGPU fp16 -> WASM q8 -> webspeech.
   Singleton vì nhiều component dùng song song; state phát qua subscribe cho
   dialog consent + settings modal. */
import { detectCapability, type TtsCapability } from "./capability";
import {
  getEngineChoice,
  setEngineChoice,
  isIosSafari,
  type TtsTier,
} from "./config";
import {
  createKokoroEngine,
  type DownloadProgress,
  type KokoroEngine,
} from "./kokoro-engine";
import type { TtsSpeakOptions } from "./types";

export type TtsOrchestratorState =
  | { kind: "idle" }
  | { kind: "consent" }
  | { kind: "downloading"; received: number; total: number }
  | { kind: "ready"; tier: TtsCapability }
  | { kind: "error"; message: string };

export interface KokoroSpeakOptions extends TtsSpeakOptions {
  /* Kokoro không dùng được cho lần phát này (chưa tải/đang tải/lỗi) ->
     hook tự phát webspeech với cùng text. */
  onFallback?: () => void;
}

export interface TtsOrchestrator {
  shouldUseKokoro(): boolean;
  speak(text: string, opts?: KokoroSpeakOptions): void;
  cancel(): void;
  acceptConsent(useKokoro: boolean): void;
  preload(): Promise<void>;
  retryAfterError(): Promise<void>;
  getState(): TtsOrchestratorState;
  subscribe(cb: (s: TtsOrchestratorState) => void): () => void;
}

let state: TtsOrchestratorState = { kind: "idle" };
const listeners = new Set<(s: TtsOrchestratorState) => void>();
let engine: KokoroEngine | null = null;
let enginePromise: Promise<KokoroEngine> | null = null;
let engineBroken = false; // lỗi runtime -> webspeech cả session (spec §8)
let consentAsked = false; // hỏi tối đa 1 lần / page load

function setState(s: TtsOrchestratorState) {
  state = s;
  listeners.forEach((l) => l(s));
}

function loadEngine(onProgress?: (p: DownloadProgress) => void): Promise<KokoroEngine> {
  /* tách khỏi ensureEngine để có thể retry tier: fp16 fail (thiếu shader-f16,
     driver lỗi) -> thử q8-wasm đúng 1 lần (spec §8) trước khi báo lỗi */
  return (async () => {
    const tier = await detectCapability();
    if (tier === "webspeech") throw new Error("Thiết bị không hỗ trợ Kokoro");
    try {
      return await createKokoroEngine(tier as TtsTier, onProgress);
    } catch (err) {
      if (tier === "webgpu-fp16") return await createKokoroEngine("wasm-q8", onProgress);
      throw err;
    }
  })();
}

function ensureEngine(onProgress?: (p: DownloadProgress) => void): Promise<KokoroEngine> {
  if (engine) return Promise.resolve(engine);
  if (!enginePromise) {
    enginePromise = loadEngine(onProgress)
      .then((e) => {
        engine = e;
        setState({ kind: "ready", tier: e.tier });
        return e;
      })
      .catch((err: unknown) => {
        enginePromise = null; // cho phép thử lại từ Settings
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Không tải được giọng đọc",
        });
        throw err;
      });
  }
  return enginePromise;
}

export function getTtsOrchestrator(): TtsOrchestrator {
  return {
    shouldUseKokoro() {
      if (engineBroken || isIosSafari()) return false;
      return getEngineChoice() === "kokoro";
    },
    speak(text, opts) {
      if (!this.shouldUseKokoro()) {
        if (getEngineChoice() === null && !consentAsked) {
          consentAsked = true;
          setState({ kind: "consent" });
        }
        opts?.onFallback?.();
        return;
      }
      if (!engine) {
        void ensureEngine().catch(() => {}); // nạp ngầm cho lần click sau
        opts?.onFallback?.(); // lần này nghe webspeech trước
        return;
      }
      engine.cancel(); // bấm loa mới -> dừng câu cũ
      void engine.speak(text, opts).catch(() => {
        engineBroken = true;
        engine = null;
        enginePromise = null;
        setState({ kind: "error", message: "Lỗi khi tạo giọng đọc — chuyển về giọng hệ thống" });
        opts?.onFallback?.();
      });
    },
    cancel() {
      engine?.cancel();
    },
    acceptConsent(useKokoro) {
      setEngineChoice(useKokoro ? "kokoro" : "system");
      if (useKokoro) void ensureEngine().catch(() => {});
      else setState({ kind: "idle" });
    },
    async preload() {
      await ensureEngine();
    },
    async retryAfterError() {
      engineBroken = false;
      enginePromise = null;
      await ensureEngine();
    },
    getState: () => state,
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
