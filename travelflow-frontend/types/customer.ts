export interface Customer {
  id: string;
  agencyId: string;
  customerRef: string;
  type: 'individual' | 'corporate';
  firstName: string;
  lastName: string;
  companyName?: string;
  businessType?: string;
  taxNumber?: string;
  email?: string;
  phone: string;
  whatsapp?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'prefer_not_to_say';
  cnic?: string;
  passportNumber?: string;
  passportExpiry?: Date;
  nationality?: string;
  address?: string;
  city?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  internalNotes?: string;
  totalBookings: number;
  totalSpent: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  note: string;
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerDocument {
  id: string;
  customerId: string;
  documentType: 'passport' | 'cnic' | 'visa' | 'ticket' | 'other';
  fileName: string;
  fileSize: number;
  mimeType: string;
  base64Data: string;
  notes?: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}
