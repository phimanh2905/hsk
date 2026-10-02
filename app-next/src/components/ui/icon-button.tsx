import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const styles = {
  ghost: "bg-transparent text-text-secondary hover:text-action-primary border-transparent",
  solid: "bg-action-primary text-white hover:bg-action-primary-hover active:bg-action-primary-active border-transparent",
} as const;

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Accessible name bắt buộc — icon trần không có text. */
  label: string;
  variant?: keyof typeof styles;
}>(function IconButton({ label, variant = "ghost", className, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-control border min-h-11 min-w-11",
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
