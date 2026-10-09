"use client";

import { useEffect, useState } from "react";
import { GitBranch, Plus, Building2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { showSuccess, showError } from "@/lib/toast-utils";

import { BranchFormValues } from "@/lib/api-client";
import { useBranches, useCreateBranch, useUpdateBranch } from "@/features/shared/hooks/queries";
import type { Branch } from "@/types";
import { Button } from "@/components/ui/button";
import { DrawerForm } from "@/components/forms/DrawerForm";
import { FormField, FormPhoneField, FormSelect } from "@/components/forms/FormField";
import { Form } from "@/components/ui/form";
import { useEntityDrawer } from "@/hooks/use-entity-drawer";
import { usePermissions } from "@/hooks/use-permissions";

const defaultValues: BranchFormValues = {
  name: "",
  code: "",
  city: "",
  address: "",
  phone: "",
  currency: "PKR",
  isHeadOffice: false,
  status: "active",
};

export default function BranchesPage() {
  const router = useRouter();
  const { data: branches = [], isLoading: loading } = useBranches();
  const { hasPermission, isAdmin } = usePermissions();
  const canCreate = isAdmin || hasPermission("Branches: Create");
  const canEdit = isAdmin || hasPermission("Branches: Edit");
  
  const createMutation = useCreateBranch();
  const updateMutation = useUpdateBranch();

  const { isDrawerOpen, editingId, isEditing, openCreate, openEdit, close } = useEntityDrawer();

  const form = useForm<BranchFormValues>({ defaultValues });

  const handleOpenCreate = () => {
    form.reset(defaultValues);
    openCreate();
  };

  const onSubmit = async (values: BranchFormValues) => {
    const payload = {
      ...values,
      isHeadOffice:
        typeof values.isHeadOffice === "string"
          ? values.isHeadOffice === "true"
          : values.isHeadOffice,
    };

    try {
      if (isEditing && editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: payload });
        showSuccess("Branch updated successfully");
      } else {
        await createMutation.mutateAsync(payload);
        showSuccess("Branch created successfully");
      }
      close();
      form.reset(defaultValues);
    } catch (error: unknown) {
      showError(error, { context: isEditing ? "Updating branch" : "Creating branch" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-tf-surface p-6 rounded-xl border border-tf-border shadow-sm">
        <div>
          <h1 className="tf-h2 text-tf-text-primary">Branches</h1>
          <p className="tf-body text-tf-text-secondary mt-1">
            Manage your office locations across Pakistan and GCC.
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={handleOpenCreate}
            className="bg-tf-primary text-white hover:bg-tf-primary-hover shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Branch
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-tf-surface rounded-xl border border-tf-border p-5 h-40 animate-pulse"
            />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-tf-surface rounded-xl border border-tf-border">
          <Building2 className="h-12 w-12 text-tf-text-muted mb-4" />
          <h3 className="tf-h4 text-tf-text-primary mb-1">No branches yet</h3>
          <p className="tf-body text-tf-text-muted mb-4">
            Create your first branch to get started.
          </p>
          {canCreate && (
            <Button
              onClick={handleOpenCreate}
              className="bg-tf-primary text-white hover:bg-tf-primary-hover"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Branch
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {branches.map((branch) => (
            <div
              key={branch.id}
              onClick={() => router.push(`/branches/${branch.id}`)}
              className="bg-tf-surface rounded-xl border border-tf-border p-5 shadow-sm hover:shadow-md hover:border-[var(--tf-primary)] transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tf-primary-soft group-hover:bg-tf-primary transition-colors">
                  <GitBranch className="h-5 w-5 text-tf-primary group-hover:text-white transition-colors" />
                </div>
                <div className="flex items-center gap-2">
                  {branch.isHeadOffice && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-tf-primary-soft text-tf-primary px-2 py-0.5 rounded-full">
                      HQ
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${branch.status === "active" ? "bg-[var(--tf-success-soft)] text-tf-success" : "bg-tf-surface-2 text-tf-text-muted"}`}
                  >
                    {branch.status}
                  </span>
                </div>
              </div>

              <h3 className="tf-h4 text-tf-text-primary mb-1">{branch.name}</h3>
              <div className="flex items-center gap-1 mb-4">
                <MapPin className="h-3 w-3 text-tf-text-muted" />
                <p className="tf-caption text-tf-text-muted">
                  {branch.code} · {branch.city}
                </p>
              </div>

              {canEdit && (
                <div className="flex justify-end pt-4 border-t border-tf-border">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      form.reset({
                        name: branch.name,
                        code: branch.code,
                        city: branch.city,
                        address: branch.address ?? "",
                        phone: branch.phone ?? "",
                        currency: branch.currency ?? "PKR",
                        isHeadOffice: String(branch.isHeadOffice) as any,
                        status: branch.status,
                      });
                      openEdit(branch.id);
                    }}
                    className="text-xs text-tf-text-muted hover:text-tf-primary transition-colors"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <DrawerForm
        title={isEditing ? "Edit Branch" : "Add Branch"}
        description={
          isEditing
            ? "Update branch details."
            : "Create a new office branch for your agency."
        }
        isOpen={isDrawerOpen}
        onClose={close}
        onSubmit={form.handleSubmit(onSubmit)}
        isSubmitting={form.formState.isSubmitting}
        size="xl"
        submitLabel={isEditing ? "Save Changes" : "Create Branch"}
      >
        <Form {...form}>
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                label="Branch Name"
                required
              />
              <FormField
                control={form.control}
                name="code"
                label="Branch Code"
                placeholder="e.g. KHI, LHR"
              />
            </div>
            <FormField
              control={form.control}
              name="city"
              label="City"
              required
            />
            <FormField control={form.control} name="address" label="Address" />
            <FormPhoneField
              control={form.control}
              name="phone"
              label="Phone"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                control={form.control}
                name="currency"
                label="Currency"
                options={[
                  { label: "Pakistani Rupee (PKR)", value: "PKR" },
                  { label: "UAE Dirham (AED)", value: "AED" },
                ]}
              />
              <FormSelect
                control={form.control}
                name="status"
                label="Status"
                options={[
                  { label: "Active", value: "active" },
                  { label: "Inactive", value: "inactive" },
                ]}
              />
              <FormSelect
                control={form.control}
                name="isHeadOffice"
                label="Head Office?"
                options={[
                  { label: "No", value: "false" },
                  { label: "Yes", value: "true" },
                ]}
              />
            </div>
          </div>
        </Form>
      </DrawerForm>
    </div>
  );
}
