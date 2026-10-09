import { useBranchStore } from "@/store/branch.store";
import { useState, useEffect } from "react";
import { showSuccess, showError } from "@/lib/toast-utils";
import { DrawerForm } from "@/components/forms/DrawerForm";
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
import { Booking } from "@/types";
import { API } from "@/lib/data-source";

interface RecordPaymentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSuccess?: () => void;
}

export function RecordPaymentDrawer({
  isOpen,
  onClose,
  booking,
  onSuccess,
}: RecordPaymentDrawerProps) {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);

  const [amount, setAmount] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalDue = booking?.totalCustomerPayable || booking?.totalSell || 0;

  useEffect(() => {
    if (isOpen && booking) {
      setAmount(totalDue);
      setPaymentMethod("bank_transfer");
      setNotes("");
    }
  }, [isOpen, booking, totalDue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showError("Please enter a valid amount");
      return;
    }

    if (numAmount > totalDue) {
      showError(`Amount cannot exceed total due (${activeCurrency} ${totalDue.toLocaleString()})`);
      return;
    }

    setIsSubmitting(true);
    try {
      await API.createCustomerPayment({
        bookingId: booking.id,
        customerId: booking.customerId,
        amount: numAmount,
        paymentMethod,
        notes,
      });
      showSuccess(
        `Payment of ${activeCurrency} ${numAmount.toLocaleString()} recorded successfully`
      );
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      const err = error as { message?: string };
      showError(err.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!booking) return null;

  return (
    <DrawerForm
      title="Record Payment"
      description={`Record payment for Booking ${booking.bookingRef}`}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Record Payment"
      size="sm"
    >
      <div className="space-y-6 py-4">
        {/* Summary Card */}
        <div className="bg-tf-surface-2 p-4 rounded-xl border border-tf-border space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-tf-text-secondary">Total Amount:</span>
            <span className="font-medium text-tf-text-primary">
              {activeCurrency} {totalDue.toLocaleString()}
            </span>
          </div>
          <div className="pt-3 border-t border-tf-border flex justify-between items-center">
            <span className="font-medium text-tf-text-primary">
              Amount Due:
            </span>
            <span className="font-bold text-tf-danger">
              {activeCurrency} {totalDue.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex justify-between gap-3">

          {/* Amount Input */}
          <div className="space-y-2 w-full">
            <Label className="text-tf-text-primary">Payment Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tf-text-secondary">{activeCurrency}</span>
              <Input
                type="number"
                min={1}
                max={totalDue}
                step="any"
                required
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value ? Number(e.target.value) : "")
                }
                className="pl-12 bg-tf-surface focus-visible:ring-[var(--tf-primary)]"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2 w-full">
            <Label className="text-tf-text-primary">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} >
              <SelectTrigger className="bg-tf-surface focus:ring-[var(--tf-primary)] w-full">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-tf-text-primary">Internal Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-tf-surface min-h-[100px] focus-visible:ring-[var(--tf-primary)] resize-none"
            placeholder="Add any internal notes about this payment..."
          />
        </div>
      </div>
    </DrawerForm>
  );
}
