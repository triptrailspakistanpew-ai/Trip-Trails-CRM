"use client";
import { useBranchStore } from "@/store/branch.store";

import { useState } from "react";
import { Plus, Plane, FileSpreadsheet, Upload } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { showSuccess, showError, showInfo } from "@/lib/toast-utils";
import { exportSalesReport } from "@/lib/export-utils";
import { Booking } from "@/types";
import { 
  useBookings, 
  useDeleteBooking 
} from "@/features/bookings/hooks/queries";
import { useCustomers } from "@/features/customers/hooks/queries";
import { DataTable } from "@/components/tables/DataTable";
import { DateRange } from "react-day-picker";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/tables/DataTableRowActions";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { EmptyState } from "@/components/shared/EmptyState";
import { useEntityDrawer } from "@/hooks/use-entity-drawer";
import { usePermissions } from "@/hooks/use-permissions";
import { BookingDrawer } from "@/components/bookings/BookingDrawer";
import BulkImportModal from "@/components/import/BulkImportModal";



export default function BookingsPage() {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);

  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const { isDrawerOpen, editingId, isEditing, openCreate, openEdit, close } =
    useEntityDrawer();
  const { hasPermission } = usePermissions();

  const { data = [], isLoading: isBookingsLoading } = useBookings(dateRange ? { from: dateRange.from, to: dateRange.to } : undefined);
  const { data: customers = [], isLoading: isCustomersLoading } = useCustomers();
  
  const isLoading = isBookingsLoading || isCustomersLoading;

  const deleteMutation = useDeleteBooking();

  const handleOpenCreate = () => {
    openCreate();
  };

  const handleExportSalesReport = () => {
    if (!data || data.length === 0) {
      showInfo("No bookings to export");
      return;
    }
    let dateLabel: string | undefined;
    if (dateRange?.from && dateRange?.to) {
      dateLabel = `${dateRange.from.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} to ${dateRange.to.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
    } else if (dateRange?.from) {
      dateLabel = `From ${dateRange.from.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
    }
    exportSalesReport(data, activeCurrency, dateLabel);
    showSuccess("Sales report exported");
  };

  const columns: ColumnDef<Booking>[] = [
    {
      accessorKey: "bookingRef",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Reference" />
      ),
      cell: ({ row }) => (
        <div className="font-mono text-xs font-medium text-tf-primary">
          {row.original.bookingRef}
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
            {row.original.services?.length || 0} services
          </span>
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
        </div>
      ),
    },
    {
      accessorKey: "services",
      header: "Route",
      cell: ({ row }) => {
        const route = row.original.services?.map((s: any) => s.title).join(", ") || "No services";
        return (
          <div className="flex flex-col max-w-[250px]">
            <span className="text-xs text-tf-text-muted truncate" title={route}>
              {route}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "totalProfit",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Profit Margin" />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-tf-success">
            {activeCurrency} {(row.original.totalProfit || 0).toLocaleString()}
          </span>
          <span className="text-xs text-tf-text-muted">
            {(row.original.profitMargin || 0).toFixed(1)}% margin
          </span>
        </div>
      ),
    },
    {
      accessorKey: "bookingStatus",
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
        <StatusBadge status={row.original.bookingStatus as any} />
      ),
    },
    {
      accessorKey: "paymentStatus",
      header: "Payment",
      filterFn: (row, id, value) => {
        const rawRowValue = row.getValue(id) as any;
        const rowValue = typeof rawRowValue === 'object' && rawRowValue !== null 
          ? (rawRowValue.id || rawRowValue.value || rawRowValue.name || String(rawRowValue))
          : (rawRowValue || "");
        const filterValue = (value as string) || "";
        return String(rowValue).toLowerCase().replace(/[-_ ]/g, '') === filterValue.toLowerCase().replace(/[-_ ]/g, '');
      },
      cell: ({ row }) => (
        <StatusBadge status={row.original.paymentStatus as any} />
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onView={() => router.push(`/bookings/${row.original.id}`)}
          onEdit={hasPermission("Bookings: Edit") ? () => {
            openEdit(row.original.id);
          } : undefined}
          onDelete={hasPermission("Bookings: Delete") ? async (r) => {
            if (!confirm(`Delete booking "${r.original.bookingRef}"?`)) return;
            try {
              await deleteMutation.mutateAsync(r.original.id);
              showSuccess("Booking deleted");
            } catch (e: any) {
              showError(e.message || "Failed to delete booking");
            }
          } : undefined}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-tf-surface p-6 rounded-xl border border-tf-border shadow-sm">
        <div>
          <h1 className="tf-h2 text-tf-text-primary">Bookings</h1>
          <p className="tf-body text-tf-text-secondary mt-1">
            Manage flight and package bookings, tracking revenue and margins.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission("Bookings: Create") && (
            <Button
              variant="outline"
              onClick={() => setIsImportModalOpen(true)}
              className="border-tf-border text-tf-text-secondary hover:bg-tf-surface-2"
            >
              <Upload className="mr-2 h-4 w-4" /> Import Data
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleExportSalesReport}
            className="border-tf-border text-tf-text-secondary hover:bg-tf-surface-2"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Sales Report
          </Button>
          {hasPermission("Bookings: Create") && (
            <Button
              onClick={handleOpenCreate}
              className="bg-tf-primary text-white hover:bg-tf-primary-hover shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" /> Create Booking
            </Button>
          )}
        </div>
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6">
        <DataTable
          columns={columns}
          data={data}
            searchKey="bookingRef"
            searchPlaceholder="Search by reference..."
            isLoading={isLoading}
            filters={[
              {
                column: "bookingStatus",
                title: "Status",
                options: [
                  { label: "Confirmed", value: "confirmed" },
                  { label: "Pending", value: "pending" },
                  { label: "Visa Processing", value: "visa_processing" },
                  { label: "Completed", value: "completed" },
                  { label: "Refunded", value: "refunded" },
                  { label: "Cancelled", value: "cancelled" },
                ],
              },
              {
                column: "paymentStatus",
                title: "Payment",
                options: [
                  { label: "Unpaid", value: "unpaid" },
                  { label: "Partial", value: "partial" },
                  { label: "Paid", value: "paid" },
                ],
              },
            ]}
            enableExport
            extraToolbar={
              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
              />
            }
            emptyState={
              <EmptyState
                icon={Plane}
                title="No bookings found"
                description={dateRange ? "No bookings found in the selected date range." : "Create your first booking to start tracking revenue and profit."}
                action={{ label: "Create Booking", onClick: handleOpenCreate }}
              />
            }
          />
        </div>

      <BookingDrawer
        isOpen={isDrawerOpen}
        onClose={close}
        booking={isEditing ? data.find((b) => b.id === editingId) : null}
        customers={customers}
        onSuccess={() => close()}
      />

      {isImportModalOpen && (
        <BulkImportModal
          open={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          defaultTab="sales"
          onImportComplete={() => {
            setIsImportModalOpen(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
