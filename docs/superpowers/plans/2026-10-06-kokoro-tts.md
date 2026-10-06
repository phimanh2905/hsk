# Kokoro TTS on-device Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay ruột TTS tiếng Trung của app-next bằng Kokoro-82M-v1.1-zh chạy on-device (WebGPU fp16 → WASM q8 → speechSynthesis), giữ nguyên API `useTts` cho ~25 component.

**Architecture:** Engine abstraction 3 tầng trong `src/lib/tts/`: orchestrator singleton chọn tầng theo capability + localStorage, engine Kokoro bọc fork `@uzen/kokoro-js` (G2P misaki zh bằng JS), engine webspeech tách từ hook cũ làm tầng cuối. Model fetch từ HuggingFace, browser tự cache qua Cache API. UI: dialog hỏi-tải-model lần đầu + nhóm cài đặt mới trong SettingsModal.

**Tech Stack:** Next.js 16 (App Router, React 19), `@uzen/kokoro-js@1.2.4` (phụ thuộc `@huggingface/transformers` ^4), vitest + @testing-library/react (jsdom), pnpm.

**Spec:** `docs/superpowers/specs/2026-10-06-kokoro-tts-design.md`

## Global Constraints

- Model KHÔNG bundle vào app: chỉ fetch runtime từ `onnx-community/Kokoro-82M-v1.1-zh-ONNX` trên HuggingFace; `@uzen/kokoro-js` + `@huggingface/transformers` phải load bằng dynamic `import()` (spec §9).
- Không được làm vỡ 25+ component đang dùng `useTts` — API công khai `speak/cancel/speaking` giữ nguyên; test cũ `src/lib/tts/__tests__/use-tts.test.ts` phải vẫn pass (trừ phần được thay thế trong Task 8).
- Không tải ngầm model: lần đầu phải hỏi user, câu trả lời lưu `localStorage("bye.tts.engine")` (spec §6).
- iOS Safari KHÔNG được đề nghị Kokoro — webspeech luôn (spec §8).
- Karaoke (`src/components/reading/karaoke.tsx`) KHÔNG đụng tới ở plan này.
- Repo có sẵn ~83 test file fail từ trước (memory 2026-10-06) — thành công của plan là: test của `src/lib/tts/` + `src/components/shell/` pass, số file fail không tăng.
- Mọi key localStorage mới dùng prefix `bye.` (quy ước hiện có).
- Lệnh chạy trong `app-next/`: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm dev` (port 3100).
- Comment trong code viết tiếng Việt, theo phong cách hiện có (giải thích constraint, không tường thuật cái mình vừa viết).

## File Structure

```
app-next/
  public/kokoro/voices/
    zf_001.bin                    (vendor 512KB, curl từ HF)
    zm_009.bin                    (vendor 512KB, curl từ HF)
  src/lib/tts/
    types.ts                      (Create — TtsSpeakOptions dùng chung)
    config.ts                     (Create — key localStorage, model/voice/tier constants)
    capability.ts                 (Create — detect WebGPU → chọn tier)
    playback.ts                   (Create — phát Float32Array qua AudioBufferSourceNode)
    webspeech-engine.ts           (Create — tách logic speechSynthesis từ use-tts.ts)
    kokoro-engine.ts              (Create — bọc @uzen/kokoro-js)
    engine.ts                     (Create — orchestrator singleton 3 tầng)
    use-tts.ts                    (Modify — rewrite mỏng, giữ API)
    __tests__/
      config.test.ts              (Create)
      capability.test.ts          (Create)
      playback.test.ts            (Create)
      webspeech-engine.test.ts    (Create)
      kokoro-engine.test.ts       (Create)
      engine.test.ts              (Create)
      use-tts.test.ts             (Modify — thêm case routing kokoro)
  src/components/shell/
    tts-consent-dialog.tsx        (Create — dialog hỏi tải model + progress)
    settings-modal.tsx            (Modify — thêm nhóm "Engine đọc tiếng Trung")
    __tests__/
      tts-consent-dialog.test.tsx (Create)
      settings-modal.test.tsx     (Modify nếu đã tồn tại, ngược lại Create phần TTS)
  src/app/layout.tsx              (Modify — mount TtsConsentDialog cạnh SettingsModal)
```

---

### Task 0: Baseline

**Files:** không tạo file nào (chỉ ghi nhận trạng thái).

- [ ] **Step 1: Ghi baseline test/lint/typecheck**

```bash
cd app-next
pnpm typecheck 2>&1 | tail -5
pnpm test 2>&1 | tail -15   # ghi lại số test file fail sẵn (kỳ vọng ~83)
```

Ghi hai con số này vào phần mô tả của PR/commit đầu tiên để so sánh ở Task 10.

---

### Task 1: Cài dependency + kiểm tra types

**Files:**
- Modify: `app-next/package.json` (thêm `@uzen/kokoro-js`)
- Create (chỉ khi package không có types): `app-next/src/types/uzen-kokoro-js.d.ts`

**Interfaces:**
- Produces: module `@uzen/kokoro-js` dùng được với API `KokoroTTS.from_pretrained(model_id, { dtype, device, voicePath, progress_callback })` → `{ generate(text, { voice, speed }): Promise<RawAudio> }`, `RawAudio = { audio: Float32Array; sampling_rate: number }`.

- [ ] **Step 1: Cài với version pin chính xác (fork non trẻ — không dùng `^`)**

```bash
cd app-next
pnpm add --save-exact @uzen/kokoro-js@1.2.4
```

- [ ] **Step 2: Kiểm tra cách fork resolve voicePath (quyết định `KOKORO_VOICE_PATH` ở Task 2)**

```bash
grep -rn "voicePath" node_modules/@uzen/kokoro-js/dist/ | head -5
```

Ghi lại cách nó nối URL (kỳ vọng `${voicePath}/${voice}.bin`). Nếu nó yêu cầu đường dẫn khác (ví dụ cần dấu `/` cuối), điều chỉnh `KOKORO_VOICE_PATH` ở Task 2 cho khớp.

- [ ] **Step 3: Kiểm tra package có types không**

```bash
node -e "const p=require('./node_modules/@uzen/kokoro-js/package.json'); console.log(p.types ?? p.typings ?? 'NO_TYPES')"
```

Nếu in ra `NO_TYPES`, tạo `src/types/uzen-kokoro-js.d.ts`:

```ts
/* Shim types cho @uzen/kokoro-js (fork chưa kèm .d.ts). Chỉ khai báo phần ta dùng. */
declare module "@uzen/kokoro-js" {
  export interface RawAudio {
    audio: Float32Array;
    sampling_rate: number;
  }
  export interface KokoroTTSLike {
    generate(
      text: string,
      opts: { voice: string; speed?: number }
    ): Promise<RawAudio>;
  }
  export interface PretrainedProgress {
    status?: string;
    loaded?: number;
    total?: number;
  }
  export const KokoroTTS: {
    from_pretrained(
      model_id: string,
      opts: {
        dtype?: "fp32" | "fp16" | "q8" | "q4" | "q4f16";
        device?: "wasm" | "webgpu" | "cpu";
        voicePath?: string;
        progress_callback?: (p: PretrainedProgress) => void;
      }
    ): Promise<KokoroTTSLike>;
  };
}
```

- [ ] **Step 4: Typecheck sạch**

Run: `pnpm typecheck`
Expected: không có lỗi mới so với baseline Task 0.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git add src/types/uzen-kokoro-js.d.ts   # nếu đã tạo
git commit -m "Add pinned @uzen/kokoro-js 1.2.4 for on-device Mandarin TTS"
```

---

### Task 2: `config.ts` — constants + localStorage + iOS detect

**Files:**
- Create: `app-next/src/lib/tts/config.ts`
- Test: `app-next/src/lib/tts/__tests__/config.test.ts`

