/* Shuffle deterministic cho chế độ Ghép từ — cùng (videoId, lineN) luôn ra
   cùng thứ tự mảnh (spec WSD.4: shuffle theo seed, tránh flaky test/UI). */

export function seedFor(videoId: string, lineN: number): number {
  let h = 0x811c9dc5; // FNV-1a 32-bit
  for (const ch of `${videoId}:${lineN}`) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) | 0; // mulberry32
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
