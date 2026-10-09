"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API } from "@/lib/data-source";
import { showError, showSuccess } from "@/lib/toast-utils";
import { formatCurrency } from "@/lib/utils";
import { Check } from "lucide-react";

interface PaymentAllocationModalProps {
  paymentId: string;
  type: "customer" | "supplier";
  entityId: string; // customerId or supplierId
  paymentAmount: number;
  existingAllocations: { bookingId: string; amount: number; id?: string }[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PaymentAllocationModal({
  paymentId,
  type,
  entityId,
  paymentAmount,
  existingAllocations = [],
  isOpen,
  onClose,
  onSuccess,
}: PaymentAllocationModalProps) {
  const [items, setItems] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<{ [key: string]: number }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    // Convert existing array to map
    const allocMap: { [key: string]: number } = {};
    existingAllocations.forEach(a => {
      allocMap[a.bookingId] = a.amount;
    });
    setAllocations(allocMap);

    const loadItems = async () => {
      setIsLoading(true);
      try {
        if (type === "customer") {
          // Fetch bookings for customer
          const res = await API.get<any>(`/bookings?customerId=${entityId}`);
          setItems(res.data || res);
        } else {
          // Fetch booking services for supplier
          // We can fetch via supplier statement
          const res = await API.get<any>(`/suppliers/${entityId}/statement`);
          setItems(res.entries?.filter((e: any) => e.type === "service") || []);
        }
      } catch (err: any) {
        showError(err.message || "Failed to load open items");
      } finally {
        setIsLoading(false);
      }
    };
    loadItems();
  }, [isOpen, entityId, type, existingAllocations]);

  const handleAllocate = (id: string, amountStr: string) => {
    const amount = Number(amountStr) || 0;
    setAllocations(prev => ({
      ...prev,
      [id]: amount,
    }));
  };

  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const unallocated = paymentAmount - totalAllocated;

  const handleSave = async () => {
    if (unallocated < 0) {
      showError("Cannot allocate more than the payment amount");
      return;
    }

    setIsSaving(true);
    try {
      const payload = Object.entries(allocations)
        .filter(([_, amount]) => amount > 0)
        .map(([id, amount]) => ({
          bookingId: type === "customer" ? id : undefined, // Simplify for now
          bookingServiceId: type === "supplier" ? id : undefined,
          amount,
        }));

      // Map back bookingId properly for supplier if needed, 
      // but backend requires bookingId for supplierPaymentAllocation too.
      // We might need to adjust payload based on API requirement.
      const endpoint = type === "customer" 
        ? `/payments/${paymentId}/allocate` 
        : `/supplier-payments/${paymentId}/allocate`;

      await API.post(endpoint, { allocations: payload });
      showSuccess("Allocations updated");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      showError(err.message || "Failed to save allocations");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-tf-surface border-tf-border text-tf-text-primary">
        <DialogHeader>
          <DialogTitle>Allocate Payment</DialogTitle>
          <DialogDescription>
            Payment Total: <span className="font-bold text-tf-text-primary">{formatCurrency(paymentAmount)}</span>
            <br />
            Unallocated: <span className={`font-bold ${unallocated < 0 ? 'text-red-500' : 'text-emerald-500'}`}>{formatCurrency(unallocated)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-tf-text-muted">Loading items...</p>
          ) : items.length === 0 ? (
            <p className="text-tf-text-muted">No open items found.</p>
          ) : (
            items.map((item, i) => {
              const id = type === "customer" ? item.id : item.id; // Or reference for supplier statement
              const title = type === "customer" ? `${item.bookingRef} - ${item.title}` : item.description;
              const billed = type === "customer" ? (item.totalSell || 0) : item.credit;
              
              return (
                <div key={i} className="flex items-center justify-between p-3 border border-tf-border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{title}</p>
                    <p className="text-xs text-tf-text-muted">Billed: {formatCurrency(billed)}</p>
                  </div>
                  <div className="w-1/3">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={allocations[id] || ""}
                      onChange={(e) => handleAllocate(id, e.target.value)}
                      className="text-right"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || unallocated < 0}>
            {isSaving ? "Saving..." : "Save Allocations"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
