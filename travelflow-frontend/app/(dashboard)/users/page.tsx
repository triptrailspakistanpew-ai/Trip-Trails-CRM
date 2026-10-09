"use client";

import { useState, useEffect } from "react";
import { Plus, UserCog, Copy, CheckCheck } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { showSuccess, showError } from "@/lib/toast-utils";
import { useRouter } from "next/navigation";

import { User, Branch, Role } from "@/types";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useBranches, useRoles } from "@/features/shared/hooks/queries";
import { useAuthStore } from "@/store/auth.store";
import { usePermissions } from "@/hooks/use-permissions";
import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/tables/DataTableRowActions";
import { TableEntityLink } from "@/components/shared/TableEntityLink";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { DrawerForm } from "@/components/forms/DrawerForm";
import { FormField, FormPhoneField, FormSelect, FormCombobox } from "@/components/forms/FormField";
import { Form } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  userSchema,
  UserFormValues,
} from "@/features/users/schemas/user.schema";
import { useEntityDrawer } from "@/hooks/use-entity-drawer";
import {
  mapUserToForm,
  userDefaultValues,
} from "@/features/users/utils/mapUserToForm";

const roleColors: Record<string, { bg: string; text: string }> = {
  admin: { bg: "var(--tf-danger-soft)", text: "var(--tf-danger)" },
  manager: { bg: "var(--tf-warning-soft)", text: "var(--tf-warning)" },
  agent: { bg: "var(--tf-info-soft)", text: "var(--tf-info)" },
  accountant: { bg: "var(--tf-success-soft)", text: "var(--tf-success)" },
};

