import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useReadingPlayer,
  charWeight,
  charWeights,
  charPosFromTime,
  type AudioLike,
  type PlayerSentence,
  type MakeAudio,
} from "../use-reading-player";

/* Mock useKaraoke: mặc định inert; test fallback override implementation để spy dispatch. */
const karaokeMock = vi.hoisted(() => ({ useKaraoke: vi.fn() }));
vi.mock("../karaoke", () => ({ useKaraoke: karaokeMock.useKaraoke }));

type StubFn = ReturnType<typeof vi.fn>;
type Stub = Omit<AudioLike, "play" | "pause"> & {
  src: string;
  listeners: Map<string, (() => void)[]>;
  play: StubFn;
  pause: StubFn;
};

function makeStub(src: string): Stub {
  const stub = {
    src,
    currentTime: 0,
    playbackRate: 1,
    play: vi.fn(),
    pause: vi.fn(),
    listeners: new Map<string, (() => void)[]>(),
  } as Stub;
  stub.addEventListener = (type, cb) => {
    const l = stub.listeners.get(type) ?? [];
    l.push(cb);
    stub.listeners.set(type, l);
  };
  stub.removeEventListener = (type, cb) => {
    stub.listeners.set(type, (stub.listeners.get(type) ?? []).filter((c) => c !== cb));
  };
  return stub;
}

const stubMakeAudio: MakeAudio = (src) => makeStub(src) as unknown as AudioLike;

function makeFactory() {
  const created: Stub[] = [];
  const make = vi.fn((src: string): AudioLike => {
    const s = makeStub(src);
    created.push(s);
    return s as unknown as AudioLike;
  });
  return { make, created };
}

function fire(stub: Stub, type: string) {
  for (const cb of stub.listeners.get(type) ?? []) cb();
}

const sents: PlayerSentence[] = [
  { zh: "你好。", py: null, vi: "Xin chào.", audio: "https://x/1.mp3", durSec: 4 },
  { zh: "我叫小明，我学习汉语。", py: null, vi: "Tôi tên Tiểu Minh.", audio: "https://x/2.mp3", durSec: 6 },
];

