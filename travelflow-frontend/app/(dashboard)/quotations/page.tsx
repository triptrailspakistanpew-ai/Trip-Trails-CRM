"use client";
import { useBranchStore } from "@/store/branch.store";

import { useEffect, useState } from "react";
import { Plus, FileText, Share2 } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast-utils";

import { useQueryClient } from "@tanstack/react-query";
import { useQuotations, useCreateQuotation, useUpdateQuotation } from "@/features/quotations/hooks/queries";
import { useCustomers } from "@/features/customers/hooks/queries";
import { useSuppliers } from "@/features/suppliers/hooks/queries";
import { useAgents, useBranches } from "@/features/shared/hooks/queries";
import { queryKeys } from "@/lib/query-keys";
import { API } from "@/lib/data-source";
import { DataTable } from "@/components/tables/DataTable";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { DateRange } from "react-day-picker";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/tables/DataTableRowActions";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { QuotationPreviewModal } from "@/components/quotations/QuotationPreviewModal";
import type { QuotationFormValues } from "@/features/quotations/schemas/quotation.schema";
import { mapQuotationToForm } from "@/features/quotations/utils/mapQuotationToForm";

import type { Quotation, Customer, Supplier, Branch, User } from "@/types";

export default function QuotationsPage() {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);

  const router = useRouter();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data = [], isLoading: isQuotationsLoading } = useQuotations(dateRange ? { from: dateRange.from, to: dateRange.to } : undefined);
  const { data: customers = [], isLoading: isCustomersLoading } = useCustomers();
  const { data: suppliers = [], isLoading: isSuppliersLoading } = useSuppliers();
  const { data: branches = [], isLoading: isBranchesLoading } = useBranches();
  const { data: agents = [], isLoading: isAgentsLoading } = useAgents();

  const isLoading = isQuotationsLoading || isCustomersLoading || isSuppliersLoading || isBranchesLoading || isAgentsLoading;

  const createMutation = useCreateQuotation();
  const updateMutation = useUpdateQuotation();

  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);

  const initialValues = {
    customerId: customers[0]?.id ?? "",
    branchId: branches[0]?.id,
    agentId: agents[0]?.id,
  };

  const columns: ColumnDef<Quotation>[] = [
    {
      accessorKey: "quotationRef",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Reference" />
      ),
      cell: ({ row }) => (
        <div className="font-mono text-xs font-medium text-tf-primary">
          {row.original.quotationRef}
        </div>
      ),
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-tf-text-primary">
            {row.original.customer?.firstName ?? "-"}{" "}
            {row.original.customer?.lastName ?? ""}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "grandTotal",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total" />
      ),
      cell: ({ row }) => (
        <span className="font-semibold text-tf-success">
          {activeCurrency} {row.original.grandTotal?.toLocaleString?.() ?? "0"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status as any} />,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onView={() => router.push(`/quotations/${row.original.id}`)}
          onEdit={() => router.push(`/quotations/${row.original.id}/edit`)}
          customActions={(row) => (
            <>
              <DropdownMenuItem
                onClick={() => {
                  window.open(`/print/quotation/${row.original.id}`, "_blank");
                }}
                className="text-tf-text-secondary focus:bg-tf-surface-2 cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4" />
                View PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  showSuccess("Sharing option will be available soon!");
                }}
                className="text-tf-text-secondary focus:bg-tf-surface-2 cursor-pointer"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
            </>
          )}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-tf-surface p-6 rounded-xl border border-tf-border shadow-sm">
        <div>
          <h1 className="tf-h2 text-tf-text-primary">Quotations</h1>
          <p className="tf-body text-tf-text-secondary mt-1">
            Create and manage customer quotations.
          </p>
        </div>
        <Button
          onClick={() => router.push("/quotations/create")}
          className="bg-tf-primary text-white hover:bg-tf-primary-hover shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" /> Create Quotation
        </Button>
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6">
        <DataTable
          columns={columns}
          data={data}
            searchKey="quotationRef"
            searchPlaceholder="Search by reference..."
            isLoading={isLoading}
            extraToolbar={
              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
              />
            }
            emptyState={
              <EmptyState
                icon={Plus}
                title="No quotations found"
                description={dateRange ? "No quotations found in the selected date range." : "Create your first quotation to get started."}
                action={{ label: "Create Quotation", onClick: () => router.push("/quotations/create") }}
              />
            }
          />
        </div>

      <QuotationPreviewModal
        isOpen={!!previewQuotation}
        onClose={() => setPreviewQuotation(null)}
        quotation={previewQuotation}
      />
    </div>
  );
}