**Interfaces:**
- Produces (các task sau dùng đúng tên này):
  - `TTS_ENGINE_KEY = "bye.tts.engine"`
  - `type TtsTier = "webgpu-fp16" | "wasm-q8"`
  - `KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.1-zh-ONNX"`
  - `KOKORO_VOICE_PATH = "/kokoro/voices"`
  - `TIER_CONFIG: Record<TtsTier, { dtype: "fp16" | "q8"; device: "webgpu" | "wasm"; label: string }>`
  - `type VoicePref = "female" | "male"`; `VOICE_BY_PREF: { female: "zf_001"; male: "zm_009" }`
  - `getVoicePref(): VoicePref` (đọc `bye.voice`, mặc định female)
  - `getEngineChoice(): "kokoro" | "system" | null` (null = auto — chưa hỏi)
  - `setEngineChoice(choice: "kokoro" | "system" | null): void` (null = xóa key, quay về auto)
  - `isIosSafari(): boolean`

- [ ] **Step 1: Viết test fail trước**

Tạo `src/lib/tts/__tests__/config.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
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
```

Lưu ý: file dùng `vi` global (vitest `globals: true` đã bật trong `vitest.config.ts`), nhưng thêm import rõ ràng cho chắc: sửa dòng import đầu thành `import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";` (đã dùng trong các test hiện có).

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `pnpm vitest run src/lib/tts/__tests__/config.test.ts`
Expected: FAIL — không resolve được `../config`.

- [ ] **Step 3: Viết `src/lib/tts/config.ts`**

```ts
/* Cấu hình TTS Kokoro — spec docs/superpowers/specs/2026-10-06-kokoro-tts-design.md
   Model không bundle: fetch runtime từ HuggingFace, browser tự cache (Cache API). */

export const TTS_ENGINE_KEY = "bye.tts.engine";
export type TtsTier = "webgpu-fp16" | "wasm-q8";

export const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.1-zh-ONNX";
/* Voice .bin (512KB/voice) tự host trong public/ để không phụ thuộc resolve URL của HF.
   Có đúng 2 voice được dùng nên tổng ~1MB. */
export const KOKORO_VOICE_PATH = "/kokoro/voices";

export const TIER_CONFIG: Record<
  TtsTier,
  { dtype: "fp16" | "q8"; device: "webgpu" | "wasm"; label: string }
> = {
  "webgpu-fp16": { dtype: "fp16", device: "webgpu", label: "WebGPU" },
  "wasm-q8": { dtype: "q8", device: "wasm", label: "WASM/CPU" },
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
   đề nghị Kokoro trên thiết bị này (spec §8). iPadOS giả Macintosh có touch. */
export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iP(hone|od|ad)/.test(ua) ||
    (/Macintosh/.test(ua) && "ontouchend" in document)
  );
}
```

- [ ] **Step 4: Chạy test pass**

Run: `pnpm vitest run src/lib/tts/__tests__/config.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tts/config.ts src/lib/tts/__tests__/config.test.ts
git commit -m "Add TTS config module (engine key, Kokoro model/voice constants, iOS detect)"
```

---

### Task 3: `capability.ts` — detect WebGPU, chọn tier

**Files:**
- Create: `app-next/src/lib/tts/capability.ts`
- Test: `app-next/src/lib/tts/__tests__/capability.test.ts`

**Interfaces:**
- Consumes: `isIosSafari`, `TtsTier` từ `./config`.
- Produces: `type TtsCapability = TtsTier | "webspeech"`; `detectCapability(): Promise<TtsCapability>` — iOS → `"webspeech"`; không có `navigator.gpu` hoặc adapter fail → `"wasm-q8"`; adapter OK → `"webgpu-fp16"`.

- [ ] **Step 1: Test fail trước**

`src/lib/tts/__tests__/capability.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { detectCapability } from "../capability";

const setGpu = (gpu: unknown) => {
  vi.stubGlobal("navigator", { ...navigator, gpu, userAgent: navigator.userAgent });
};
const setUa = (ua: string) => {
  vi.stubGlobal("navigator", { ...navigator, userAgent: ua });
};

beforeEach(() => afterEach(() => vi.unstubAllGlobals()));

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
    setGpu({ requestAdapter: async () => { throw new Error("GPU crash"); } });
    await expect(detectCapability()).resolves.toBe("wasm-q8");
  });
});
```

- [ ] **Step 2: Chạy xác nhận fail**

Run: `pnpm vitest run src/lib/tts/__tests__/capability.test.ts`
Expected: FAIL — không resolve được `../capability`.

- [ ] **Step 3: Viết `src/lib/tts/capability.ts`**

```ts
import { isIosSafari, type TtsTier } from "./config";

export type TtsCapability = TtsTier | "webspeech";

interface GpuLike {
  requestAdapter(): Promise<unknown>;
}

/* requestAdapter() chứ không chỉ kiểm navigator.gpu: trình duyệt có thể expose
   gpu nhưng driver lỗi -> adapter null. Lỗi thì hạ xuống wasm, không nổ. */
export async function detectCapability(): Promise<TtsCapability> {
  if (isIosSafari()) return "webspeech";
  const gpu = (navigator as Navigator & { gpu?: GpuLike }).gpu;
  if (!gpu) return "wasm-q8";
  try {
    const adapter = await gpu.requestAdapter();
    return adapter ? "webgpu-fp16" : "wasm-q8";
  } catch {
    return "wasm-q8";
  }
}
```

- [ ] **Step 4: Chạy pass**

Run: `pnpm vitest run src/lib/tts/__tests__/capability.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tts/capability.ts src/lib/tts/__tests__/capability.test.ts
git commit -m "Add TTS capability detection (WebGPU adapter probe, tier selection)"
```

---

### Task 4: `playback.ts` — phát Float32Array 24kHz

**Files:**
- Create: `app-next/src/lib/tts/playback.ts`
- Test: `app-next/src/lib/tts/__tests__/playback.test.ts`

**Interfaces:**
- Produces: `playSamples(samples: Float32Array, sampleRate?: number, onEnded?: () => void): void`; `stopPlayback(): void`. `stopPlayback` phải nuốt `onEnded` của lần phát đang dừng (cancel không được tính là phát xong).

- [ ] **Step 1: Test fail trước**

`src/lib/tts/__tests__/playback.test.ts`:

