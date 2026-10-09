"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Printer, Send, Download } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { showError, showSuccess } from "@/lib/toast-utils";
import { Button } from "@/components/ui/button";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { API } from "@/lib/data-source";
import { CustomerPayment } from "@/types";

export default function ReceiptDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [payment, setPayment] = useState<CustomerPayment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const data = await API.getPayment(id!);
        if (!cancelled) setPayment(data);
      } catch (err) {
        showError(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!payment) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-tf-text-secondary">Payment not found.</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const customerName = payment.customer
    ? `${payment.customer.firstName} ${payment.customer.lastName}`
    : "N/A";

  const bookingRefs = payment.allocations?.length
    ? payment.allocations.map((a) => a.bookingId).join(", ")
    : payment.bookingId ?? "N/A";

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
            <h1 className="tf-h2 text-tf-text-primary">Payment {payment.paymentRef}</h1>
            <p className="tf-body text-tf-text-secondary mt-1">
              Generated on {payment.date ? new Date(payment.date).toLocaleDateString() : "N/A"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="bg-tf-surface text-tf-text-primary print:hidden"
          >
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button
            variant="outline"
            onClick={() => showSuccess("Receipt emailed successfully")}
            className="bg-tf-surface text-tf-text-primary print:hidden"
          >
            <Send className="w-4 h-4 mr-2" /> Email
          </Button>
          <Button
            onClick={() => {
              showSuccess("Generating PDF...");
              window.print();
            }}
            className="bg-tf-primary text-white hover:bg-tf-primary-hover print:hidden"
          >
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Receipt Document */}
      <div className="bg-white text-black p-8 md:p-12 rounded-xl shadow-sm border border-tf-border max-w-3xl mx-auto">
        <div className="flex justify-between items-center border-b border-gray-200 pb-8 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">
              TravelFlow
            </span>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-light text-gray-900 mb-2">
              OFFICIAL PAYMENT
            </h2>
            <p className="text-gray-500 font-medium">{payment.paymentRef}</p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
            Receipt Information
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-gray-500 mb-1">Date Received:</p>
              <p className="font-semibold text-gray-900">
                {payment.date ? new Date(payment.date).toLocaleDateString() : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Payment Method:</p>
              <p className="font-semibold text-gray-900">{payment.paymentMethod}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Received From:</p>
              <p className="font-semibold text-gray-900">{customerName}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Applied To:</p>
              <p className="font-semibold text-gray-900">{bookingRefs}</p>
            </div>
          </div>
        </div>

        <div className="py-8 border-y border-gray-100 my-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center flex-1">
              <p className="text-gray-500 mb-2 uppercase tracking-widest text-xs font-bold">
                Total Booking Cost
              </p>
              <CurrencyDisplay
                amount={(payment as any).bookingTotal ?? 0}
                className="text-nowrap text-2xl font-light text-gray-900"
              />
            </div>

            <div className="text-center flex-1 border-l border-r border-gray-100 px-4">
              <p className="text-nowrap text-green-600 mb-2 uppercase tracking-widest text-sm font-bold">
                Amount Received
              </p>
              <CurrencyDisplay
                amount={payment.amount}
                className="text-nowrap text-4xl font-light text-gray-900"
              />
            </div>

            <div className="text-center flex-1">
              <p className="text-gray-500 mb-2 uppercase tracking-widest text-xs font-bold">
                Remaining Balance
              </p>
              <CurrencyDisplay
                amount={(payment as any).balanceDue ?? 0}
                className="text-2xl font-light text-red-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 text-gray-500 text-sm">
          <p className="mb-4">
            <span className="font-semibold text-gray-700">Notes: </span>
            {payment.notes || "No additional notes."}
          </p>
          <div className="flex justify-between items-end mt-16 pt-8 border-t border-gray-200">
            <div>
              <p className="font-semibold text-gray-900">TravelFlow Inc.</p>
              <p>contact@travelflow.pk</p>
            </div>
            <div className="text-center">
              <div className="w-40 border-b border-gray-400 mb-2"></div>
              <p className="text-xs uppercase tracking-wider">
                Authorized Signature
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
