"use client";
import { useBranchStore } from "@/store/branch.store";

import { useState } from "react";
import { Receipt } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/tables/DataTableRowActions";
import { EmptyState } from "@/components/shared/EmptyState";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { DateRange } from "react-day-picker";
import { usePayments } from "@/features/finance/hooks/queries";

export default function ReceiptsPage() {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);

  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data = [], isLoading } = usePayments(dateRange ? { from: dateRange.from, to: dateRange.to } : undefined);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "paymentRef",
      header: "Payment #",
      cell: ({ row }) => (
        <div className="font-mono text-xs font-medium text-tf-primary">
          {row.original.paymentRef}
        </div>
      ),
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => {
        const customer = row.original.customer;
        const customerName = customer
          ? customer.companyName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
          : "—";

        return (
          <span className="font-medium text-tf-text-primary">
            {customerName || "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => (
        <span className="text-tf-text-secondary">
          {new Date(
            row.original.date ?? row.original.createdAt,
          ).toLocaleDateString("en-GB")}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount Received" />
      ),
      cell: ({ row }) => (
        <div className="font-semibold text-tf-success">
          {activeCurrency} {Number(row.original.amount).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ row }) => (
        <span className="capitalize text-tf-text-secondary">
          {row.original.paymentMethod?.replace("_", " ") || "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className="capitalize text-tf-text-secondary">
          {row.original.status || "—"}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const bookingId = row.original.booking?.id || row.original.bookingId;

        return (
          <DataTableRowActions
            row={row}
            onView={() => bookingId && router.push(`/bookings/${bookingId}`)}
            customActions={(row) => (
              <DropdownMenuItem
                onClick={() => window.open(`/print/receipt/${row.original.id}`, "_blank")}
                className="text-tf-text-secondary focus:bg-tf-surface-2 cursor-pointer"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Payment
              </DropdownMenuItem>
            )}
          />
        );
      },
    },
  ];

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-tf-surface p-6 rounded-xl border border-tf-border shadow-sm">
        <div>
          <h1 className="tf-h2 text-tf-text-primary">Payments</h1>
          <p className="tf-body text-tf-text-secondary mt-1">
            Track incoming customer payments.
          </p>
        </div>
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6">
        <DataTable
          columns={columns}
          data={data}
            searchKey="paymentRef"
            searchPlaceholder="Search payments..."
            isLoading={isLoading}
            extraToolbar={
              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
              />
            }
            emptyState={
              <EmptyState
                icon={Receipt}
                title="No payments recorded"
                description={dateRange ? "No payments found in the selected date range." : "You haven't recorded any payments yet. Add a payment to a booking to get started."}
              />
            }
          />
        </div>
    </div>
  );
}