```ts
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
  let bufferCopied: Float32Array | null = null;
  const FakeAudioContext = vi.fn().mockImplementation(() => ({
    state: "running",
    resume: vi.fn(async () => {}),
    destination: {},
    createBuffer: vi.fn(() => ({
      copyToChannel: vi.fn((data: Float32Array) => {
        bufferCopied = data;
      }),
    })),
    createBufferSource: vi.fn(() => {
      // mỗi lần phát là 1 node mới, nhưng test chỉ cần node gần nhất
      return (source = makeSourceNode());
    }),
    __copied: () => bufferCopied,
  }));
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
    const SuspendedContext = vi.fn().mockImplementation(() => ({
      state: "suspended",
      resume,
      destination: {},
      createBuffer: vi.fn(() => ({ copyToChannel: vi.fn() })),
      createBufferSource: vi.fn(() => makeSourceNode()),
    }));
    vi.stubGlobal("AudioContext", SuspendedContext);
    playSamples(new Float32Array(10), 24000);
    expect(resume).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Chạy xác nhận fail**

Run: `pnpm vitest run src/lib/tts/__tests__/playback.test.ts`
Expected: FAIL — không resolve được `../playback`.

- [ ] **Step 3: Viết `src/lib/tts/playback.ts`**

```ts
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
```

- [ ] **Step 4: Chạy pass**

Run: `pnpm vitest run src/lib/tts/__tests__/playback.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tts/playback.ts src/lib/tts/__tests__/playback.test.ts
git commit -m "Add audio playback for Kokoro samples (AudioBufferSourceNode)"
```

---

### Task 5: Tách `webspeech-engine.ts` từ `use-tts.ts` (refactor thuần)

**Files:**
- Create: `app-next/src/lib/tts/types.ts`, `app-next/src/lib/tts/webspeech-engine.ts`
- Modify: `app-next/src/lib/tts/use-tts.ts` (rewrite mỏng, giữ API)
- Test: `app-next/src/lib/tts/__tests__/webspeech-engine.test.ts` (Create); `__tests__/use-tts.test.ts` (KHÔNG sửa — phải pass nguyên vẹn)

**Interfaces:**
- Produces:
  - `src/lib/tts/types.ts`: `interface TtsSpeakOptions { lang?: "zh-CN" | "vi-VN"; rate?: number; onEnd?: () => void }`
  - `webspeech-engine.ts`: `chunkText(text: string): string[]`; `type WebspeechEngine = { speak(text: string, opts?: TtsSpeakOptions): void; cancel(): void; dispose(): void }`; `createWebspeechEngine(onSpeakingChange: (speaking: boolean) => void): WebspeechEngine`

**Yêu cầu hành vi:** logic bên trong `createWebspeechEngine` phải là **port nguyên văn** của `use-tts.ts` hiện tại (chunk 200 ký tự tại `。/，`, pickVoice theo `bye.voice` + cache voiceschanged, cancel có điều kiện tránh iOS nuốt utterance, không retry setTimeout). Chỉ thay `setSpeaking` bằng callback `onSpeakingChange`.

- [ ] **Step 1: Viết `src/lib/tts/types.ts` (không cần test riêng — chỉ là type)**

```ts
/* Option chung cho mọi TTS engine — khớp signature speak() cũ của useTts. */
export interface TtsSpeakOptions {
  lang?: "zh-CN" | "vi-VN";
  rate?: number;
  onEnd?: () => void;
}
```

- [ ] **Step 2: Viết test cho webspeech engine**

`src/lib/tts/__tests__/webspeech-engine.test.ts` — port các assertion chính của `use-tts.test.ts` sang dạng engine (không qua React):

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createWebspeechEngine, chunkText } from "../webspeech-engine";

const utterances = () =>
  (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls.map(
    (c) => (c[0] as SpeechSynthesisUtterance).text
  );

beforeEach(() => {
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      text: string;
      lang = "";
      rate = 1;
      voice: SpeechSynthesisVoice | null = null;
      onend: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
  );
  vi.stubGlobal("speechSynthesis", {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => [
      { name: "Tingting", lang: "zh-CN" },
      { name: "Male-ZH", lang: "zh-CN" },
    ]),
    speaking: false,
    pending: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

afterEach(() => {
  localStorage.removeItem("bye.voice");
  vi.unstubAllGlobals();
});

describe("chunkText", () => {
  it("câu ngắn -> 1 chunk", () => {
    expect(chunkText("你好")).toEqual(["你好"]);
  });
  it("cắt tại dấu 。/， gần 200 nhất, không vượt 200", () => {
    const text = "好".repeat(150) + "。" + "你".repeat(150);
    const chunks = chunkText(text);
    expect(chunks.length).toBe(2);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(200);
  });
});

describe("createWebspeechEngine", () => {
  const speakingEvents = () =>
    (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls.length;

  it("speak -> phát utterance, báo speaking=true; onend -> false + onEnd callback", () => {
    const changes: boolean[] = [];
    const onEnd = vi.fn();
    const engine = createWebspeechEngine((s) => changes.push(s));
    engine.speak("你好", { onEnd });
    expect(changes).toEqual([true]);
    const u = (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
    u.onend?.();
    expect(changes).toEqual([true, false]);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("voice female mặc định -> Tingting; male -> Male-ZH", () => {
    const engine = createWebspeechEngine(() => {});
    engine.speak("你好");
    const picked = () =>
      (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0].voice?.name;
    expect(picked()).toBe("Tingting");
    localStorage.setItem("bye.voice", "male");
    engine.speak("再见");
    expect(picked()).toBe("Male-ZH");
  });

  it("cancel -> speechSynthesis.cancel + báo speaking=false", () => {
    const changes: boolean[] = [];
    const engine = createWebspeechEngine((s) => changes.push(s));
    engine.speak("你好");
    engine.cancel();
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    expect(changes.at(-1)).toBe(false);
  });

  it("đang phát (synth.speaking) mà speak -> cancel trước khi phát", () => {
    (window.speechSynthesis as unknown as { speaking: boolean }).speaking = true;
    const engine = createWebspeechEngine(() => {});
    engine.speak("你好");
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    expect(utterances()).toEqual(["你好"]);
  });

  it("câu dài -> nhiều utterance, chỉ chunk cuối gắn onend", () => {
    const onEnd = vi.fn();
    const engine = createWebspeechEngine(() => {});
    engine.speak("好".repeat(450), { onEnd });
    const calls = (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(3);
    expect((calls[0][0] as SpeechSynthesisUtterance).onend).toBeNull();
    expect((calls.at(-1)![0] as SpeechSynthesisUtterance).onend).not.toBeNull();
  });

  it("onerror cũng kết thúc (báo false + onEnd)", () => {
    const changes: boolean[] = [];
    const onEnd = vi.fn();
    const engine = createWebspeechEngine((s) => changes.push(s));
    engine.speak("你好", { onEnd });
    const u = (window.speechSynthesis.speak as ReturnType<typeof vi.fn>).mock.calls[0][0];
    u.onerror?.(new Event("error"));
    expect(changes.at(-1)).toBe(false);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("dispose -> gỡ listener voiceschanged + cancel", () => {
    const engine = createWebspeechEngine(() => {});
    engine.dispose();
    expect(synthSynth().removeEventListener).toHaveBeenCalledWith("voiceschanged", expect.any(Function));
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });
});

const synthSynth = () => window.speechSynthesis as unknown as Record<string, ReturnType<typeof vi.fn>>;
```

- [ ] **Step 3: Chạy xác nhận fail**

Run: `pnpm vitest run src/lib/tts/__tests__/webspeech-engine.test.ts`
Expected: FAIL — chưa có `../webspeech-engine`.

- [ ] **Step 4: Viết `src/lib/tts/webspeech-engine.ts` — port nguyên văn logic cũ**

```ts
"use client";
/* Engine speechSynthesis (Web Speech API) — tầng cuối của chuỗi fallback.
   Port nguyên văn logic use-tts.ts cũ: chunk 200, pickVoice theo bye.voice,
   cancel có điều kiện (iOS nuốt utterance), không retry setTimeout (mất gesture). */
import type { TtsSpeakOptions } from "./types";

const CHUNK = 200;

export function chunkText(text: string): string[] {
  if (text.length <= CHUNK) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > 0) {
    let cut = Math.min(CHUNK, rest.length);
    const dot = rest.lastIndexOf("。", cut);
    const comma = rest.lastIndexOf("，", cut);
    const brk = Math.max(dot, comma);
    if (brk > 0) cut = brk + 1;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  return parts;
}

export interface WebspeechEngine {
  speak(text: string, opts?: TtsSpeakOptions): void;
  cancel(): void;
  dispose(): void;
}

export function createWebspeechEngine(
  onSpeakingChange: (speaking: boolean) => void
): WebspeechEngine {
  const voicesCache: SpeechSynthesisVoice[] = [];
  const synth = () => window.speechSynthesis;

  /* iOS/Safari nạp voice bất đồng bộ — nhớ danh sách voice zh mỗi khi báo sẵn sàng. */
  const cache = () => {
    voicesCache.length = 0;
    voicesCache.push(...synth().getVoices().filter((v) => /^zh/i.test(v.lang)));
  };
  cache();
  synth().addEventListener?.("voiceschanged", cache);

  const pickVoice = (lang: string): SpeechSynthesisVoice | null => {
    let pref: string | null = null;
    try {
      pref = localStorage.getItem("bye.voice");
    } catch {
      pref = null;
    }
    const voicePref = pref || "female";
    const zh = synth().getVoices().filter((v) => /^zh/i.test(v.lang));
    const voices = zh.length ? zh : voicesCache;
    const re = voicePref === "male" ? /male|daniel|tington/i : /female|mei|tingting|hui/i;
    return voices.find((v) => re.test(v.name)) ?? voices[0] ?? null;
  };

  return {
    speak(text, opts) {
      const lang = opts?.lang ?? "zh-CN";
      const rate = opts?.rate ?? 1;
      const voice = pickVoice(lang);
      const chunks = chunkText(text);
      /* Chỉ cancel khi thật sự đang phát — iOS Safari nuốt utterance nếu cancel()
         gọi liền speak() trong cùng một tick. */
      if (synth().speaking || synth().pending) synth().cancel();
      onSpeakingChange(true);
      const finish = () => {
        onSpeakingChange(false);
        opts?.onEnd?.();
      };
      chunks.forEach((t, i) => {
        const u = new SpeechSynthesisUtterance(t);
        u.lang = lang;
        u.rate = rate;
        if (voice && lang.startsWith("zh")) u.voice = voice;
        if (i === chunks.length - 1) {
          u.onend = finish;
          u.onerror = finish;
        }
        synth().speak(u);
      });
    },
    cancel() {
      synth().cancel();
      onSpeakingChange(false);
    },
    dispose() {
      synth().removeEventListener?.("voiceschanged", cache);
      this.cancel();
    },
  };
}
```

