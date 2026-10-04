import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const styles = {
  primary: "bg-action-primary text-white hover:bg-action-primary-hover active:bg-action-primary-active border-transparent",
  secondary: "bg-surface-elevated text-text-primary border-border-default hover:border-action-primary hover:text-action-primary",
  danger: "bg-action-danger text-white hover:opacity-90 border-transparent",
  ghost: "bg-surface-muted text-text-primary border-border-default hover:bg-surface-elevated hover:border-border-strong",
} as const;

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof styles; size?: "sm" | "md" | "lg"; loading?: boolean;
}>(function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control border font-semibold min-h-11",
        size === "sm" ? "px-3 text-sm" : size === "lg" ? "min-h-12 px-6 text-[15px]" : "px-5",
        loading && "min-w-28",
        "focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        styles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
