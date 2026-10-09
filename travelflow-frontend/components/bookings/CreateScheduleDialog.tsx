"use client";

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
import { Plus, Trash2 } from "lucide-react";
import { useCreatePaymentSchedule } from "@/features/bookings/hooks/queries";
import { showSuccess, showError } from "@/lib/toast-utils";

interface ScheduleItem {
  label: string;
  amount: number | "";
  dueDate: string;
}

interface CreateScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
}

export function CreateScheduleDialog({
  isOpen,
  onClose,
  bookingId,
}: CreateScheduleDialogProps) {
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState<number | "">("");
  const [items, setItems] = useState<ScheduleItem[]>([
    { label: "", amount: "", dueDate: "" },
  ]);
  const createSchedule = useCreatePaymentSchedule();

  const addItem = () => {
    setItems([...items, { label: "", amount: "", dueDate: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ScheduleItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showError("Please enter a schedule title");
      return;
    }
    const numTotal = Number(totalAmount);
    if (!numTotal || numTotal <= 0) {
      showError("Please enter a valid total amount");
      return;
    }
    const validItems = items.filter(
      (item) => item.label.trim() && item.amount && item.dueDate
    );
    if (validItems.length === 0) {
      showError("Please add at least one schedule item");
      return;
    }

    try {
      await createSchedule.mutateAsync({
        bookingId,
        title: title.trim(),
        totalAmount: numTotal,
        items: validItems.map((item) => ({
          label: item.label.trim(),
          amount: Number(item.amount),
          dueDate: item.dueDate,
        })),
      });
      showSuccess("Payment schedule created successfully");
      setTitle("");
      setTotalAmount("");
      setItems([{ label: "", amount: "", dueDate: "" }]);
      onClose();
    } catch (error: any) {
      showError(error.message || "Failed to create payment schedule");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] bg-tf-surface border-tf-border">
        <DialogHeader>
          <DialogTitle className="text-tf-text-primary">
            Create Payment Schedule
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-tf-text-primary">Schedule Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Installment Plan"
              className="bg-tf-surface-2 border-tf-border"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-tf-text-primary">Total Amount</Label>
            <Input
              type="number"
              min={1}
              step="any"
              value={totalAmount}
              onChange={(e) =>
                setTotalAmount(e.target.value ? Number(e.target.value) : "")
              }
              placeholder="0"
              className="bg-tf-surface-2 border-tf-border"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-tf-text-primary">Schedule Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="h-7 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>
            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[1fr_100px_130px_32px] gap-2 items-end"
              >
                <div className="space-y-1">
                  {idx === 0 && (
                    <Label className="text-xs text-tf-text-muted">Label</Label>
                  )}
                  <Input
                    value={item.label}
                    onChange={(e) => updateItem(idx, "label", e.target.value)}
                    placeholder="Label"
                    className="bg-tf-surface-2 border-tf-border h-9"
                  />
                </div>
                <div className="space-y-1">
                  {idx === 0 && (
                    <Label className="text-xs text-tf-text-muted">
                      Amount
                    </Label>
                  )}
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={item.amount}
                    onChange={(e) =>
                      updateItem(
                        idx,
                        "amount",
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                    placeholder="0"
                    className="bg-tf-surface-2 border-tf-border h-9"
                  />
                </div>
                <div className="space-y-1">
                  {idx === 0 && (
                    <Label className="text-xs text-tf-text-muted">
                      Due Date
                    </Label>
                  )}
                  <Input
                    type="date"
                    value={item.dueDate}
                    onChange={(e) => updateItem(idx, "dueDate", e.target.value)}
                    className="bg-tf-surface-2 border-tf-border h-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-tf-danger hover:text-red-600 hover:bg-red-50"
                  onClick={() => removeItem(idx)}
                  disabled={items.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
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
              disabled={createSchedule.isPending}
            >
              {createSchedule.isPending ? "Creating..." : "Create Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
