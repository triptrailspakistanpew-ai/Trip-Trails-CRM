import type { Expense } from "@/types";
import type { ExpenseFormValues } from "@/features/expenses/schemas/expense.schema";

export function mapExpenseToForm(expense: any): ExpenseFormValues {
  return {
    title: expense.title,
    category: expense.category,
    amount: expense.amount,
    date: new Date(expense.date),
    paidTo: expense.paidTo ?? "",
    paymentMethod: expense.paymentMethod,
    accountId: expense.accountId ?? undefined,
    paymentAccountId: expense.paymentAccountId ?? undefined,
    notes: expense.notes ?? "",
    isPrepaid: false,
    amortizeOverMonths: 12,
    startDate: new Date(expense.date),
  };
}

export const expenseDefaultValues: ExpenseFormValues = {
  title: "",
  category: "other",
  amount: undefined as unknown as number,
  date: new Date(),
  paidTo: "",
  paymentMethod: "cash",
  accountId: undefined,
  paymentAccountId: undefined,
  notes: "",
  isPrepaid: false,
  amortizeOverMonths: 12,
  startDate: new Date(),
};
