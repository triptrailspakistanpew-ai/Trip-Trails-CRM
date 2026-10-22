export type VatCategory = 'STANDARD' | 'ZERO_RATED' | 'EXEMPT' | 'OUT_OF_SCOPE';
export type SupplyRole = 'agent' | 'principal';

export interface InvoiceLine {
  id: string;
  agencyId: string;
  invoiceId: string;
  serviceCategory?: string;
  description: string;
  supplyRole?: SupplyRole;
  quantity: number;
  unitPrice: number;
  amount: number;
  discountAmount?: number;
  netAmount?: number;
  vatCategory?: VatCategory;
  vatRate?: number;
  vatAmount?: number;
  totalAmount?: number;
  
  // Travel Specific
  passengerNames?: string[];
  pnr?: string;
  ticketNumber?: string;
  route?: string;
  travelStartDate?: string;
  travelEndDate?: string;
  hotelName?: string;
  supplierRef?: string;
  supplierCost?: number; // Internal only

  // Fee Details
  isServiceFee?: boolean;
  feeType?: 'fixed' | 'percentage';
  feeBasis?: 'base_fare' | 'total_ticket' | 'supplier_cost';
  parentLineId?: string;
}

export interface VatBreakdownSummary {
  standardRated: { base: number; vat: number; rate: number };
  zeroRated: { base: number; vat: number };
  exempt: { base: number; vat: number };
  outOfScope: { base: number; vat: number };
}

export interface Invoice {
  id: string;
  agencyId: string;
  branchId?: string;
  invoiceRef: string;
  invoiceType?: 'TAX_INVOICE' | 'SIMPLIFIED_TAX_INVOICE';
  bookingId?: string;
  customerId: string;
  currency?: string;
  exchangeRate?: number;
  supplyDate?: string;
  isLocked?: boolean;
  customerTrn?: string;
  agencyTrn?: string;
  
  subtotal: number;
  discount?: number;
  taxableAmount?: number;
  tax: number;
  total: number;
  vatBreakdown?: VatBreakdownSummary;

  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate?: string;
  paidAt?: string;
  notes?: string;
  terms?: string;
  customer?: { 
    id?: string;
    firstName: string; 
    lastName: string; 
    name?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    address?: string;
    taxNumber?: string;
    taxId?: string;
  };
  booking?: { 
    bookingRef: string; 
    title?: string;
    pnr?: string;
    amountReceived?: number;
    balance?: number;
  };
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

