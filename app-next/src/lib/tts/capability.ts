import { isIosSafari, type TtsTier } from "./config";

export type TtsCapability = TtsTier | "webspeech";

interface GpuLike {
  requestAdapter(): Promise<unknown>;
}

/* requestAdapter() chứ không chỉ kiểm navigator.gpu: trình duyệt có thể expose
   gpu nhưng driver lỗi -> adapter null. Không WebGPU -> webspeech, không nổ. */
export async function detectCapability(): Promise<TtsCapability> {
  if (isIosSafari()) return "webspeech";
  const gpu = (navigator as Navigator & { gpu?: GpuLike }).gpu;
  if (!gpu) return "webspeech";
  try {
    const adapter = await gpu.requestAdapter();
    return adapter ? "webgpu-fp32" : "webspeech";
  } catch {
    return "webspeech";
  }
}
