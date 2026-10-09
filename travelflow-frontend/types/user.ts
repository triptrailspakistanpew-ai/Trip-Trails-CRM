export interface User {
  id: string;
  agencyId: string;
  branchId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  permissions?: string[];
  status: 'active' | 'inactive' | 'invited';
  avatarUrl?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  agency?: {
    id: string;
    name: string;
    code: string;
    city: string;
    country: string;
  };
  branch?: {
    id: string;
    name: string;
    code: string;
    city: string;
    currency?: "PKR" | "AED";
  };
}
