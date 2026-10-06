"use client";
/* Nạp bundle Kokoro vendored (self-contained, sinh bởi `pnpm vendor:kokoro` —
   copy của node_modules/@uzen/kokoro-js/dist/kokoro.web.js) từ public/ bằng URL động.

   Phải tính URL lúc runtime (new URL) + turbopackIgnore: nếu để string literal,
   Next SSR in literal vào chunk và esbuild của opennextjs-cloudflare thử resolve
   nó như module (vỡ ở CI); nếu để bare specifier thì nft trace kéo
   @huggingface/transformers (entry Node import sharp) vào server bundle. Biểu
   thức không phân tích tĩnh được sẽ được giữ nguyên đến runtime — chỉ browser
   thực thi (khi user bật Kokoro). */
export type KokoroBundle = typeof import("@uzen/kokoro-js");

const KOKORO_BUNDLE_PATH = "/kokoro/vendor/kokoro.web.js";

export async function loadKokoroBundle(): Promise<KokoroBundle> {
  const url = new URL(KOKORO_BUNDLE_PATH, globalThis.location?.origin).href;
  return (await import(/* turbopackIgnore: true */ /* webpackIgnore: true */ url)) as KokoroBundle;
}
