"use client";
/* Kế thừa logic recorder-panel (getUserMedia + MediaRecorder + analyser level)
   nhưng dạng hook cho studio: start/stop theo pointerdown/up, lỗi quyền → simMode
   (vẫn chấm heuristic, spec §7). jsdom/test không có mediaDevices → sim luôn.
   Level chỉ đi qua callback `onLevel`; object trả về đúng 5 trường:
   { recording, simMode, start, stop, lastUrl }.

   Hợp đồng trả về của stop(): `{ blob: Blob; secs: number } | null` — LUÔN đồng bộ.
   - `secs` tính đồng bộ tại thời điểm stop (đáng tin, dùng để chấm điểm).
   - `blob` trên đường dẫn THẬT (MediaRecorder) có thể THIẾU chunk: MediaRecorder
     deliver chunk bất đồng bộ, nên blob dựng ngay lúc stop chỉ gồm các chunk đã
     tới. Artifact đáng tin để phát lại là `lastUrl` — được assembled trong
     onstop với TOÀN BỘ chunks (chunksRef không bị clear trước khi onstop chạy). */
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
  const ctxRef = useRef<AudioContext | null>(null);
  const lastUrlRef = useRef<string | null>(null);
  const startingRef = useRef(false); // chặn double-start khi getUserMedia đang pending
  const stopDuringStartRef = useRef(false); // stop() được gọi trong lúc promise chưa resolve
  const genRef = useRef(0); // generation token: promise cũ resolve muộn không ghi đè phiên mới
  const onLevelRef = useRef(onLevel);
  onLevelRef.current = onLevel;

  const stopLevelLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    ctxRef.current?.close().catch(() => { /* silent */ });
    ctxRef.current = null;
    onLevelRef.current?.(0);
  }, []);

  useEffect(() => () => {
    try { recRef.current?.stop(); } catch { /* silent */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    stopLevelLoop();
    if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
  }, [stopLevelLoop]);

  const start = useCallback(() => {
    // recRef chỉ được set bên trong .then() (async), nên cần cờ startingRef đặt
    // ĐỒNG BỘ để hai lần start() nhanh liên tiếp không mở song song hai
    // getUserMedia/recorder (review t5 — double-start race).
    if (recRef.current || startingRef.current) return;
    startingRef.current = true;
    stopDuringStartRef.current = false;
    const gen = ++genRef.current;
    t0Ref.current = Date.now();
    chunksRef.current = [];
    const nav = navigator as Navigator & { mediaDevices?: MediaDevices };
    const MR = (window as unknown as { MediaRecorder?: new (s: MediaStream) => Rec }).MediaRecorder;
    if (nav.mediaDevices && MR) {
      nav.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        startingRef.current = false;
        // Phiên mới đã bắt đầu sau khi stop() hủy phiên này → dọn stream cũ.
        if (gen !== genRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        // stop() đã được gọi trong lúc promise pending → dọn dẹp, KHÔNG bật
        // recording lại (tránh kẹt trạng thái "recording").
        if (stopDuringStartRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const rec = new MR(stream);
        rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          // ChunksRef giữ nguyên tới đây (không clear ở stop()) để lastUrl có
          // đủ toàn bộ chunks — lastUrl là artifact đáng tin, không phải blob
          // trả về đồng bộ từ stop().
          if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
          const url = URL.createObjectURL(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
          lastUrlRef.current = url;
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
            ctxRef.current = ctx;
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
      }).catch(() => {
        startingRef.current = false;
        if (stopDuringStartRef.current) return;
        setSimMode(true);
        setRecording(true);
      });
    } else {
      // đường dẫn sim (jsdom/test, thiết bị không hỗ trợ): đồng bộ, không có race.
      startingRef.current = false;
      setSimMode(true);
      setRecording(true);
    }
  }, [stopLevelLoop]);

  const stop = useCallback((): { blob: Blob; secs: number } | null => {
    if (!recording) return null;
    const secs = (Date.now() - t0Ref.current) / 1000;
    stopLevelLoop();
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* silent */ }
      recRef.current = null;
      streamRef.current = null;
    } else if (startingRef.current || stopDuringStartRef.current) {
      // getUserMedia còn pending: đánh dấu để .then() tự dọn stream và không
      // bật lại recording. Vẫn trả kết quả đồng bộ theo hợp đồng.
      stopDuringStartRef.current = true;
      startingRef.current = false;
    }
    setRecording(false);
    // LƯU Ý (đường dẫn thật): blob có thể chưa chứa đủ chunk (MediaRecorder
    // deliver bất đồng bộ). Consumer nên dùng `lastUrl` để phát lại và `secs`
    // để chấm điểm. ChunksRef KHÔNG bị clear ở đây — onstop sẽ dựng lastUrl
    // với đủ chunks rồi mới thay thế.
    return { blob: new Blob(chunksRef.current, { type: "audio/webm" }), secs };
  }, [recording, stopLevelLoop]);

  return { recording, simMode, start, stop, lastUrl };
}
