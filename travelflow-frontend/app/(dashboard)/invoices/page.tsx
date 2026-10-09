"use client";
import { useBranchStore } from "@/store/branch.store";

import { useState, useEffect } from "react";
import { Plus, FileText, Printer, CreditCard, Ban } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";

import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/tables/DataTableRowActions";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { API } from "@/lib/data-source";
import { IssueCreditNoteDialog } from "@/components/invoices/IssueCreditNoteDialog";
import { showSuccess, showError } from "@/lib/toast-utils";
import { usePermissions } from "@/hooks/use-permissions";
import type { Invoice } from "@/types/invoice";

export default function InvoicesPage() {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);

  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [data, setData] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creditNoteInvoice, setCreditNoteInvoice] = useState<Invoice | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const invoices = await API.getInvoices();
      setData(invoices);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (row: any) => {
    try {
      await API.deleteInvoice(row.original.id);
      setData((prev) => prev.filter((inv) => inv.id !== row.original.id));
      showSuccess("Invoice deleted successfully");
    } catch (error: unknown) {
      showError(error, { context: "Deleting invoice" });
    }
  };

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "invoiceRef",
      header: "Invoice #",
      cell: ({ row }) => (
        <div className="font-mono text-xs font-medium text-tf-primary">
          {row.original.invoiceRef}
        </div>
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
      accessorKey: "dueDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Due Date" />
      ),
      cell: ({ row }) => (
        <span className="text-tf-text-secondary">
          {row.original.dueDate
            ? new Date(row.original.dueDate).toLocaleDateString("en-GB")
            : "—"}
        </span>
      ),
    },
    {
      accessorKey: "total",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount" />
      ),
      cell: ({ row }) => (
        <div className="font-semibold text-tf-text-primary">
          {activeCurrency} {(row.original.total || 0).toLocaleString()}
        </div>
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
        <StatusBadge status={row.original.status as any} />
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const handleViewPDF = async () => {
          try {
            window.open(`/print/invoice/${row.original.id}`, "_blank");
          } catch (error: any) {
            // toast error handled upstream
          }
        };

        return (
          <DataTableRowActions
            row={row}
            onView={() => router.push(`/invoices/${row.original.id}`)}
            onDelete={hasPermission("Invoices: Delete") ? handleDelete : undefined}
            deleteLabel="this invoice"
            customActions={(row) => (
              <>
                <DropdownMenuItem
                  onClick={handleViewPDF}
                  className="text-tf-text-secondary focus:bg-tf-surface-2 cursor-pointer"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Print PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setCreditNoteInvoice(row.original)}
                  className="text-tf-text-secondary focus:bg-tf-surface-2 cursor-pointer"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Issue Credit Note
                </DropdownMenuItem>
              </>
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
          <h1 className="tf-h2 text-tf-text-primary">Invoices</h1>
          <p className="tf-body text-tf-text-secondary mt-1">
            Manage billing, pending payments, and customer invoices.
          </p>
        </div>
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6">
        <DataTable
          columns={columns}
          data={data}
          searchKey="invoiceRef"
          searchPlaceholder="Search invoices..."
          isLoading={isLoading}
          filters={[
            {
              column: "status",
              title: "Status",
              options: [
                { label: "Draft", value: "draft" },
                { label: "Sent", value: "sent" },
                { label: "Paid", value: "paid" },
                { label: "Overdue", value: "overdue" },
                { label: "Cancelled", value: "cancelled" },
              ],
            },
          ]}
          emptyState={
            <EmptyState
              icon={FileText}
              title="No invoices found"
              description="No invoices have been generated yet."
            />
          }
        />
      </div>

      {creditNoteInvoice && (
        <IssueCreditNoteDialog
          isOpen={!!creditNoteInvoice}
          onClose={() => setCreditNoteInvoice(null)}
          invoice={creditNoteInvoice}
        />
      )}
    </div>
  );
}
