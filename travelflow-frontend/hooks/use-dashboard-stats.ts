"use client";

/**
 * useDashboardStats — React Query hook for dashboard data.
 *
 * Manages the full lifecycle: loading, error, retry, caching.
 * The error is pre-parsed into a UserFriendlyError so widgets
 * can display it directly without any processing.
 */

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { API } from "@/lib/data-source";
import { parseApiError, type UserFriendlyError } from "@/lib/error-parser";
import { useInvalidationStore } from "@/store/invalidation.store";
import { useBranchStore } from "@/store/branch.store";
import { queryKeys } from "@/lib/query-keys";
import type { DashboardStats } from "@/types";

export function useDashboardStats(dates?: { from?: Date; to?: Date }) {
  const lastUpdated = useInvalidationStore((state) => state.lastUpdated);
  const activeBranchId = useBranchStore((state) => state.activeBranchId);

  const query = useQuery<DashboardStats>({
    queryKey: [...queryKeys.dashboard.stats(activeBranchId), lastUpdated, dates?.from, dates?.to],
    queryFn: () => API.getDashboardStats(dates),
    staleTime: 60_000, // Dashboard data is fresh for 1 minute
    placeholderData: keepPreviousData,
  });

  const parsedError: UserFriendlyError | null =
    query.error ? parseApiError(query.error) : null;

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: parsedError,
    refetch: query.refetch,
  };
}
