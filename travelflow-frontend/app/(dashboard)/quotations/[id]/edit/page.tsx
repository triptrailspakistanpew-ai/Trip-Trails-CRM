"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { QuotationForm } from "@/components/quotations/QuotationForm";
import { useCustomers } from "@/features/customers/hooks/queries";
import { useBranches, useAgents } from "@/features/shared/hooks/queries";
import { queryKeys } from "@/lib/query-keys";
import { API } from "@/lib/data-source";
import { mapQuotationToForm } from "@/features/quotations/utils/mapQuotationToForm";
import { showError } from "@/lib/toast-utils";
import type { QuotationFormValues } from "@/features/quotations/schemas/quotation.schema";

export default function EditQuotationPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const quotationId = params?.id as string;

  const [initialValues, setInitialValues] = useState<Partial<QuotationFormValues> | null>(null);
  const [isQuotationLoading, setIsQuotationLoading] = useState(true);

  const { data: customers = [], isLoading: isCustomersLoading } = useCustomers();
  const { data: branches = [], isLoading: isBranchesLoading } = useBranches();
  const { data: agents = [], isLoading: isAgentsLoading } = useAgents();

  useEffect(() => {
    if (!quotationId) return;

    const fetchQuotation = async () => {
      try {
        setIsQuotationLoading(true);
        const q = await queryClient.fetchQuery({
          queryKey: queryKeys.quotations.detail(quotationId),
          queryFn: () => API.getQuotation(quotationId),
        });
        setInitialValues(mapQuotationToForm(q));
      } catch (e: any) {
        showError(e.message || "Failed to load quotation");
        router.push("/quotations");
      } finally {
        setIsQuotationLoading(false);
      }
    };

    fetchQuotation();
  }, [quotationId, queryClient, router]);

  const isLoading = isQuotationLoading || isCustomersLoading || isBranchesLoading || isAgentsLoading;

  if (isLoading || !initialValues) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tf-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <QuotationForm 
        mode="edit" 
        editingId={quotationId}
        initialValues={initialValues}
        customers={customers}
        branches={branches}
        agents={agents}
      />
    </div>
  );
}