- [ ] **Step 5: Rewrite `use-tts.ts` mỏng (API giữ nguyên)**

```ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createWebspeechEngine, type WebspeechEngine } from "./webspeech-engine";
import type { TtsSpeakOptions } from "./types";

export type TtsOptions = TtsSpeakOptions;

export function useTts() {
  const [speaking, setSpeaking] = useState(false);
  const engineRef = useRef<WebspeechEngine | null>(null);
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => {
    const engine = createWebspeechEngine(setSpeaking);
    engineRef.current = engine;
    cancelRef.current = () => engine.cancel();
    return () => engine.dispose();
  }, []);

  const cancel = useCallback(() => cancelRef.current(), []);

  const speak = useCallback((text: string, opts?: TtsSpeakOptions) => {
    engineRef.current?.speak(text, opts);
  }, []);

  return { speak, cancel, speaking };
}
```

- [ ] **Step 6: Chạy test cũ + test mới — cả hai phải pass**

```bash
pnpm vitest run src/lib/tts/__tests__/webspeech-engine.test.ts src/lib/tts/__tests__/use-tts.test.ts
```

Expected: PASS toàn bộ. Nếu `use-tts.test.ts` có case fail, sửa **webspeech-engine.ts** (không sửa test cũ) cho khớp hành vi gốc.

- [ ] **Step 7: Typecheck + commit**

```bash
pnpm typecheck
git add src/lib/tts/types.ts src/lib/tts/webspeech-engine.ts src/lib/tts/use-tts.ts src/lib/tts/__tests__/webspeech-engine.test.ts
git commit -m "Extract webspeech engine from useTts hook (behavior-preserving refactor)"
```

---

### Task 6: `kokoro-engine.ts` + vendor voice .bin

**Files:**
- Create: `app-next/public/kokoro/voices/zf_001.bin`, `app-next/public/kokoro/voices/zm_009.bin`
- Create: `app-next/src/lib/tts/kokoro-engine.ts`
- Test: `app-next/src/lib/tts/__tests__/kokoro-engine.test.ts`

**Interfaces:**
- Consumes: `KOKORO_MODEL_ID`, `KOKORO_VOICE_PATH`, `TIER_CONFIG`, `VOICE_BY_PREF`, `getVoicePref`, `TtsTier` (Task 2); `chunkText` (Task 5); `playSamples`, `stopPlayback` (Task 4); module `@uzen/kokoro-js` (Task 1).
- Produces:
  - `type DownloadProgress = { received: number; total: number }`
  - `type KokoroEngine = { readonly tier: TtsTier; speak(text: string, opts?: TtsSpeakOptions): Promise<void>; cancel(): void }`
  - `createKokoroEngine(tier: TtsTier, onProgress?: (p: DownloadProgress) => void): Promise<KokoroEngine>`

- [ ] **Step 1: Vendor 2 voice .bin (chỉ 2 voice được dùng — ~1MB)**

```bash
mkdir -p app-next/public/kokoro/voices
curl -sL -o app-next/public/kokoro/voices/zf_001.bin \
  "https://huggingface.co/onnx-community/Kokoro-82M-v1.1-zh-ONNX/resolve/main/voices/zf_001.bin"
curl -sL -o app-next/public/kokoro/voices/zm_009.bin \
  "https://huggingface.co/onnx-community/Kokoro-82M-v1.1-zh-ONNX/resolve/main/voices/zm_009.bin"
ls -la app-next/public/kokoro/voices/
```

Expected: mỗi file 522240 bytes. Nếu lệch, kiểm tra URL/network trước khi đi tiếp.

- [ ] **Step 2: Test fail trước**

`src/lib/tts/__tests__/kokoro-engine.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createKokoroEngine } from "../kokoro-engine";

/* Fake module @uzen/kokoro-js: from_pretrained ghi nhận opts, generate trả
   RawAudio giả (100 samples, 24kHz). */
const fromPretrained = vi.fn();
const generate = vi.fn();
vi.mock("@uzen/kokoro-js", () => ({
  KokoroTTS: {
    from_pretrained: (...args: unknown[]) => fromPretrained(...args),
  },
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
    (_samples: Float32Array, _rate: number, onEnded?: () => void) => onEnded?.()
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
    fromPretrained.mockImplementation(async (_id, opts) => {
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
      () => new Promise((res) => { resolveFirst = res; })
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
```

- [ ] **Step 3: Chạy xác nhận fail**

Run: `pnpm vitest run src/lib/tts/__tests__/kokoro-engine.test.ts`
Expected: FAIL — chưa có `../kokoro-engine`.

- [ ] **Step 4: Viết `src/lib/tts/kokoro-engine.ts`**

```ts
"use client";
/* Engine Kokoro-82M-v1.1-zh qua fork @uzen/kokoro-js — G2P misaki zh bằng JS
   (tone sandhi 一/不/sandhi-3, đa âm tự, erhua). Model fetch từ HuggingFace,
   browser cache bằng Cache API; voice .bin tự host (public/kokoro/voices).
   Toàn bộ lib ML nạp bằng dynamic import — không được vào bundle chính (spec §9). */
import {
  KOKORO_MODEL_ID,
  KOKORO_VOICE_PATH,
  TIER_CONFIG,
  VOICE_BY_PREF,
  getVoicePref,
  type TtsTier,
} from "./config";
import { chunkText } from "./webspeech-engine";
import { playSamples, stopPlayback } from "./playback";
import type { TtsSpeakOptions } from "./types";

export interface DownloadProgress {
  received: number;
  total: number;
}

export interface KokoroEngine {
  readonly tier: TtsTier;
  speak(text: string, opts?: TtsSpeakOptions): Promise<void>;
  cancel(): void;
}

interface RawAudioLike {
  audio: Float32Array;
  sampling_rate: number;
}

interface KokoroTtsLike {
  generate(text: string, opts: { voice: string; speed?: number }): Promise<RawAudioLike>;
}

export async function createKokoroEngine(
  tier: TtsTier,
  onProgress?: (p: DownloadProgress) => void
): Promise<KokoroEngine> {
  const { KokoroTTS } = await import("@uzen/kokoro-js");
  const cfg = TIER_CONFIG[tier];
  const tts = (await KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
    dtype: cfg.dtype,
    device: cfg.device,
    voicePath: KOKORO_VOICE_PATH,
    progress_callback: (p: { status?: string; loaded?: number; total?: number }) => {
      /* transformers.js báo nhiều status (init/download/progress/done) —
         chỉ status "progress" có cặp loaded/total đáng tin. */
      if (p.status === "progress" && p.total) {
        onProgress?.({ received: p.loaded ?? 0, total: p.total });
      }
    },
  })) as KokoroTtsLike;

  /* runId thay boolean: speak() mới tự hủy run cũ (bấm loa liên tiếp), và
     cancel() không thể bị "hồi sinh" bởi speak() đang treo ở await. */
  let runId = 0;

  return {
    tier,
    cancel() {
      runId++;
      stopPlayback();
    },
    async speak(text, opts) {
      const id = ++runId;
      const voice = VOICE_BY_PREF[getVoicePref()];
      const speed = opts?.rate ?? 1;
      for (const chunk of chunkText(text)) {
        if (id !== runId) return;
        const audio = await tts.generate(chunk, { voice, speed });
        if (id !== runId) return;
        await new Promise<void>((resolve) => {
          playSamples(audio.audio, audio.sampling_rate, () => resolve());
        });
      }
      if (id === runId) opts?.onEnd?.();
    },
  };
}
```

