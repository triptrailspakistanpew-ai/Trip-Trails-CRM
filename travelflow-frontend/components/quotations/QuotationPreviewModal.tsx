"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Printer, X } from "lucide-react";
import type { Quotation } from "@/types";

interface QuotationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
}

export function QuotationPreviewModal({
  isOpen,
  onClose,
  quotation,
}: QuotationPreviewModalProps) {
  if (!quotation) return null;

  const handlePrint = () => {
    window.open(`/print/quotation/${quotation.id}`, "_blank");
  };

  const handleShare = () => {
    const phone = quotation.customer?.phone || quotation.customer?.whatsapp;
    if (!phone) {
      alert("No phone number available for this customer.");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    // Default WhatsApp web link
    const text = encodeURIComponent(
      `Hi ${quotation.customer?.firstName ?? ""}, your quotation ${
        quotation.quotationRef || ""
      } is ready.`,
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-tf-surface border-tf-border">
        <DialogHeader>
          <DialogTitle className="text-tf-text-primary text-xl font-bold flex items-center justify-between">
            Quotation Created
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-4 py-6">
          <div className="w-16 h-16 bg-[var(--tf-success)]/10 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-tf-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-tf-text-primary">
            Quotation {quotation.quotationRef}
          </h3>
          <p className="text-sm text-tf-text-secondary text-center">
            Successfully generated for{" "}
            <span className="font-medium text-tf-text-primary">
              {quotation.customer?.firstName} {quotation.customer?.lastName}
            </span>
          </p>
          <p className="text-lg font-bold text-tf-primary">
            {(quotation as any).currency || "PKR"} {quotation.grandTotal?.toLocaleString()}
          </p>
        </div>
        <DialogFooter className="w-full sm:justify-between flex flex-col sm:flex-row gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto min-w-[120px]">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="w-full sm:w-auto min-w-[120px] text-[var(--tf-primary)] border-[var(--tf-primary)] hover:bg-[var(--tf-primary)]/10"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print PDF
            </Button>
            <Button
              onClick={handleShare}
              className="w-full sm:w-auto min-w-[120px] bg-[var(--tf-success)] hover:bg-[var(--tf-success)]/90 text-white border-0"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
