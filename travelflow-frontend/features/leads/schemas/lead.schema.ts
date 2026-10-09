import { z } from "zod";
import { leadStatusValues } from "@/features/leads/constants";

const phoneRegex = /^\+?[1-9]\d{6,14}$/;

export const leadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  phone: z.string().regex(phoneRegex, "Enter a valid phone number with country code (e.g. +923001234567)"),
  whatsapp: z.string().regex(phoneRegex, "Enter a valid phone number with country code").optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  destination: z.string().min(2, "Destination is required"),
  travelDate: z.string().optional(),
  budget: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(0).optional()
  ),
  adults: z.coerce.number().int().min(1, "Minimum 1 adult").max(20).default(1),
  children: z.coerce.number().int().min(0).max(10).default(0),
  specialRequirements: z.string().max(500).optional().or(z.literal("")),
  source: z.enum(["walk_in", "whatsapp", "facebook", "instagram", "website", "referral", "google_ads"]),
  status: z.enum(leadStatusValues as [string, ...string[]]),
  assignedAgentId: z.string().optional(),
  branchId: z.string().optional(),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type LeadFormValues = z.infer<typeof leadSchema>;
