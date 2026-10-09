"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ApiClient as API } from "@/lib/api-client";
import dynamic from "next/dynamic";

const ReceiptPDFViewer = dynamic(
  () => import("@/components/receipts/ReceiptPDFViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-lg text-tf-text-secondary">Loading PDF Viewer...</div>
      </div>
    ),
  }
);

export default function ReceiptPrintPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      API.getPayment(id as string)
        .then((payment) => {
          if (payment) {
            setData(payment);
          } else {
            setError("Payment not found");
          }
        })
        .catch((err) => {
          console.error(err);
          setError(err.message || "Failed to load payment");
        });
    }
  }, [id]);

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-lg text-tf-danger">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-lg text-tf-text-secondary">Loading Payment Data...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-screen m-0 p-0 overflow-hidden bg-black">
      <ReceiptPDFViewer data={data} />
    </div>
  );
}
