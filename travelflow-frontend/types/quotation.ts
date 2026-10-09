import type { Lead } from "./lead";
import type { Customer } from "./customer";
import type { Supplier } from "./supplier";
import type { Branch } from "./agency";
import type { User } from "./user";

export type QuotationStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "cancelled";

export type QuotationTaxType = "fixed" | "percentage";

export interface QuotationItem {
  id: string;
  quotationId: string;
  serviceCategory: string;
  title: string;
  description: string;
  supplierId?: string;
  supplier?: Supplier;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  lineTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotationTax {
  id: string;
  quotationId: string;
  label: string;
  taxType: QuotationTaxType;
  value: number;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotationAttachment {
  id: string;
  quotationId: string;
  name: string;
  url: string;
  type: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotationVersion {
  id: string;
  quotationId: string;
  version: number;
  changes: string;
  snapshot?: Partial<Quotation>;
  createdBy: string;
  createdByUser?: { firstName: string; lastName: string };
  createdAt: Date;
}

export interface QuotationActivity {
  id: string;
  quotationId: string;
  type: string;
  description: string;
  createdBy: string;
  createdAt: Date;
}

export interface Quotation {
  id: string;
  quotationRef: string;
  title: string;
  status: QuotationStatus;

  subtotalAmount?: number;
  taxAmount?: number;
  grandTotal?: number;
  estimatedProfit?: number;

  createdAt: Date;
  updatedAt: Date;

  travelType?: string;
  destination?: string;
  adults?: number;
  children?: number;
  infants?: number;
  currency?: "PKR" | "AED";
  validUntil?: Date;

  customer?: Customer;
  customerId?: string;

  // Temporary customer details (before acceptance)
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;

  lead?: Lead;
  leadId?: string;

  branch?: Branch;
  branchId?: string;

  agent?: User;
  agentId?: string;

  items: QuotationItem[];
  taxes: QuotationTax[];

  notes?: string;
  terms?: string;
  templates?: string;

  attachments: QuotationAttachment[];
  versions: QuotationVersion[];
  activities: QuotationActivity[];
}
