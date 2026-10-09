import { z } from "zod";

export const bookingServiceSchema = z.object({
  serviceCategory: z.string().min(1, "Category is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  costPrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  supplierInvoiceAmount: z.coerce.number().min(0).optional().nullable(),
  taxTreatment: z.enum([
    'VAT_ON_MARGIN', 'VAT_ON_SELLING_PRICE',
    'ZERO_RATED', 'EXEMPT', 'NO_VAT'
  ]).default('VAT_ON_MARGIN'),
  vatRate: z.coerce.number().min(0).max(100).default(5),
  quantity: z.coerce.number().int().min(1).default(1),
  unit: z.string().optional().default("Person"),
  status: z.string().optional().default("pending"),
  financialStatus: z.string().optional().default("draft"),
  serviceDetails: z.any().optional(),
});

export const bookingFormSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  title: z.string().optional(),
  departureDate: z.date({ error: "Departure date is required" }),
  returnDate: z.date().optional(),
  expectedAdults: z.coerce.number().int().min(1).optional().default(1),
  expectedChildren: z.coerce.number().int().min(0).optional().default(0),
  expectedInfants: z.coerce.number().int().min(0).optional().default(0),
  bookingStatus: z
    .enum([
      "draft",
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
      "refunded",
    ])
    .optional()
    .default("confirmed"),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional().default("unpaid"),
  notes: z.string().optional(),
  terms: z.string().optional(),
  termsTemplateId: z.string().optional(),
  notesTemplateId: z.string().optional(),
  services: z.array(bookingServiceSchema).optional(),
});

export const bookingSchema = bookingFormSchema.refine(
  (data) => {
    if (data.customerId === "NEW_CUSTOMER") return true;
    return data.customerId.length > 0;
  },
  { message: "Customer is required", path: ["customerId"] },
);

export type BookingFormValues = z.infer<typeof bookingFormSchema>;
export type BookingServiceFormValues = z.infer<typeof bookingServiceSchema>;
