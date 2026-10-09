"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Printer, Send, FileText, Download, Ban } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast-utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { API } from "@/lib/data-source";
import { useBranchStore } from "@/store/branch.store";

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const activeCurrency = useBranchStore((state) => state.activeCurrency);

  const [invoice, setInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadInvoice = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await API.getInvoice(id as string);
      setInvoice(data);
    } catch (err: any) {
      console.error("Failed to load invoice:", err);
      showError(err.message || "Failed to load invoice details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCancelInvoice = async () => {
    if (!invoice || invoice.status === "cancelled") return;
    if (!confirm(`Are you sure you want to cancel Tax Invoice ${invoice.invoiceRef}? This will post a reversal entry.`)) return;

    setIsCancelling(true);
    try {
      await API.updateInvoiceStatus(invoice.id, "cancelled");
      showSuccess(`Tax Invoice ${invoice.invoiceRef} cancelled successfully`);
      loadInvoice();
    } catch (err: any) {
      showError(err.message || "Failed to cancel invoice");
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!invoice) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-lg text-tf-text-secondary">Tax Invoice not found.</p>
          <Button onClick={() => router.push("/invoices")}>Back to Invoices</Button>
        </div>
      </div>
    );
  }

  const currency = invoice.currency || activeCurrency || "PKR";

  const customerName = invoice.customer?.name || `${invoice.customer?.firstName || ""} ${invoice.customer?.lastName || ""}`.trim() || "N/A";

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-tf-surface p-6 rounded-xl border border-tf-border shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full bg-tf-surface border border-tf-border hover:bg-tf-surface-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="tf-h2 text-tf-text-primary">
                Tax Invoice {invoice.invoiceRef}
              </h1>
              <StatusBadge status={invoice.status as any} />
            </div>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-xs text-tf-text-secondary">
                Issued: {new Date(invoice.createdAt).toLocaleDateString()}
              </p>
              <div className="h-3 w-px bg-tf-border"></div>
              <p className="text-xs text-tf-text-secondary">
                Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => window.open(`/print/invoice/${invoice.id}`, "_blank")}
            className="border-tf-border text-tf-text-secondary hover:bg-tf-surface-2"
          >
            <Printer className="w-4 h-4 mr-2" /> Print / View PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => showSuccess("Tax Invoice emailed successfully")}
            className="border-tf-border text-tf-text-secondary hover:bg-tf-surface-2"
          >
            <Send className="w-4 h-4 mr-2" /> Email
          </Button>
          {invoice.status !== "cancelled" && (
            <Button
              variant="outline"
              onClick={handleCancelInvoice}
              disabled={isCancelling}
              className="border-tf-danger/30 text-tf-danger hover:bg-tf-danger/10"
            >
              <Ban className="w-4 h-4 mr-2" /> {isCancelling ? "Cancelling..." : "Cancel Invoice"}
            </Button>
          )}
        </div>
      </div>

      {/* Grid: Client & Document Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bill To Card */}
        <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-tf-text-muted border-b border-tf-border pb-2">
            Bill To (Customer Details)
          </h3>
          <div className="space-y-1.5 text-sm">
            <p className="font-semibold text-tf-text-primary text-base">{customerName}</p>
            {invoice.customer?.companyName && (
              <p className="text-tf-text-secondary"><span className="text-tf-text-muted">Company:</span> {invoice.customer.companyName}</p>
            )}
            {(invoice.customer?.taxNumber || invoice.customer?.taxId) && (
              <p className="text-tf-text-secondary"><span className="text-tf-text-muted">TRN / Tax No:</span> <span className="font-mono text-tf-primary">{invoice.customer.taxNumber || invoice.customer.taxId}</span></p>
            )}
            {invoice.customer?.phone && (
              <p className="text-tf-text-secondary"><span className="text-tf-text-muted">Phone:</span> {invoice.customer.phone}</p>
            )}
            {invoice.customer?.email && (
              <p className="text-tf-text-secondary"><span className="text-tf-text-muted">Email:</span> {invoice.customer.email}</p>
            )}
            {invoice.customer?.address && (
              <p className="text-tf-text-secondary"><span className="text-tf-text-muted">Address:</span> {invoice.customer.address}</p>
            )}
          </div>
        </div>

        {/* Invoice Metadata Card */}
        <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-tf-text-muted border-b border-tf-border pb-2">
            Tax Invoice Summary
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-tf-text-muted">Invoice Ref:</span>
              <span className="font-mono font-medium text-tf-primary">{invoice.invoiceRef}</span>
            </div>
            {invoice.booking?.bookingRef && (
              <div className="flex justify-between">
                <span className="text-tf-text-muted">Booking Ref:</span>
                <span className="font-mono font-medium text-tf-text-primary">{invoice.booking.bookingRef}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-tf-text-muted">Issue Date:</span>
              <span className="font-medium text-tf-text-primary">{new Date(invoice.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tf-text-muted">Due Date:</span>
              <span className="font-medium text-tf-text-primary">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "N/A"}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-tf-border">
              <span className="text-tf-text-muted">Grand Total:</span>
              <span className="font-bold text-tf-success text-base">{currency} {invoice.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Services / Line Items Table */}
      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6 space-y-4">
        <h3 className="text-base font-semibold text-tf-text-primary border-b border-tf-border pb-3">
          Line Items
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-tf-border text-left text-xs uppercase tracking-wider text-tf-text-muted">
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price ({currency})</th>
                <th className="py-2.5 px-3 text-right">Amount ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items ?? []).map((item: any, idx: number) => (
                <tr key={item.id || idx} className="border-b border-tf-border/50 hover:bg-tf-surface-2/50 transition-colors">
                  <td className="py-3 px-3 font-medium text-tf-text-primary">{item.description}</td>
                  <td className="py-3 px-3 text-center">{item.quantity}</td>
                  <td className="py-3 px-3 text-right text-tf-text-secondary">{item.unitPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-3 text-right font-semibold text-tf-text-primary">{item.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              {(invoice.items ?? []).length === 0 && (
                <tr>
                  <td className="py-6 text-tf-text-muted text-center" colSpan={4}>
                    No line items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="flex justify-end pt-4 border-t border-tf-border">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between text-tf-text-secondary">
              <span>Subtotal:</span>
              <span className="font-medium">{currency} {invoice.subtotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-tf-text-secondary">
              <span>Output Tax (VAT):</span>
              <span className="font-medium text-tf-accent">{currency} {invoice.tax?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-tf-text-primary pt-2 border-t border-tf-border">
              <span>Total Invoice Amount:</span>
              <span className="text-tf-success">{currency} {invoice.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Terms Section */}
      {(invoice.notes || invoice.terms) && (
        <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6 space-y-4">
          <h3 className="text-base font-semibold text-tf-text-primary border-b border-tf-border pb-3">
            Notes & Terms
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {invoice.notes && (
              <div className="space-y-1">
                <p className="text-xs text-tf-text-muted uppercase tracking-wider font-semibold">Notes</p>
                <p className="text-tf-text-secondary whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div className="space-y-1">
                <p className="text-xs text-tf-text-muted uppercase tracking-wider font-semibold">Terms & Conditions</p>
                <p className="text-tf-text-secondary whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
