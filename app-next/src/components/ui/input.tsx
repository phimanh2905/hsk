import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const fieldBase =
  "rounded-control border bg-surface-elevated text-text-primary placeholder:text-text-secondary " +
  "border-border-default focus:outline-none focus:ring-3 ring-action-focus ring-offset-2 " +
  "disabled:opacity-50 disabled:pointer-events-none";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(fieldBase, "min-h-11 px-3 py-2", className)}
        {...rest}
      />
    );
  },
);