beforeEach(() => {
  karaokeMock.useKaraoke.mockReset();
  karaokeMock.useKaraoke.mockImplementation(() => ({
    activeIdx: -1,
    playingAll: false,
    highlight: null,
    playFrom: vi.fn(),
    stop: vi.fn(),
    setRate: vi.fn(),
  }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("charWeights", () => {
  it("Han=1, số/latin=1.5, dấu câu=0.2", () => {
    expect(charWeight("你")).toBe(1);
    expect(charWeight("a")).toBe(1.5);
    expect(charWeight("5")).toBe(1.5);
    expect(charWeight("。")).toBe(0.2);
    expect(charWeight("，")).toBe(0.2);
    expect(charWeights("你好a5。")).toEqual([1, 1, 1.5, 1.5, 0.2]);
  });

  it("charPosFromTime: cumulative weight map t → vị trí ký tự", () => {
    // "你好。" → acc: 1, 2, 2.2
    expect(charPosFromTime("你好。", 0)).toBe(0);
    expect(charPosFromTime("你好。", 0.5)).toBe(0);
    expect(charPosFromTime("你好。", 1.2)).toBe(1);
    expect(charPosFromTime("你好。", 2.1)).toBe(2); // vào dấu câu
    expect(charPosFromTime("你好。", 99)).toBe(2); // kẹt cuối
  });
});

describe("useReadingPlayer — MP3 mode", () => {
  it("toggle: tạo audio từ audio URL đầy đủ + play", () => {
    const { make, created } = makeFactory();
    const { result } = renderHook(() => useReadingPlayer(sents, make));
    expect(result.current.hasAudio).toBe(true);
    expect(result.current.playing).toBe(false);
    act(() => result.current.toggle());
    expect(make).toHaveBeenCalledWith("https://x/1.mp3");
    expect(created[0].play).toHaveBeenCalled();
    expect(result.current.playing).toBe(true);
    act(() => result.current.toggle());
    expect(created[0].pause).toHaveBeenCalled();
    expect(result.current.playing).toBe(false);
  });

  it("onended không loop → sang câu kế, play câu mới", () => {
    const { make, created } = makeFactory();
    const { result } = renderHook(() => useReadingPlayer(sents, make));
    act(() => result.current.toggle());
    act(() => fire(created[0], "ended"));
    expect(result.current.curIdx).toBe(1);
    expect(created[1].play).toHaveBeenCalled();
    expect(created[0].pause).toHaveBeenCalled();
  });

  it("loopSentence bật → onended replay câu, KHÔNG next", () => {
    const { make, created } = makeFactory();
    const { result } = renderHook(() => useReadingPlayer(sents, make));
    act(() => result.current.toggle());
    act(() => result.current.setLoopSentence(true));
    const plays = created[0].play.mock.calls.length;
    act(() => fire(created[0], "ended"));
    expect(result.current.curIdx).toBe(0);
    expect(created[0].currentTime).toBe(0);
    expect(created[0].play.mock.calls.length).toBeGreaterThan(plays);
  });

  it("hết list → stop", () => {
    const { make, created } = makeFactory();
    const { result } = renderHook(() => useReadingPlayer(sents, make));
    act(() => result.current.toggle());
    act(() => result.current.next());
    act(() => fire(created[1], "ended"));
    expect(result.current.playing).toBe(false);
    expect(result.current.curIdx).toBe(1);
  });

  it("setRate áp playbackRate vào audio hiện tại và audio tạo sau này", () => {
    const { make, created } = makeFactory();
    const { result } = renderHook(() => useReadingPlayer(sents, make));
    act(() => result.current.toggle());
    act(() => result.current.setRate(1.5));
    expect(created[0].playbackRate).toBe(1.5);
    expect(result.current.rate).toBe(1.5);
    // audio tạo sau (seekSentence sang câu 2) cũng nhận rate
    act(() => result.current.seekSentence(1));
    expect(created[1].playbackRate).toBe(1.5);
  });

  it("seekGlobal map đúng câu + offset, pause thì không play", () => {
    const { make, created } = makeFactory();
    const { result } = renderHook(() => useReadingPlayer(sents, make));
    act(() => result.current.seekGlobal(7)); // offsets [0, 4] → câu 1, local 3s
    expect(result.current.curIdx).toBe(1);
    expect(result.current.curTime).toBe(7);
    const stub2 = created.find((s) => s.src === "https://x/2.mp3");
    expect(stub2).toBeDefined();
    expect(stub2!.currentTime).toBe(3);
    expect(result.current.playing).toBe(false);
    expect(stub2!.play).not.toHaveBeenCalled();
    expect(result.current.charPos).toEqual({ row: 1, char: charPosFromTime(sents[1].zh, 3) });
  });

  it("tick curTime bằng setInterval: curTime = currentTime + offset, charPos theo trọng số", () => {
    vi.useFakeTimers();
    const { make, created } = makeFactory();
    const { result } = renderHook(() => useReadingPlayer(sents, make));
    act(() => result.current.toggle());
    created[0].currentTime = 2;
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.curTime).toBe(2); // offset câu 0 = 0
    expect(result.current.charPos).toEqual({ row: 0, char: charPosFromTime(sents[0].zh, 2) });
  });

  it("duration = Σ durSec, làm tròn 1 chữ số", () => {
    const { make } = makeFactory();
    const { result } = renderHook(() => useReadingPlayer(sents, make));
    expect(result.current.duration).toBe(10);
  });

  it("unmount → pause mọi audio", () => {
    const { make, created } = makeFactory();
    const { result, unmount } = renderHook(() => useReadingPlayer(sents, make));
    act(() => result.current.toggle());
    act(() => result.current.seekSentence(1));
    unmount();
    expect(created[0].pause).toHaveBeenCalled();
    expect(created[1].pause).toHaveBeenCalled();
  });
});

describe("useReadingPlayer — fallback TTS (audio null)", () => {
  const ttsSents: PlayerSentence[] = [
    { zh: "你好。", py: null, vi: "Xin chào.", audio: null, durSec: 0 },
    { zh: "再见。", py: null, vi: "Tạm biệt.", audio: null, durSec: 0 },
  ];

  it("hasAudio=false, delegate toggle/next/seekSentence sang useKaraoke", () => {
    const playFrom = vi.fn();
    const stop = vi.fn();
    karaokeMock.useKaraoke.mockImplementation(() => ({
      activeIdx: -1,
      playingAll: false,
      highlight: null,
      playFrom,
      stop,
      setRate: vi.fn(),
    }));
    const { make, created } = makeFactory();
    const { result } = renderHook(() => useReadingPlayer(ttsSents, make));
    expect(result.current.hasAudio).toBe(false);
    expect(result.current.playing).toBe(false);
    expect(result.current.curIdx).toBe(0);

    act(() => result.current.toggle());
    expect(playFrom).toHaveBeenCalledWith(0, true);
    expect(make).not.toHaveBeenCalled(); // không tạo Audio
    expect(created).toHaveLength(0);

    act(() => result.current.next());
    expect(playFrom).toHaveBeenLastCalledWith(1, true);

    act(() => result.current.seekSentence(0));
    expect(playFrom).toHaveBeenLastCalledWith(0, true);
  });

  it("đang playing → toggle gọi stop; setRate dispatch sang karaoke", () => {
    const playFrom = vi.fn();
    const stop = vi.fn();
    const kSetRate = vi.fn();
    karaokeMock.useKaraoke.mockImplementation(() => ({
      activeIdx: 1,
      playingAll: true,
      highlight: { row: 1, char: 2 },
      playFrom,
      stop,
      setRate: kSetRate,
    }));
    const { result } = renderHook(() => useReadingPlayer(ttsSents, stubMakeAudio));
    act(() => result.current.toggle());
    expect(stop).toHaveBeenCalled();
    expect(result.current.playing).toBe(true);
    expect(result.current.curIdx).toBe(1);
    expect(result.current.charPos).toEqual({ row: 1, char: 2 });
    act(() => result.current.setRate(1.25));
    expect(kSetRate).toHaveBeenCalledWith(1.25);
    expect(result.current.rate).toBe(1.25);
  });

  it("seekGlobal no-op; duration: durSec 0 hết → ước lượng n*4", () => {
    const { result } = renderHook(() => useReadingPlayer(ttsSents, stubMakeAudio));
    expect(() => act(() => result.current.seekGlobal(5))).not.toThrow();
    expect(result.current.duration).toBe(8); // 2 câu × 4s
  });
});
