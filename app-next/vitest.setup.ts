import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";
// jsdom thiếu API browser dùng trong app: stub tối thiểu
if (!window.matchMedia) {
  window.matchMedia = (q: string) =>
    ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList;
}
window.scrollTo = window.scrollTo ?? (() => {});
// jsdom không có Web Speech API — stub tối thiểu cho useTts
if (!window.speechSynthesis) {
  window.speechSynthesis = {
    cancel() {}, speak() {}, getVoices() { return []; }, speaking: false, pending: false, paused: false,
    addEventListener() {}, removeEventListener() {}, onvoiceschanged: null, pause() {}, resume() {},
  } as unknown as SpeechSynthesis;
}
if (typeof (window as any).SpeechSynthesisUtterance === "undefined") {
  (window as any).SpeechSynthesisUtterance = class { text = ""; lang = ""; voice: unknown = null; rate = 1; pitch = 1; volume = 1; onend: (() => void) | null = null; onstart: (() => void) | null = null; onerror: (() => void) | null = null; };
}

// @testing-library/react phát hiện fake timers qua global `jest`
// (jestFakeTimersAreEnabled: setTimeout._isMockFunction || setTimeout.clock + typeof jest).
// Vitest faked setTimeout có .clock nhưng không định nghĩa `jest` — cung cấp shim
// để RTL advanceTimersByTime(0) trong asyncWrapper/user-event không treo khi vi.useFakeTimers().
if (typeof (globalThis as unknown as { jest?: unknown }).jest === "undefined") {
  (globalThis as unknown as { jest: unknown }).jest = {
    advanceTimersByTime: (ms?: number) => vi.advanceTimersByTime(ms ?? 0),
  };
}
