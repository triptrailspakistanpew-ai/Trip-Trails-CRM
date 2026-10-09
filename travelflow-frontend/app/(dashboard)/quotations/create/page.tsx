"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { QuotationForm } from "@/components/quotations/QuotationForm";
import { useCustomers } from "@/features/customers/hooks/queries";
import { useBranches, useAgents } from "@/features/shared/hooks/queries";
import { useLead } from "@/features/leads/hooks/queries";

import { useBranchStore } from "@/store/branch.store";

function CreateQuotationContent() {
  const searchParams = useSearchParams();
  const leadId = searchParams?.get("leadId");
  const { activeBranchId, activeCurrency } = useBranchStore();

  const { data: lead, isLoading: isLeadLoading } = useLead(leadId);
  const { data: customers = [], isLoading: isCustomersLoading } = useCustomers();
  const { data: branches = [], isLoading: isBranchesLoading } = useBranches();
  const { data: agents = [], isLoading: isAgentsLoading } = useAgents();

  const isLoading = isCustomersLoading || isBranchesLoading || isAgentsLoading || (leadId ? isLeadLoading : false);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tf-primary"></div>
      </div>
    );
  }

  const selectedBranch = branches.find((b) => b.id === activeBranchId) || branches[0];
  const currency = selectedBranch?.currency || activeCurrency || "PKR";

  let defaultCustomerId = customers[0]?.id ?? "";
  let customerName = "";
  let customerEmail = "";
  let customerPhone = "";
  let travelType = "custom";
  let destination = "";
  let adults = 0;
  let children = 0;
  let infants = 0;

  if (lead) {
    const existingCustomer = customers.find(c => (c.email && c.email === lead.email) || (c.phone && c.phone === lead.phone));
    if (existingCustomer) {
      defaultCustomerId = existingCustomer.id;
    } else {
      defaultCustomerId = "NEW_CUSTOMER";
      customerName = lead.name || "";
      customerEmail = lead.email || "";
      customerPhone = lead.phone || "";
    }

    if (lead.destination) destination = lead.destination;
    if (lead.adults) adults = lead.adults;
    if (lead.children) children = lead.children;
  }

  const initialValues = {
    customerId: defaultCustomerId,
    branchId: selectedBranch?.id,
    agentId: agents[0]?.id,
    leadId: lead?.id,
    customerName,
    customerEmail,
    customerPhone,
    destination,
    adults,
    children,
    infants,
    travelType,
    currency,
  };

  return (
    <QuotationForm
      mode="create"
      initialValues={initialValues}
      customers={customers}
      branches={branches}
      agents={agents}
    />
  );
}

export default function CreateQuotationPage() {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tf-primary"></div>
      </div>
    }>
      <CreateQuotationContent />
    </Suspense>
  );
}
