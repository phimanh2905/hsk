"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createWebspeechEngine, type WebspeechEngine } from "./webspeech-engine";
import type { TtsSpeakOptions } from "./types";

export type TtsOptions = TtsSpeakOptions;

export function useTts() {
  const [speaking, setSpeaking] = useState(false);
  const engineRef = useRef<WebspeechEngine | null>(null);
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => {
    const engine = createWebspeechEngine(setSpeaking);
    engineRef.current = engine;
    cancelRef.current = () => engine.cancel();
    return () => engine.dispose();
  }, []);

  const cancel = useCallback(() => cancelRef.current(), []);

  const speak = useCallback((text: string, opts?: TtsSpeakOptions) => {
    engineRef.current?.speak(text, opts);
  }, []);

  return { speak, cancel, speaking };
}
