"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { API } from "@/lib/data-source";
import { showSuccess, showError } from "@/lib/toast-utils";
import { formatCurrency } from "@/lib/utils";
import { Building2, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

export interface ConfirmSupplierBillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  service: {
    id: string;
    title: string;
    serviceCategory: string;
    costPrice: number;
    supplierInvoiceAmount?: number | null;
    supplier?: { name: string } | null;
    supplierId?: string | null;
  } | null;
  currency?: string;
  onSuccess?: () => void;
}

export function ConfirmSupplierBillDialog({
  isOpen,
  onClose,
  service,
  currency = "AED",
  onSuccess,
}: ConfirmSupplierBillDialogProps) {
  const [amount, setAmount] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (service) {
      setAmount(
        String(service.supplierInvoiceAmount ?? service.costPrice ?? 0)
      );
      setReference("");
      setDate(new Date().toISOString().split("T")[0]);
    }
  }, [service]);

  if (!service) return null;

  const estimatedCost = Number(service.costPrice || 0);
  const billAmount = Number(amount || 0);
  const variance = billAmount - estimatedCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (billAmount <= 0) {
      showError("Please enter a valid supplier bill amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await API.confirmSupplierInvoice({
        bookingServiceId: service.id,
        supplierInvoiceAmount: billAmount,
        reference: reference.trim() || undefined,
        date: date ? new Date(date) : undefined,
      });

      showSuccess("Supplier bill confirmed successfully", {
        description: `Reclassified to 2010 Confirmed AP for ${formatCurrency(billAmount, currency)}.`,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      showError(err.message || "Failed to confirm supplier bill");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-tf-surface border-tf-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-tf-text-primary">
            <Building2 className="w-5 h-5 text-tf-primary" />
            Confirm Supplier Bill / Obligation
          </DialogTitle>
          <DialogDescription className="text-tf-text-secondary text-xs">
            Verify actual supplier invoice amount to reclassify from Estimated (2000) into Confirmed AP (2010).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Service Summary Header */}
          <div className="p-3 bg-tf-surface-2 rounded-lg border border-tf-border space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-tf-text-primary">
                {service.title}
              </span>
              <Badge variant="outline" className="capitalize text-xs">
                {service.serviceCategory}
              </Badge>
            </div>
            <div className="flex justify-between text-xs text-tf-text-muted">
              <span>Supplier: <strong className="text-tf-text-secondary">{service.supplier?.name || "Unassigned"}</strong></span>
              <span>Estimated Cost: <strong className="text-tf-text-primary">{formatCurrency(estimatedCost, currency)}</strong></span>
            </div>
          </div>

          {/* Bill Amount Input */}
          <div className="space-y-1.5">
            <Label htmlFor="billAmount">Actual Supplier Bill Amount ({currency})</Label>
            <Input
              id="billAmount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 4050"
              required
              className="bg-tf-surface"
            />
          </div>

          {/* Bill Reference Input */}
          <div className="space-y-1.5">
            <Label htmlFor="billReference">Supplier Bill / Invoice Ref #</Label>
            <Input
              id="billReference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. BILL-EK-9988 or INV-4412"
              className="bg-tf-surface"
            />
          </div>

          {/* Bill Date Input */}
          <div className="space-y-1.5">
            <Label htmlFor="billDate">Bill Date</Label>
            <Input
              id="billDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-tf-surface"
            />
          </div>

          {/* Dynamic Variance Analysis Box */}
          <div className="p-3 rounded-lg border text-xs space-y-1 bg-tf-surface-2 border-tf-border">
            <div className="flex justify-between items-center font-medium">
              <span className="text-tf-text-secondary flex items-center gap-1.5">
                {Math.abs(variance) > 0.001 ? (
                  variance > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-tf-danger" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-tf-success" />
                  )
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-tf-primary" />
                )}
                Cost Variance:
              </span>
              <span
                className={`font-mono font-bold ${
                  variance > 0
                    ? "text-tf-danger"
                    : variance < 0
                    ? "text-tf-success"
                    : "text-tf-text-primary"
                }`}
              >
                {variance > 0
                  ? `+${formatCurrency(variance, currency)} (Cost Increase)`
                  : variance < 0
                  ? `-${formatCurrency(Math.abs(variance), currency)} (Cost Savings)`
                  : `${formatCurrency(0, currency)} (Matches Estimate)`}
              </span>
            </div>
            <p className="text-[11px] text-tf-text-muted leading-relaxed">
              {Math.abs(variance) > 0.001
                ? `Clears 2000 Estimated (${formatCurrency(estimatedCost, currency)}), credits 2010 Confirmed AP (${formatCurrency(billAmount, currency)}), and posts difference to 5000 Cost Variance.`
                : `Clears 2000 Estimated (${formatCurrency(estimatedCost, currency)}) and credits 2010 Confirmed AP (${formatCurrency(billAmount, currency)}) with zero variance.`}
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-tf-primary text-white hover:bg-tf-primary-hover"
            >
              {isSubmitting ? "Confirming..." : "Confirm Supplier Bill"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
