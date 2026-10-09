import { z } from "zod";

const phoneRegex = /^\+?[1-9]\d{6,14}$/;

export const userSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(phoneRegex, "Enter a valid phone number with country code").optional().or(z.literal("")),
  role: z.string().min(1),
  branchId: z.string().min(1, "Branch is required"),
  status: z.enum(["active", "inactive", "invited"]),
});

export type UserFormValues = z.infer<typeof userSchema>;
