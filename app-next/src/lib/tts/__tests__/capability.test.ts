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

  it("không có navigator.gpu (Firefox) -> webspeech", async () => {
    setUa("Mozilla/5.0 (X11; Linux x86_64) Firefox/128.0");
    setGpu(undefined);
    await expect(detectCapability()).resolves.toBe("webspeech");
  });

  it("có adapter -> webgpu-fp32", async () => {
    setUa("Mozilla/5.0 Chrome/126.0");
    setGpu({ requestAdapter: async () => ({ features: [] }) });
    await expect(detectCapability()).resolves.toBe("webgpu-fp32");
  });

  it("requestAdapter return null (cắm cờ nhưng driver lỗi) -> webspeech", async () => {
    setUa("Mozilla/5.0 Chrome/126.0");
    setGpu({ requestAdapter: async () => null });
    await expect(detectCapability()).resolves.toBe("webspeech");
  });

  it("requestAdapter throw -> webspeech, không nổ", async () => {
    setUa("Mozilla/5.0 Chrome/126.0");
    setGpu({
      requestAdapter: async () => {
        throw new Error("GPU crash");
      },
    });
    await expect(detectCapability()).resolves.toBe("webspeech");
  });
});
