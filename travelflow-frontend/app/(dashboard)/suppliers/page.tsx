"use client";
import { useBranchStore } from "@/store/branch.store";

import { useState, useEffect } from "react";
import { Plus, Building2 } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { showSuccess, showError } from "@/lib/toast-utils";
import { useRouter } from "next/navigation";

import { Supplier } from "@/types";
import { useSuppliers, useCreateSupplier, useUpdateSupplier } from "@/features/suppliers/hooks/queries";
import { DataTable } from "@/components/tables/DataTable";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { DateRange } from "react-day-picker";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/tables/DataTableRowActions";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { DrawerForm } from "@/components/forms/DrawerForm";
import { FormField, FormPhoneField, FormSelect, FormCombobox } from "@/components/forms/FormField";
import { Form } from "@/components/ui/form";
import {
  supplierSchema,
  SupplierFormValues,
} from "@/features/suppliers/schemas/supplier.schema";
import { useEntityDrawer } from "@/hooks/use-entity-drawer";
import {
  mapSupplierToForm,
  supplierDefaultValues,
} from "@/features/suppliers/utils/mapSupplierToForm";

export default function SuppliersPage() {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);

  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { isDrawerOpen, editingId, isEditing, openCreate, openEdit, close } =
    useEntityDrawer();

  const { data = [], isLoading } = useSuppliers(dateRange ? { from: dateRange.from, to: dateRange.to } : undefined);
  
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplierDefaultValues,
  });

  const handleOpenCreate = () => {
    form.reset(supplierDefaultValues);
    openCreate();
  };

  const onSubmit = async (values: SupplierFormValues) => {
    try {
      if (isEditing && editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: values });
        showSuccess("Supplier updated successfully");
      } else {
        await createMutation.mutateAsync(values);
        showSuccess("Supplier created successfully");
      }
      close();
      form.reset(supplierDefaultValues);
    } catch (error: unknown) {
      showError(error, { context: isEditing ? "Updating supplier" : "Creating supplier" });
    }
  };

  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Supplier" />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-tf-text-primary">
            {row.original.name}
          </span>
          <span className="text-xs text-tf-text-muted capitalize">
            {row.original.category}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "contactPerson",
      header: "Contact",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm text-tf-text-secondary">
            {row.original.contactPerson || "-"}
          </span>
          <span className="text-xs text-tf-text-muted">
            {row.original.email}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "city",
      header: "Location",
      cell: ({ row }) => (
        <span className="text-tf-text-secondary">
          {row.original.city}, {row.original.country}
        </span>
      ),
    },
    {
      accessorKey: "balance",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Balance Owed" />
      ),
      cell: ({ row }) => (
        <div className="text-tf-danger font-medium">
          {activeCurrency} {row.original.balance.toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${row.original.status === "active" ? "bg-[var(--tf-success-soft)] text-tf-success" : "bg-tf-surface-2 text-tf-text-secondary"}`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onView={() => router.push(`/suppliers/${row.original.id}`)}
          onEdit={() => {
            form.reset(mapSupplierToForm(row.original));
            openEdit(row.original.id);
          }}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-tf-surface p-6 rounded-xl border border-tf-border shadow-sm">
        <div>
          <h1 className="tf-h2 text-tf-text-primary">Suppliers</h1>
          <p className="tf-body text-tf-text-secondary mt-1">
            Manage B2B partners, airlines, and consolidators.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-tf-primary text-white hover:bg-tf-primary-hover shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Supplier
        </Button>
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6">
        <DataTable
          columns={columns}
          data={data}
            searchKey="name"
            searchPlaceholder="Search suppliers..."
            isLoading={isLoading}
            extraToolbar={
              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
              />
            }
            emptyState={
              <EmptyState
                icon={Building2}
                title="No suppliers found"
                description={dateRange ? "No suppliers found in the selected date range." : "Add your first supplier to track payables and booking sources."}
                action={{ label: "Add Supplier", onClick: handleOpenCreate }}
              />
            }
          />
        </div>

      <DrawerForm
        title={isEditing ? "Edit Supplier" : "Add Supplier"}
        description={
          isEditing
            ? "Update supplier contact and category details."
            : "Register a new B2B partner or service provider."
        }
        isOpen={isDrawerOpen}
        onClose={close}
        onSubmit={form.handleSubmit(onSubmit)}
        isSubmitting={form.formState.isSubmitting}
        size="md"
        submitLabel={isEditing ? "Save Changes" : "Add Supplier"}
      >
        <Form {...form}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                label="Company Name"
                required
              />
              <FormCombobox
                control={form.control}
                name="category"
                label="Category"
                required
                options={[
                  { label: "Airline", value: "airline" },
                  { label: "Hotel", value: "hotel" },
                  { label: "Visa", value: "visa" },
                  { label: "Transport", value: "transport" },
                  { label: "Insurance", value: "insurance" },
                  { label: "Consolidator", value: "consolidator" },
                  { label: "Other", value: "other" },
                ]}
              />
            </div>
            <FormField
              control={form.control}
              name="contactPerson"
              label="Contact Person"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                label="Email"
                type="email"
              />
              <FormPhoneField
                control={form.control}
                name="phone"
                label="Phone"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="city" label="City" />
              <FormField
                control={form.control}
                name="country"
                label="Country"
              />
            </div>
          </div>
        </Form>
      </DrawerForm>
    </div>
  );
}
