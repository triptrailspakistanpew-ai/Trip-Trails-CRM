"use client";

import { DataTable } from "@/components/tables/DataTable";
import { formatCurrency } from "@/lib/utils";
import { showSuccess } from "@/lib/toast-utils";
import { FileSpreadsheet } from "lucide-react";
import { exportAPLedger } from "@/lib/export-utils";
import { useBranchStore } from "@/store/branch.store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAPLedger } from "@/features/finance/hooks/queries";

export default function APLedgerPage() {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);
  const router = useRouter();
  const { data = [], isLoading } = useAPLedger();

  const totalOutstanding = data.reduce(
    (sum: number, row: any) => sum + (row.outstandingBalance || 0),
    0
  );

  const columns = [
    {
      accessorKey: "name",
      header: "Supplier",
    },
    {
      accessorKey: "totalIncurred",
      header: "Total Incurred",
      cell: ({ row }: any) => formatCurrency(row.original.totalIncurred),
    },
    {
      accessorKey: "totalPaid",
      header: "Total Paid",
      cell: ({ row }: any) => formatCurrency(row.original.totalPaid),
    },
    {
      accessorKey: "outstandingBalance",
      header: "Outstanding Balance",
      cell: ({ row }: any) => {
        const bal = row.original.outstandingBalance;
        return (
          <span className={bal > 0 ? "text-red-500 font-medium" : "text-emerald-500"}>
            {formatCurrency(bal)}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }: any) => {
        return (
          <Button
            variant="ghost"
            onClick={() => router.push(`/suppliers/${row.original.id}`)}
          >
            View
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-tf-surface p-6 rounded-xl border border-tf-border shadow-sm">
        <PageHeader
          title="Accounts Payable (AP)"
          description="View outstanding balances for all suppliers."
        />

        <div className="flex flex-col items-end gap-2">
          <p className="text-sm font-medium text-tf-text-secondary">Total Outstanding AP</p>
          {isLoading && !data.length ? (
            <Skeleton className="h-9 w-36" />
          ) : (
            <p className="text-3xl font-bold text-red-500">{formatCurrency(totalOutstanding)}</p>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading && !data.length}
            onClick={() => {
              exportAPLedger(data, activeCurrency);
              showSuccess("AP Ledger exported");
            }}
            className="border-tf-border text-tf-text-secondary hover:bg-tf-surface-2"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border overflow-hidden p-6">
        <DataTable
          columns={columns}
          data={data}
          searchKey="name"
          searchPlaceholder="Search suppliers..."
          isLoading={isLoading}
        />
      </div>
    </div >
  );
}
