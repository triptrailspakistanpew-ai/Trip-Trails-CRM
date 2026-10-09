import { formatCurrency, formatShort, formatPKR, cn } from "@/lib/utils";
import { useBranchStore } from "@/store/branch.store";

interface CurrencyDisplayProps {
  amount: number;
  /** If true, shows compact notation (e.g. Rs 4.8 Lac) */
  short?: boolean;
  className?: string;
}

/**
 * Renders a currency value based on the active branch currency. Handles prefix internally — never double-prefix.
 */
export function CurrencyDisplay({
  amount,
  short = false,
  className,
}: CurrencyDisplayProps) {
  const { activeCurrency } = useBranchStore();
  const formatted = formatCurrency(amount, activeCurrency, short);

  // "Rs 125,000" -> ["Rs", "125,000"]
  const [currency, ...rest] = formatted.split(" ");
  const value = rest.join(" ");

  return (
    <span className={cn("font-mono font-medium tabular-nums", className)}>
      <span className="text-sm font-semibold pr-1">{currency}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </span>
  );
}
