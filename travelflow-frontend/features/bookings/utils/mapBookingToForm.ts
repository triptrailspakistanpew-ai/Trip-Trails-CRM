import type { Booking } from "@/types";
import type { BookingFormValues } from "@/features/bookings/schemas/booking.schema";

export function mapBookingToForm(booking: Booking): BookingFormValues {
  return {
    customerId: booking.customerId,
    title: booking.title,
    departureDate: new Date(booking.departureDate),
    returnDate: booking.returnDate ? new Date(booking.returnDate) : undefined,
    expectedAdults: booking.expectedAdults,
    expectedChildren: booking.expectedChildren,
    expectedInfants: booking.expectedInfants,
    bookingStatus: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,
    notes: booking.notes ?? "",
    terms: booking.terms ?? "",
    termsTemplateId: booking.termsTemplateId ?? "",
    services: booking.services?.map((s) => ({
      serviceCategory: s.serviceCategory,
      title: s.title,
      description: s.description ?? "",
      supplierId: s.supplierId ?? "",
      supplierName: (s.serviceDetails as any)?.supplierName ?? "",
      costPrice: s.costPrice,
      sellingPrice: s.sellingPrice,
      supplierInvoiceAmount: s.supplierInvoiceAmount ?? undefined,
      taxTreatment: s.taxTreatment,
      vatRate: s.vatRate,
      financialStatus: s.financialStatus,
      quantity: s.quantity,
      unit: s.unit,
      status: s.status,
      serviceDetails: s.serviceDetails,
    })) ?? [],
  };
}

export const bookingDefaultValues: BookingFormValues = {
  customerId: "",
  title: "",
  departureDate: new Date(),
  expectedAdults: 1,
  expectedChildren: 0,
  expectedInfants: 0,
  bookingStatus: "confirmed",
  paymentStatus: "unpaid",
  notes: "",
  terms: "",
  termsTemplateId: "",
  services: [
    {
      serviceCategory: "flight",
      title: "",
      description: "",
      supplierId: "",
      supplierName: "",
      costPrice: 0,
      sellingPrice: 0,
      taxTreatment: "VAT_ON_MARGIN",
      vatRate: 5,
      quantity: 1,
      unit: "Person",
      status: "pending",
      financialStatus: "draft",
    },
  ],
};
