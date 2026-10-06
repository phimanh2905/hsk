import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TTS_ENGINE_KEY,
  getVoicePref,
  getEngineChoice,
  setEngineChoice,
  isIosSafari,
  TIER_CONFIG,
  VOICE_BY_PREF,
  KOKORO_MODEL_ID,
} from "../config";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("config", () => {
  it("key engine đúng 'bye.tts.engine' (quy ước prefix bye.)", () => {
    expect(TTS_ENGINE_KEY).toBe("bye.tts.engine");
  });

  describe("getVoicePref", () => {
    it("mặc định female khi chưa có key", () => {
      expect(getVoicePref()).toBe("female");
    });
    it("male khi bye.voice = male", () => {
      localStorage.setItem("bye.voice", "male");
      expect(getVoicePref()).toBe("male");
    });
    it("giá trị lạ -> female", () => {
      localStorage.setItem("bye.voice", "robot");
      expect(getVoicePref()).toBe("female");
    });
  });

  describe("engine choice", () => {
    it("chưa có lựa chọn -> null (auto)", () => {
      expect(getEngineChoice()).toBeNull();
    });
    it("lưu/đọc kokoro và system", () => {
      setEngineChoice("kokoro");
      expect(getEngineChoice()).toBe("kokoro");
      expect(localStorage.getItem(TTS_ENGINE_KEY)).toBe("kokoro");
      setEngineChoice("system");
      expect(getEngineChoice()).toBe("system");
    });
    it("setEngineChoice(null) xóa key -> auto", () => {
      setEngineChoice("kokoro");
      setEngineChoice(null);
      expect(getEngineChoice()).toBeNull();
      expect(localStorage.getItem(TTS_ENGINE_KEY)).toBeNull();
    });
  });

  describe("isIosSafari", () => {
    it("UA iPhone -> true", () => {
      vi.stubGlobal(
        "navigator",
        { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" }
      );
      expect(isIosSafari()).toBe(true);
    });
    it("UA Chrome desktop -> false", () => {
      vi.stubGlobal("navigator", {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/126.0",
      });
      expect(isIosSafari()).toBe(false);
    });
  });

  it("tier config khớp spec: webgpu-fp16 = fp16/webgpu, wasm-q8 = q8/wasm", () => {
    expect(TIER_CONFIG["webgpu-fp16"]).toMatchObject({ dtype: "fp16", device: "webgpu" });
    expect(TIER_CONFIG["wasm-q8"]).toMatchObject({ dtype: "q8", device: "wasm" });
  });

  it("voice map: female -> zf_*, male -> zm_*", () => {
    expect(VOICE_BY_PREF.female).toMatch(/^zf_/);
    expect(VOICE_BY_PREF.male).toMatch(/^zm_/);
    expect(KOKORO_MODEL_ID).toBe("onnx-community/Kokoro-82M-v1.1-zh-ONNX");
  });
});
