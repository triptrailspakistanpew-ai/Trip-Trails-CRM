import { z } from "zod";

// International phone: allows +, digits, spaces, dashes, parens. Min 7, max 20 chars.
const phoneRegex = /^[+]?[\d\s\-().]{7,20}$/;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const leadSchema = z.object({
  name: z.string().min(2).max(60),
  phone: z.string().regex(phoneRegex, "Enter a valid phone number"),
  whatsapp: z.string().regex(phoneRegex).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  destination: z.string().min(2),
  travelDate: z.string().optional(),
  budget: z.preprocess(
    (val) =>
      val === "" || val === undefined || val === null ? undefined : Number(val),
    z.number().min(0).optional(),
  ),
  adults: z.coerce.number().int().min(1).max(20).default(1),
  children: z.coerce.number().int().min(0).max(10).default(0),
  specialRequirements: z.string().max(500).optional().or(z.literal("")),
  source: z.enum([
    "walk_in",
    "whatsapp",
    "facebook",
    "instagram",
    "website",
    "referral",
    "google_ads",
  ]),
  status: z.enum([
    "new",
    "contacted",
    "follow_up",
    "interested",
    "negotiation",
    "converted",
    "lost",
  ]),
  assignedAgentId: z.string().optional(),
  branchId: z.string().optional(),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export const leadActivitySchema = z.object({
  type: z.enum([
    "note",
    "call",
    "whatsapp",
    "email",
    "status_change",
    "meeting",
    "site_visit",
    "booking_created",
  ]),
  description: z.string().min(1),
  outcome: z
    .enum(["reached", "no_answer", "callback_requested", "meeting_scheduled"])
    .optional(),
});

export const customerSchema = z
  .object({
    type: z.enum(["individual", "corporate"]),
    branchId: z.string().uuid().optional(),
    firstName: z.string().min(2).max(30),
    lastName: z.string().min(2).max(30),
    companyName: z.string().optional(),
    businessType: z.string().optional(),
    taxNumber: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().regex(phoneRegex),
    whatsapp: z.string().regex(phoneRegex).optional().or(z.literal("")),
    dateOfBirth: z.string().optional(),
    gender: z.enum(["male", "female", "prefer_not_to_say"]).optional(),
    cnic: z.string().optional().or(z.literal("")),
    passportNumber: z.string().optional().or(z.literal("")),
    city: z.string().min(1),
    country: z.string().optional(),
    address: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional().or(z.literal("")),
    internalNotes: z.string().max(500).optional().or(z.literal("")),
  })
  .refine(
    (data) =>
      data.type !== "corporate" ||
      (data.companyName && data.companyName.length >= 2),
    {
      message: "Company name is required for corporate customers",
      path: ["companyName"],
    },
  );

export const bookingSchema = z.object({
  customerId: z.string().min(1),
  title: z.string().optional(),
  departureDate: z.coerce.date(),
  returnDate: z.coerce.date().optional(),
  expectedAdults: z.number().int().min(1).optional(),
  expectedChildren: z.number().int().min(0).optional(),
  expectedInfants: z.number().int().min(0).optional(),
  bookingStatus: z.enum(["draft", "confirmed", "in_progress", "completed", "cancelled"]).optional(),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  termsTemplateId: z.string().optional().nullable(),
  leadId: z.string().optional(),
  branchId: z.string().optional(),
  agentId: z.string().optional(),
  sourceQuotationId: z.string().optional(),
  sourceType: z
    .enum(["manual", "lead", "quotation"])
    .optional()
    .default("manual"),
  services: z
    .array(
      z.object({
        serviceCategory: z.string().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
        supplierId: z.string().optional(),
        supplierName: z.string().optional(),
        costPrice: z.number().min(0).optional(),
        sellingPrice: z.number().min(0).optional(),
        supplierInvoiceAmount: z.number().min(0).optional().nullable(),
        taxTreatment: z
          .enum([
            "VAT_ON_MARGIN",
            "VAT_ON_SELLING_PRICE",
            "ZERO_RATED",
            "EXEMPT",
            "NO_VAT",
          ])
          .optional()
          .default("VAT_ON_MARGIN"),
        vatRate: z.number().min(0).max(100).optional(),
        quantity: z.number().int().min(1).optional(),
        unit: z.string().optional(),
        status: z.string().optional(),
        financialStatus: z.string().optional(),
        serviceDetails: z.any().optional(),
      }),
    )
    .optional(),
});

export const convertLeadSchema = bookingSchema.omit({ customerId: true });

export const supplierSchema = z.object({
  name: z.string().min(2),
  category: z.enum([
    "airline",
    "hotel",
    "visa",
    "transport",
    "insurance",
    "consolidator",
    "other",
  ]),
  contactPerson: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

export const branchSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(8).optional(),
  city: z.string().min(2),
  address: z.string().optional(),
  phone: z.string().optional(),
  currency: z.string().optional(),
  isHeadOffice: z.boolean().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const expenseSchema = z.object({
  title: z.string().min(2),
  category: z.string().min(1), // Flexible string — no longer restricted to hardcoded enum
  amount: z.preprocess(
    (val) =>
      val === "" || val === undefined || val === null ? undefined : Number(val),
    z.number().min(1),
  ),
  date: z.coerce.date(),
  paidTo: z.string().optional(),
  paymentMethod: z.enum(["cash", "bank_transfer", "credit_card", "cheque"]),
  notes: z.string().optional(),
  branchId: z.string().optional(),
  accountId: z.string().optional(),
  paymentAccountId: z.string().optional(),
  isPrepaid: z.boolean().optional(),
  amortizeOverMonths: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(1).optional()
  ),
  startDate: z.coerce.date().optional(),
  // Bulk Import VAT & Supplier fields
  supplierId: z.string().optional(),
  supplierRef: z.string().optional(),
  vatTreatment: z.string().optional(),
  vatRate: z.number().optional(),
  inputVat: z.number().optional(),
  netAmount: z.number().optional(),
  refundReceived: z.number().optional(),
});

export const userSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().regex(phoneRegex).optional().or(z.literal("")),
  role: z.string().min(1),
  branchId: z.string().min(1),
  status: z.enum(["active", "inactive", "invited"]),
  password: z.string().min(6).optional(),
});

export const rolePermissionsSchema = z.object({
  permissions: z.array(z.string()),
});

export const createRoleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().default(""),
  permissions: z.array(z.string()).default([]),
  color: z.string().min(3),
  textColor: z.string().min(3),
});

export const customerNoteSchema = z.object({
  note: z.string().min(1),
});

export const customerDocumentSchema = z.object({
  documentType: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().min(0),
  mimeType: z.string().min(1),
  fileUrl: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://"), {
      message: "File URL must use HTTPS",
    }),
  notes: z.string().optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const leadIdParamSchema = z.object({
  leadId: z.string().min(1),
});

export const roleIdParamSchema = z.object({
  roleId: z.string().min(1),
});

export const createCustomerPaymentSchema = z.object({
  bookingId: z.string().optional(),
  customerId: z.string().min(1),
  amount: z.number().min(0.01),
  paymentMethod: z.enum([
    "cash",
    "bank_transfer",
    "credit_card",
    "cheque",
    "online",
  ]),
  accountId: z.string().optional(),
  notes: z.string().optional(),
});