export default function UsersPage() {
  const router = useRouter();
  const { isDrawerOpen, editingId, isEditing, openCreate, openEdit, close } = useEntityDrawer();

  // Temp password dialog state
  const [tempPasswordData, setTempPasswordData] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data = [], isLoading: isUsersLoading } = useUsers();
  const { data: branches = [], isLoading: isBranchesLoading } = useBranches();
  const { data: roles = [], isLoading: isRolesLoading } = useRoles();

  const isLoading = isUsersLoading || isBranchesLoading || isRolesLoading;

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const user = useAuthStore((state) => state.user);
  const { hasPermission, isAdmin } = usePermissions();
  const canAccessAllBranches = isAdmin || hasPermission("Branches: Access All");

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: userDefaultValues,
  });

  const handleOpenCreate = () => {
    form.reset({
      ...userDefaultValues,
      branchId: !canAccessAllBranches && user?.branchId ? user.branchId : userDefaultValues.branchId,
    });
    openCreate();
  };

  const onSubmit = async (values: UserFormValues) => {
    try {
      if (isEditing && editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: values });
        showSuccess("User updated successfully");
        close();
        form.reset(userDefaultValues);
      } else {
        const result = await createMutation.mutateAsync(values);
        showSuccess("User created successfully");
        close();
        form.reset(userDefaultValues);

        if (result.tempPassword) {
          setTempPasswordData({
            name: `${result.firstName} ${result.lastName}`,
            email: result.email,
            password: result.tempPassword,
          });
        }
      }
    } catch (error: unknown) {
      showError(error, { context: isEditing ? "Updating user" : "Creating user" });
    }
  };

  const handleDelete = async (row: any) => {
    try {
      await deleteMutation.mutateAsync(row.original.id);
      showSuccess("User deleted successfully");
    } catch (error: unknown) {
      showError(error, { context: "Deleting user" });
    }
  };

  const handleCopyPassword = () => {
    if (tempPasswordData) {
      navigator.clipboard.writeText(tempPasswordData.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getBranchName = (branchId: string) => {
    if (user?.branchId === branchId && user?.branch?.name) {
      return user.branch.name;
    }
    return branches.find((b) => b.id === branchId)?.name ?? branchId;
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "firstName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-tf-primary-soft flex items-center justify-center text-tf-primary font-semibold text-sm">
            {row.original.firstName.charAt(0)}
          </div>
          <div>
            <TableEntityLink
              onClick={() => router.push(`/users/${row.original.id}`)}
            >
              {row.original.firstName} {row.original.lastName}
            </TableEntityLink>
            <p className="text-xs text-tf-text-muted">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const roleDef = roles.find((r) => r.name === row.original.role);
        const style = roleDef
          ? { bg: roleDef.color, text: roleDef.textColor }
          : (roleColors[row.original.role] ?? {
            bg: "var(--tf-surface-2)",
            text: "var(--tf-text-secondary)",
          });
        return (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
            style={{ backgroundColor: style.bg, color: style.text }}
          >
            {row.original.role}
          </span>
        );
      },
    },
    {
      accessorKey: "branchId",
      header: "Branch",
      cell: ({ row }) => (
        <span className="text-sm text-tf-text-secondary">
          {getBranchName(row.original.branchId)}
        </span>
      ),
    },
    {
      accessorKey: "lastLoginAt",
      header: "Last Active",
      cell: ({ row }) => (
        <span className="text-sm text-tf-text-muted">
          {row.original.lastLoginAt
            ? new Date(row.original.lastLoginAt).toLocaleDateString()
            : "Never"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-tf-success capitalize">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--tf-success)] inline-block" />
          {row.original.status}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onView={() => router.push(`/users/${row.original.id}`)}
          onEdit={
            isAdmin || hasPermission("Users: Edit")
              ? () => {
                form.reset(mapUserToForm(row.original));
                openEdit(row.original.id);
              }
              : undefined
          }
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-tf-surface p-6 rounded-xl border border-tf-border shadow-sm">
        <div>
          <h1 className="tf-h2 text-tf-text-primary">Users</h1>
          <p className="tf-body text-tf-text-secondary mt-1">
            Manage team members and their access across branches.
          </p>
        </div>
        {(isAdmin || hasPermission("Users: Create")) && (
          <Button
            onClick={handleOpenCreate}
            className="bg-tf-primary text-white hover:bg-tf-primary-hover shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        )}
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm overflow-hidden p-6">
        <DataTable
          columns={columns}
          data={data}
          searchKey="firstName"
          searchPlaceholder="Search users..."
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={UserCog}
              title="No users yet"
              description="Add team members and assign roles to manage access across branches."
              action={{ label: "Add User", onClick: handleOpenCreate }}
            />
          }
        />
      </div>

      {/* Create/Edit User Drawer */}
      <DrawerForm
        title={isEditing ? "Edit User" : "Add User"}
        description={
          isEditing
            ? "Update user profile, role, and branch assignment."
            : "Create a new team member. A temporary password will be generated automatically."
        }
        isOpen={isDrawerOpen}
        onClose={close}
        onSubmit={form.handleSubmit(onSubmit)}
        isSubmitting={form.formState.isSubmitting}
        size="md"
        text-tf-text-primary
        submitLabel={isEditing ? "Save Changes" : "Create User"}
      >
        <Form {...form}>
          <div className="space-y-6">
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
            </div>
            <FormField
              control={form.control}
              name="email"
              label="Email"
              type="email"
              required
            />
            <FormPhoneField
              control={form.control}
              name="phone"
              label="Phone"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormCombobox
                control={form.control}
                name="role"
                label="Role"
                required
                options={roles
                  .filter((r) => isAdmin || r.name.toLowerCase() !== "admin")
                  .map((r) => ({
                    label: r.name.charAt(0).toUpperCase() + r.name.slice(1),
                    value: r.name.toLowerCase(),
                  }))}
              />
              <FormCombobox
                control={form.control}
                name="branchId"
                label="Branch"
                required
                disabled={!canAccessAllBranches}
                options={
                  !canAccessAllBranches && user?.branchId
                    ? (branches.find((b) => b.id === user.branchId)
                      ? [{ label: branches.find((b) => b.id === user.branchId)!.name, value: user.branchId }]
                      : user.branch
                        ? [{ label: user.branch.name, value: user.branchId }]
                        : [{ label: "My Branch", value: user.branchId }])
                    : branches.map((b) => ({
                      label: b.name,
                      value: b.id,
                    }))
                }
              />
            </div>
            <FormSelect
              control={form.control}
              name="status"
              label="Status"
              required
              options={[
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
                { label: "Invited", value: "invited" },
              ]}
            />
          </div>
        </Form>
      </DrawerForm>

      {/* Temp Password Dialog */}
      <Dialog
        open={!!tempPasswordData}
        onOpenChange={() => setTempPasswordData(null)}
      >
        <DialogContent className="sm:max-w-md bg-tf-surface border-tf-border">
          <DialogHeader>
            <DialogTitle className="text-tf-text-primary">
              User Created Successfully
            </DialogTitle>
            <DialogDescription className="text-tf-text-secondary">
              Share these credentials securely with{" "}
              <strong>{tempPasswordData?.name}</strong>. The password is only
              shown once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-tf-surface-2 border border-tf-border p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-tf-text-muted">Email</span>
                <span className="font-medium text-tf-text-primary">
                  s{tempPasswordData?.email}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-tf-text-muted">Temp Password</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-tf-primary bg-tf-primary-soft px-2 py-1 rounded">
                    {tempPasswordData?.password}
                  </code>
                  <button
                    onClick={handleCopyPassword}
                    className="text-tf-text-muted hover:text-tf-primary transition-colors"
                    title="Copy password"
                  >
                    {copied ? (
                      <CheckCheck className="h-4 w-4 text-tf-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-tf-text-muted">
              ⚠️ Ask the user to change their password after first login.
            </p>
            <Button
              className="w-full bg-tf-primary text-white hover:bg-tf-primary-hover"
              onClick={() => setTempPasswordData(null)}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
