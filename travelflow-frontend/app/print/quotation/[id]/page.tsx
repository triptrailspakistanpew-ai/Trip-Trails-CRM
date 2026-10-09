"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API } from "@/lib/data-source";
import dynamic from "next/dynamic";

const QuotationPDFViewer = dynamic(
  () => import("@/components/quotations/QuotationPDFViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-lg text-tf-text-secondary">Loading PDF Viewer...</div>
      </div>
    ),
  }
);

export default function QuotationPrintPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      API.getQuotationForPrint(id as string)
        .then(setData)
        .catch((err) => {
          console.error(err);
          setError(err.message || "Failed to load quotation");
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
        <div className="text-lg text-tf-text-secondary">Loading Quotation Data...</div>
      </div>
    );
  }

  // Hide the default site layout padding/margin if any
  return (
    <div className="flex-1 w-full h-screen m-0 p-0 overflow-hidden bg-black">
      <QuotationPDFViewer data={data} />
    </div>
  );
}