- [ ] **Step 5: Chạy pass + typecheck**

```bash
pnpm vitest run src/lib/tts/__tests__/kokoro-engine.test.ts
pnpm typecheck
```

Expected: PASS; typecheck sạch. Nếu TS báo lỗi `Float32Array<ArrayBufferLike>` tại `copyToChannel`/`audio.audio`, bọc bản sao: `playSamples(new Float32Array(audio.audio), ...)`.

- [ ] **Step 6: Commit**

```bash
git add public/kokoro/voices/ src/lib/tts/kokoro-engine.ts src/lib/tts/__tests__/kokoro-engine.test.ts
git commit -m "Add Kokoro engine wrapper (misaki zh G2P via @uzen/kokoro-js, HF model fetch)"
```

---

### Task 7: `engine.ts` — orchestrator singleton 3 tầng

**Files:**
- Create: `app-next/src/lib/tts/engine.ts`
- Test: `app-next/src/lib/tts/__tests__/engine.test.ts`

**Interfaces:**
- Consumes: `detectCapability` (Task 3), `getEngineChoice`/`setEngineChoice`/`isIosSafari` (Task 2), `createKokoroEngine` + `KokoroEngine` + `DownloadProgress` (Task 6).
- Produces (Task 8, 9 dùng đúng tên này):
  - `type TtsOrchestratorState = { kind: "idle" } | { kind: "consent" } | { kind: "downloading"; received: number; total: number } | { kind: "ready"; tier: TtsCapability } | { kind: "error"; message: string }`
  - `interface KokoroSpeakOptions extends TtsSpeakOptions { onFallback?: () => void }` — `onFallback` được gọi khi lần phát này không dùng được Kokoro (chưa tải, đang tải, lỗi) để hook phát webspeech thay.
  - `interface TtsOrchestrator { shouldUseKokoro(): boolean; speak(text, opts?): void; cancel(): void; acceptConsent(useKokoro: boolean): void; preload(): Promise<void>; retryAfterError(): Promise<void>; getState(): TtsOrchestratorState; subscribe(cb): () => void }`
  - `getTtsOrchestrator(): TtsOrchestrator` (singleton)

**Quy tắc hành vi (theo spec §5, §6, §8):**
- `shouldUseKokoro()` = `getEngineChoice() === "kokoro"` VÀ không iOS VÀ chưa broken (lỗi runtime trong session).
- `speak()` khi không dùng Kokoro: nếu `getEngineChoice() === null` (auto, chưa hỏi) và chưa hỏi trong page load này → phát state `{kind:"consent"}` (tối đa 1 lần); **luôn** gọi `onFallback` để phát webspeech ngay.
- `speak()` khi dùng Kokoro nhưng engine chưa nạp: khởi động nạp ngầm (`ensureEngine`, không chờ), gọi `onFallback` — lần click này nghe webspeech, các click sau dùng Kokoro.
- `acceptConsent(true)` → lưu `kokoro` + preload ngầm; `acceptConsent(false)` → lưu `system`.
- Lỗi nạp/inference → state `{kind:"error"}`, engineBroken=true (fallback webspeech cả session), `retryAfterError()` xóa cờ.

- [ ] **Step 1: Test fail trước**

`src/lib/tts/__tests__/engine.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getTtsOrchestrator } from "../engine";

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
  detectCapability.mockResolvedValue("webgpu-fp16");
  createKokoroEngine.mockResolvedValue({
    tier: "webgpu-fp16",
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
    await vi.waitFor(() => expect(engine.speak).toHaveBeenCalledWith("你好", expect.anything()));
    expect(onFallback).not.toHaveBeenCalled();
    expect(orch.getState()).toMatchObject({ kind: "ready", tier: "webgpu-fp16" });
  });

  it("choice=kokoro nhưng engine chưa nạp: khởi động nạp ngầm + onFallback cho lần này", async () => {
    fakeKokoro();
    localStorage.setItem("bye.tts.engine", "kokoro");
    const orch = await freshOrchestrator();
    const onFallback = vi.fn();
    orch.speak("你好", { onFallback });
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(createKokoroEngine).toHaveBeenCalledTimes(1); // đã bắt đầu nạp ngầm
  });

  it("acceptConsent(true) -> lưu kokoro + preload ngầm", async () => {
    fakeKokoro();
    const orch = await freshOrchestrator();
    orch.acceptConsent(true);
    await vi.waitFor(() =>
      expect(orch.getState()).toMatchObject({ kind: "ready", tier: "webgpu-fp16" })
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

  it("fp16 nạp fail (thiếu shader-f16) -> tự thử lại q8-wasm đúng 1 lần (spec §8)", async () => {
    detectCapability.mockResolvedValue("webgpu-fp16");
    createKokoroEngine
      .mockRejectedValueOnce(new Error("no shader-f16"))
      .mockResolvedValueOnce({
        tier: "wasm-q8",
        speak: vi.fn(async (_t: string, opts?: { onEnd?: () => void }) => opts?.onEnd?.()),
        cancel: vi.fn(),
      });
    localStorage.setItem("bye.tts.engine", "kokoro");
    const orch = await freshOrchestrator();
    await orch.preload();
    expect(createKokoroEngine).toHaveBeenCalledTimes(2);
    expect(createKokoroEngine.mock.calls[0][0]).toBe("webgpu-fp16");
    expect(createKokoroEngine.mock.calls[1][0]).toBe("wasm-q8");
    expect(orch.getState()).toMatchObject({ kind: "ready", tier: "wasm-q8" });
  });

  it("lỗi nạp engine (HF offline) -> state error, các speak sau fallback webspeech cả session", async () => {
    detectCapability.mockResolvedValue("wasm-q8");
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
```

- [ ] **Step 2: Chạy xác nhận fail**

Run: `pnpm vitest run src/lib/tts/__tests__/engine.test.ts`
Expected: FAIL — chưa có `../engine`.

- [ ] **Step 3: Viết `src/lib/tts/engine.ts`**

