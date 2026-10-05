/* Bars giả deterministic — port hàm bars() của mock shadowing-video.html.
   Chỉ là visualize trang trí, KHÔNG phải phân tích tín hiệu thật.

   Công thức: base(i) = 0.18 + r(i) * 0.72  (r = hash sin trong [0,1)),
   sau đó nhân với amp: h = clamp(base * amp, 0, 1) — amp co giãn biên
   nhân tử (h * amp === full * amp), đúng tính chất test yêu cầu. */
export function barHeights(seed: number, amp: number, n = 72): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
    const r = x - Math.floor(x); // [0,1)
    const base = 0.18 + r * 0.72; // [0.18, 0.9]
    out.push(Math.max(0, Math.min(1, base * amp)));
  }
  return out;
}
