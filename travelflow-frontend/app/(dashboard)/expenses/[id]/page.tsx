"use client";

import { use, useEffect, useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  Tag,
  Calendar,
  Banknote,
  FileText,
  CheckCircle,
  Download,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { showSuccess } from "@/lib/toast-utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API } from "@/lib/data-source";
import { Expense } from "@/types";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";

export default function ExpenseDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [expense, setExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const data = await API.getExpense(id);
      setExpense(data);
      setIsLoading(false);
    }
    load();
  }, [id]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!expense) {
    return <div>Expense not found.</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
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
              <h1 className="tf-h2 text-tf-text-primary">{expense.title}</h1>
              <StatusBadge status={expense.status as any} />
            </div>
            <p className="tf-body text-tf-text-secondary mt-1 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Ref:{" "}
              <span className="font-mono font-medium text-tf-text-primary">
                {expense.expenseRef}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expense.status !== "approved" && (
            <Button
              onClick={() => showSuccess("Expense approved")}
              className="bg-[var(--tf-success)] text-white hover:bg-[var(--tf-success)]/90"
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Approve
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              showSuccess("Downloading receipt PDF...");
              window.print();
            }}
            className="bg-tf-surface text-tf-text-primary print:hidden"
          >
            <Download className="w-4 h-4 mr-2" /> Receipt
          </Button>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="bg-tf-surface rounded-xl border border-tf-border p-6 shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-lg font-semibold text-tf-text-primary mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-tf-primary" /> Expense
            Information
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Category
              </p>
              <p className="font-medium text-tf-text-primary capitalize">
                {expense.category.replace("_", " ")}
              </p>
            </div>
            <div>
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <Banknote className="w-3 h-3" /> Payment Method
              </p>
              <p className="font-medium text-tf-text-primary capitalize">
                {expense.paymentMethod.replace("_", " ")}
              </p>
            </div>
            <div>
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Date
              </p>
              <p className="font-medium text-tf-text-primary">
                {new Date(expense.date).toLocaleDateString()}
              </p>
            </div>
            <div className="col-span-2 md:col-span-3">
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1">
                Paid To / Vendor
              </p>
              <p className="font-medium text-tf-text-primary">
                {expense.paidTo || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Amount */}
        <div className="bg-tf-surface rounded-xl border border-tf-border p-6 shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-sm font-medium text-tf-text-secondary mb-2">
            Total Amount
          </p>
          <CurrencyDisplay
            amount={expense.amount}
            className="text-4xl font-bold text-tf-text-primary"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="bg-tf-surface border border-tf-border p-1 rounded-lg">
          <TabsTrigger
            value="details"
            className="rounded-md data-[state=active]:bg-tf-primary data-[state=active]:text-white"
          >
            Metadata
          </TabsTrigger>
          <TabsTrigger
            value="receipts"
            className="rounded-md data-[state=active]:bg-tf-primary data-[state=active]:text-white"
          >
            Receipts / Attachments
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="details"
          className="mt-4 bg-tf-surface rounded-xl border border-tf-border p-6"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-tf-border">
              <span className="text-tf-text-secondary">Recorded By</span>
              <span className="font-medium text-tf-text-primary">
                {expense.recordedById}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-tf-border">
              <span className="text-tf-text-secondary">Branch</span>
              <span className="font-medium text-tf-text-primary">
                {expense.branchId}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-tf-text-secondary">Last Updated</span>
              <span className="font-medium text-tf-text-primary">
                {new Date(expense.updatedAt).toLocaleString()}
              </span>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="receipts"
          className="mt-4 bg-tf-surface rounded-xl border border-tf-border p-6"
        >
          <div className="text-center py-12 border-2 border-dashed border-tf-border rounded-lg">
            <p className="text-tf-text-secondary">
              No receipt attachments found.
            </p>
            <Button
              variant="outline"
              onClick={() => showSuccess("File upload dialog opened")}
              className="mt-4"
            >
              Upload Receipt
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