```ts
"use client";
/* Orchestrator 3 tầng (spec §4): WebGPU fp16 -> WASM q8 -> webspeech.
   Singleton vì nhiều component dùng song song; state phát qua subscribe cho
   dialog consent + settings modal. */
import { detectCapability, type TtsCapability } from "./capability";
import {
  getEngineChoice,
  setEngineChoice,
  isIosSafari,
  type TtsTier,
} from "./config";
import {
  createKokoroEngine,
  type DownloadProgress,
  type KokoroEngine,
} from "./kokoro-engine";
import type { TtsSpeakOptions } from "./types";

export type TtsOrchestratorState =
  | { kind: "idle" }
  | { kind: "consent" }
  | { kind: "downloading"; received: number; total: number }
  | { kind: "ready"; tier: TtsCapability }
  | { kind: "error"; message: string };

export interface KokoroSpeakOptions extends TtsSpeakOptions {
  /* Kokoro không dùng được cho lần phát này (chưa tải/đang tải/lỗi) ->
     hook tự phát webspeech với cùng text. */
  onFallback?: () => void;
}

export interface TtsOrchestrator {
  shouldUseKokoro(): boolean;
  speak(text: string, opts?: KokoroSpeakOptions): void;
  cancel(): void;
  acceptConsent(useKokoro: boolean): void;
  preload(): Promise<void>;
  retryAfterError(): Promise<void>;
  getState(): TtsOrchestratorState;
  subscribe(cb: (s: TtsOrchestratorState) => void): () => void;
}

let state: TtsOrchestratorState = { kind: "idle" };
const listeners = new Set<(s: TtsOrchestratorState) => void>();
let engine: KokoroEngine | null = null;
let enginePromise: Promise<KokoroEngine> | null = null;
let engineBroken = false; // lỗi runtime -> webspeech cả session (spec §8)
let consentAsked = false; // hỏi tối đa 1 lần / page load

function setState(s: TtsOrchestratorState) {
  state = s;
  listeners.forEach((l) => l(s));
}

function loadEngine(onProgress?: (p: DownloadProgress) => void): Promise<KokoroEngine> {
  /* tách khỏi ensureEngine để có thể retry tier: fp16 fail (thiếu shader-f16,
     driver lỗi) -> thử q8-wasm đúng 1 lần (spec §8) trước khi báo lỗi */
  return (async () => {
    const tier = await detectCapability();
    if (tier === "webspeech") throw new Error("Thiết bị không hỗ trợ Kokoro");
    try {
      return await createKokoroEngine(tier as TtsTier, onProgress);
    } catch (err) {
      if (tier === "webgpu-fp16") return await createKokoroEngine("wasm-q8", onProgress);
      throw err;
    }
  })();
}

function ensureEngine(onProgress?: (p: DownloadProgress) => void): Promise<KokoroEngine> {
  if (engine) return Promise.resolve(engine);
  if (!enginePromise) {
    enginePromise = loadEngine(onProgress)
      .then((e) => {
        engine = e;
        setState({ kind: "ready", tier: e.tier });
        return e;
      })
      .catch((err: unknown) => {
        enginePromise = null; // cho phép thử lại từ Settings
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Không tải được giọng đọc",
        });
        throw err;
      });
  }
  return enginePromise;
}

export function getTtsOrchestrator(): TtsOrchestrator {
  return {
    shouldUseKokoro() {
      if (engineBroken || isIosSafari()) return false;
      return getEngineChoice() === "kokoro";
    },
    speak(text, opts) {
      if (!this.shouldUseKokoro()) {
        if (getEngineChoice() === null && !consentAsked) {
          consentAsked = true;
          setState({ kind: "consent" });
        }
        opts?.onFallback?.();
        return;
      }
      if (!engine) {
        void ensureEngine().catch(() => {}); // nạp ngầm cho lần click sau
        opts?.onFallback?.(); // lần này nghe webspeech trước
        return;
      }
      engine.cancel(); // bấm loa mới -> dừng câu cũ
      void engine.speak(text, opts).catch(() => {
        engineBroken = true;
        engine = null;
        enginePromise = null;
        setState({ kind: "error", message: "Lỗi khi tạo giọng đọc — chuyển về giọng hệ thống" });
        opts?.onFallback?.();
      });
    },
    cancel() {
      engine?.cancel();
    },
    acceptConsent(useKokoro) {
      setEngineChoice(useKokoro ? "kokoro" : "system");
      if (useKokoro) void ensureEngine().catch(() => {});
      else setState({ kind: "idle" });
    },
    async preload() {
      await ensureEngine();
    },
    async retryAfterError() {
      engineBroken = false;
      enginePromise = null;
      await ensureEngine();
    },
    getState: () => state,
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
```

- [ ] **Step 4: Chạy pass + typecheck**

```bash
pnpm vitest run src/lib/tts/__tests__/engine.test.ts
pnpm typecheck
```

Expected: PASS; typecheck sạch. Ghi chú: `engine.speak(text, opts)` nhận cả `onFallback` thừa — vô hại vì KokoroEngine chỉ đọc `onEnd`/`rate`/`lang`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tts/engine.ts src/lib/tts/__tests__/engine.test.ts
git commit -m "Add TTS orchestrator (3-tier selection, consent gate, session fallback)"
```

---

### Task 8: Rewrite `use-tts.ts` route qua orchestrator

**Files:**
- Modify: `app-next/src/lib/tts/use-tts.ts`
- Modify: `app-next/src/lib/tts/__tests__/use-tts.test.ts` (chỉ **thêm** describe mới, không xóa case cũ)

**Interfaces:**
- Consumes: `getTtsOrchestrator`, `KokoroSpeakOptions` (Task 7); `createWebspeechEngine`, `WebspeechEngine` (Task 5).
- Produces: `useTts()` giữ nguyên `{ speak, cancel, speaking }` — signature `speak(text, opts?: { lang?; rate?; onEnd? })` không đổi.

- [ ] **Step 1: Thêm test routing vào cuối `use-tts.test.ts` (trước dấu `});` cuối file)**

```ts
  describe("routing kokoro qua orchestrator", () => {
    it("engine choice=kokoro + orchestrator sẵn sàng -> phát qua Kokoro (không speechSynthesis)", async () => {
      localStorage.setItem("bye.tts.engine", "kokoro");
      const kokoroSpeak = vi.fn(async () => {});
      const fakeOrch = {
        shouldUseKokoro: () => true,
        speak: kokoroSpeak,
        cancel: vi.fn(),
      };
      vi.doMock("../engine", () => ({
        getTtsOrchestrator: () => fakeOrch,
      }));
      vi.resetModules();
      const { useTts } = await import("../use-tts");
      const { result } = renderHook(() => useTts());
      const onEnd = vi.fn();
      act(() => result.current.speak("你好", { onEnd }));
      expect(kokoroSpeak).toHaveBeenCalledWith(
        "你好",
        expect.objectContaining({ onEnd })
      );
      expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
      vi.doUnmock("../engine");
    });

    it("auto chưa hỏi -> vẫn phát webspeech ngay (consent do orchestrator phát)", () => {
      const { result } = renderHook(() => useTts());
      act(() => result.current.speak("你好"));
      expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    });

    it("cancel -> hủy cả webspeech lẫn orchestrator", async () => {
      localStorage.setItem("bye.tts.engine", "kokoro");
      const fakeOrch = {
        shouldUseKokoro: () => true,
        speak: vi.fn(async () => {}),
        cancel: vi.fn(),
      };
      vi.doMock("../engine", () => ({ getTtsOrchestrator: () => fakeOrch }));
      vi.resetModules();
      const { useTts } = await import("../use-tts");
      const { result } = renderHook(() => useTts());
      act(() => result.current.cancel());
      expect(fakeOrch.cancel).toHaveBeenCalled();
      expect(window.speechSynthesis.cancel).toHaveBeenCalled();
      vi.doUnmock("../engine");
    });
  });
```

Lưu ý: thêm `afterEach(() => { localStorage.removeItem("bye.tts.engine"); })` toàn cục ở đầu file nếu các case trên làm bẩn localStorage cho test khác trong file.

- [ ] **Step 2: Chạy xác nhận case mới fail**

Run: `pnpm vitest run src/lib/tts/__tests__/use-tts.test.ts`
Expected: 3 case mới FAIL (use-tts chưa route qua orchestrator), case cũ PASS.

- [ ] **Step 3: Rewrite `use-tts.ts`**

```ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createWebspeechEngine, type WebspeechEngine } from "./webspeech-engine";
import { getTtsOrchestrator } from "./engine";
import type { TtsSpeakOptions } from "./types";

export type TtsOptions = TtsSpeakOptions;

/* API giữ nguyên cho ~25 component: speak/cancel/speaking.
   Routing: orchestrator quyết định Kokoro hay webspeech (engine.ts);
   webspeech engine là per-hook để unmount dọn listener voiceschanged. */
