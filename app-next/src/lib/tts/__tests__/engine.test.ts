import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const detectCapability = vi.fn();
const createKokoroEngine = vi.fn();
vi.mock("../capability", () => ({
  detectCapability: (...a: unknown[]) => detectCapability(...a),
}));
vi.mock("../kokoro-engine", () => ({
  createKokoroEngine: (...a: unknown[]) => createKokoroEngine(...a),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  localStorage.clear();
});

/* Singleton theo module — mỗi test import lại để có instance sạch */
async function freshOrchestrator() {
  vi.resetModules();
  const { getTtsOrchestrator } = await import("../engine");
  return getTtsOrchestrator();
}

const fakeKokoro = () => {
  detectCapability.mockResolvedValue("webgpu-fp32");
  createKokoroEngine.mockResolvedValue({
    tier: "webgpu-fp32",
    speak: vi.fn(async (_t: string, opts?: { onEnd?: () => void }) => opts?.onEnd?.()),
    cancel: vi.fn(),
  });
};

beforeEach(() => {
  localStorage.clear();
  detectCapability.mockReset();
  createKokoroEngine.mockReset();
});

describe("TtsOrchestrator", () => {
  it("auto chưa hỏi: speak -> onFallback + phát state consent đúng 1 lần", async () => {
    const orch = await freshOrchestrator();
    const states: string[] = [];
    orch.subscribe((s) => states.push(s.kind));
    const onFallback = vi.fn();
    orch.speak("你好", { onFallback });
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(states).toEqual(["consent"]);
    // lần 2 không hỏi lại trong cùng page load
    orch.speak("再见", { onFallback: vi.fn() });
    expect(states).toEqual(["consent"]);
  });

  it("choice=system: không bao giờ consent, luôn onFallback", async () => {
    localStorage.setItem("bye.tts.engine", "system");
    const orch = await freshOrchestrator();
    const onFallback = vi.fn();
    orch.speak("你好", { onFallback });
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(orch.getState().kind).toBe("idle");
  });

  it("choice=kokoro: speak khi engine sẵn sàng -> engine.speak, không fallback", async () => {
    fakeKokoro();
    localStorage.setItem("bye.tts.engine", "kokoro");
    const orch = await freshOrchestrator();
    await orch.preload();
    const engine = await createKokoroEngine.mock.results[0].value;
    const onFallback = vi.fn();
    orch.speak("你好", { onFallback });
    await vi.waitFor(() =>
      expect(engine.speak).toHaveBeenCalledWith("你好", expect.anything())
    );
    expect(onFallback).not.toHaveBeenCalled();
    expect(orch.getState()).toMatchObject({ kind: "ready", tier: "webgpu-fp32" });
  });

  it("choice=kokoro nhưng engine chưa nạp: khởi động nạp ngầm + onFallback cho lần này", async () => {
    fakeKokoro();
    localStorage.setItem("bye.tts.engine", "kokoro");
    const orch = await freshOrchestrator();
    const onFallback = vi.fn();
    orch.speak("你好", { onFallback });
    expect(onFallback).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(createKokoroEngine).toHaveBeenCalledTimes(1)); // nạp ngầm đã bắt đầu
  });

  it("acceptConsent(true) -> lưu kokoro + preload ngầm", async () => {
    fakeKokoro();
    const orch = await freshOrchestrator();
    orch.acceptConsent(true);
    await vi.waitFor(() =>
      expect(orch.getState()).toMatchObject({ kind: "ready", tier: "webgpu-fp32" })
    );
    expect(localStorage.getItem("bye.tts.engine")).toBe("kokoro");
  });

  it("acceptConsent(false) -> lưu system, không preload", async () => {
    const orch = await freshOrchestrator();
    orch.acceptConsent(false);
    expect(localStorage.getItem("bye.tts.engine")).toBe("system");
    expect(createKokoroEngine).not.toHaveBeenCalled();
  });

  it("iOS Safari: không bao giờ shouldUseKokoro, không consent", async () => {
    vi.stubGlobal(
      "navigator",
      { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" }
    );
    fakeKokoro();
    localStorage.setItem("bye.tts.engine", "kokoro");
    const orch = await freshOrchestrator();
    expect(orch.shouldUseKokoro()).toBe(false);
    const onFallback = vi.fn();
    orch.speak("你好", { onFallback });
    expect(onFallback).toHaveBeenCalled();
    expect(createKokoroEngine).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("iOS Safari + auto chưa hỏi: KHÔNG phát consent (spec §8 — chặn đề nghị Kokoro)", async () => {
    vi.stubGlobal(
      "navigator",
      { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" }
    );
    const orch = await freshOrchestrator();
    const states: string[] = [];
    orch.subscribe((s) => states.push(s.kind));
    const onFallback = vi.fn();
    orch.speak("你好", { onFallback });
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(states).toEqual([]); // không consent, vẫn webspeech
    expect(orch.getState().kind).toBe("idle");
    vi.unstubAllGlobals();
  });

  it("lỗi nạp engine (HF offline) -> state error, các speak sau fallback webspeech cả session", async () => {
    detectCapability.mockResolvedValue("webgpu-fp32");
    createKokoroEngine.mockRejectedValue(new Error("offline"));
    localStorage.setItem("bye.tts.engine", "kokoro");
    const orch = await freshOrchestrator();
    await expect(orch.preload()).rejects.toThrow();
    expect(orch.getState().kind).toBe("error");
    const onFallback = vi.fn();
    orch.speak("你好", { onFallback });
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(createKokoroEngine).toHaveBeenCalledTimes(1); // không thử lại ngầm
    // retryAfterError xóa cờ broken và thử lại (vẫn lỗi ở đây vì mock vẫn reject)
    await expect(orch.retryAfterError()).rejects.toThrow("offline");
    expect(orch.getState().kind).toBe("error");
  });

  it("subscribe trả về unsubscribe", async () => {
    const orch = await freshOrchestrator();
    const states: string[] = [];
    const unsub = orch.subscribe((s) => states.push(s.kind));
    unsub();
    orch.speak("你好", { onFallback: vi.fn() });
    expect(states).toEqual([]);
  });
});
