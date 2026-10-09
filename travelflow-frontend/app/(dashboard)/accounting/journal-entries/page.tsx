"use client";

import { useRouter } from "next/navigation";
import { ScrollText, Plus, FileSpreadsheet } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import type { JournalEntry } from "@/types/finance";
import { exportJournalEntries } from "@/lib/export-utils";
import { useBranchStore } from "@/store/branch.store";
import { showSuccess, showError } from "@/lib/toast-utils";
import {
  useJournalEntries,
  useReverseJournalEntry,
} from "@/features/finance/hooks/queries";

export default function JournalEntriesPage() {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);
  const router = useRouter();
  const { data = [], isLoading } = useJournalEntries();
  const reverseMutation = useReverseJournalEntry();

  const handleReverse = async (id: string, entryNumber: string) => {
    if (
      !confirm(
        `Reverse journal entry ${entryNumber}? This will create a new entry that cancels out this one.`
      )
    )
      return;
    try {
      await reverseMutation.mutateAsync({
        id,
        reason: `Manual reversal of ${entryNumber}`,
      });
      showSuccess(`Journal entry ${entryNumber} reversed`);
    } catch (e: any) {
      showError(e?.message || "Failed to reverse entry");
    }
  };

  const columns: ColumnDef<JournalEntry>[] = [
    {
      accessorKey: "entryNumber",
      header: "Entry #",
      cell: ({ row }) => (
        <div className="font-mono text-xs font-medium text-tf-primary">
          {row.original.entryNumber}
        </div>
      ),
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => (
        <span className="text-tf-text-secondary">
          {new Date(row.original.date).toLocaleDateString("en-GB")}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="font-medium text-tf-text-primary">{row.original.description}</span>
      ),
    },
    {
      accessorKey: "sourceModule",
      header: "Source",
      cell: ({ row }) => (
        <span className="text-tf-text-secondary">{row.original.sourceModule || "—"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      filterFn: (row, id, value) => {
        const rawRowValue = row.getValue(id) as any;
        const rowValue = typeof rawRowValue === 'object' && rawRowValue !== null
          ? (rawRowValue.id || rawRowValue.value || rawRowValue.name || String(rawRowValue))
          : (rawRowValue || "");
        const filterValue = (value as string) || "";
        return String(rowValue).toLowerCase().replace(/[-_ ]/g, '') === filterValue.toLowerCase().replace(/[-_ ]/g, '');
      },
      cell: ({ row }) => (
        <StatusBadge status={row.original.status.toLowerCase().replace(/_/g, '-') as any} />
      ),
    },
    {
      accessorKey: "createdByUser",
      header: "Created By",
      cell: ({ row }) => {
        const user = row.original.createdByUser;
        return (
          <span className="text-tf-text-secondary">
            {user ? `${user.firstName} ${user.lastName}` : "—"}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const entry = row.original;
        if (entry.status !== "POSTED") return <span className="text-tf-text-secondary text-xs">—</span>;
        return (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => handleReverse(entry.id, entry.entryNumber)}
          >
            Reverse
          </Button>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-tf-surface p-6 rounded-xl border border-tf-border shadow-sm">
        <div>
          <h1 className="tf-h2 text-tf-text-primary">Journal Entries</h1>
          <p className="tf-body text-tf-text-secondary mt-1">
            View and manage your accounting journal entries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              exportJournalEntries(data as any, activeCurrency);
              showSuccess("Journal Entries exported");
            }}
            className="border-tf-border text-tf-text-secondary hover:bg-tf-surface-2"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button onClick={() => router.push("/accounting/journal-entries/create")}>
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6">
        <DataTable
          columns={columns}
          data={data}
          searchKey="description"
          searchPlaceholder="Search entries..."
          isLoading={isLoading}
          filters={[
            {
              column: "status",
              title: "Status",
              options: [
                { label: "Draft", value: "draft" },
                { label: "Posted", value: "posted" },
                { label: "Reversed", value: "reversed" },
              ],
            },
          ]}
          emptyState={
            <EmptyState
              icon={ScrollText}
              title="No journal entries found"
              description="No journal entries have been created yet."
            />
          }
        />
      </div>
    </div>
  );
}
