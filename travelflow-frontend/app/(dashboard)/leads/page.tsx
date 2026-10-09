"use client";

import { useState, useEffect } from "react";
import { Plus, UserPlus } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { showSuccess, showError } from "@/lib/toast-utils";
import { useRouter } from "next/navigation";

import { Lead, Branch, User } from "@/types";
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead } from "@/features/leads/hooks/queries";
import { useAgents, useBranches } from "@/features/shared/hooks/queries";
import { useAuthStore } from "@/store/auth.store";
import { DataTable } from "@/components/tables/DataTable";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { DateRange } from "react-day-picker";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/tables/DataTableRowActions";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { DrawerForm } from "@/components/forms/DrawerForm";
import {
  FormField,
  FormPhoneField,
  FormTextArea,
  FormSelect,
  FormCombobox,
} from "@/components/forms/FormField";
import { LeadSourceSelector } from "@/components/forms/LeadSourceSelector";
import { Form } from "@/components/ui/form";
import {
  leadSchema,
  LeadFormValues,
} from "@/features/leads/schemas/lead.schema";
import { leadStatusOptions } from "@/features/leads/constants";
import { useEntityDrawer } from "@/hooks/use-entity-drawer";
import {
  leadDefaultValues,
  mapLeadToForm,
} from "@/features/leads/utils/mapLeadToForm";
import { usePermissions } from "@/hooks/use-permissions";

