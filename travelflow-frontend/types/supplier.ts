export type SupplierCategory = 'airline' | 'hotel' | 'visa' | 'transport' | 'insurance' | 'consolidator' | 'other';

export interface Supplier {
  id: string;
  agencyId: string;
  name: string;
  category: SupplierCategory;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string;
  balance: number;       // Amount we owe them
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}
