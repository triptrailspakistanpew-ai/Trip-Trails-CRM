import type { Lead } from "@/types";
import type { LeadFormValues } from "@/features/leads/schemas/lead.schema";

export function mapLeadToForm(lead: Lead): LeadFormValues {
  return {
    name: lead.name,
    phone: lead.phone,
    whatsapp: lead.whatsapp ?? "",
    email: lead.email ?? "",
    destination: lead.destination,
    travelDate: lead.travelDate
      ? new Date(lead.travelDate).toISOString().slice(0, 10)
      : "",
    budget: lead.budget,
    adults: lead.adults ?? 1,
    children: lead.children ?? 0,
    specialRequirements: lead.specialRequirements ?? "",
    source: lead.source,
    status: lead.status,
    assignedAgentId: lead.assignedAgentId ?? "",
    branchId: lead.branchId ?? undefined,
    notes: lead.notes ?? "",
  };
}

export const leadDefaultValues: LeadFormValues = {
  name: "",
  phone: "",
  whatsapp: "",
  email: "",
  destination: "",
  source: "walk_in",
  status: "new",
  adults: 1,
  children: 0,
  specialRequirements: "",
  notes: "",
  branchId: undefined,
};
