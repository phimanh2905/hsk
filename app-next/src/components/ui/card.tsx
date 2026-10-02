import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const shadows = {
  none: "",
  xs: "shadow-xs",
  md: "shadow-md",
} as const;

export function Card({
  shadow = "xs",
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { shadow?: keyof typeof shadows }) {
  return (
    <div
      className={cn(
        "rounded-card border border-border-default bg-surface-elevated p-6",
        shadows[shadow],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
