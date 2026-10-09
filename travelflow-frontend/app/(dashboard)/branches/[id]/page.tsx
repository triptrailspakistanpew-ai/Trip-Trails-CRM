"use client";

import { use, useEffect, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Users,
  Mail,
  Globe,
  Building,
  UserPlus,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { showSuccess, showError } from "@/lib/toast-utils";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { BranchPerformance } from "@/components/dashboard/BranchPerformance";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { DrawerForm } from "@/components/forms/DrawerForm";
import { FormField, FormPhoneField, FormSelect } from "@/components/forms/FormField";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { API } from "@/lib/data-source";
import { Branch, User, Booking } from "@/types";
import {
  userSchema,
  UserFormValues,
} from "@/features/users/schemas/user.schema";
import { userDefaultValues } from "@/features/users/utils/mapUserToForm";

export default function BranchDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [branch, setBranch] = useState<Branch | null>(null);
  const [agents, setAgents] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({ revenue: 0, bookings: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [addMode, setAddMode] = useState<"assign" | "create">("assign");
  const [assignUserId, setAssignUserId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { ...userDefaultValues, branchId: id, role: "agent" },
  });

  const loadAll = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const branchData = await API.getBranch(id);
      setBranch(branchData);
    } finally {
      setIsLoading(false);
    }
    
    API.getUsers().then(users => {
      setAllUsers(users);
      setAgents(users.filter((u) => u.branchId === id));
    }).catch(console.error);

    API.getBookings({ branchId: id, limit: 100 }).then(branchBookings => {
      setStats({
        revenue: branchBookings.reduce((s: any, b: any) => s + (b.totalSell || 0), 0),
        bookings: branchBookings.length,
      });
    }).catch(console.error);
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  const unassignedUsers = allUsers.filter((u) => u.branchId !== id);

  const handleAssignAgent = async () => {
    if (!assignUserId) {
      showError("Please select a user to assign");
      return;
    }
    setIsSubmitting(true);
    const user = allUsers.find((u) => u.id === assignUserId);
    if (user) {
      await API.updateUser(assignUserId, {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone ?? "",
        role: user.role,
        branchId: id,
        status: user.status,
      });
      showSuccess(`${user.firstName} assigned to ${branch?.name}`);
    }
    setAddAgentOpen(false);
    setAssignUserId("");
    setIsSubmitting(false);
    await loadAll();
  };

  const handleCreateAgent = async (values: UserFormValues) => {
    setIsSubmitting(true);
    try {
      await API.createUser({
        ...values,
        branchId: id,
        role: values.role || "agent",
      });
      showSuccess("Agent created and assigned to branch");
      setAddAgentOpen(false);
      form.reset({ ...userDefaultValues, branchId: id, role: "agent" });
      await loadAll();
    } catch (error: unknown) {
      showError(error, { context: "Creating agent" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddAgent = () => {
    setAddMode("assign");
    setAssignUserId("");
    form.reset({ ...userDefaultValues, branchId: id, role: "agent" });
    setAddAgentOpen(true);
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!branch) {
    return <div className="p-6">Branch not found.</div>;
  }

  const roleColors: Record<string, string> = {
    admin: "var(--tf-danger)",
    manager: "var(--tf-warning)",
    agent: "var(--tf-info)",
    accountant: "var(--tf-success)",
  };

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
          <div>
            <div className="flex items-center gap-3">
              <h1 className="tf-h2 text-tf-text-primary">{branch.name}</h1>
              <span
                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${branch.status === "active" ? "bg-[var(--tf-success-soft)] text-tf-success" : "bg-[var(--tf-danger-soft)] text-tf-danger"}`}
              >
                {branch.status}
              </span>
            </div>
            <p className="tf-body text-tf-text-secondary mt-1 flex items-center gap-2">
              <Building className="w-4 h-4" /> Type:{" "}
              <span className="font-medium text-tf-text-primary">
                {branch.isHeadOffice ? "Main Headquarters" : "Branch Office"}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-tf-surface rounded-xl border border-tf-border p-6 shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-lg font-semibold text-tf-text-primary mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-tf-primary" /> Branch Details
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </p>
              <p className="font-medium text-tf-text-primary">{branch.phone}</p>
            </div>
            <div>
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </p>
              <p className="font-medium text-tf-text-primary truncate">
                {branch.city.toLowerCase()}@travelflow.pk
              </p>
            </div>
            <div>
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Region
              </p>
              <p className="font-medium text-tf-text-primary">{branch.city}</p>
            </div>
            <div className="col-span-2 md:col-span-3">
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1">
                Address
              </p>
              <p className="font-medium text-tf-text-primary">{branch.city}</p>
            </div>
          </div>
        </div>

        <div className="bg-tf-surface rounded-xl border border-tf-border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-tf-text-primary mb-4">
            Current Month Performance
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-tf-border">
              <span className="text-tf-text-secondary">Revenue Generated</span>
              <CurrencyDisplay
                amount={stats.revenue}
                className="font-bold text-tf-success"
              />
            </div>
            <div className="flex justify-between items-center py-2 border-b border-tf-border">
              <span className="text-tf-text-secondary">Total Bookings</span>
              <span className="font-bold text-tf-text-primary">
                {stats.bookings}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-tf-text-secondary flex items-center gap-2">
                <Users className="w-4 h-4 text-tf-text-muted" /> Active Agents
              </span>
              <span className="font-medium text-tf-text-primary">
                {agents.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="bg-tf-surface border border-tf-border p-1 rounded-lg">
          <TabsTrigger
            value="agents"
            className="rounded-md data-[state=active]:bg-tf-primary data-[state=active]:text-white"
          >
            Agents
          </TabsTrigger>
          <TabsTrigger
            value="performance"
            className="rounded-md data-[state=active]:bg-tf-primary data-[state=active]:text-white"
          >
            Performance Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="agents"
          className="mt-4 bg-tf-surface rounded-xl border border-tf-border p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-tf-text-primary">
              Assigned Personnel
            </h3>
            <Button variant="outline" size="sm" onClick={openAddAgent}>
              + Add Agent
            </Button>
          </div>
          {agents.length === 0 ? (
            <p className="text-sm text-tf-text-muted text-center py-8">
              No agents assigned to this branch yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-tf-border hover:bg-tf-surface-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-tf-primary/10 flex items-center justify-center text-tf-primary font-semibold">
                      {agent.firstName.charAt(0)}
                      {agent.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-tf-text-primary">
                        {agent.firstName} {agent.lastName}
                      </p>
                      <p className="text-xs text-tf-text-muted">
                        {agent.email}
                      </p>
                      <span
                        className="text-xs capitalize"
                        style={{ color: roleColors[agent.role] }}
                      >
                        {agent.role}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-tf-text-muted"
                    onClick={() => router.push(`/users/${agent.id}`)}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <div className="max-w-4xl">
            <BranchPerformance isLoading={isLoading} />
          </div>
        </TabsContent>
      </Tabs>

      <DrawerForm
        title="Add Agent to Branch"
        description="Assign an existing user or create a new agent for this branch."
        isOpen={addAgentOpen}
        onClose={() => setAddAgentOpen(false)}
        onSubmit={
          addMode === "create"
            ? form.handleSubmit(handleCreateAgent)
            : (e) => {
              e.preventDefault();
              handleAssignAgent();
            }
        }
        isSubmitting={isSubmitting}
        size="md"
        submitLabel={addMode === "create" ? "Create Agent" : "Assign Agent"}
      >
        <div className="space-y-6">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={addMode === "assign" ? "default" : "outline"}
              size="sm"
              onClick={() => setAddMode("assign")}
              className={addMode === "assign" ? "bg-tf-primary text-white" : ""}
            >
              Assign Existing
            </Button>
            <Button
              type="button"
              variant={addMode === "create" ? "default" : "outline"}
              size="sm"
              onClick={() => setAddMode("create")}
              className={addMode === "create" ? "bg-tf-primary text-white" : ""}
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" /> Create New
            </Button>
          </div>

          {addMode === "assign" ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-tf-text-secondary">
                Select User
                <span className="text-tf-danger ml-0.5">*</span>
              </Label>
              <select
                className="w-full h-10 rounded-lg border border-tf-border bg-tf-surface px-3 text-sm"
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
              >
                <option value="">Select a user...</option>
                {unassignedUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.role}) —{" "}
                    {u.branchId !== id ? "other branch" : ""}
                  </option>
                ))}
                {allUsers.filter((u) => u.branchId !== id).length === 0 && (
                  <option disabled>
                    No users available from other branches
                  </option>
                )}
              </select>
              <p className="text-xs text-tf-text-muted">
                Users from other branches can be reassigned here.
              </p>
            </div>
          ) : (
            <Form {...form}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                <FormSelect
                  control={form.control}
                  name="role"
                  label="Role"
                  required
                  options={[
                    { label: "Agent", value: "agent" },
                    { label: "Manager", value: "manager" },
                  ]}
                />
              </div>
            </Form>
          )}
        </div>
      </DrawerForm>
    </div>
  );
}
