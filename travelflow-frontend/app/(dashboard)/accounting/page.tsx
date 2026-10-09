"use client";

import { useState, useMemo } from "react";
import {
  BookOpen,
  FileSpreadsheet,
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  Power,
  Search,
  Filter,
  CheckCircle2,
  Building2,
  Tag,
  HelpCircle,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/tables/DataTable";
import { DataTableColumnHeader } from "@/components/tables/DataTableColumnHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Combobox } from "@/components/forms/FormField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useToggleAccountStatus,
  useDeleteAccount,
} from "@/features/finance/hooks/queries";
import type { ChartOfAccount } from "@/types/finance";
import { exportChartOfAccounts } from "@/lib/export-utils";
import { showSuccess, showError } from "@/lib/toast-utils";
import { useBranchStore } from "@/store/branch.store";

const ACCOUNT_TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  ASSET: {
    bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    text: "text-blue-600",
    border: "border-blue-500/20",
  },
  LIABILITY: {
    bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    text: "text-amber-600",
    border: "border-amber-500/20",
  },
  EQUITY: {
    bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    text: "text-purple-600",
    border: "border-purple-500/20",
  },
  REVENUE: {
    bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    text: "text-emerald-600",
    border: "border-emerald-500/20",
  },
  EXPENSE: {
    bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    text: "text-rose-600",
    border: "border-rose-500/20",
  },
};

const SUGGESTED_CATEGORIES: Record<string, string[]> = {
  ASSET: ["Cash & Bank", "Receivables", "Prepaid Expenses", "Fixed Assets", "Taxes"],
  LIABILITY: ["Supplier Liabilities", "Customer Liabilities", "Taxes Payable", "Payroll Liabilities", "Accrued Liabilities", "Loans & Borrowings"],
  EQUITY: ["Equity"],
  REVENUE: ["Operating Revenue", "Other Income"],
  EXPENSE: ["Direct Cost", "Operating Expense", "Payroll Expense"],
};

