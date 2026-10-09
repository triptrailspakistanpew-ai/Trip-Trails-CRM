import { Customer } from "./customer";

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'completed';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type ServiceCategory = 'flight' | 'hotel' | 'transfer' | 'insurance' | 'visa' | 'safari' | 'cruise' | 'activity' | 'other';
export type BookingServiceStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type TravelerType = 'adult' | 'child' | 'infant';
export type TaxTreatment = 'VAT_ON_MARGIN' | 'VAT_ON_SELLING_PRICE' | 'ZERO_RATED' | 'EXEMPT' | 'NO_VAT';

export interface BookingService {
  id: string;
  bookingId: string;
  serviceCategory: ServiceCategory;
  title: string;
  description?: string;
  supplierId?: string;
  supplier?: { id: string; name: string; category: string };
  costPrice: number;
  supplierInvoiceAmount?: number | null;
  sellingPrice: number;
  // Phase 3 financial fields
  taxTreatment: TaxTreatment;
  vatRate: number;
  taxBase: number;
  taxAmount: number;
  expectedMargin: number;
  actualMargin?: number | null;
  costVariance?: number | null;
  customerTotal: number;
  financialStatus: string;
  quantity: number;
  unit: string;
  status: BookingServiceStatus;
  serviceDetails?: Record<string, unknown>;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingTraveler {
  id: string;
  bookingId: string;
  firstName: string;
  lastName: string;
  type: TravelerType;
  passportNumber?: string;
  nationality?: string;
  dateOfBirth?: Date;
  gender?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Booking {
  id: string;
  bookingRef: string;
  customerId: string;
  customer?: Customer;
  branchId: string;
  branch?: { id: string; name: string };
  agentId: string;
  agent?: { id: string; name: string };
  leadId?: string;
  title: string;
  departureDate: Date;
  returnDate?: Date;
  expectedAdults: number;
  expectedChildren: number;
  expectedInfants: number;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  terms?: string;
  termsTemplateId?: string;
  services: BookingService[];
  travelers: BookingTraveler[];
  totalCost: number;
  totalSell: number;
  totalProfit: number;
  profitMargin: number;
  totalTax: number;
  totalCustomerPayable: number;
  totalExpectedMargin: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentAllocation {
  id: string;
  bookingId: string;
  amount: number;
}

export interface CustomerPayment {
  id: string;
  paymentRef: string;
  customerId: string;
  bookingId?: string;
  amount: number;
  paymentMethod: string;
  status: "pending" | "completed" | "reversed";
  notes?: string;
  date: Date;
  customer?: Customer;
  booking?: Booking;
  allocations: PaymentAllocation[];
}

export interface BookingDocument {
  id: string;
  bookingId: string;
  name: string;
  url: string;
  type: string;
  uploadedBy: string;
  createdAt: Date;
}

export interface PaymentScheduleItem {
  id: string;
  scheduleId: string;
  label: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paidAt?: string;
  customerPaymentId?: string;
}

export interface PaymentSchedule {
  id: string;
  agencyId: string;
  bookingId: string;
  title: string;
  totalAmount: number;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  items: PaymentScheduleItem[];
  booking?: { bookingRef: string };
  createdAt: string;
}
