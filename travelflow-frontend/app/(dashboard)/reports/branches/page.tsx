"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BranchPerformance } from "@/components/dashboard/BranchPerformance";

export default function BranchReportPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="tf-h2 text-tf-text-primary">Branch Performance</h1>
          <p className="tf-body text-tf-text-secondary mt-1">
            Metrics comparing different agency branches.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <BranchPerformance isLoading={false} />
      </div>
    </div>
  );
}
