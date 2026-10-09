export interface InvoiceLine {
  id: string;
  agencyId: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  agencyId: string;
  branchId?: string;
  invoiceRef: string;
  bookingId?: string;
  customerId: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate?: string;
  paidAt?: string;
  notes?: string;
  terms?: string;
  customer?: { firstName: string; lastName: string; companyName?: string };
  booking?: { bookingRef: string; title: string };
  items?: InvoiceLine[];
}

export interface CreditNote {
  id: string;
  agencyId: string;
  branchId?: string;
  creditNoteRef: string;
  invoiceId: string;
  customerId: string;
  bookingId?: string;
  amount: number;
  reason: string;
  status: 'issued' | 'applied' | 'cancelled';
  issuedAt: string;
  appliedAt?: string;
  notes?: string;
  customer?: { firstName: string; lastName: string; companyName?: string };
  invoice?: { invoiceRef: string };
  booking?: { bookingRef: string };
}