export function useTts() {
  const [speaking, setSpeaking] = useState(false);
  const wsRef = useRef<WebspeechEngine | null>(null);
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => {
    const ws = createWebspeechEngine(setSpeaking);
    wsRef.current = ws;
    cancelRef.current = () => {
      ws.cancel();
      getTtsOrchestrator().cancel();
    };
    return () => ws.dispose();
  }, []);

  const cancel = useCallback(() => cancelRef.current(), []);

  const speak = useCallback((text: string, opts?: TtsSpeakOptions) => {
    const wsOpts: TtsSpeakOptions = {
      ...opts,
      onEnd: () => {
        setSpeaking(false);
        opts?.onEnd?.();
      },
    };
    const orch = getTtsOrchestrator();
    if (orch.shouldUseKokoro() && orch.getState().kind === "ready") {
      setSpeaking(true);
      orch.speak(text, {
        ...wsOpts,
        onFallback: () => {
          setSpeaking(false);
          wsRef.current?.speak(text, wsOpts);
        },
      });
      return;
    }
    /* không dùng Kokoro lần này (auto/system/chưa tải/lỗi) — orchestrator
       phát consent nếu cần, playback do webspeech lo (quản speaking riêng) */
    orch.speak(text, {});
    wsRef.current?.speak(text, wsOpts);
  }, []);

  return { speak, cancel, speaking };
}
```

- [ ] **Step 4: Chạy toàn bộ test của tts + typecheck**

```bash
pnpm vitest run src/lib/tts/
pnpm typecheck
```

Expected: PASS toàn bộ (case cũ + mới); typecheck sạch.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tts/use-tts.ts src/lib/tts/__tests__/use-tts.test.ts
git commit -m "Route useTts through TTS orchestrator (Kokoro when ready, webspeech otherwise)"
```

---

### Task 9: UI — dialog consent + Settings engine group + mount layout

**Files:**
- Create: `app-next/src/components/shell/tts-consent-dialog.tsx`
- Modify: `app-next/src/components/shell/settings-modal.tsx`
- Modify: `app-next/src/app/layout.tsx:46` (mount `<TtsConsentDialog />` cạnh `<SettingsModal />`)
- Test: `app-next/src/components/shell/__tests__/tts-consent-dialog.test.tsx` (Create); settings modal test (Modify nếu tồn tại — `ls src/components/shell/__tests__/` để kiểm tra)

**Interfaces:**
- Consumes: `getTtsOrchestrator`, `TtsOrchestratorState` (Task 7); `getEngineChoice`, `setEngineChoice`, `TIER_CONFIG` (Task 2); UI primitives `Dialog`, `Button` (đã có trong `src/components/ui/`, xem cách SettingsModal dùng: `variant="primary" | "secondary"`, `Dialog` props `open/onClose/labelledBy/className`).

- [ ] **Step 1: Test fail trước cho consent dialog**

`src/components/shell/__tests__/tts-consent-dialog.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TtsConsentDialog from "../tts-consent-dialog";

const orch = {
  getState: vi.fn(() => ({ kind: "idle" }) as never),
  subscribe: vi.fn(() => vi.fn()),
  acceptConsent: vi.fn(),
  retryAfterError: vi.fn(async () => {}),
};
vi.mock("@/lib/tts/engine", () => ({
  getTtsOrchestrator: () => orch,
}));

beforeEach(() => {
  orch.getState.mockReturnValue({ kind: "idle" });
  orch.acceptConsent.mockClear();
});

describe("TtsConsentDialog", () => {
  it("state idle -> dialog đóng", () => {
    render(<TtsConsentDialog />);
    expect(screen.queryByText("Giọng đọc Bye HSK")).toBeNull();
  });

  it("state consent -> hiện dialog với nút tải / dùng giọng hệ thống", () => {
    orch.getState.mockReturnValue({ kind: "consent" });
    render(<TtsConsentDialog />);
    expect(screen.getByText("Giọng đọc Bye HSK")).toBeTruthy();
    fireEvent.click(screen.getByText("Tải giọng Bye HSK"));
    expect(orch.acceptConsent).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByText("Dùng giọng hệ thống"));
    expect(orch.acceptConsent).toHaveBeenCalledWith(false);
  });

  it("state downloading -> hiện progress MB, không nút accept nữa", () => {
    orch.getState.mockReturnValue({ kind: "downloading", received: 52428800, total: 171966464 });
    render(<TtsConsentDialog />);
    expect(screen.getByText(/50 MB/)).toBeTruthy();
    expect(screen.queryByText("Tải giọng Bye HSK")).toBeNull();
    expect(screen.getByText("Bỏ qua, dùng giọng hệ thống")).toBeTruthy();
  });

  it("state error trong dialog -> hiện message + nút thử lại", () => {
    orch.getState.mockReturnValue({ kind: "error", message: "offline" });
    render(<TtsConsentDialog />);
    expect(screen.getByText(/offline/)).toBeTruthy();
    fireEvent.click(screen.getByText("Thử lại"));
    expect(orch.retryAfterError).toHaveBeenCalled();
  });
});
```

Chỉnh assertion text theo markup thực tế nếu khác (giữ nguyên ý nghĩa).

- [ ] **Step 2: Chạy xác nhận fail**

Run: `pnpm vitest run src/components/shell/__tests__/tts-consent-dialog.test.tsx`
Expected: FAIL — chưa có component.

- [ ] **Step 3: Viết `tts-consent-dialog.tsx`**

```tsx
"use client";
/* Dialog hỏi tải model Kokoro lần đầu (spec §6) — mở khi orchestrator phát
   state consent/downloading/error; ẩn ở idle/ready. */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  getTtsOrchestrator,
  type TtsOrchestratorState,
} from "@/lib/tts/engine";

const mb = (n: number) => `${Math.round(n / 1024 / 1024)} MB`;

export default function TtsConsentDialog() {
  const [state, setState] = useState<TtsOrchestratorState>(() =>
    getTtsOrchestrator().getState()
  );

  useEffect(() => getTtsOrchestrator().subscribe(setState), []);

  const open =
    state.kind === "consent" || state.kind === "downloading" || state.kind === "error";

  return (
    <Dialog open={open} onClose={() => {}} labelledBy="tts-consent-title">
      <h2 id="tts-consent-title" className="text-2xl font-extrabold mb-2">
        Giọng đọc Bye HSK
      </h2>
      {state.kind === "downloading" ? (
        <div>
          <p className="text-sm text-text-secondary mb-2">
            Đang tải giọng đọc… {mb(state.received)} / {mb(state.total)}
          </p>
          <progress className="w-full" value={state.received} max={state.total} />
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={() => getTtsOrchestrator().acceptConsent(false)}>
              Bỏ qua, dùng giọng hệ thống
            </Button>
          </div>
        </div>
      ) : state.kind === "error" ? (
        <div>
          <p className="text-sm text-text-secondary mb-4">
            Không tải được giọng đọc: {state.message}. Bạn vẫn nghe được bằng giọng hệ thống.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => getTtsOrchestrator().acceptConsent(false)}>
              Dùng giọng hệ thống
            </Button>
            <Button onClick={() => void getTtsOrchestrator().retryAfterError()}>Thử lại</Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-text-secondary mb-4">
            Nghe tiếng Trung rõ và đều hơn trên mọi thiết bị bằng giọng đọc tích hợp của
            Bye HSK. Cần tải model ~156 MB (máy không hỗ trợ WebGPU: ~127 MB), chỉ tải
            một lần rồi dùng offline.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => getTtsOrchestrator().acceptConsent(false)}>
              Dùng giọng hệ thống
            </Button>
            <Button onClick={() => getTtsOrchestrator().acceptConsent(true)}>
              Tải giọng Bye HSK
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
```

- [ ] **Step 4: Sửa `settings-modal.tsx` — thêm nhóm "Engine đọc tiếng Trung"**

Thêm imports đầu file:

