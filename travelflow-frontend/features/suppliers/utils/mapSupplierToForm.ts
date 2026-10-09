import type { Supplier } from "@/types";
import type { SupplierFormValues } from "@/features/suppliers/schemas/supplier.schema";

export function mapSupplierToForm(supplier: Supplier): SupplierFormValues {
  return {
    name: supplier.name,
    category: supplier.category,
    contactPerson: supplier.contactPerson ?? "",
    email: supplier.email ?? "",
    phone: supplier.phone ?? "",
    city: supplier.city ?? "",
    country: supplier.country ?? "",
  };
}

export const supplierDefaultValues: SupplierFormValues = {
  name: "",
  category: "airline",
  contactPerson: "",
  email: "",
  phone: "",
  city: "",
  country: "",
};
