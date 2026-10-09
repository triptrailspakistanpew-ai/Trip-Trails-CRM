import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a PKR amount — returns ONLY the formatted number string, no prefix.
 * Use `formatCurrencyPKR` for a complete Rs-prefixed string.
 */
export const formatPKR = (amount: number): string => {
  return amount.toLocaleString('en-PK');
}

/**
 * Format a number in human-readable PKR shorthand:
 * 1,000 → 1K | 10,000 → 10K | 100,000 → 1 Lac | 1,000,000 → 10 Lac | 10,000,000 → 1 Crore
 */
export const formatShort = (amount: number): string => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 10_000_000) {
    const val = abs / 10_000_000;
    return `${sign}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}Cr`;
  }
  if (abs >= 100_000) {
    const val = abs / 100_000;
    return `${sign}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}Lac`;
  }
  if (abs >= 1_000) {
    const val = abs / 1_000;
    return `${sign}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}K`;
  }
  return `${sign}${abs}`;
}

/**
 * Format a number in standard international shorthand (K, M, B)
 */
export const formatShortStandard = (amount: number): string => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    const val = abs / 1_000_000_000;
    return `${sign}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000;
    return `${sign}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    const val = abs / 1_000;
    return `${sign}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}K`;
  }
  return `${sign}${abs}`;
}

/**
 * Full currency string based on currency code
 */
export const formatCurrency = (amount: number, currencyCode: string = "PKR", short = false): string => {
  const isSouthAsian = currencyCode === "PKR" || currencyCode === "INR";
  const symbol = currencyCode === "PKR" ? "Rs" : currencyCode === "AED" ? "AED" : currencyCode;

  if (short) {
    return `${symbol} ${isSouthAsian ? formatShort(amount) : formatShortStandard(amount)}`;
  }
  return `${symbol} ${amount.toLocaleString(isSouthAsian ? 'en-PK' : 'en-US')}`;
}

/**
 * Legacy formatter - delegates to formatCurrency with PKR
 */
export const formatCurrencyPKR = (amount: number, short = false): string => {
  return formatCurrency(amount, "PKR", short);
}

export const formatDate = (date: Date | string) => {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(date))
}

export const formatTimeAgo = (date: Date | string): string => {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}
