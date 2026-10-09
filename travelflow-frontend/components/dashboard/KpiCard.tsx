import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CurrencyDisplay } from "../shared/CurrencyDisplay";
import { TrendBadge } from "../shared/TrendBadge";
import { SparklineChart } from "../charts/SparklineChart";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export interface KpiCardProps {
  label: string;
  value: number | string;
  isCurrency?: boolean;
  trend?: number;
  trendLabel?: string;
  icon: LucideIcon;
  cardColor: "blue" | "teal" | "amber" | "violet" | "slate" | "coral";
  sparklineData?: number[];
  isLoading?: boolean;
  onClick?: () => void;
}

const colorMap = {
  blue: {
    bg: "bg-[var(--tf-card-blue)]",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    sparkline: "#2563eb",
  },
  teal: {
    bg: "bg-[var(--tf-card-teal)]",
    iconBg: "bg-teal-100 dark:bg-teal-900/30",
    iconColor: "text-teal-600 dark:text-teal-400",
    sparkline: "#0d9488",
  },
  amber: {
    bg: "bg-[var(--tf-card-amber)]",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    sparkline: "#d97706",
  },
  violet: {
    bg: "bg-[var(--tf-card-violet)]",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-600 dark:text-violet-400",
    sparkline: "#7c3aed",
  },
  slate: {
    bg: "bg-[var(--tf-card-slate)]",
    iconBg: "bg-slate-200 dark:bg-slate-800",
    iconColor: "text-slate-600 dark:text-slate-400",
    sparkline: "#64748b",
  },
  coral: {
    bg: "bg-[var(--tf-card-coral)]",
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconColor: "text-rose-600 dark:text-rose-400",
    sparkline: "#e11d48",
  },
};

const valueClassName =
  "text-[1.625rem] font-extrabold leading-none tracking-tight text-tf-text-primary sm:text-[1.75rem] xl:text-[1.875rem]";

export function KpiCard({
  label,
  value,
  isCurrency = false,
  trend,
  trendLabel,
  icon: Icon,
  cardColor,
  sparklineData,
  onClick,
}: KpiCardProps) {
  const styles = colorMap[cardColor];

  const renderValue = () => {
    if (isCurrency && typeof value === "number") {
      return (
        <CurrencyDisplay
          amount={value}
          short={value >= 100_000}
          className={cn(valueClassName, "block truncate")}
        />
      );
    }
    if (typeof value === "number") {
      return (
        <span className={cn(valueClassName, "block truncate")}>
          {value.toLocaleString()}
        </span>
      );
    }
    return (
      <span className={cn(valueClassName, "block truncate")}>{value}</span>
    );
  };

  return (
    <Card
      size="sm"
      onClick={onClick}
      className={cn(
        "gap-0 overflow-hidden rounded-[14px] border-tf-border py-3 shadow-none ring-0 [--card-spacing:--spacing(4)]",
        styles.bg,
        onClick && "cursor-pointer transition-shadow hover:shadow-md",
      )}
    >
      <CardHeader className="grid-cols-[1fr_auto] items-center gap-2 pb-2">
        <p className="truncate text-xs font-medium text-tf-text-secondary">
          {label}
        </p>
        <CardAction>
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              styles.iconBg,
            )}
          >
            <Icon className={cn("h-4 w-4", styles.iconColor)} />
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">{renderValue()}</div>
          {sparklineData && sparklineData.length > 0 && (
            <div className="hidden h-8 w-[4.5rem] shrink-0 opacity-90 sm:block">
              <SparklineChart
                data={sparklineData}
                color={styles.sparkline}
                width={72}
                height={32}
              />
            </div>
          )}
        </div>
      </CardContent>

      {trend !== undefined && (
        <CardFooter className="border-t border-tf-border/60 pt-2">
          <TrendBadge value={trend} label={trendLabel} className="w-full" />
        </CardFooter>
      )}
    </Card>
  );
}
