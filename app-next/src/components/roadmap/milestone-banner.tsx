/* Banner tiến độ chặng (port .banner của opendesign_hsk/roadmap.html).
   sub/currentLabel/endLabel là ReactNode vì client island nhúng <b>/<Link>. */
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Port `.banner .sub b` + `.banner-meta b` của mock: mọi <b> trong sub/currentLabel/
   endLabel render màu ink foreground (token text-primary), không kế thừa slate của
   wrapper. Bọc đệ quy nên caller giữ nguyên hợp đồng ReactNode (chỉ đổi props.children,
   dùng Children.map để không sinh key-warning). */
function inkBold(node: ReactNode): ReactNode {
  if (Array.isArray(node)) return Children.map(node, inkBold);
  if (!isValidElement(node)) return node;
  const el = node as ReactElement<{ children?: ReactNode }>;
  if (el.type === "b") return <b className="text-text-primary">{el.props.children}</b>;
  if (el.props.children === undefined) return el;
  return cloneElement(el, undefined, inkBold(el.props.children));
}

export function MilestoneBanner({
  kicker,
  title,
  sub,
  pct,
  currentLabel,
  endLabel,
  ariaLabel,
  className,
}: {
  kicker: string;
  title: string;
  sub: ReactNode;
  pct: number;
  currentLabel: ReactNode;
  endLabel: ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <section
      aria-label={ariaLabel}
      className={cn("rounded-card border border-border-default bg-surface-elevated p-5 shadow-xs", className)}
    >
      <p className="text-[11px] font-extrabold tracking-[0.1em] text-text-secondary">{kicker}</p>
      <h1 className="mt-1 text-xl tracking-[-0.01em]">{title}</h1>
      <p className="mt-0.5 text-[13px] text-text-secondary">{inkBold(sub)}</p>
      <div
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="mt-3 h-2 overflow-hidden rounded-full bg-ring-track"
      >
        <div
          className="h-full rounded-full bg-jade transition-[width] duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between gap-4 text-xs text-text-secondary">
        <span>{inkBold(currentLabel)}</span>
        <span className="text-right">{inkBold(endLabel)}</span>
      </div>
    </section>
  );
}
