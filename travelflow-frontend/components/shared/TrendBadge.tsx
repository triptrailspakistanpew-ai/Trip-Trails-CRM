import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendBadgeProps {
  value: number; // e.g. 12.5 for +12.5%
  label?: string; // e.g. "vs last month"
  className?: string;
}

export function TrendBadge({ value, label, className }: TrendBadgeProps) {
  const isPositive = value >= 0;

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[11px] font-bold",
          isPositive
            ? "bg-[var(--tf-success-soft)] text-tf-success"
            : "bg-[var(--tf-danger-soft)] text-tf-danger",
        )}
      >
        {isPositive ? (
          <ArrowUpRight className="mr-0.5 h-3 w-3" />
        ) : (
          <ArrowDownRight className="mr-0.5 h-3 w-3" />
        )}
        {isPositive ? "+" : ""}
        {value}%
      </span>
      {label && (
        <span className="truncate text-[11px] text-tf-text-muted whitespace-nowrap">
          {label}
        </span>
      )}
    </div>
  );
}
