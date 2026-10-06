/* Cấu hình TTS Kokoro — spec docs/superpowers/specs/2026-10-06-kokoro-tts-design.md
   Model không bundle: fetch runtime từ HuggingFace, browser tự cache (Cache API). */

export const TTS_ENGINE_KEY = "bye.tts.engine";
export type TtsTier = "webgpu-fp32";

export const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.1-zh-ONNX";
/* Voice .bin (512KB/voice) tự host trong public/ để không phụ thuộc resolve URL của HF.
   Có đúng 2 voice được dùng nên tổng ~1MB. */
export const KOKORO_VOICE_PATH = "/kokoro/voices";

export const TIER_CONFIG: Record<
  TtsTier,
  { dtype: "fp32"; device: "webgpu"; label: string }
> = {
  /* fp16 trên WebGPU EP của onnxruntime bị hỏng audio (rè) — onnxruntime
     issue #29807; fp32 là đường an toàn duy nhất trên WebGPU. Không có tier
     wasm: chậm và q8 không được khuyến nghị cho model này — fallback là
     Web Speech API. */
  "webgpu-fp32": { dtype: "fp32", device: "webgpu", label: "WebGPU" },
};

/* Voice mặc định theo pref female/male hiện có. zf_/zm_ là voice zh của
   Kokoro-82M-v1.1-zh (~100 voice); cặp này là lựa chọn khởi điểm, có thể
   đổi sau khi nghe thử (spec §12 — voice picker là phase sau). */
export const VOICE_BY_PREF = { female: "zf_001", male: "zm_009" } as const;
export type VoicePref = keyof typeof VOICE_BY_PREF;

export function getVoicePref(): VoicePref {
  try {
    return localStorage.getItem("bye.voice") === "male" ? "male" : "female";
  } catch {
    return "female";
  }
}

/* null = auto: chưa hỏi user lần nào -> phải hỏi trước khi tải (spec §6). */
export type EngineChoice = "kokoro" | "system";

export function getEngineChoice(): EngineChoice | null {
  try {
    const v = localStorage.getItem(TTS_ENGINE_KEY);
    return v === "kokoro" || v === "system" ? v : null;
  } catch {
    return null;
  }
}

export function setEngineChoice(choice: EngineChoice | null): void {
  try {
    if (choice === null) localStorage.removeItem(TTS_ENGINE_KEY);
    else localStorage.setItem(TTS_ENGINE_KEY, choice);
  } catch {
    /* silent — Safari private mode chặn localStorage */
  }
}

/* iOS Safari: WebGPU chưa ổn định + CPU yếu, inference sẽ unusable -> không
   đề nghị Kokoro trên thiết bị này (spec §8). iPadOS giả danh Macintosh nhưng
   navigator.maxTouchPoints > 1 (desktop Mac luôn = 0). */
export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const touchPoints = (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints ?? 0;
  return /iP(hone|od|ad)/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);
}
