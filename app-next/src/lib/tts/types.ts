/* Option chung cho mọi TTS engine — khớp signature speak() cũ của useTts. */
export interface TtsSpeakOptions {
  lang?: "zh-CN" | "vi-VN";
  rate?: number;
  onEnd?: () => void;
}
