"use client";

import { useState, useEffect } from "react";
import { DrawerForm } from "@/components/forms/DrawerForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from "@/lib/toast-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Supplier } from "@/types";
import { API } from "@/lib/data-source";
import { useBranchStore } from "@/store/branch.store";
import { ConfirmSupplierBillDialog } from "@/components/finance/ConfirmSupplierBillDialog";
import { FileCheck, AlertCircle } from "lucide-react";

interface SettleBalanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier;
  onSuccess?: () => void;
}

export function SettleBalanceDrawer({
  isOpen,
  onClose,
  supplier,
  onSuccess,
}: SettleBalanceDrawerProps) {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [reference, setReference] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unconfirmedServices, setUnconfirmedServices] = useState<any[]>([]);
  const [selectedServiceToConfirm, setSelectedServiceToConfirm] = useState<any | null>(null);

  const loadUnconfirmedServices = async () => {
    try {
      const svcs = await API.getSupplierUnconfirmedServices(supplier.id);
      setUnconfirmedServices(svcs);
    } catch (err) {
      console.error("Failed to load supplier unconfirmed services", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUnconfirmedServices();
    }
  }, [isOpen, supplier.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      showError("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await API.recordSupplierPayment(supplier.id, {
        amount: Number(amount),
        method: paymentMethod,
        reference,
      });
      showSuccess(
        `Successfully recorded payment of ${activeCurrency} ${Number(amount).toLocaleString()} to ${supplier.name}`,
      );
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      const err = error as { message?: string };
      showError(err.message || "Failed to process payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DrawerForm
        title="Settle Balance"
        description={`Record a payment made to ${supplier.name}.`}
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        size="sm"
        submitLabel="Record Payment"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-tf-surface-2 rounded-lg border border-tf-border">
            <span className="text-sm text-tf-text-secondary">
              Current Balance
            </span>
            <span className="text-lg font-bold text-tf-danger">
              {activeCurrency} {supplier.balance.toLocaleString()}
            </span>
          </div>

          {/* Unconfirmed Services Notice */}
          {unconfirmedServices.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
                <AlertCircle className="w-4 h-4" />
                <span>Unconfirmed Obligations ({unconfirmedServices.length})</span>
              </div>
              <p className="text-[11px] text-tf-text-muted leading-tight">
                Confirming the bill moves the liability from Account 2000 (Estimated) into Account 2010 (Confirmed AP) and logs cost variance.
              </p>
              <div className="space-y-1.5 pt-1">
                {unconfirmedServices.map((svc) => (
                  <div
                    key={svc.id}
                    className="flex justify-between items-center bg-tf-surface p-2 rounded border border-tf-border text-xs"
                  >
                    <div>
                      <span className="font-medium text-tf-text-primary block">
                        {svc.title}
                      </span>
                      <span className="text-[10px] text-tf-text-muted">
                        Ref: {svc.bookingRef} &bull; Est: {activeCurrency}{" "}
                        {Number(svc.costPrice).toLocaleString()}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 text-[11px] px-2 bg-tf-surface-2"
                      onClick={() => setSelectedServiceToConfirm(svc)}
                    >
                      <FileCheck className="w-3 h-3 mr-1 text-tf-primary" />
                      Confirm Bill
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-tf-text-primary">
                Amount to Pay ({activeCurrency})
              </label>
              <Input
                type="number"
                placeholder="e.g. 50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-tf-surface"
                min="1"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="w-full text-sm font-medium text-tf-text-primary">
                Payment Method
              </label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-tf-surface">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-tf-text-primary">
              Reference / Cheque No. (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g. TRN-12345"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="bg-tf-surface"
            />
          </div>
        </div>
      </DrawerForm>

      <ConfirmSupplierBillDialog
        isOpen={!!selectedServiceToConfirm}
        onClose={() => setSelectedServiceToConfirm(null)}
        service={selectedServiceToConfirm}
        currency={activeCurrency}
        onSuccess={() => {
          loadUnconfirmedServices();
          if (selectedServiceToConfirm) {
            setAmount(String(selectedServiceToConfirm.costPrice));
          }
          onSuccess?.();
        }}
      />
    </>
  );
}
