"use client";
/* Waveform trang trí theo style WaveformVisual của dictation-mate (fe-v2):
   rAF loop, bar bo tròn, envelope sin, lerp easing, DPR-aware + ResizeObserver.
   Khác bản gốc: không có analyser/mic — biên bar deterministic từ barHeights(seed)
   cộng drift động nhẹ; màu truyền vào dạng "r, g, b" (từ design token). */
import { useEffect, useRef } from "react";
import { barHeights } from "@/lib/shadowing/waveform";

export default function WaveformVisual({
  seed,
  amp,
  rgb,
  className = "",
}: {
  seed: number;
  amp: number;
  /** "r, g, b" — rgb của token màu bar */
  rgb: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  // snapshot để rAF loop không restart khi prop đổi
  const liveRef = useRef({ seed, amp, rgb });
  useEffect(() => {
    liveRef.current = { seed, amp, rgb };
  }, [seed, amp, rgb]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const levels: number[] = [];
    let running = true;

    const setupSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w > 0 && h > 0) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    const drawWaveform = (time: number) => {
      const { seed: s, amp: a, rgb: color } = liveRef.current;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (width <= 0 || height <= 0) return;

      const pattern = barHeights(s, a, 72);
      const levelCount = Math.max(34, Math.min(84, Math.round(width / 7)));
      // co/giãn pattern deterministic theo levelCount (không hash lại để giữ hình)
      const patternAt = (i: number) => {
        const p = (i / levelCount) * (pattern.length - 1);
        const lo = Math.floor(p);
        const hi = Math.min(pattern.length - 1, lo + 1);
        return pattern[lo] + (pattern[hi] - pattern[lo]) * (p - lo);
      };

      for (let i = 0; i < levelCount; i++) {
        const envelope = Math.pow(Math.sin((i / Math.max(1, levelCount - 1)) * Math.PI), 0.62);
        const drift = (Math.sin(time * 0.0015 + i * 0.67) + 1) / 2;
        // deterministic base từ seed/amp + drift động nhẹ (giống idle của bản gốc)
        const target = Math.min(1, 0.06 + patternAt(i) * 0.78 + envelope * drift * 0.1);
        if (levels[i] == null) levels[i] = target; // tránh undefined + x = NaN
        levels[i] += (target - levels[i]) * 0.08;

        const gap = width / levelCount;
        const barWidth = Math.max(2, Math.min(3.2, gap * 0.44));
        const x = i * gap + (gap - barWidth) / 2;
        const barHeight = Math.max(3, levels[i] * height * 0.83);
        ctx.beginPath();
        ctx.roundRect(x, height / 2 - barHeight / 2, barWidth, barHeight, barWidth / 2);
        const alpha = 0.28 + envelope * 0.48 + levels[i] * 0.16;
        ctx.fillStyle = `rgba(${color}, ${Math.min(1, alpha).toFixed(3)})`;
        ctx.fill();
      }
    };

    const frame = (time: number) => {
      if (!running) return;
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      ctx.clearRect(0, 0, w, h);
      drawWaveform(time);
      rafRef.current = requestAnimationFrame(frame);
    };

    setupSize();
    const resizeObs = new ResizeObserver(setupSize);
    resizeObs.observe(canvas);
    rafRef.current = requestAnimationFrame(frame);

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      } else if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      resizeObs.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      data-wave-seed={seed}
    />
  );
}
