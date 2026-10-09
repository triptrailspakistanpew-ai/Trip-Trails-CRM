"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RevenueChart } from "@/components/dashboard/RevenueChart";

export default function RevenueReportPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="tf-h2 text-tf-text-primary">Revenue Report</h1>
          <p className="tf-body text-tf-text-secondary mt-1">
            Detailed breakdown of gross and net revenue.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <RevenueChart data={[]} isLoading={false} />
      </div>
    </div>
  );
}
