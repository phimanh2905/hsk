import { describe, it, expect, vi, beforeEach } from "vitest";
import { playSamples, stopPlayback, __resetPlayback } from "../playback";

function makeSourceNode() {
  return {
    buffer: null as unknown,
    onended: null as (() => void) | null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

let source: ReturnType<typeof makeSourceNode>;
beforeEach(() => {
  __resetPlayback(); // AudioContext là singleton trong module — reset giữa các test
  source = makeSourceNode();
  const FakeAudioContext = vi.fn(function FakeAudioContext(this: object) {
    return {
      state: "running",
      resume: vi.fn(async () => {}),
      destination: {},
      createBuffer: vi.fn(() => ({
        copyToChannel: vi.fn(),
      })),
      createBufferSource: vi.fn(() => {
        // mỗi lần phát là 1 node mới, nhưng test chỉ cần node gần nhất
        return (source = makeSourceNode());
      }),
    } as object;
  });
  vi.stubGlobal("AudioContext", FakeAudioContext);
});

describe("playSamples", () => {
  it("tạo buffer 1 kênh với sampleRate 24000 và start()", () => {
    const samples = new Float32Array(24000);
    playSamples(samples, 24000);
    expect(source.start).toHaveBeenCalledTimes(1);
    expect(source.connect).toHaveBeenCalled();
  });

  it("onended được gọi khi buffer phát xong", () => {
    const onEnded = vi.fn();
    playSamples(new Float32Array(10), 24000, onEnded);
    expect(onEnded).not.toHaveBeenCalled();
    source.onended?.();
    expect(onEnded).toHaveBeenCalledTimes(1);
  });
});

describe("stopPlayback", () => {
  it("stop() node đang phát và NUỐT onended (cancel không phải phát xong)", () => {
    const onEnded = vi.fn();
    playSamples(new Float32Array(10), 24000, onEnded);
    stopPlayback();
    expect(source.stop).toHaveBeenCalledTimes(1);
    expect(source.disconnect).toHaveBeenCalledTimes(1);
    source.onended?.(); // onended đã bị gỡ — không được gọi
    expect(onEnded).not.toHaveBeenCalled();
  });

  it("stop khi không có gì đang phát -> không nổ", () => {
    expect(() => stopPlayback()).not.toThrow();
  });

  it("phát mới -> tự stop cái cũ (chỉ 1 âm thanh tại 1 thời điểm)", () => {
    playSamples(new Float32Array(10), 24000);
    const first = source;
    playSamples(new Float32Array(10), 24000);
    expect(first.stop).toHaveBeenCalledTimes(1);
  });

  it("AudioContext suspended -> resume() (cần gesture để iOS cho phát)", () => {
    // context fake đầu tiên suspended
    const resume = vi.fn(async () => {});
    const SuspendedContext = vi.fn(function SuspendedContext(this: object) {
      return {
        state: "suspended",
        resume,
        destination: {},
        createBuffer: vi.fn(() => ({ copyToChannel: vi.fn() })),
        createBufferSource: vi.fn(() => makeSourceNode()),
      } as object;
    });
    vi.stubGlobal("AudioContext", SuspendedContext);
    playSamples(new Float32Array(10), 24000);
    expect(resume).toHaveBeenCalledTimes(1);
  });
});
