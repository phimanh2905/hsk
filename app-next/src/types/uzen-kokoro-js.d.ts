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
