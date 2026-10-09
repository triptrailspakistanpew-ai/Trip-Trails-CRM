import type { Customer } from "@/types";
import type { CustomerFormValues } from "@/features/customers/schemas/customer.schema";

export function mapCustomerToForm(customer: Customer): CustomerFormValues {
  return {
    type: customer.type,
    firstName: customer.firstName,
    lastName: customer.lastName,
    companyName: customer.companyName ?? "",
    businessType: customer.businessType ?? "",
    taxNumber: customer.taxNumber ?? "",
    email: customer.email ?? "",
    phone: customer.phone,
    whatsapp: customer.whatsapp ?? "",
    dateOfBirth: customer.dateOfBirth
      ? new Date(customer.dateOfBirth).toISOString().slice(0, 10)
      : "",
    gender: customer.gender,
    cnic: customer.cnic ?? "",
    passportNumber: customer.passportNumber ?? "",
    city: customer.city ?? "Karachi",
    country: customer.country ?? "Pakistan",
    address: customer.address ?? "",
    emergencyContactName: customer.emergencyContactName ?? "",
    emergencyContactPhone: customer.emergencyContactPhone ?? "",
    internalNotes: customer.internalNotes ?? "",
  };
}

export const customerDefaultValues: CustomerFormValues = {
  type: "individual",
  firstName: "",
  lastName: "",
  companyName: "",
  email: "",
  phone: "",
  whatsapp: "",
  city: "Karachi",
  country: "Pakistan",
};
