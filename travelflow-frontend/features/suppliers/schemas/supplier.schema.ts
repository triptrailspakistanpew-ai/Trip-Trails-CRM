import { z } from "zod";

const phoneRegex = /^\+?[1-9]\d{6,14}$/;

export const supplierSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  category: z.enum(["airline", "hotel", "visa", "transport", "insurance", "consolidator", "other"]),
  contactPerson: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().regex(phoneRegex, "Enter a valid phone number with country code").optional().or(z.literal("")),
  city: z.string().optional(),
  country: z.string().optional(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
