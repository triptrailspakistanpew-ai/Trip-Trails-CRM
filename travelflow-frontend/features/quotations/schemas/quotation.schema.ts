import { z } from "zod";

export const quotationStatusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Accepted", value: "accepted" },
  { label: "Rejected", value: "rejected" },
  { label: "Cancelled", value: "cancelled" },
] as const;

export const quotationTaxTypeOptions = [
  { label: "Fixed", value: "fixed" },
  { label: "Percentage", value: "percentage" },
] as const;

export type QuotationStatus = (typeof quotationStatusOptions)[number]["value"];
export type QuotationTaxType =
  (typeof quotationTaxTypeOptions)[number]["value"];

export const quotationItemSchema = z.object({
  id: z.string().optional(),
  serviceCategory: z.string().min(1, "Service category is required"),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  quantity: z.coerce.number().int().min(1, "Quantity must be >= 1"),
  unit: z.string().optional().default("Person"),
  costPrice: z.coerce.number().min(0, "Cost price must be >= 0"),
  sellingPrice: z.coerce.number().min(0, "Selling price must be >= 0"),
});

export const quotationTaxSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Tax label is required"),
  taxType: z.enum(["fixed", "percentage"]),
  value: z.coerce.number().min(0, "Tax value must be >= 0"),
});

export const quotationSchema = z
  .object({
    // Quotation title (trip/package title)
    title: z.string().min(1, "Title is required"),

    // Link quotation to an existing customer.
    // NOTE: for UI in this step we will use customerId via a customer name input.
    customerId: z.string().optional().default(""),

    // Owner/agency context is derived elsewhere.
    branchId: z.string().optional(),
    leadId: z.string().optional(),
    agentId: z.string().optional(),

    status: z.enum(["draft", "sent", "accepted", "rejected", "cancelled"]),

    travelType: z.string().min(1, "Travel type is required").default("custom"),
    destination: z.string().min(1, "Destination is required"),
    adults: z.coerce.number().min(0).default(0),
    children: z.coerce.number().min(0).default(0),
    infants: z.coerce.number().min(0).default(0),
    validUntil: z.string().optional(),

    // Temporary customer details (deferred creation)
    customerName: z.string().optional().default(""),
    customerPhone: z.string().optional().default(""),
    customerEmail: z.string().optional().default(""),

    currency: z.enum(["PKR", "AED"]).default("PKR"),

    items: z.array(quotationItemSchema).min(1, "Add at least one item"),
    taxes: z.array(quotationTaxSchema).optional().default([]),

    notes: z.string().optional().default(""),
    terms: z.string().optional().default(""),

    // Used for “templates” selection (frontend-only helper)
    templates: z.string().optional().default(""),

    attachments: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().min(1),
          url: z.string().min(1),
          type: z.string().min(1),
        }),
      )
      .optional()
      .default([]),

    revisionBaseVersionId: z.string().optional(),
  })

  .refine((d) => {
    let subtotal = 0;
    let totalCost = 0;
    
    d.items.forEach((it) => {
      subtotal += it.quantity * it.sellingPrice;
      totalCost += it.quantity * it.costPrice;
    });

    const profit = subtotal - totalCost;

    const taxAmount = (d.taxes ?? []).reduce((acc, t) => {
      if (t.taxType === "fixed") return acc + t.value;
      return acc + profit * (t.value / 100);
    }, 0);
    const grandTotal = subtotal + taxAmount;
    return grandTotal >= 0;
  }, "Grand total must be valid");

export type QuotationFormValues = z.infer<typeof quotationSchema>;

export const quotationDefaultValues: QuotationFormValues = {
  title: "",
  customerId: "",
  branchId: undefined,
  leadId: undefined,
  agentId: undefined,

  status: "draft",

  travelType: "custom",
  destination: "",
  adults: 0,
  children: 0,
  infants: 0,
  validUntil: "",

  customerName: "",
  customerPhone: "",
  customerEmail: "",

  currency: "PKR",

  items: [
    {
      id: undefined,
      serviceCategory: "other",
      title: "",
      description: "",
      quantity: 1,
      unit: "Person",
      costPrice: 0,
      sellingPrice: 0,
      supplierId: undefined,
      supplierName: undefined,
    },
  ],
  taxes: [],

  notes: "",
  terms: "",
  templates: "",
  attachments: [],
  revisionBaseVersionId: undefined,
};

export function getDefaultTaxesForCurrency(currency?: string) {
  if (currency === "AED") {
    return [
      {
        id: undefined,
        label: "VAT",
        taxType: "percentage" as const,
        value: 5,
      },
    ];
  }
  return [];
}

export function getQuotationDefaultValues(currency?: string): QuotationFormValues {
  const isAED = currency === "AED";
  return {
    ...quotationDefaultValues,
    currency: isAED ? "AED" : "PKR",
    taxes: getDefaultTaxesForCurrency(currency),
  };
}

