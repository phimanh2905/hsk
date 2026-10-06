import { describe, it, expect, vi, afterEach } from "vitest";
import { detectCapability } from "../capability";

const setGpu = (gpu: unknown) => {
  vi.stubGlobal("navigator", { ...navigator, gpu, userAgent: navigator.userAgent });
};
const setUa = (ua: string) => {
  vi.stubGlobal("navigator", { ...navigator, userAgent: ua });
};

afterEach(() => vi.unstubAllGlobals());

describe("detectCapability", () => {
  it("iOS Safari -> webspeech, dù navigator.gpu có tồn tại (spec §8)", async () => {
    setUa("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/605.1");
    setGpu({ requestAdapter: async () => ({}) });
    await expect(detectCapability()).resolves.toBe("webspeech");
  });

  it("không có navigator.gpu (Firefox) -> wasm-q8", async () => {
    setUa("Mozilla/5.0 (X11; Linux x86_64) Firefox/128.0");
    setGpu(undefined);
    await expect(detectCapability()).resolves.toBe("wasm-q8");
  });

  it("có adapter -> webgpu-fp16", async () => {
    setUa("Mozilla/5.0 Chrome/126.0");
    setGpu({ requestAdapter: async () => ({ features: [] }) });
    await expect(detectCapability()).resolves.toBe("webgpu-fp16");
  });

  it("requestAdapter return null (cắm cờ nhưng driver lỗi) -> wasm-q8", async () => {
    setUa("Mozilla/5.0 Chrome/126.0");
    setGpu({ requestAdapter: async () => null });
    await expect(detectCapability()).resolves.toBe("wasm-q8");
  });

  it("requestAdapter throw -> wasm-q8, không nổ", async () => {
    setUa("Mozilla/5.0 Chrome/126.0");
    setGpu({
      requestAdapter: async () => {
        throw new Error("GPU crash");
      },
    });
    await expect(detectCapability()).resolves.toBe("wasm-q8");
  });
});
