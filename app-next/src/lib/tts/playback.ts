/* Phát samples Kokoro (Float32Array, 24kHz) bằng AudioBufferSourceNode.
   Kokoro trả mảng samples hoàn chỉnh sau inference, không phải stream realtime,
   nên không cần AudioWorklet ở phase 1 (spec §4 — gapless stream là phase 2). */

let ctx: AudioContext | null = null;
let current: AudioBufferSourceNode | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  /* speak() luôn được gọi trong click handler nên user gesture còn hiệu lực,
     resume() sẽ thành công; nếu không có gesture browser sẽ tự bỏ qua. */
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function playSamples(
  samples: Float32Array,
  sampleRate = 24_000,
  onEnded?: () => void
): void {
  stopPlayback();
  const context = getCtx();
  const buf = context.createBuffer(1, samples.length, sampleRate);
  buf.copyToChannel(samples, 0);
  const src = context.createBufferSource();
  src.buffer = buf;
  src.onended = () => {
    if (current === src) current = null;
    onEnded?.();
  };
  src.connect(context.destination);
  current = src;
  src.start();
}

export function stopPlayback(): void {
  if (!current) return;
  current.onended = null; // cancel ≠ phát xong: nuốt onEnded
  try {
    current.stop();
  } catch {
    /* node đã tự stop */
  }
  current.disconnect();
  current = null;
}

/* Chỉ để test: AudioContext là singleton nên jsdom test phải reset giữa các case */
export function __resetPlayback(): void {
  stopPlayback();
  ctx = null;
}