export default function LeadsPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { isDrawerOpen, editingId, isEditing, openCreate, openEdit, close } =
    useEntityDrawer();
  const { hasPermission, isAdmin } = usePermissions();
  const user = useAuthStore((state) => state.user);

  const { data = [], isLoading: isLeadsLoading } = useLeads(dateRange ? { from: dateRange.from, to: dateRange.to } : undefined);
  const { data: agents = [], isLoading: isAgentsLoading } = useAgents();
  const { data: branches = [], isLoading: isBranchesLoading } = useBranches();
  
  const isLoading = isLeadsLoading || isAgentsLoading || isBranchesLoading;

  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();
  const deleteMutation = useDeleteLead();

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: leadDefaultValues,
  });

  const handleOpenCreate = () => {
    const defaults = { ...leadDefaultValues };
    if (!isAdmin && user) {
      defaults.assignedAgentId = user.id;
      defaults.branchId = user.branchId;
    }
    form.reset(defaults);
    openCreate();
  };

  const onSubmit = async (values: LeadFormValues) => {
    try {
      if (isEditing && editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: values });
        showSuccess("Lead updated successfully");
      } else {
        const lead = await createMutation.mutateAsync(values);
        showSuccess("Lead created successfully", {
          description: `Reference: ${lead.leadRef}`,
        });
      }
      close();
      form.reset(leadDefaultValues);
    } catch (error: unknown) {
      showError(error, { context: isEditing ? "Updating lead" : "Creating lead" });
    }
  };

  const handleDelete = async (row: any) => {
    try {
      await deleteMutation.mutateAsync(row.original.id);
      showSuccess("Lead deleted successfully");
    } catch (error: unknown) {
      showError(error, { context: "Deleting lead" });
    }
  };

  const columns: ColumnDef<Lead>[] = [
    {
      accessorKey: "leadRef",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Reference" />
      ),
      cell: ({ row }) => (
        <div className="font-mono text-xs font-medium text-tf-primary">
          {row.original.leadRef}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Contact" />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-tf-text-primary">
            {row.original.name}
          </span>
          <span className="text-xs text-tf-text-muted">
            {row.original.phone}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "destination",
      header: "Destination",
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => (
        <span className="capitalize text-sm">
          {row.original.source.replace("_", " ")}
        </span>
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
      cell: ({ row }) => <StatusBadge status={row.original.status as any} />,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onView={() => router.push(`/leads/${row.original.id}`)}
          onEdit={hasPermission("Leads: Edit") ? () => {
            form.reset(mapLeadToForm(row.original));
            openEdit(row.original.id);
          } : undefined}
          onDelete={hasPermission("Leads: Delete") ? async (r) => {
            if (!confirm(`Delete lead "${r.original.name}"?`)) return;
            try {
              await deleteMutation.mutateAsync(r.original.id);
              showSuccess("Lead deleted");
            } catch (e: unknown) {
              showError(e, { context: "Deleting lead" });
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
          <h1 className="tf-h2 text-tf-text-primary">Leads</h1>
          <p className="tf-body text-tf-text-secondary mt-1">
            Manage and track your prospective customers.
          </p>
        </div>
        <div className="flex gap-4">
          {hasPermission("Leads: Create") && (
            <Button
              onClick={handleOpenCreate}
              className="bg-tf-primary text-white hover:bg-tf-primary-hover shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" /> Add New Lead
            </Button>
          )}
        </div>
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6">
        <DataTable
          columns={columns}
          data={data}
            searchKey="name"
            searchPlaceholder="Search leads by name..."
            isLoading={isLoading}
            filters={[
              {
                column: "status",
                title: "Status",
                options: leadStatusOptions.map(({ label, value }) => ({
                  label,
                  value,
                })),
              },
            ]}
            extraToolbar={
              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
              />
            }
            emptyState={
              <EmptyState
                icon={UserPlus}
                title="No leads found"
                description={dateRange ? "No leads found in the selected date range." : "You haven't added any leads yet. Create your first lead to start tracking your sales pipeline."}
                action={{ label: "Add New Lead", onClick: handleOpenCreate }}
              />
            }
          />
        </div>

      <DrawerForm
        title={isEditing ? "Edit Lead" : "Add New Lead"}
        description={
          isEditing
            ? "Update lead details and pipeline status."
            : "Create a new lead inquiry to start tracking them in your pipeline."
        }
        isOpen={isDrawerOpen}
        onClose={close}
        onSubmit={form.handleSubmit(onSubmit)}
        isSubmitting={form.formState.isSubmitting}
        size="md"
        submitLabel={isEditing ? "Save Changes" : "Create Lead"}
      >
        <Form {...form}>
          <div className="space-y-8">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-tf-text-primary">
                Basic Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  label="Full Name"
                  placeholder="e.g. Ahmed Raza"
                  required
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
                  name="email"
                  label="Email"
                  type="email"
                />
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-tf-text-primary">
                Trip Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="destination"
                  label="Destination"
                  placeholder="e.g. Dubai, Umrah"
                  required
                />
                <FormField
                  control={form.control}
                  name="travelDate"
                  label="Travel Date"
                  type="date"
                />
                <FormField
                  control={form.control}
                  name="budget"
                  label="Budget (PKR)"
                  type="number"
                  placeholder="0 = Unspecified"
                />
                <FormField
                  control={form.control}
                  name="adults"
                  label="Adults"
                  type="number"
                  required
                />
                <FormField
                  control={form.control}
                  name="children"
                  label="Children"
                  type="number"
                />
              </div>
              <FormTextArea
                control={form.control}
                name="specialRequirements"
                label="Special Requirements"
                placeholder="Max 500 chars"
              />
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-tf-text-primary">
                Classification
              </h4>
              <Controller
                control={form.control}
                name="source"
                render={({ field }) => (
                  <LeadSourceSelector
                    value={field.value}
                    onChange={field.onChange}
                    required
                  />
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormCombobox
                  control={form.control}
                  name="status"
                  label="Lead Status"
                  required
                  options={leadStatusOptions.map(({ label, value }) => ({
                    label,
                    value,
                  }))}
                />
                {isAdmin && (
                  <>
                    <FormCombobox
                      control={form.control}
                      name="assignedAgentId"
                      label="Assigned Agent"
                      options={agents.map((a) => ({
                        label: `${a.firstName} ${a.lastName}`,
                        value: a.id,
                      }))}
                    />
                    <FormCombobox
                      control={form.control}
                      name="branchId"
                      label="Branch"
                      options={branches.map((b) => ({
                        label: b.name,
                        value: b.id,
                      }))}
                    />
                  </>
                )}
              </div>
            </div>
            <FormTextArea
              control={form.control}
              name="notes"
              label="Initial Notes"
              placeholder="Optional notes..."
            />
          </div>
        </Form>
      </DrawerForm>
    </div>
  );
}
