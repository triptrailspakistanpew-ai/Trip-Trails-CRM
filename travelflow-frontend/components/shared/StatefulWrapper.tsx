"use client";

import { ReactNode } from "react";
import { ErrorState } from "@/components/shared/ErrorState";
import type { UserFriendlyError } from "@/lib/error-parser";

interface StatefulWrapperProps {
  /** Is the data currently loading? */
  isLoading: boolean;
  /** The parsed error, if the request failed */
  error?: UserFriendlyError | null;
  /** Called when the user clicks "Try again" in the error state */
  onRetry?: () => void;
  /** Is the data set empty (after a successful load)? */
  isEmpty?: boolean;
  /** Custom skeleton/loading component */
  loadingSkeleton: ReactNode;
  /** Custom empty state component (rendered when isEmpty is true) */
  emptyState?: ReactNode;
  /** The actual content to render on success */
  children: ReactNode;
  /** Error variant style */
  errorVariant?: "card" | "section" | "inline";
  className?: string;
}

/**
 * StatefulWrapper — Standardized data-fetching lifecycle for any widget or section.
 *
 * Handles the state machine: Loading → Error/Retry → Empty → Content
 *
 * @example
 * <StatefulWrapper
 *   isLoading={isLoading}
 *   error={error}
 *   onRetry={refetch}
 *   isEmpty={data.length === 0}
 *   loadingSkeleton={<KpiCardSkeleton count={6} />}
 *   emptyState={<EmptyState ... />}
 * >
 *   <KpiRow data={data} />
 * </StatefulWrapper>
 */
export function StatefulWrapper({
  isLoading,
  error,
  onRetry,
  isEmpty,
  loadingSkeleton,
  emptyState,
  children,
  errorVariant = "card",
  className,
}: StatefulWrapperProps) {
  // 1. Loading
  if (isLoading) {
    return <div className={className}>{loadingSkeleton}</div>;
  }

  // 2. Error
  if (error) {
    return (
      <div className={className}>
        <ErrorState error={error} onRetry={onRetry} variant={errorVariant} />
      </div>
    );
  }

  // 3. Empty
  if (isEmpty && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  // 4. Success
  return <>{children}</>;
}
