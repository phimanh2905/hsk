import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createKokoroEngine } from "../kokoro-engine";

/* Fake bundle qua loader seam: from_pretrained ghi nhận opts, generate trả
   RawAudio giả (100 samples, 24kHz). loadKokoroBundle bị mock vì nó là dynamic
   URL import chỉ chạy ở browser. */
const fromPretrained = vi.fn();
const generate = vi.fn();
vi.mock("../kokoro-loader", () => ({
  loadKokoroBundle: async () => ({
    KokoroTTS: {
      from_pretrained: (...args: unknown[]) => fromPretrained(...args),
    },
  }),
}));

vi.mock("../playback", () => ({
  playSamples: vi.fn(),
  stopPlayback: vi.fn(),
}));

import { playSamples, stopPlayback } from "../playback";
const playMock = vi.mocked(playSamples);
const stopMock = vi.mocked(stopPlayback);

/* playSamples fake: gọi ngay onEnded để vòng lặp chunk chạy tới hết */
beforeEach(() => {
  fromPretrained.mockReset();
  generate.mockReset();
  playMock.mockImplementation(
    (_samples: Float32Array, _rate?: number, onEnded?: () => void) => onEnded?.()
  );
  stopMock.mockClear();
  localStorage.clear();
});

afterEach(() => vi.restoreAllMocks());

const fakeTts = () => {
  generate.mockResolvedValue({ audio: new Float32Array(100), sampling_rate: 24000 });
  fromPretrained.mockResolvedValue({ generate });
  return { generate };
};

describe("createKokoroEngine", () => {
  it("load đúng model, dtype/device theo tier, voicePath tự host", async () => {
    fakeTts();
    await createKokoroEngine("webgpu-fp16");
    expect(fromPretrained).toHaveBeenCalledWith(
      "onnx-community/Kokoro-82M-v1.1-zh-ONNX",
      expect.objectContaining({ dtype: "fp16", device: "webgpu", voicePath: "/kokoro/voices" })
    );
    await createKokoroEngine("wasm-q8");
    expect(fromPretrained).toHaveBeenLastCalledWith(
      "onnx-community/Kokoro-82M-v1.1-zh-ONNX",
      expect.objectContaining({ dtype: "q8", device: "wasm" })
    );
  });

  it("progress_callback được chuyển tiếp (status=progress)", async () => {
    fakeTts();
    const onProgress = vi.fn();
    fromPretrained.mockImplementation(async (_id: string, opts: { progress_callback?: (p: { status?: string; loaded?: number; total?: number }) => void }) => {
      opts.progress_callback?.({ status: "progress", loaded: 50, total: 100 });
      return { generate };
    });
    await createKokoroEngine("webgpu-fp16", onProgress);
    expect(onProgress).toHaveBeenCalledWith({ received: 50, total: 100 });
  });

  it("speak gọi generate với voice theo bye.voice + speed theo rate", async () => {
    fakeTts();
    const engine = await createKokoroEngine("webgpu-fp16");
    localStorage.setItem("bye.voice", "male");
    await engine.speak("你好", { rate: 0.8 });
    expect(generate).toHaveBeenCalledWith(
      "你好",
      expect.objectContaining({ voice: "zm_009", speed: 0.8 })
    );
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it("speak chunk dài -> generate từng chunk tuần tự", async () => {
    fakeTts();
    const engine = await createKokoroEngine("webgpu-fp16");
    await engine.speak("好".repeat(150) + "。" + "你".repeat(150));
    expect(generate).toHaveBeenCalledTimes(2);
    expect(playMock).toHaveBeenCalledTimes(2);
  });

  it("speak xong gọi opts.onEnd", async () => {
    fakeTts();
    const engine = await createKokoroEngine("webgpu-fp16");
    const onEnd = vi.fn();
    await engine.speak("你好", { onEnd });
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("cancel giữa chừng -> stopPlayback, chunk sau bỏ qua", async () => {
    fakeTts();
    let resolveFirst: (v: unknown) => void = () => {};
    generate.mockImplementationOnce(
      () => new Promise((res) => (resolveFirst = res))
    );
    const engine = await createKokoroEngine("webgpu-fp16");
    const pending = engine.speak("好".repeat(150) + "。" + "你".repeat(150));
    engine.cancel();
    resolveFirst(undefined);
    await pending;
    expect(stopMock).toHaveBeenCalled();
    expect(generate).toHaveBeenCalledTimes(1); // chunk 2 không chạy
  });

  it("load lỗi (HF chặn/network) -> createKokoroEngine reject", async () => {
    fromPretrained.mockRejectedValue(new Error("offline"));
    await expect(createKokoroEngine("webgpu-fp16")).rejects.toThrow("offline");
  });
});
