"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { API } from "@/lib/data-source";
import { Booking } from "@/types";
import { DataTable } from "@/components/tables/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTableRowActions } from "@/components/tables/DataTableRowActions";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TableEntityLink } from "@/components/shared/TableEntityLink";
import { ErrorState } from "@/components/shared/ErrorState";
import { parseApiError } from "@/lib/error-parser";
import { useInvalidationStore } from "@/store/invalidation.store";
import { useBranchStore } from "@/store/branch.store";

export function RecentBookingsTable({
  isLoading: parentLoading,
}: {
  isLoading: boolean;
}) {
  const router = useRouter();
  const lastUpdated = useInvalidationStore((state) => state.lastUpdated);
  const activeBranchId = useBranchStore((state) => state.activeBranchId);
  const activeCurrency = useBranchStore((state) => state.activeCurrency);

  const {
    data = [],
    isLoading: queryLoading,
    error,
    refetch,
  } = useQuery<Booking[]>({
    queryKey: ["bookings", "recent", activeBranchId, lastUpdated],
    queryFn: () => API.getBookings(),
    staleTime: 30_000,
  });

  const isLoading = parentLoading || queryLoading;

  const columns: ColumnDef<Booking>[] = [
    {
      accessorKey: "bookingRef",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Reference" />
      ),
      cell: ({ row }) => (
        <TableEntityLink
          onClick={() => router.push(`/bookings/${row.original.id}`)}
        >
          {row.original.bookingRef}
        </TableEntityLink>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="text-xs text-tf-text-primary">
          {row.original.title || "Untitled"}
        </div>
      ),
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-tf-text-primary">
            {row.original.customer?.firstName} {row.original.customer?.lastName}
          </span>
          <span className="text-xs text-tf-text-muted">
            {row.original.customer?.phone}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-tf-text-primary">
            {row.original.title || "Untitled"}
          </span>
          <span className="text-xs text-tf-text-muted">
            {row.original.bookingRef}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "totalSell",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount" />
      ),
      cell: ({ row }) => (
        <div className="font-semibold text-tf-text-primary font-mono tabular-nums text-sm">
          {formatCurrency(row.original.totalSell || 0, activeCurrency)}
        </div>
      ),
    },
    {
      accessorKey: "bookingStatus",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.original.bookingStatus as any} />
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onView={() => router.push(`/bookings/${row.original.id}`)}
        />
      ),
    },
  ];

  return (
    <div className="bg-tf-surface border border-tf-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="tf-h3 text-tf-text-primary">Recent Bookings</h3>
          <p className="text-sm text-tf-text-secondary">
            Latest flight and package bookings
          </p>
        </div>
        <Link
          href="/bookings"
          prefetch={false}
          className="flex items-center gap-1.5 text-sm font-medium text-tf-primary hover:text-[var(--tf-primary-hover)] transition-colors group"
        >
          View All
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {error && !isLoading ? (
        <ErrorState
          error={parseApiError(error)}
          onRetry={() => refetch()}
          variant="section"
        />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
