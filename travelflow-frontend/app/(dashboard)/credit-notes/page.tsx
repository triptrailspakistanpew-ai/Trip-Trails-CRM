"use client";
import { useBranchStore } from "@/store/branch.store";

import { FileMinus } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";

import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/tables/DataTableRowActions";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCreditNotes } from "@/features/finance/hooks/queries";

export default function CreditNotesPage() {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);

  const router = useRouter();
  const { data = [], isLoading } = useCreditNotes();

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "creditNoteRef",
      header: "Credit Note #",
      cell: ({ row }) => (
        <div className="font-mono text-xs font-medium text-tf-primary">
          {row.original.creditNoteRef}
        </div>
      ),
    },
    {
      accessorKey: "invoice",
      header: "Invoice",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-tf-text-secondary">
          {row.original.invoice?.invoiceRef || "—"}
        </span>
      ),
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => {
        const customer = row.original.customer;
        const name = customer
          ? customer.companyName || `${customer.firstName} ${customer.lastName}`
          : "—";
        return <span className="font-medium text-tf-text-primary">{name}</span>;
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount" />
      ),
      cell: ({ row }) => (
        <div className="font-semibold text-tf-text-primary">
          {activeCurrency} {Number(row.original.amount).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <span className="text-tf-text-secondary">{row.original.reason || "—"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.original.status as any} />
      ),
    },
    {
      accessorKey: "issuedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => (
        <span className="text-tf-text-secondary">
          {new Date(row.original.issuedAt).toLocaleDateString("en-GB")}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const bookingId = row.original.bookingId;
        return (
          <DataTableRowActions
            row={row}
            onView={() => bookingId && router.push(`/bookings/${bookingId}`)}
          />
        );
      },
    },
  ];

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-tf-surface p-6 rounded-xl border border-tf-border shadow-sm">
        <div>
          <h1 className="tf-h2 text-tf-text-primary">Credit Notes</h1>
          <p className="tf-body text-tf-text-secondary mt-1">
            Track credit notes issued against invoices.
          </p>
        </div>
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6">
        <DataTable
          columns={columns}
          data={data}
          searchKey="creditNoteRef"
          searchPlaceholder="Search credit notes..."
          isLoading={isLoading}
          filters={[
            {
              column: "status",
              title: "Status",
              options: [
                { label: "Issued", value: "issued" },
                { label: "Applied", value: "applied" },
                { label: "Cancelled", value: "cancelled" },
              ],
            },
          ]}
          emptyState={
            <EmptyState
              icon={FileMinus}
              title="No credit notes"
              description="No credit notes have been issued yet."
            />
          }
        />
      </div>
    </div>
  );
}
