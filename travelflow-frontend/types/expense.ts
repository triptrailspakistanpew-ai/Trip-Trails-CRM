export type ExpenseCategory = 'salary' | 'rent' | 'marketing' | 'utilities' | 'office_supplies' | 'software' | 'travel' | 'other';

export interface Expense {
  id: string;
  agencyId: string;
  branchId: string;
  expenseRef: string;    // EXP-2024-001
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: Date;
  paidTo?: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' | 'cheque';
  receiptUrl?: string;
  notes?: string;
  recordedById: string;
  status: 'approved' | 'pending' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}
