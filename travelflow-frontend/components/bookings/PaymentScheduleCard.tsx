"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, CheckCircle2 } from "lucide-react";
import { PaymentSchedule, PaymentScheduleItem } from "@/types";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { API } from "@/lib/data-source";
import { showSuccess, showError } from "@/lib/toast-utils";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
  paid: {
    label: "Paid",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  },
};

interface PaymentScheduleCardProps {
  schedule: PaymentSchedule;
}

export function PaymentScheduleCard({ schedule }: PaymentScheduleCardProps) {
  const [markingId, setMarkingId] = useState<string | null>(null);
  const qc = useQueryClient();

  const handleMarkPaid = async (item: PaymentScheduleItem) => {
    setMarkingId(item.id);
    try {
      await API.updateScheduleItemStatus(item.id, { status: "paid" });
      showSuccess(`"${item.label}" marked as paid`);
      qc.invalidateQueries({
        queryKey: queryKeys.paymentSchedules.all,
      });
    } catch (error: any) {
      showError(error.message || "Failed to update status");
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <Card className="border-tf-border bg-tf-surface shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-tf-text-primary">
            <Calendar className="w-4 h-4 text-tf-primary" />
            {schedule.title}
          </CardTitle>
          <CurrencyDisplay
            amount={schedule.totalAmount}
            className="font-semibold text-tf-text-primary"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.items?.map((item) => {
              const cfg = statusConfig[item.status] || statusConfig.pending;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-tf-text-primary">
                    {item.label}
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay amount={item.amount} />
                  </TableCell>
                  <TableCell className="text-tf-text-secondary">
                    {new Date(item.dueDate).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cfg.className}>
                      {cfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                        onClick={() => handleMarkPaid(item)}
                        disabled={markingId === item.id}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {markingId === item.id ? "Saving..." : "Mark Paid"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
