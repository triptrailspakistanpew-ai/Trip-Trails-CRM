"use client";

import { use, useEffect, useState } from "react";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  CalendarDays,
  UserPlus,
  Plane,
  Edit,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { showSuccess, showError } from "@/lib/toast-utils";

import { User, Branch, Role, Lead, Booking } from "@/types";
import { API } from "@/lib/data-source";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { parseApiError } from "@/lib/error-parser";
import { Button } from "@/components/ui/button";
import { DrawerForm } from "@/components/forms/DrawerForm";
import { FormField, FormPhoneField, FormSelect, FormCombobox } from "@/components/forms/FormField";
import { Form } from "@/components/ui/form";
import {
  userSchema,
  UserFormValues,
} from "@/features/users/schemas/user.schema";
import { mapUserToForm } from "@/features/users/utils/mapUserToForm";

const roleColors: Record<string, { bg: string; text: string }> = {
  admin: { bg: "var(--tf-danger-soft)", text: "var(--tf-danger)" },
  manager: { bg: "var(--tf-warning-soft)", text: "var(--tf-warning)" },
  agent: { bg: "var(--tf-info-soft)", text: "var(--tf-info)" },
  accountant: { bg: "var(--tf-success-soft)", text: "var(--tf-success)" },
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [user, setUser] = useState<User | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [leadCount, setLeadCount] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
  });

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [userData, branchList, roleList] = await Promise.all([
        API.getUser(id),
        API.getBranches(),
        API.getRoles(),
      ]);
      setUser(userData);
      setBranches(branchList);
      setRoles(roleList);
      if (userData) {
        setBranch(branchList.find((b) => b.id === userData.branchId) ?? null);
        form.reset(mapUserToForm(userData));
        
        API.getLeads().then((leads: Lead[]) => {
          setLeadCount(leads.filter((l) => l.assignedAgentId === userData.id).length);
        }).catch(console.error);
        
        API.getBookings({ limit: 200 }).then((bookings: Booking[]) => {
          setBookingCount(bookings.filter((b) => b.agentId === userData.id).length);
        }).catch(console.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  const onSubmit = async (values: UserFormValues) => {
    try {
      await API.updateUser(id, values);
      showSuccess("User updated successfully");
      setEditOpen(false);
      await loadAll();
    } catch (error: unknown) {
      showError(error, { context: "Updating user" });
    }
  };

  const [isResetting, setIsResetting] = useState(false);

  const handleResetPassword = async () => {
    if (!confirm("Are you sure you want to reset this user's password? The new password will be 'Password123!'.")) return;
    setIsResetting(true);
    try {
      await API.resetUserPassword(id!);
      showSuccess("Password reset successfully to Password123!");
    } catch (error) {
      showError(error, { context: "Resetting password" });
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return <div className="p-6">User not found.</div>;
  }

  const roleDef = roles.find((r) => r.name === user.role);
  const roleStyle = roleDef
    ? { bg: roleDef.color, text: roleDef.textColor }
    : (roleColors[user.role] ?? {
      bg: "var(--tf-surface-2)",
      text: "var(--tf-text-secondary)",
    });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full bg-tf-surface border border-tf-border"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-tf-primary-soft flex items-center justify-center text-tf-primary font-bold text-2xl">
              {user.firstName.charAt(0)}
              {user.lastName.charAt(0)}
            </div>
            <div>
              <h1 className="tf-h2 text-tf-text-primary">
                {user.firstName} {user.lastName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                  style={{
                    backgroundColor: roleStyle.bg,
                    color: roleStyle.text,
                  }}
                >
                  {user.role}
                </span>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ${user.status === "active" ? "bg-[var(--tf-success-soft)] text-tf-success" : "bg-tf-surface-2 text-tf-text-secondary"}`}
                >
                  {user.status}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleResetPassword}
            disabled={isResetting}
          >
            Reset Password
          </Button>
          <Button
            onClick={() => {
              form.reset(mapUserToForm(user));
              setEditOpen(true);
            }}
            className="bg-tf-primary text-white hover:bg-tf-primary-hover"
          >
            <Edit className="w-4 h-4 mr-2" /> Edit User
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-tf-surface rounded-xl border border-tf-border p-5 shadow-sm">
          <div className="flex items-center gap-2 text-tf-text-muted mb-2">
            <UserPlus className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">
              Leads Handled
            </span>
          </div>
          <p className="text-2xl font-bold text-tf-text-primary">{leadCount}</p>
        </div>
        <div className="bg-tf-surface rounded-xl border border-tf-border p-5 shadow-sm">
          <div className="flex items-center gap-2 text-tf-text-muted mb-2">
            <Plane className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Bookings</span>
          </div>
          <p className="text-2xl font-bold text-tf-text-primary">
            {bookingCount}
          </p>
        </div>
        <div className="bg-tf-surface rounded-xl border border-tf-border p-5 shadow-sm">
          <div className="flex items-center gap-2 text-tf-text-muted mb-2">
            <CalendarDays className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">
              Member Since
            </span>
          </div>
          <p className="text-lg font-semibold text-tf-text-primary">
            {new Date(user.createdAt).toLocaleDateString("en-GB", {
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-tf-text-primary mb-4">
          Profile Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email
            </p>
            <p className="font-medium text-tf-text-primary">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
              <Phone className="w-3 h-3" /> Phone
            </p>
            <p className="font-medium text-tf-text-primary">
              {user.phone ?? "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
              <Building className="w-3 h-3" /> Branch
            </p>
            <p className="font-medium text-tf-text-primary">
              {branch?.name ?? user.branchId}
            </p>
          </div>
          <div>
            <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1">
              Last Login
            </p>
            <p className="font-medium text-tf-text-primary">
              {user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString()
                : "Never logged in"}
            </p>
          </div>
        </div>
      </div>

      <DrawerForm
        title="Edit User"
        description="Update user profile, role, and branch assignment."
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={form.handleSubmit(onSubmit)}
        isSubmitting={form.formState.isSubmitting}
        size="md"
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
                options={roles.map((r) => ({
                  label: r.name,
                  value: r.name,
                }))}
              />
              <FormCombobox
                control={form.control}
                name="branchId"
                label="Branch"
                required
                options={branches.map((b) => ({
                  label: b.name,
                  value: b.id,
                }))}
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
    </div>
  );
}
