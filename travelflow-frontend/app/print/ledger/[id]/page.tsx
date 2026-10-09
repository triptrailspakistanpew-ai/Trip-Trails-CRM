"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ApiClient as API } from "@/lib/api-client";
import dynamic from "next/dynamic";
import { useBranchStore } from "@/store/branch.store";

const LedgerPDFViewer = dynamic(
  () => import("@/components/reports/LedgerPDFViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-lg text-tf-text-secondary">Loading PDF Viewer...</div>
      </div>
    ),
  }
);

export default function LedgerPrintPage() {
  const { id } = useParams();
  const activeCurrency = useBranchStore(state => state.activeCurrency);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      API.getCustomerLedger(id as string)
        .then(setData)
        .catch((err) => {
          console.error(err);
          setError(err.message || "Failed to load ledger");
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
        <div className="text-lg text-tf-text-secondary">Loading Ledger Data...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-screen m-0 p-0 overflow-hidden bg-black">
      <LedgerPDFViewer data={data} currency={activeCurrency} />
    </div>
  );
}
