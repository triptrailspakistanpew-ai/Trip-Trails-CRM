import { z } from "zod";

export const expenseSchema = z.object({
  title: z.string().min(2, "Title is required"),
  category: z.enum(["salary", "rent", "marketing", "utilities", "office_supplies", "software", "travel", "other"]),
  amount: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number({ error: "Amount must be a number" }).min(1, "Amount must be greater than 0")
  ),
  date: z.date({ error: "Date is required" }),
  paidTo: z.string().optional(),
  paymentMethod: z.enum(["cash", "bank_transfer", "credit_card", "cheque"]),
  accountId: z.string().optional(),
  paymentAccountId: z.string().optional(),
  notes: z.string().optional(),
  isPrepaid: z.boolean().default(false).optional(),
  amortizeOverMonths: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(1).optional()
  ),
  startDate: z.date().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
