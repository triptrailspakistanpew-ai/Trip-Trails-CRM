"use client";

import { Scale, FileSpreadsheet } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrialBalanceAccount } from "@/types/finance";
import { exportTrialBalance } from "@/lib/export-utils";
import { useBranchStore } from "@/store/branch.store";
import { showSuccess } from "@/lib/toast-utils";
import { useTrialBalance } from "@/features/finance/hooks/queries";

export default function TrialBalancePage() {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);
  const { data: response, isLoading } = useTrialBalance();

  const data: TrialBalanceAccount[] = response?.accounts || [];
  const totalDebits = response?.totalDebits || 0;
  const totalCredits = response?.totalCredits || 0;
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const columns: ColumnDef<TrialBalanceAccount>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <div className="font-mono text-xs font-medium text-tf-primary">
          {row.original.code}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: "Account Name",
      cell: ({ row }) => (
        <span className="font-medium text-tf-text-primary">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "debit",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Debit" />
      ),
      accessorFn: (row) => (row.balance > 0 ? row.balance : 0),
      cell: ({ row }) => {
        const balance = row.original.balance;
        return (
          <span className="text-tf-text-primary">
            {balance > 0 ? balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
          </span>
        );
      },
    },
    {
      accessorKey: "credit",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Credit" />
      ),
      accessorFn: (row) => (row.balance < 0 ? Math.abs(row.balance) : 0),
      cell: ({ row }) => {
        const balance = row.original.balance;
        return (
          <span className="text-tf-text-primary">
            {balance < 0 ? Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-tf-surface p-6 rounded-xl border border-tf-border shadow-sm">
        <div>
          <h1 className="tf-h2 text-tf-text-primary">Trial Balance</h1>
          <p className="tf-body text-tf-text-secondary mt-1">
            Summary of all account balances to verify debits equal credits.
          </p>
        </div>
        {isLoading && !response ? (
          <Skeleton className="h-6 w-24 rounded-full" />
        ) : (
          <Badge
            variant={isBalanced ? "default" : "destructive"}
            className={isBalanced ? "bg-green-100 text-green-800 border-green-200" : ""}
          >
            {isBalanced ? "Balanced" : "Unbalanced"}
          </Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading && !data.length}
          onClick={() => {
            exportTrialBalance(data, totalDebits, totalCredits, activeCurrency);
            showSuccess("Trial Balance exported");
          }}
          className="border-tf-border text-tf-text-secondary hover:bg-tf-surface-2 ml-2"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6">
        <DataTable
          columns={columns}
          data={data}
          searchKey="name"
          searchPlaceholder="Search accounts..."
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={Scale}
              title="No accounts found"
              description="No chart of accounts entries have been created yet."
            />
          }
        />

        <div className="mt-4 flex items-center justify-end gap-8 border-t border-tf-border pt-4">
          <div className="text-sm">
            <span className="text-tf-text-secondary">Total Debits: </span>
            {isLoading && !response ? (
              <Skeleton className="h-4 w-20 inline-block align-middle ml-1" />
            ) : (
              <span className="font-semibold text-tf-text-primary">
                {totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
          <div className="text-sm">
            <span className="text-tf-text-secondary">Total Credits: </span>
            {isLoading && !response ? (
              <Skeleton className="h-4 w-20 inline-block align-middle ml-1" />
            ) : (
              <span className="font-semibold text-tf-text-primary">
                {totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