export default function ChartOfAccountsPage() {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);
  const { data = [], isLoading } = useAccounts();

  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const toggleMutation = useToggleAccountStatus();
  const deleteMutation = useDeleteAccount();

  // Filters
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedOrigin, setSelectedOrigin] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<ChartOfAccount | null>(null);

  // Form States for Create
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<string>("ASSET");
  const [formCategory, setFormCategory] = useState("");
  const [formNormalBalance, setFormNormalBalance] = useState<string>("DEBIT");
  const [formParentAccountId, setFormParentAccountId] = useState<string>("");
  const [formDescription, setFormDescription] = useState("");

  // Form States for Edit
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editParentAccountId, setEditParentAccountId] = useState<string>("");
  const [editNormalBalance, setEditNormalBalance] = useState<string>("DEBIT");

  // Dynamic Categories list from active data
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    data.forEach((a: ChartOfAccount) => {
      if (a.category) set.add(a.category);
    });
    return Array.from(set).sort();
  }, [data]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((a: ChartOfAccount) => {
      if (selectedType !== "ALL" && a.type !== selectedType) return false;
      if (selectedOrigin === "SYSTEM" && !a.isSystem) return false;
      if (selectedOrigin === "CUSTOM" && a.isSystem) return false;
      if (selectedCategory !== "ALL" && a.category !== selectedCategory) return false;
      return true;
    });
  }, [data, selectedType, selectedOrigin, selectedCategory]);

  const resetCreateForm = () => {
    setFormCode("");
    setFormName("");
    setFormType("ASSET");
    setFormCategory("");
    setFormNormalBalance("DEBIT");
    setFormParentAccountId("");
    setFormDescription("");
  };

  const handleOpenCreate = () => {
    resetCreateForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (acc: ChartOfAccount) => {
    setEditingAccount(acc);
    setEditName(acc.name);
    setEditCategory(acc.category || "");
    setEditDescription(acc.description || "");
    setEditParentAccountId(acc.parentAccountId || "");
    setEditNormalBalance(acc.normalBalance);
    setIsEditOpen(true);
  };

  const handleTypeChangeInCreate = (type: string) => {
    setFormType(type);
    // Auto-suggest default normal balance
    if (type === "ASSET" || type === "EXPENSE") {
      setFormNormalBalance("DEBIT");
    } else {
      setFormNormalBalance("CREDIT");
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim()) {
      showError(new Error("Code and Name are required."));
      return;
    }

    try {
      await createMutation.mutateAsync({
        code: formCode.trim(),
        name: formName.trim(),
        type: formType,
        category: formCategory.trim() || undefined,
        normalBalance: formNormalBalance,
        parentAccountId: formParentAccountId || undefined,
        description: formDescription.trim() || undefined,
      });
      showSuccess(`Account ${formCode} created successfully.`);
      setIsCreateOpen(false);
      resetCreateForm();
    } catch (err) {
      showError(err, { context: "Creating Account" });
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    if (!editName.trim()) {
      showError(new Error("Account name is required."));
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: editingAccount.id,
        data: {
          name: editName.trim(),
          category: editCategory.trim() || undefined,
          description: editDescription.trim() || undefined,
          parentAccountId: editParentAccountId || null,
          normalBalance: editNormalBalance,
        },
      });
      showSuccess(`Account ${editingAccount.code} updated successfully.`);
      setIsEditOpen(false);
      setEditingAccount(null);
    } catch (err) {
      showError(err, { context: "Updating Account" });
    }
  };

  const handleToggleStatus = async (acc: ChartOfAccount) => {
    try {
      await toggleMutation.mutateAsync({ id: acc.id, isActive: !acc.isActive });
      showSuccess(`Account ${acc.code} ${acc.isActive ? "deactivated" : "activated"}.`);
    } catch (err) {
      showError(err, { context: "Updating Status" });
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;
    try {
      await deleteMutation.mutateAsync(deletingAccount.id);
      showSuccess(`Account ${deletingAccount.code} deleted successfully.`);
      setDeletingAccount(null);
    } catch (err) {
      showError(err, { context: "Deleting Account" });
      setDeletingAccount(null);
    }
  };

  const columns: ColumnDef<ChartOfAccount>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Code" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-tf-surface-2 border border-tf-border text-tf-text-primary">
            {row.original.code}
          </span>
          {row.original.isSystem ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-500 font-normal">
              System
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/30 text-purple-500 font-normal">
              Custom
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Account Name" />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-tf-text-primary text-sm">
            {row.original.name}
          </span>
          {row.original.description && (
            <span className="text-xs text-tf-text-secondary truncate max-w-xs mt-0.5">
              {row.original.description}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const style = ACCOUNT_TYPE_STYLES[row.original.type] || {
          bg: "bg-tf-surface-2 text-tf-text-secondary",
          text: "",
          border: "",
        };
        return (
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${style.bg} ${style.border}`}
          >
            {row.original.type}
          </span>
        );
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-tf-text-secondary">
          {row.original.category || "—"}
        </span>
      ),
    },
    {
      accessorKey: "normalBalance",
      header: "Normal",
      cell: ({ row }) => (
        <span className="text-xs font-mono text-tf-text-muted">
          {row.original.normalBalance}
        </span>
      ),
    },
    {
      accessorKey: "balance",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Current Balance" />
      ),
      cell: ({ row }) => {
        const bal = row.original.balance ?? 0;
        return (
          <div className="font-mono text-xs font-medium text-tf-text-primary">
            {activeCurrency} {bal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.original.isActive ? "active" : "inactive"} />
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const acc = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 p-0 text-tf-text-secondary hover:text-tf-text-primary">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleOpenEdit(acc)}>
                <Edit2 className="mr-2 h-4 w-4 text-tf-text-secondary" />
                Edit Metadata
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleStatus(acc)}>
                <Power className="mr-2 h-4 w-4 text-tf-text-secondary" />
                {acc.isActive ? "Deactivate Account" : "Activate Account"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={acc.isSystem}
                onClick={() => setDeletingAccount(acc)}
                className="text-red-600 focus:text-red-600 focus:bg-red-500/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-tf-surface p-6 rounded-xl border border-tf-border shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="tf-h2 text-tf-text-primary">Chart of Accounts</h1>
            {isLoading && !data.length ? (
              <span className="inline-block w-20 h-5 bg-tf-surface-2 animate-pulse rounded-md" />
            ) : (
              <Badge variant="secondary" className="font-mono text-xs">
                {data.length} Accounts
              </Badge>
            )}
          </div>
          <p className="tf-body text-tf-text-secondary mt-1">
            Authoritative general ledger structure, default system accounts, and custom account extensions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            disabled={isLoading && !data.length}
            onClick={() => {
              exportChartOfAccounts(filteredData, activeCurrency);
              showSuccess("Chart of Accounts exported successfully.");
            }}
            className="border-tf-border text-tf-text-secondary hover:bg-tf-surface-2"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button
            onClick={handleOpenCreate}
            className="bg-tf-primary text-white hover:bg-tf-primary-hover shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Custom Account
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-tf-surface p-4 rounded-xl border border-tf-border shadow-sm">
        {/* Account Type Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-tf-text-secondary">Type:</span>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="h-8 text-xs w-36 border-tf-border bg-tf-surface">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="ASSET">Assets</SelectItem>
              <SelectItem value="LIABILITY">Liabilities</SelectItem>
              <SelectItem value="EQUITY">Equity</SelectItem>
              <SelectItem value="REVENUE">Revenue</SelectItem>
              <SelectItem value="EXPENSE">Expenses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Origin Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-tf-text-secondary">Origin:</span>
          <Select value={selectedOrigin} onValueChange={setSelectedOrigin}>
            <SelectTrigger className="h-8 text-xs w-32 border-tf-border bg-tf-surface">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Accounts</SelectItem>
              <SelectItem value="SYSTEM">System (Default)</SelectItem>
              <SelectItem value="CUSTOM">User Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-tf-text-secondary">Category:</span>
          <div className="w-52">
            <Combobox
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              options={[
                { label: "All Categories", value: "ALL" },
                ...availableCategories.map((c) => ({ label: c, value: c })),
              ]}
              placeholder="All Categories"
              searchPlaceholder="Search category..."
              emptyText="No category found."
              triggerClassName="h-8 text-xs border-tf-border bg-tf-surface"
            />
          </div>
        </div>

        {/* Quick Reset if filters active */}
        {(selectedType !== "ALL" || selectedOrigin !== "ALL" || selectedCategory !== "ALL") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedType("ALL");
              setSelectedOrigin("ALL");
              setSelectedCategory("ALL");
            }}
            className="h-8 text-xs text-tf-text-secondary hover:text-tf-text-primary ml-auto"
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6">
        <DataTable
          columns={columns}
          data={filteredData}
          searchKey="name"
          searchPlaceholder="Search accounts by name or code..."
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={BookOpen}
              title="No accounts match your filters"
              description="Try adjusting your filter options or add a new custom account."
              action={{ label: "Add Custom Account", onClick: handleOpenCreate }}
            />
          }
        />
      </div>

      {/* Dialog: Create Custom Account */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg bg-tf-surface rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Custom Account</DialogTitle>
            <DialogDescription>
              Create a custom general ledger account. System accounts remain protected.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAccount} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs font-medium">
                  Account Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="code"
                  placeholder="e.g. 1025"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="font-mono text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="type" className="text-xs font-medium">
                  Account Type <span className="text-red-500">*</span>
                </Label>
                <Select value={formType} onValueChange={handleTypeChangeInCreate}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSET">Asset</SelectItem>
                    <SelectItem value="LIABILITY">Liability</SelectItem>
                    <SelectItem value="EQUITY">Equity</SelectItem>
                    <SelectItem value="REVENUE">Revenue</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium">
                Account Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Dubai Islamic Bank - Savings"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-medium">
                  Category
                </Label>
                <Combobox
                  value={formCategory}
                  onValueChange={setFormCategory}
                  options={Array.from(
                    new Set([
                      ...(SUGGESTED_CATEGORIES[formType] || []),
                      ...availableCategories,
                    ])
                  ).map((cat) => ({
                    label: cat,
                    value: cat,
                  }))}
                  placeholder="Select or enter category"
                  searchPlaceholder="Search or type category..."
                  allowCustom
                  triggerClassName="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="normalBalance" className="text-xs font-medium">
                  Normal Balance <span className="text-red-500">*</span>
                </Label>
                <Select value={formNormalBalance} onValueChange={setFormNormalBalance}>
                  <SelectTrigger id="normalBalance">
                    <SelectValue placeholder="Normal balance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEBIT">DEBIT (Dr)</SelectItem>
                    <SelectItem value="CREDIT">CREDIT (Cr)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="parent" className="text-xs font-medium">
                Parent Account (Optional)
              </Label>
              <Select
                value={formParentAccountId || "none"}
                onValueChange={(val) => setFormParentAccountId(val === "none" ? "" : val)}
              >
                <SelectTrigger id="parent">
                  <SelectValue placeholder="None (Top Level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {data
                    .filter((a: ChartOfAccount) => a.type === formType)
                    .map((a: ChartOfAccount) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} – {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                rows={2}
                placeholder="Operational purpose of this account..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-tf-primary text-white hover:bg-tf-primary-hover"
              >
                {createMutation.isPending ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Account Metadata */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Account: {editingAccount?.code}</DialogTitle>
            <DialogDescription>
              Update account metadata. Account code and type are locked to maintain journal integrity.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateAccount} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs font-medium">
                Account Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-category" className="text-xs font-medium">
                  Category
                </Label>
                <Combobox
                  value={editCategory}
                  onValueChange={setEditCategory}
                  options={availableCategories.map((cat) => ({
                    label: cat,
                    value: cat,
                  }))}
                  placeholder="Select or enter category"
                  searchPlaceholder="Search or type category..."
                  allowCustom
                  triggerClassName="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-normal" className="text-xs font-medium">
                  Normal Balance
                </Label>
                <Select value={editNormalBalance} onValueChange={setEditNormalBalance}>
                  <SelectTrigger id="edit-normal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEBIT">DEBIT (Dr)</SelectItem>
                    <SelectItem value="CREDIT">CREDIT (Cr)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-description" className="text-xs font-medium">
                Description
              </Label>
              <Textarea
                id="edit-description"
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-tf-primary text-white hover:bg-tf-primary-hover"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Delete Custom Account */}
      <AlertDialog open={!!deletingAccount} onOpenChange={() => setDeletingAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account: {deletingAccount?.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deletingAccount?.name}</span>?
              If this account contains any historical journal entries, deletion will be blocked to preserve financial data integrity. You may deactivate it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
