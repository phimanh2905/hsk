import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Vòng tròn tiến độ SVG (port .big-ring/#masteryArc + #goalArc của opendesign index.html).
   Server-safe: không state, animate bằng transition CSS trên stroke-dashoffset. */
export function DonutRing({
  value,
  total,
  size = 96,
  strokeWidth = 9,
  color = "var(--action-primary)",
  label,
  children,
  className,
}: {
  value: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label: string;
  children?: ReactNode;
  className?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      className={cn("shrink-0", className)}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hz-ring-track)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-[stroke-dashoffset] duration-700"
      />
      {children}
    </svg>
  );
}
