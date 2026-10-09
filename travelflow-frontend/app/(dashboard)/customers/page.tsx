"use client";

import { useBranchStore } from "@/store/branch.store";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { showSuccess, showError } from "@/lib/toast-utils";

import { Customer } from "@/types";
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from "@/features/customers/hooks/queries";
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
  customerSchema,
  CustomerFormValues,
  PAKISTAN_CITIES,
  countryForCity,
} from "@/features/customers/schemas/customer.schema";
import { useEntityDrawer } from "@/hooks/use-entity-drawer";
import {
  customerDefaultValues,
  mapCustomerToForm,
} from "@/features/customers/utils/mapCustomerToForm";
import { Controller } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/use-permissions";

export default function CustomersPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { isDrawerOpen, editingId, isEditing, openCreate, openEdit, close } =
    useEntityDrawer();
  const { hasPermission } = usePermissions();
  const activeCurrency = useBranchStore((state) => state.activeCurrency);

  const { data = [], isLoading } = useCustomers(dateRange ? { from: dateRange.from, to: dateRange.to } : undefined);
  
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: customerDefaultValues,
  });

  const handleOpenCreate = () => {
    form.reset(customerDefaultValues);
    openCreate();
  };

  const onSubmit = async (values: CustomerFormValues) => {
    try {
      if (isEditing && editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: values });
        showSuccess("Customer updated successfully");
      } else {
        const customer = await createMutation.mutateAsync(values);
        showSuccess("Customer created successfully", {
          description: `Reference: ${customer.customerRef}`,
        });
      }
      close();
      form.reset(customerDefaultValues);
    } catch (error: unknown) {
      // Form stays open, user input is preserved
      showError(error, { context: isEditing ? "Updating customer" : "Creating customer" });
    }
  };

  const handleDelete = async (row: any) => {
    try {
      await deleteMutation.mutateAsync(row.original.id);
      showSuccess("Customer deleted successfully");
    } catch (error: unknown) {
      showError(error, { context: "Deleting customer" });
    }
  };

  const customerType = form.watch("type");
  const selectedCity = form.watch("city");

  useEffect(() => {
    if (selectedCity) {
      form.setValue("country", countryForCity(selectedCity));
    }
  }, [selectedCity, form]);

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: "customerRef",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Reference" />
      ),
      cell: ({ row }) => (
        <div className="font-mono text-xs font-medium text-tf-primary">
          {row.original.customerRef}
        </div>
      ),
    },
    {
      accessorKey: "firstName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-tf-text-primary">
            {row.original.firstName} {row.original.lastName}
          </span>
          <span className="text-xs text-tf-text-muted">
            {row.original.type === "corporate"
              ? row.original.companyName
              : "Individual"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Contact",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm text-tf-text-secondary">
            {row.original.phone}
          </span>
          <span className="text-xs text-tf-text-muted">
            {row.original.email}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "city",
      header: "City",
      cell: ({ row }) => (
        <span className="text-tf-text-secondary">
          {row.original.city || "-"}
        </span>
      ),
    },
    {
      accessorKey: "totalBookings",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Bookings" />
      ),
      cell: ({ row }) => (
        <span className="font-medium text-tf-text-primary">
          {row.original.totalBookings}
        </span>
      ),
    },
    {
      accessorKey: "totalSpent",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total Spent" />
      ),
      cell: ({ row }) => (
        <div className="text-tf-text-primary">
          {activeCurrency} {row.original.totalSpent.toLocaleString()}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onView={(row) => router.push(`/customers/${row.original.id}`)}
          onEdit={hasPermission("Customers: Edit") ? (row) => {
            form.reset(mapCustomerToForm(row.original));
            openEdit(row.original.id);
          } : undefined}
          onDelete={hasPermission("Customers: Delete") ? handleDelete : undefined}
          deleteLabel="this customer"
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-tf-surface p-6 rounded-xl border border-tf-border shadow-sm">
        <div>
          <h1 className="tf-h2 text-tf-text-primary">Customers</h1>
          <p className="tf-body text-tf-text-secondary mt-1">
            Manage your customer database and profiles.
          </p>
        </div>
        {hasPermission("Customers: Create") && (
          <Button onClick={openCreate} className="bg-tf-primary hover:bg-tf-primary-hover text-white">
            <Plus className="w-4 h-4 mr-2" /> Add Customer
          </Button>
        )}
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6">
        <DataTable
          columns={columns}
          data={data}
            searchKey="firstName"
            searchPlaceholder="Search customers by name..."
            isLoading={isLoading}
            extraToolbar={
              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
              />
            }
            emptyState={
              <EmptyState
                icon={Users}
                title="No customers yet"
                description={dateRange ? "No customers found in the selected date range." : "Your customer database is empty. Add a customer to start managing their profiles and bookings."}
                action={{ label: "Add Customer", onClick: handleOpenCreate }}
              />
            }
          />
        </div>

      <DrawerForm
        title={isEditing ? "Edit Customer" : "Add Customer"}
        description={
          isEditing
            ? "Update customer profile and contact details."
            : "Add a new individual or corporate customer to your database."
        }
        isOpen={isDrawerOpen}
        onClose={close}
        onSubmit={form.handleSubmit(onSubmit)}
        isSubmitting={form.formState.isSubmitting}
        size="md"
        submitLabel={isEditing ? "Save Changes" : "Add Customer"}
      >
        <Form {...form}>
          <div className="space-y-8">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-tf-text-primary">
                Personal Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  label="First Name"
                  required
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  label="Last Name"
                  required
                />
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
                  required
                />
                <FormPhoneField
                  control={form.control}
                  name="whatsapp"
                  label="WhatsApp"
                />
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  label="Date of Birth"
                  type="date"
                />
                <FormSelect
                  control={form.control}
                  name="gender"
                  label="Gender"
                  options={[
                    { label: "Male", value: "male" },
                    { label: "Female", value: "female" },
                    { label: "Prefer not to say", value: "prefer_not_to_say" },
                  ]}
                />
                <FormField
                  control={form.control}
                  name="cnic"
                  label="CNIC"
                  placeholder="XXXXX-XXXXXXX-X"
                />
                <FormField
                  control={form.control}
                  name="passportNumber"
                  label="Passport"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-tf-text-primary">
                Address
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormCombobox
                  control={form.control}
                  name="city"
                  label="City"
                  required
                  options={PAKISTAN_CITIES.map((c) => ({ label: c, value: c }))}
                />
                <FormField
                  control={form.control}
                  name="country"
                  label="Country"
                />
                <FormField
                  control={form.control}
                  name="address"
                  label="Address"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-tf-text-primary">
                Client Type
              </h4>
              <div className="flex items-center gap-3">
                <Label className="normal-case tracking-normal">
                  Individual
                </Label>
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <Switch
                      checked={field.value === "corporate"}
                      onCheckedChange={(checked) =>
                        field.onChange(checked ? "corporate" : "individual")
                      }
                    />
                  )}
                />
                <Label className="normal-case tracking-normal">Corporate</Label>
              </div>
              {customerType === "corporate" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    label="Company Name"
                    required
                  />
                  <FormCombobox
                    control={form.control}
                    name="businessType"
                    label="Business Type"
                    options={[
                      { label: "Travel Agency", value: "Travel Agency" },
                      { label: "Corporate", value: "Corporate" },
                      { label: "NGO", value: "NGO" },
                      { label: "Government", value: "Government" },
                      { label: "Other", value: "Other" },
                    ]}
                  />
                  <FormField
                    control={form.control}
                    name="taxNumber"
                    label="Tax Number (NTN)"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-tf-text-primary">
                Emergency / Notes
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  label="Emergency Contact Name"
                />
                <FormPhoneField
                  control={form.control}
                  name="emergencyContactPhone"
                  label="Emergency Contact Phone"
                />
              </div>
              <FormField
                control={form.control}
                name="internalNotes"
                label="Internal Notes"
              />
            </div>
          </div>
        </Form>
      </DrawerForm>
    </div>
  );
}