```tsx
import { getTtsOrchestrator, type TtsOrchestratorState } from "@/lib/tts/engine";
import { getEngineChoice, setEngineChoice, TIER_CONFIG } from "@/lib/tts/config";
```

Thêm state + effect trong component (sau state `selectionLookup`):

```tsx
type EnginePick = "auto" | "kokoro" | "system";
const [engine, setEngine] = useState<EnginePick>("auto");
const [ttsState, setTtsState] = useState<TtsOrchestratorState>(() =>
  getTtsOrchestrator().getState()
);

useEffect(() => getTtsOrchestrator().subscribe(setTtsState), []);

useEffect(() => {
  if (!isOpen) return;
  setEngine(getEngineChoice() ?? "auto");
}, [isOpen]);

const pickEngine = (pick: EnginePick) => {
  setEngine(pick);
  if (pick === "auto") {
    setEngineChoice(null);
    return;
  }
  setEngineChoice(pick === "kokoro" ? "kokoro" : "system");
  if (pick === "kokoro") void getTtsOrchestrator().preload();
};

const clearModelCache = async () => {
  try {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => /transformers|kokoro/i.test(k))
        .map((k) => caches.delete(k))
    );
  } catch {
    /* silent */
  }
};
```

Thêm JSX sau block "Giọng đọc tiếng Trung" (giữ block đó nguyên):

```tsx
<div className="mb-5">
  <p className="text-sm font-bold mb-2">Engine đọc tiếng Trung</p>
  <div className="grid grid-cols-3 gap-2">
    <Button type="button" variant={on(engine === "auto")} onClick={() => pickEngine("auto")}>
      Tự động
    </Button>
    <Button type="button" variant={on(engine === "kokoro")} onClick={() => pickEngine("kokoro")}>
      Bye HSK
    </Button>
    <Button type="button" variant={on(engine === "system")} onClick={() => pickEngine("system")}>
      Hệ thống
    </Button>
  </div>
  <div className="mt-2 text-xs text-text-secondary flex items-center gap-2">
    {ttsState.kind === "downloading" && (
      <span>Đang tải… {Math.round((ttsState.received / ttsState.total) * 100)}%</span>
    )}
    {ttsState.kind === "ready" && (
      <span>
        Đã sẵn sàng ({TIER_CONFIG[ttsState.tier as keyof typeof TIER_CONFIG]?.label ?? ttsState.tier})
        <button type="button" className="underline ml-1" onClick={() => void clearModelCache()}>
          Xóa model đã tải
        </button>
      </span>
    )}
    {ttsState.kind === "error" && (
      <span>
        Lỗi: {ttsState.message}
        <button
          type="button"
          className="underline ml-1"
          onClick={() => void getTtsOrchestrator().retryAfterError()}
        >
          Thử lại
        </button>
      </span>
    )}
    {engine === "kokoro" && ttsState.kind === "idle" && (
      <button type="button" className="underline" onClick={() => void getTtsOrchestrator().preload()}>
        Tải giọng đọc (156 MB)
      </button>
    )}
  </div>
</div>
```

- [ ] **Step 5: Mount trong `layout.tsx`**

Thêm import cạnh SettingsModal và JSX cạnh `<SettingsModal />` (dòng 46):

```tsx
import TtsConsentDialog from "@/components/shell/tts-consent-dialog";
```
```tsx
<SettingsModal />
<TtsConsentDialog />
```

- [ ] **Step 6: Chạy test + typecheck**

```bash
pnpm vitest run src/components/shell/ src/lib/tts/
pnpm typecheck
```

Expected: PASS; typecheck sạch. Nếu `settings-modal` có test sẵn, chạy kèm và sửa assertion nếu thêm section làm vỡ snapshot/count.

- [ ] **Step 7: Commit**

```bash
git add src/components/shell/tts-consent-dialog.tsx src/components/shell/settings-modal.tsx src/app/layout.tsx src/components/shell/__tests__/tts-consent-dialog.test.tsx
git add src/components/shell/__tests__/settings-modal.test.tsx  # nếu đã sửa
git commit -m "Add TTS consent dialog and engine settings group"
```

---

### Task 10: Verification tổng

**Files:** không tạo/sửa file (trừ khi verification phát hiện lỗi).

- [ ] **Step 1: Đối chiếu số đo với baseline**

```bash
pnpm typecheck && pnpm lint && pnpm test 2>&1 | tail -15
```

Expected: typecheck sạch; lint không có lỗi mới; số test file fail == baseline Task 0 (không tăng), test của `src/lib/tts/` + `src/components/shell/` pass trọn.

- [ ] **Step 2: Kiểm bundle không chứa kokoro (dynamic import)**

```bash
pnpm build 2>&1 | grep -i "kokoro\|onnxruntime" || echo "OK: kokoro không nằm trong bundle chính"
```

Expected: `@huggingface/transformers` + `onnxruntime` xuất hiện dưới dạng **chunk riêng** (lazy), không nằm trong bundle trang chính. Nếu thấy nằm trong bundle chính → kiểm tra lại mọi `import` của `kokoro-engine.ts` phải là `await import(...)` bên trong hàm.

- [ ] **Step 3: Chạy thử thủ công (pnpm dev, Chrome có WebGPU)**

Checklist (làm trên `http://localhost:3100`):
1. Mở Review, bấm loa trên 1 từ → nghe giọng hệ thống + dialog "Giọng đọc Bye HSK" hiện đúng 1 lần.
2. Chọn "Dùng giọng hệ thống" → tắt dialog; localStorage `bye.tts.engine` = `system`; reload → không hỏi lại.
3. Settings → Engine "Bye HSK" → progress tải xuất hiện trong Settings; xong → status "Đã sẵn sàng (WebGPU)".
4. Bấm loa → nghe giọng Kokoro (khác hẳn giọng hệ thống); DevTools Network: model chỉ fetch 1 lần; reload + bấm lại → không fetch lại (Cache API).
5. Bấm loa 2 câu liên tiếp → câu sau đè câu trước, không chồng âm.
6. Đổi Nữ/Nam trong Settings → voice đổi (zm khác zf).
7. (Firefox nếu có) → tải bản q8, phát được dù chậm.
8. DevTools tắt WebGPU không khả thi thì test fallback bằng cách set `localStorage["bye.tts.engine"]="kokoro"` trên Firefox: lần click đầu webspeech, sau khi tải xong click tiếp → Kokoro.

Nếu 1 checklist fail → quay lại task tương ứng sửa, không "vá" tại Task 10.

- [ ] **Step 4: Commit (nếu có sửa) + tổng kết**

```bash
git status   # phải sạch
git log --oneline | head -12
```

---

## Phụ lục: mapping spec → task

| Spec section | Task |
|---|---|
| §3 Q1 fork @uzen/kokoro-js + adapter | Task 1, 6 (`kokoro-engine.ts` là adapter duy nhất import fork) |
| §3 Q2 fetch HF + Cache API | Task 1 (default), 6 (verify trong Task 10 checklist 4) |
| §3 Q3 WebGPU fp16 → WASM q8 → webspeech | Task 2 (`TIER_CONFIG`), 3 (`detectCapability`), 7 (orchestrator) |
| §4 thành phần `engine/kokoro-engine/webspeech-engine/use-tts/playback` | Task 4–8 |
| §5 luồng speak + consent 1 lần | Task 7, 8 |
| §6 UX hỏi-tải + progress | Task 9 (dialog), 7 (downloading state) |
| §7 Settings engine group | Task 9 |
| §8 iOS Safari chặn, shader-f16 fail→q8, lỗi runtime→session fallback | Task 2/3 (iOS), 6→Task 1 (fp16 fail do transformers.js tự ném lỗi → orchestrator fallback), 7 (engineBroken) |
| §9 lazy import | Task 6 (dynamic import), 10 Step 2 (verify) |
| §10 kiểm thử | từng task + Task 10 |
| §12 ngoài phạm vi (AudioWorklet, karaoke, voice picker, R2) | không có task — đúng ý |
