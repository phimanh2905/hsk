"use client";
/* Kế thừa logic recorder-panel (getUserMedia + MediaRecorder + analyser level)
   nhưng dạng hook cho studio: start/stop theo pointerdown/up, lỗi quyền → simMode
   (vẫn chấm heuristic, spec §7). jsdom/test không có mediaDevices → sim luôn.
   Level chỉ đi qua callback `onLevel`; object trả về đúng 5 trường:
   { recording, simMode, start, stop, lastUrl }. */
import { useCallback, useEffect, useRef, useState } from "react";

type Rec = { stop: () => void; onstop: (() => void) | null; ondataavailable: ((e: { data: Blob }) => void) | null; start: () => void; mimeType: string };

export function useRecorder(onLevel?: (level: number) => void) {
  const [recording, setRecording] = useState(false);
  const [simMode, setSimMode] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const recRef = useRef<Rec | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const t0Ref = useRef(0);
  const rafRef = useRef(0);
  const onLevelRef = useRef(onLevel);
  onLevelRef.current = onLevel;

  useEffect(() => () => {
    try { recRef.current?.stop(); } catch { /* silent */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    cancelAnimationFrame(rafRef.current);
  }, []);

  const start = useCallback(() => {
    if (recRef.current) return;
    t0Ref.current = Date.now();
    chunksRef.current = [];
    const nav = navigator as Navigator & { mediaDevices?: MediaDevices };
    const MR = (window as unknown as { MediaRecorder?: new (s: MediaStream) => Rec }).MediaRecorder;
    if (nav.mediaDevices && MR) {
      nav.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        streamRef.current = stream;
        const rec = new MR(stream);
        rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const url = URL.createObjectURL(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
          setLastUrl(url);
        };
        rec.start();
        recRef.current = rec;
        setRecording(true);
        // level loop từ analyser
        try {
          const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (AC) {
            const ctx = new AC();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 1024;
            ctx.createMediaStreamSource(stream).connect(analyser);
            const buf = new Uint8Array(analyser.fftSize);
            const loop = () => {
              analyser.getByteTimeDomainData(buf);
              let s = 0;
              for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; }
              onLevelRef.current?.(Math.min(1, Math.sqrt(s / buf.length) * 3.2));
              rafRef.current = requestAnimationFrame(loop);
            };
            loop();
          }
        } catch { /* silent — level bar đứng 0 */ }
      }).catch(() => { setSimMode(true); setRecording(true); });
    } else {
      setSimMode(true);
      setRecording(true);
    }
  }, []);

  const stop = useCallback((): { blob: Blob; secs: number } | null => {
    if (!recording) return null;
    const secs = (Date.now() - t0Ref.current) / 1000;
    cancelAnimationFrame(rafRef.current);
    onLevelRef.current?.(0);
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* silent */ }
      recRef.current = null;
      streamRef.current = null;
    }
    setRecording(false);
    return { blob: new Blob(chunksRef.current, { type: "audio/webm" }), secs };
  }, [recording]);

  return { recording, simMode, start, stop, lastUrl };
}
