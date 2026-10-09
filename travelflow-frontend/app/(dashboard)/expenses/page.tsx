"use client";

import { useState, useEffect } from "react";
import { Plus, CreditCard, Upload } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { showSuccess, showError } from "@/lib/toast-utils";
import { useRouter } from "next/navigation";

import { Expense } from "@/types";
import { useExpenses, useCreateExpense, useUpdateExpense, useAccounts } from "@/features/finance/hooks/queries";
import { DataTable } from "@/components/tables/DataTable";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { DateRange } from "react-day-picker";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/tables/DataTableRowActions";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { DrawerForm } from "@/components/forms/DrawerForm";
import { FormField, FormSelect, FormCombobox } from "@/components/forms/FormField";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  expenseSchema,
  ExpenseFormValues,
} from "@/features/expenses/schemas/expense.schema";
import { useEntityDrawer } from "@/hooks/use-entity-drawer";
import {
  expenseDefaultValues,
  mapExpenseToForm,
} from "@/features/expenses/utils/mapExpenseToForm";
import { useBranchStore } from "@/store/branch.store";
import BulkImportModal from "@/components/import/BulkImportModal";

export default function ExpensesPage() {
  const router = useRouter();
  const activeCurrency = useBranchStore(state => state.activeCurrency);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const { isDrawerOpen, editingId, isEditing, openCreate, openEdit, close } =
    useEntityDrawer();

  const { data = [], isLoading } = useExpenses(dateRange ? { from: dateRange.from, to: dateRange.to } : undefined);
  const { data: accounts = [] } = useAccounts();
  
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();

  const expenseAccounts = accounts.filter((a: any) => a.type === "EXPENSE" && a.isActive !== false);
  const paymentAccounts = accounts.filter(
    (a: any) => (a.category === "Cash & Bank" || a.code?.startsWith("10") || a.type === "ASSET") && a.isActive !== false
  );

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: expenseDefaultValues,
  });

  const isPrepaid = form.watch("isPrepaid");

  const handleOpenCreate = () => {
    form.reset({ ...expenseDefaultValues, date: new Date() });
    openCreate();
  };

  const onSubmit = async (values: ExpenseFormValues) => {
    try {
      if (isEditing && editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: values });
        showSuccess("Expense updated successfully");
      } else {
        await createMutation.mutateAsync(values);
        showSuccess("Expense logged successfully");
      }
      close();
      form.reset(expenseDefaultValues);
    } catch (error: unknown) {
      showError(error, { context: isEditing ? "Updating expense" : "Creating expense" });
    }
  };

  const columns: ColumnDef<Expense>[] = [
    {
      accessorKey: "expenseRef",
      header: "Ref",
      cell: ({ row }) => (
        <div className="font-mono text-xs text-tf-text-muted">
          {row.original.expenseRef}
        </div>
      ),
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-tf-text-primary">
            {row.original.title}
          </span>
          <span className="text-xs text-tf-text-secondary capitalize">
            {row.original.category.replace("_", " ")}
          </span>
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
          {new Date(row.original.date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount" />
      ),
      cell: ({ row }) => (
        <div className="font-semibold text-tf-text-primary">
          {activeCurrency} {row.original.amount.toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Payment Method",
      cell: ({ row }) => (
        <span className="capitalize text-tf-text-secondary">
          {row.original.paymentMethod.replace("_", " ")}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${row.original.status === "approved" ? "bg-[var(--tf-success-soft)] text-tf-success" : "bg-[var(--tf-warning-soft)] text-[var(--tf-warning)]"}`}
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
          onView={() => router.push(`/expenses/${row.original.id}`)}
          onEdit={() => {
            form.reset(mapExpenseToForm(row.original));
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
          <h1 className="tf-h2 text-tf-text-primary">Expenses</h1>
          <p className="tf-body text-tf-text-secondary mt-1">
            Log and track operational costs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            className="border-tf-border text-tf-text-secondary hover:bg-tf-surface-2"
          >
            <Upload className="mr-2 h-4 w-4" /> Import Data
          </Button>
          <Button
            onClick={handleOpenCreate}
            className="bg-tf-primary text-white hover:bg-tf-primary-hover shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" /> Log Expense
          </Button>
        </div>
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6">
        <DataTable
          columns={columns}
          data={data}
            searchKey="title"
            searchPlaceholder="Search expenses..."
            isLoading={isLoading}
            extraToolbar={
              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
              />
            }
            filters={[
              {
                column: "status",
                title: "Status",
                options: [
                  { label: "Pending", value: "pending" },
                  { label: "Approved", value: "approved" },
                  { label: "Rejected", value: "rejected" },
                ],
              },
            ]}
            emptyState={
              <EmptyState
                icon={CreditCard}
                title="No expenses recorded"
                description={dateRange ? "No expenses found in the selected date range." : "Log your first operational expense to keep your profit calculations accurate."}
                action={{ label: "Log Expense", onClick: handleOpenCreate }}
              />
            }
          />
        </div>

      <DrawerForm
        title={isEditing ? "Edit Expense" : "Log Expense"}
        description={
          isEditing
            ? "Update expense details."
            : "Record a new operational expense."
        }
        isOpen={isDrawerOpen}
        onClose={close}
        onSubmit={form.handleSubmit(onSubmit)}
        isSubmitting={form.formState.isSubmitting}
        size="md"
        submitLabel={isEditing ? "Save Changes" : "Log Expense"}
      >
        <Form {...form}>
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              label="Expense Description"
              placeholder="e.g. Office Rent"
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                label={`Amount (${activeCurrency})`}
                type="number"
                required
              />
              <FormCombobox
                control={form.control}
                name="category"
                label="Category"
                required
                options={[
                  { label: "Salary", value: "salary" },
                  { label: "Rent", value: "rent" },
                  { label: "Marketing", value: "marketing" },
                  { label: "Utilities", value: "utilities" },
                  { label: "Office Supplies", value: "office_supplies" },
                  { label: "Software", value: "software" },
                  { label: "Travel", value: "travel" },
                  { label: "Other", value: "other" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-tf-text-secondary">
                Date<span className="text-tf-danger ml-0.5">*</span>
              </Label>
              <Controller
                control={form.control}
                name="date"
                render={({ field }) => (
                  <Input
                    type="date"
                    className="rounded-lg bg-tf-surface border-tf-border"
                    value={
                      field.value
                        ? new Date(field.value).toISOString().slice(0, 10)
                        : ""
                    }
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? new Date(e.target.value) : undefined,
                      )
                    }
                  />
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="paidTo" label="Paid To" />
              <FormSelect
                control={form.control}
                name="paymentMethod"
                label="Payment Method"
                required
                options={[
                  { label: "Cash", value: "cash" },
                  { label: "Bank Transfer", value: "bank_transfer" },
                  { label: "Credit Card", value: "credit_card" },
                  { label: "Cheque", value: "cheque" },
                ]}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormCombobox
                control={form.control}
                name="accountId"
                label="Expense Account (Debit)"
                options={expenseAccounts.map((a: any) => ({
                  label: `${a.code} - ${a.name}`,
                  value: a.id,
                }))}
              />
              <FormCombobox
                control={form.control}
                name="paymentAccountId"
                label="Payment Account (Credit)"
                options={paymentAccounts.map((a: any) => ({
                  label: `${a.code} - ${a.name}`,
                  value: a.id,
                }))}
              />
            </div>
            
            <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm border-tf-border bg-tf-surface">
              <Controller
                control={form.control}
                name="isPrepaid"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <div className="space-y-1 leading-none">
                <Label>Is this a Prepaid Expense?</Label>
                <p className="text-sm text-tf-text-secondary">
                  If yes, the expense will be capitalized and amortized over the specified months.
                </p>
              </div>
            </div>

            {isPrepaid && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-md bg-[var(--tf-surface-hover)] border border-tf-border">
                <FormField
                  control={form.control}
                  name="amortizeOverMonths"
                  label="Amortize Over (Months)"
                  type="number"
                  required={isPrepaid}
                />
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-tf-text-secondary">
                    Amortization Start Date<span className="text-tf-danger ml-0.5">*</span>
                  </Label>
                  <Controller
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <Input
                        type="date"
                        className="rounded-lg bg-tf-surface border-tf-border"
                        value={
                          field.value
                            ? new Date(field.value).toISOString().slice(0, 10)
                            : ""
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? new Date(e.target.value) : undefined,
                          )
                        }
                      />
                    )}
                  />
                </div>
              </div>
            )}

            <FormField control={form.control} name="notes" label="Notes" />
          </div>
        </Form>
      </DrawerForm>

      {isImportModalOpen && (
        <BulkImportModal
          open={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          defaultTab="expenses"
          onImportComplete={() => {
            setIsImportModalOpen(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
