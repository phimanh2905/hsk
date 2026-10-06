"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createWebspeechEngine, type WebspeechEngine } from "./webspeech-engine";
import { getTtsOrchestrator } from "./engine";
import type { TtsSpeakOptions } from "./types";

export type TtsOptions = TtsSpeakOptions;

/* API giữ nguyên cho ~25 component: speak/cancel/speaking.
   Routing: orchestrator quyết định Kokoro hay webspeech (engine.ts);
   webspeech engine là per-hook để unmount dọn listener voiceschanged. */
export function useTts() {
  const [speaking, setSpeaking] = useState(false);
  const wsRef = useRef<WebspeechEngine | null>(null);
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => {
    const ws = createWebspeechEngine(setSpeaking);
    wsRef.current = ws;
    cancelRef.current = () => {
      ws.cancel();
      getTtsOrchestrator().cancel();
    };
    return () => ws.dispose();
  }, []);

  const cancel = useCallback(() => cancelRef.current(), []);

  const speak = useCallback((text: string, opts?: TtsSpeakOptions) => {
    const wsOpts: TtsSpeakOptions = {
      ...opts,
      onEnd: () => {
        setSpeaking(false);
        opts?.onEnd?.();
      },
    };
    const orch = getTtsOrchestrator();
    if (orch.shouldUseKokoro() && orch.getState().kind === "ready") {
      setSpeaking(true);
      orch.speak(text, {
        ...wsOpts,
        onFallback: () => {
          setSpeaking(false);
          wsRef.current?.speak(text, wsOpts);
        },
      });
      return;
    }
    /* không dùng Kokoro lần này (auto/system/chưa tải/lỗi) — orchestrator
       phát consent nếu cần, playback do webspeech lo (quản speaking riêng) */
    orch.speak(text, {});
    wsRef.current?.speak(text, wsOpts);
  }, []);

  return { speak, cancel, speaking };
}
