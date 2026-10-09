"use client";

import { useState } from "react";
import { ShieldCheck, Pencil, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@/lib/zod-resolver";
import { showSuccess, showError } from "@/lib/toast-utils";

import { User } from "@/types";
import { Role, PERMISSION_GROUPS } from "@/types/role";
import { useRoles, useCreateRole, useUpdateRolePermissions, useDeleteRole, useUsers } from "@/features/shared/hooks/queries";
import { useAuthStore } from "@/store/auth.store";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DrawerForm } from "@/components/forms/DrawerForm";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Form } from "@/components/ui/form";
import { FormField } from "@/components/forms/FormField";

const roleSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  color: z.string().min(3),
  textColor: z.string().min(3),
});
type RoleFormValues = z.infer<typeof roleSchema>;

function PermissionGroupRow({ group, selectedPermissions, togglePermission, toggleGroup }: {
  group: typeof PERMISSION_GROUPS[number];
  selectedPermissions: string[];
  togglePermission: (perm: string) => void;
  toggleGroup: (groupActions: readonly string[], isAllSelected: boolean) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const groupPermissions = group.actions;
  const selectedCount = groupPermissions.filter(p => selectedPermissions.includes(p as string)).length;
  const isAllSelected = selectedCount === groupPermissions.length;
  const isIndeterminate = selectedCount > 0 && !isAllSelected;

  return (
    <div className="border border-tf-border rounded-lg overflow-hidden bg-tf-surface">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-tf-surface-2 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-tf-text-muted" /> : <ChevronRight className="w-4 h-4 text-tf-text-muted" />}
          <span className="text-sm font-medium">{group.module}</span>
        </div>
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-tf-text-muted">{selectedCount} / {groupPermissions.length}</span>
          <Checkbox
            checked={isAllSelected || (isIndeterminate ? "indeterminate" : false)}
            onCheckedChange={() => toggleGroup(groupPermissions, isAllSelected)}
          />
        </div>
      </div>
      {isExpanded && (
        <div className="p-3 bg-tf-surface-2 border-t border-tf-border grid grid-cols-1 sm:grid-cols-2 gap-3">
          {groupPermissions.map(perm => (
            <div key={perm} className="flex items-center gap-2">
              <Checkbox
                id={`perm-${perm}`}
                checked={selectedPermissions.includes(perm)}
                onCheckedChange={() => togglePermission(perm)}
              />
              <Label htmlFor={`perm-${perm}`} className="text-sm font-normal cursor-pointer">
                {perm.replace(`${group.module}: `, '')}
              </Label>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RolesPage() {
  const { data: roles = [], isLoading: isRolesLoading } = useRoles();
  const { data: users = [], isLoading: isUsersLoading } = useUsers();

  const isLoading = isRolesLoading || isUsersLoading;

  const createMutation = useCreateRole();
  const updatePermissionsMutation = useUpdateRolePermissions();
  const deleteMutation = useDeleteRole();
  const { hasPermission, isAdmin } = usePermissions();
  const canCreateRole = isAdmin || hasPermission("Roles: Create");
  const canEditRole = isAdmin || hasPermission("Roles: Edit");
  const canDeleteRole = isAdmin || hasPermission("Roles: Delete");
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", description: "", color: "#e5e7eb", textColor: "#374151" },
  });

  const getUserCount = (roleName: string) => {
    const roleKey = roleName.toLowerCase() as User["role"];
    return users.filter((u) => u.role === roleKey).length;
  };

  const openEditPermissions = (role: Role) => {
    setEditingRole(role);
    setSelectedPermissions(role.permissions.filter((p) => p !== "all" && p !== "admin"));
    setEditOpen(true);
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const toggleGroup = (groupActions: readonly string[], isAllSelected: boolean) => {
    setSelectedPermissions((prev) => {
      if (isAllSelected) {
        return prev.filter((p) => !groupActions.includes(p));
      } else {
        const set = new Set([...prev, ...groupActions]);
        return Array.from(set);
      }
    });
  };

  const handleSavePermissions = async () => {
    if (!editingRole) return;
    setIsSaving(true);
    try {
      const permsToSave =
        editingRole.name.toLowerCase() === "admin"
          ? selectedPermissions
          : selectedPermissions.filter((p) => p !== "all" && p !== "admin");

      await updatePermissionsMutation.mutateAsync({ id: editingRole.id, permissions: permsToSave });
      showSuccess("Permissions updated");
      setEditOpen(false);

      const currentUser = useAuthStore.getState().user;
      if (
        currentUser &&
        currentUser.role.toLowerCase() === editingRole.name.toLowerCase()
      ) {
        await useAuthStore.getState().fetchMe();
      }
    } catch (e: any) {
      showError(e, { context: "Updating permissions" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async (values: RoleFormValues) => {
    setIsSaving(true);
    try {
      await createMutation.mutateAsync(values);
      showSuccess("Role created");
      setCreateOpen(false);
      form.reset();
    } catch (e: any) {
      showError(e, { context: "Creating role" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setIsSaving(true);
    try {
      await deleteMutation.mutateAsync(roleToDelete.id);
      showSuccess("Role deleted");
      setRoleToDelete(null);
    } catch (e: any) {
      showError(e, { context: "Deleting role" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-tf-surface p-6 rounded-xl border border-tf-border shadow-sm">
        <div>
          <h1 className="tf-h2 text-tf-text-primary">Roles & Permissions</h1>
          <p className="tf-body text-tf-text-secondary mt-1">
            Manage what each role can access across TravelFlow.
          </p>
        </div>
        {canCreateRole && (
          <Button
            onClick={() => {
              form.reset();
              setSelectedPermissions([]);
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Role
          </Button>
        )}
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Permissions Count</TableHead>
              <TableHead>Users</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !roles.length ? (
              [1, 2, 3, 4].map((i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <div className="h-8 bg-tf-surface-2 animate-pulse rounded my-1 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: role.color }}
                    >
                      <ShieldCheck
                        className="w-4 h-4"
                        style={{ color: role.textColor }}
                      />
                    </div>
                    <span className="font-medium text-tf-text-primary">{role.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-tf-text-secondary">{role.description || "—"}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-tf-text-secondary">
                    {role.permissions.length} permissions
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ backgroundColor: role.color, color: role.textColor }}
                  >
                    {getUserCount(role.name)} user{getUserCount(role.name) !== 1 ? "s" : ""}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {role.name.toLowerCase() === "admin" ? (
                    <span className="text-xs text-tf-text-muted italic px-2">System Default</span>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      {canEditRole && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditPermissions(role)}
                        >
                          <Pencil className="w-4 h-4 mr-2" /> Permissions
                        </Button>
                      )}
                      {canDeleteRole && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-tf-danger hover:text-tf-danger hover:bg-tf-danger-soft"
                          onClick={() => setRoleToDelete(role)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
          {roles.length === 0 && !isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-tf-text-muted">
                No roles found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        </Table>
      </div>

      <DrawerForm
        title={`Edit Permissions — ${editingRole?.name ?? ""}`}
        description="Toggle permissions for this role. Changes apply to all users with this role."
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={(e) => {
          e.preventDefault();
          handleSavePermissions();
        }}
        isSubmitting={isSaving}
        size="md"
        submitLabel="Save Permissions"
      >
        <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2">
          {PERMISSION_GROUPS.map((group) => (
            <PermissionGroupRow
              key={group.module}
              group={group}
              selectedPermissions={selectedPermissions}
              togglePermission={togglePermission}
              toggleGroup={toggleGroup}
            />
          ))}
        </div>
      </DrawerForm>

      <DrawerForm
        title="Create New Role"
        description="Define a new role and its permissions."
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={form.handleSubmit(handleCreateRole)}
        isSubmitting={isSaving}
        size="md"
        submitLabel="Create Role"
      >
        <Form {...form}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              label="Role Name"
              required
            />
            <FormField
              control={form.control}
              name="description"
              label="Description"
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="color"
                label="Background Color"
                type="color"
              />
              <FormField
                control={form.control}
                name="textColor"
                label="Text Color"
                type="color"
              />
            </div>

            <div className="pt-4 border-t border-tf-border mt-6">
              <h3 className="text-sm font-medium mb-3">Permissions</h3>
              <div className="grid grid-cols-1 gap-3 max-h-[40vh] overflow-y-auto pr-2">
                {PERMISSION_GROUPS.map((group) => (
                  <PermissionGroupRow
                    key={group.module}
                    group={group}
                    selectedPermissions={selectedPermissions}
                    togglePermission={togglePermission}
                    toggleGroup={toggleGroup}
                  />
                ))}
              </div>
            </div>
          </div>
        </Form>
      </DrawerForm>

      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{roleToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => handleDeleteRole()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
