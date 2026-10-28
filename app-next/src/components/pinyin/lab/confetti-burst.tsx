"use client";

/* Burst confetti thuần CSS khi tổng kết quiz đậu — không dependency mới.
   Overlay aria-hidden, pointer-events-none để không chặn click/a11y.
   Màu: brief liệt kê bg-main/bg-accent/bg-peach — không tồn tại trong theme;
   thay bằng token có thật: action-primary, feedback-success, jade, amber-ink, rose-ink. */
const COLORS = ["bg-action-primary", "bg-feedback-success", "bg-jade", "bg-amber-ink", "bg-rose-ink"];

export function ConfettiBurst({ count = 28 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`absolute top-0 block size-2 rounded-[2px] ${COLORS[i % COLORS.length]}`}
          style={{
            left: `${(i * 97) % 100}%`,
            animation: `confetti-fall ${1.4 + (i % 5) * 0.25}s ease-in ${(i % 7) * 0.12}s 1 forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
