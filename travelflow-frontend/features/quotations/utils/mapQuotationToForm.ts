import type { Quotation } from "@/types/quotation";
import type { QuotationFormValues } from "../schemas/quotation.schema";

export function mapQuotationToForm(q: Quotation): QuotationFormValues {
  return {
    title: (q as any).title ?? "",
    // If there's no real customerId but temp customer details exist, show as NEW_CUSTOMER
    customerId: q.customerId ?? q.customer?.id ?? (q.customerName ? "NEW_CUSTOMER" : ""),
    branchId: q.branchId ?? q.branch?.id,

    leadId: q.leadId ?? q.lead?.id,
    agentId: q.agentId ?? q.agent?.id,

    status: q.status,

    travelType: q.travelType ?? "custom",
    destination: q.destination ?? "",
    currency: q.currency === "AED" ? "AED" : "PKR",
    adults: q.adults ?? 0,
    children: q.children ?? 0,
    infants: q.infants ?? 0,
    validUntil: q.validUntil ? new Date(q.validUntil).toISOString().split("T")[0] : "",

    customerName: q.customerName ?? "",
    customerPhone: q.customerPhone ?? "",
    customerEmail: q.customerEmail ?? "",

    items: (Array.isArray(q.items) ? q.items : []).map((it) => ({
      id: it.id,
      serviceCategory: it.serviceCategory || "other",
      title: it.title || "",
      description: it.description || "",
      quantity: it.quantity || 1,
      unit: (it as any).unit || "Person",
      costPrice: it.costPrice || 0,
      sellingPrice: it.sellingPrice || 0,
      supplierId: it.supplierId || undefined,
      supplierName: (it as any).supplierName || undefined,
    })),
    taxes: (Array.isArray(q.taxes) ? q.taxes : []).map((t) => ({
      id: t.id,
      label: t.label,
      taxType: t.taxType as any,
      value: t.value,
    })),

    notes: q.notes ?? "",
    terms: q.terms ?? "",
    templates: q.templates ?? "",
    attachments: (Array.isArray(q.attachments) ? q.attachments : []).map(
      (a) => ({
        id: a.id,
        name: a.name,
        url: a.url,
        type: a.type,
      }),
    ),

    revisionBaseVersionId: undefined,
  };
}
