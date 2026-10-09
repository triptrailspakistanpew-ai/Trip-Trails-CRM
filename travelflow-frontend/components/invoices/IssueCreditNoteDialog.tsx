"use client";
import { useBranchStore } from "@/store/branch.store";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCreditNote } from "@/features/finance/hooks/queries";
import { showSuccess, showError } from "@/lib/toast-utils";
import type { Invoice } from "@/types/invoice";

interface IssueCreditNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
}

export function IssueCreditNoteDialog({
  isOpen,
  onClose,
  invoice,
}: IssueCreditNoteDialogProps) {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);

  const [amount, setAmount] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const createCreditNote = useCreateCreditNote();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      showError("Please enter a valid credit amount");
      return;
    }
    if (numAmount > invoice.total) {
      showError(`Amount cannot exceed invoice total (${activeCurrency} ${invoice.total.toLocaleString()})`);
      return;
    }
    if (!reason.trim()) {
      showError("Please provide a reason for the credit note");
      return;
    }

    try {
      await createCreditNote.mutateAsync({
        invoiceId: invoice.id,
        amount: numAmount,
        reason: reason.trim(),
        bookingId: invoice.bookingId,
      });
      showSuccess("Credit note issued successfully");
      setAmount("");
      setReason("");
      onClose();
    } catch (error: any) {
      showError(error.message || "Failed to issue credit note");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] bg-tf-surface border-tf-border">
        <DialogHeader>
          <DialogTitle className="text-tf-text-primary">
            Issue Credit Note
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-tf-surface-2 p-3 rounded-lg border border-tf-border space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-tf-text-secondary">Invoice</span>
              <span className="font-medium text-tf-text-primary font-mono">
                {invoice.invoiceRef}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-tf-text-secondary">Total</span>
              <span className="font-medium text-tf-text-primary">
                {activeCurrency} {invoice.total.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-tf-text-primary">Credit Amount</Label>
            <Input
              type="number"
              min={1}
              max={invoice.total}
              step="any"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value ? Number(e.target.value) : "")
              }
              placeholder="0"
              className="bg-tf-surface-2 border-tf-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-tf-text-primary">Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for issuing this credit note..."
              className="bg-tf-surface-2 border-tf-border min-h-[80px] resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-tf-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-tf-primary text-white hover:bg-tf-primary-hover"
              disabled={createCreditNote.isPending}
            >
              {createCreditNote.isPending ? "Issuing..." : "Issue Credit Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
