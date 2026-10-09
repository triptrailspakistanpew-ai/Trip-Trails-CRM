"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { Plus, Trash2, Plane, Building2, Calculator, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { showSuccess, showError } from "@/lib/toast-utils";

import { DrawerForm } from "@/components/forms/DrawerForm";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormField,
  FormSelect,
  FormCombobox,
  FormTextArea,
} from "@/components/forms/FormField";

import {
  bookingSchema,
  BookingFormValues,
} from "@/features/bookings/schemas/booking.schema";
import {
  bookingDefaultValues,
  mapBookingToForm,
} from "@/features/bookings/utils/mapBookingToForm";
import { API } from "@/lib/data-source";
import { useSuppliers } from "@/features/suppliers/hooks/queries";
import { useBranchStore } from "@/store/branch.store";
import type { Booking, Customer, Supplier, Template } from "@/types";

const TAX_TREATMENT_OPTIONS = [
  { label: "VAT on Margin (5% UAE standard)", value: "VAT_ON_MARGIN" },
  { label: "VAT on Selling Price (5%)", value: "VAT_ON_SELLING_PRICE" },
  { label: "Zero Rated (0%)", value: "ZERO_RATED" },
  { label: "Exempt", value: "EXEMPT" },
  { label: "No VAT", value: "NO_VAT" },
] as const;

const SERVICE_CATEGORIES = [
  { label: "Flight", value: "flight" },
  { label: "Hotel", value: "hotel" },
  { label: "Transfer", value: "transfer" },
  { label: "Visa", value: "visa" },
  { label: "Insurance", value: "insurance" },
  { label: "Activity / Tour", value: "activity" },
  { label: "Other", value: "other" },
] as const;

function VatCalculationBreakdown({
  costPrice,
  sellingPrice,
  vatRate,
  taxTreatment,
  quantity,
  currency,
}: {
  costPrice: number;
  sellingPrice: number;
  vatRate: number;
  taxTreatment: string;
  quantity: number;
  currency: string;
}) {
  const qty = Number(quantity) || 1;
  const unitCost = Number(costPrice) || 0;
  const unitSelling = Number(sellingPrice) || 0;
  const totalCost = unitCost * qty;
  const totalSelling = unitSelling * qty;
  const margin = totalSelling - totalCost;
  const treatment = taxTreatment || "VAT_ON_MARGIN";
  const rate = Number(vatRate || 0);

  let taxBase = 0;
  let vatAmount = 0;
  let taxLabel = "VAT";

  switch (treatment) {
    case "VAT_ON_MARGIN":
      taxBase = Math.max(0, margin);
      vatAmount = (taxBase * rate) / 100;
      taxLabel = `VAT on Margin (${rate}%)`;
      break;
    case "VAT_ON_SELLING_PRICE":
      taxBase = totalSelling;
      vatAmount = (taxBase * rate) / 100;
      taxLabel = `VAT on Selling Price (${rate}%)`;
      break;
    case "ZERO_RATED":
      taxBase = totalSelling;
      vatAmount = 0;
      taxLabel = "Zero Rated (0%)";
      break;
    case "EXEMPT":
    case "NO_VAT":
      taxBase = 0;
      vatAmount = 0;
      taxLabel = treatment === "EXEMPT" ? "Exempt" : "No VAT";
      break;
  }

  const customerTotal = totalSelling + vatAmount;

  return (
    <div className="bg-tf-surface-2 p-3 rounded-lg text-xs space-y-1.5 border border-tf-border">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
        <div className="p-1.5 rounded bg-tf-surface">
          <p className="text-tf-text-muted text-[10px] uppercase font-medium">Supplier Cost</p>
          <p className="font-semibold text-tf-text-primary">
            {currency} {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-1.5 rounded bg-tf-surface">
          <p className="text-tf-text-muted text-[10px] uppercase font-medium">Selling Price</p>
          <p className="font-semibold text-tf-text-primary">
            {currency} {totalSelling.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-1.5 rounded bg-tf-surface">
          <p className="text-tf-text-muted text-[10px] uppercase font-medium">Margin / Profit</p>
          <p className={`font-semibold ${margin >= 0 ? "text-tf-success" : "text-tf-danger"}`}>
            {currency} {margin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-1.5 rounded bg-tf-surface">
          <p className="text-tf-text-muted text-[10px] uppercase font-medium">{taxLabel}</p>
          <p className="font-semibold text-tf-accent">
            {currency} {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-1.5 rounded bg-tf-primary/10 col-span-2 sm:col-span-1">
          <p className="text-tf-primary text-[10px] uppercase font-medium">Customer Total</p>
          <p className="font-bold text-tf-primary">
            {currency} {customerTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
}

function ServiceItemCard({
  index,
  suppliers,
  onRemove,
  canRemove,
  form,
  currency,
}: {
  index: number;
  suppliers: Supplier[];
  onRemove: () => void;
  canRemove: boolean;
  form: any;
  currency: string;
}) {
  const costPrice = useWatch({ control: form.control, name: `services.${index}.costPrice` }) || 0;
  const sellingPrice = useWatch({ control: form.control, name: `services.${index}.sellingPrice` }) || 0;
  const vatRate = useWatch({ control: form.control, name: `services.${index}.vatRate` }) ?? 5;
  const taxTreatment = useWatch({ control: form.control, name: `services.${index}.taxTreatment` }) || "VAT_ON_MARGIN";
  const quantity = useWatch({ control: form.control, name: `services.${index}.quantity` }) || 1;
  const serviceCategory = useWatch({ control: form.control, name: `services.${index}.serviceCategory` }) || "flight";

  const showVatRate = taxTreatment === "VAT_ON_MARGIN" || taxTreatment === "VAT_ON_SELLING_PRICE";

  const filteredSuppliers = suppliers.filter((s) => {
    if (!serviceCategory || serviceCategory === "other") return true;
    if (serviceCategory === "flight") return s.category === "airline" || s.category === "consolidator" || !s.category;
    if (serviceCategory === "hotel") return s.category === "hotel" || s.category === "consolidator" || !s.category;
    if (serviceCategory === "transfer") return s.category === "transport" || !s.category;
    return !s.category || s.category === serviceCategory || s.category === "consolidator" || s.category === "other";
  });

  return (
    <div className="border border-tf-border rounded-xl p-4 sm:p-5 space-y-4 bg-tf-surface shadow-xs">
      <div className="flex justify-between items-center border-b border-tf-border pb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
            Service {index + 1}
          </Badge>
          <span className="text-xs text-tf-text-secondary capitalize font-medium">
            {serviceCategory}
          </span>
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-tf-danger hover:bg-tf-danger/10 hover:text-tf-danger h-8 px-2"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            <span className="text-xs">Remove</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormCombobox
          control={form.control}
          name={`services.${index}.serviceCategory`}
          label="Category"
          required
          options={SERVICE_CATEGORIES.map((c) => ({ label: c.label, value: c.value }))}
        />
        <div className="sm:col-span-2">
          <FormField
            control={form.control}
            name={`services.${index}.title`}
            label="Service Title"
            placeholder="e.g. Emirates Airline DXB - LHE"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormCombobox
          control={form.control}
          name={`services.${index}.supplierId`}
          label="Supplier"
          options={[
            { label: "-- Select Supplier --", value: "" },
            ...filteredSuppliers.map((s) => ({
              label: `${s.name} (${s.category || "Supplier"})`,
              value: s.id,
            })),
          ]}
        />
        <FormField
          control={form.control}
          name={`services.${index}.supplierName`}
          label="Manual Supplier Name (Optional)"
          placeholder="Override or unlisted supplier"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <FormField
          control={form.control}
          name={`services.${index}.costPrice`}
          label={`Cost / Unit (${currency})`}
          type="number"
          required
        />
        <FormField
          control={form.control}
          name={`services.${index}.sellingPrice`}
          label={`Sell / Unit (${currency})`}
          type="number"
          required
        />
        <FormField
          control={form.control}
          name={`services.${index}.quantity`}
          label="Quantity"
          type="number"
          required
        />
        <FormField
          control={form.control}
          name={`services.${index}.unit`}
          label="Unit"
          placeholder="e.g. Person, Night"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormCombobox
          control={form.control}
          name={`services.${index}.taxTreatment`}
          label="Tax Treatment"
          options={TAX_TREATMENT_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
        />
        {showVatRate ? (
          <FormField
            control={form.control}
            name={`services.${index}.vatRate`}
            label="VAT Rate (%)"
            type="number"
            placeholder="e.g. 5 for 5%"
          />
        ) : (
          <div className="flex items-center text-xs text-tf-text-muted pt-7">
            No VAT applied for this tax treatment.
          </div>
        )}
      </div>

      <FormField
        control={form.control}
        name={`services.${index}.description`}
        label="Service Notes / Voucher Instructions"
        placeholder="e.g. Flight PNR 7X8Y9Z, Hotel Voucher Ref #..."
      />

      <VatCalculationBreakdown
        costPrice={costPrice}
        sellingPrice={sellingPrice}
        vatRate={vatRate}
        taxTreatment={taxTreatment}
        quantity={quantity}
        currency={currency}
      />
    </div>
  );
}

interface BookingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: Booking | null;
  customers: Customer[];
  onSuccess?: () => void;
}

export function BookingDrawer({
  isOpen,
  onClose,
  booking,
  customers,
  onSuccess,
}: BookingDrawerProps) {
  const queryClient = useQueryClient();
  const activeCurrency = useBranchStore((state) => state.activeCurrency);
  const { data: suppliers = [] } = useSuppliers();

  const isEditing = Boolean(booking?.id);

  const [notesTemplates, setNotesTemplates] = useState<Template[]>([]);
  const [termsTemplates, setTermsTemplates] = useState<Template[]>([]);

  const [newCustomer, setNewCustomer] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    city: "Dubai",
    country: activeCurrency === "PKR" ? "Pakistan" : "United Arab Emirates",
  });

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: bookingDefaultValues,
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "services",
  });

  // Load templates on mount
  useEffect(() => {
    Promise.all([
      API.getTemplates("quotation_notes").catch(() => []),
      API.getTemplates("booking_notes" as any).catch(() => []),
    ]).then(([qNotes, bNotes]) => {
      setNotesTemplates([...qNotes, ...bNotes]);
    });

    Promise.all([
      API.getTemplates("quotation_terms").catch(() => []),
      API.getTemplates("invoice_terms").catch(() => []),
      API.getTemplates("booking_terms" as any).catch(() => []),
    ]).then(([qTerms, invTerms, bTerms]) => {
      const map = new Map<string, Template>();
      [...qTerms, ...invTerms, ...bTerms].forEach((t) => map.set(t.id, t));
      setTermsTemplates(Array.from(map.values()));
    });
  }, []);

  // Populate or reset form when drawer opens or booking changes
  useEffect(() => {
    if (isOpen) {
      if (booking) {
        form.reset(mapBookingToForm(booking));
      } else {
        form.reset({
          ...bookingDefaultValues,
          customerId: customers[0]?.id ?? "",
          departureDate: new Date(),
        });
        setNewCustomer({
          firstName: "",
          lastName: "",
          phone: "",
          email: "",
          city: "Dubai",
          country: activeCurrency === "PKR" ? "Pakistan" : "United Arab Emirates",
        });
      }
    }
  }, [isOpen, booking, customers, activeCurrency, form]);

  const watchedServices = useWatch({ control: form.control, name: "services" }) || [];
  const selectedCustomerId = useWatch({ control: form.control, name: "customerId" });

  // Calculate overall booking totals
  const totals = useMemo(() => {
    let totalCost = 0;
    let totalSelling = 0;
    let totalVat = 0;

    watchedServices.forEach((svc: any) => {
      const qty = Number(svc.quantity) || 1;
      const cost = (Number(svc.costPrice) || 0) * qty;
      const sell = (Number(svc.sellingPrice) || 0) * qty;
      const margin = sell - cost;
      const rate = Number(svc.vatRate || 0);
      const treatment = svc.taxTreatment || "VAT_ON_MARGIN";

      let vat = 0;
      if (treatment === "VAT_ON_MARGIN") {
        vat = (Math.max(0, margin) * rate) / 100;
      } else if (treatment === "VAT_ON_SELLING_PRICE") {
        vat = (sell * rate) / 100;
      }

      totalCost += cost;
      totalSelling += sell;
      totalVat += vat;
    });

    const grossMargin = totalSelling - totalCost;
    const customerPayable = totalSelling + totalVat;

    return {
      totalCost,
      totalSelling,
      grossMargin,
      totalVat,
      customerPayable,
    };
  }, [watchedServices]);

  const handleAddService = () => {
    append({
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
    });
  };

  const onSubmit = async (values: BookingFormValues) => {
    try {
      let finalCustomerId = values.customerId;

      // Inline customer creation if selected
      if (finalCustomerId === "NEW_CUSTOMER") {
        if (!newCustomer.firstName.trim() || newCustomer.firstName.trim().length < 2) {
          showError("First name is required (min 2 characters)");
          return;
        }
        if (!newCustomer.lastName.trim() || newCustomer.lastName.trim().length < 2) {
          showError("Last name is required (min 2 characters)");
          return;
        }
        if (!newCustomer.phone.trim()) {
          showError("Phone number is required");
          return;
        }

        const createdCustomer = await API.createCustomer({
          type: "individual",
          firstName: newCustomer.firstName.trim(),
          lastName: newCustomer.lastName.trim(),
          phone: newCustomer.phone.trim(),
          email: newCustomer.email.trim() || undefined,
          city: newCustomer.city || "Dubai",
          country: newCustomer.country || "United Arab Emirates",
        });
        finalCustomerId = createdCustomer.id;
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      }

      // Ensure services have titles and are well formatted
      const formattedServices = (values.services || []).map((s) => ({
        serviceCategory: s.serviceCategory,
        title: s.title.trim() || `${s.serviceCategory.toUpperCase()} Service`,
        description: s.description || undefined,
        supplierId: s.supplierId?.trim() || undefined,
        supplierName: s.supplierName?.trim() || undefined,
        costPrice: Number(s.costPrice) || 0,
        sellingPrice: Number(s.sellingPrice) || 0,
        taxTreatment: s.taxTreatment || "VAT_ON_MARGIN",
        vatRate: Number(s.vatRate) || 0,
        quantity: Number(s.quantity) || 1,
        unit: s.unit || "Person",
        status: s.status || "pending",
        financialStatus: s.financialStatus || "draft",
      }));

      const bookingPayload = {
        ...values,
        customerId: finalCustomerId,
        services: formattedServices,
      };

      if (isEditing && booking?.id) {
        await API.updateBooking(booking.id, bookingPayload);
        showSuccess("Booking Updated", {
          description: `Booking ${booking.bookingRef} updated successfully.`,
        });
      } else {
        const res = await API.createBookingFromForm(bookingPayload);
        showSuccess("Booking Created Successfully", {
          description: `Booking reference: ${res.bookingRef}`,
        });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      showError(err, { context: isEditing ? "Updating booking" : "Creating booking" });
    }
  };

  return (
    <DrawerForm
      title={isEditing ? `Edit Booking (${booking?.bookingRef})` : "Create New Booking"}
      description={
        isEditing
          ? "Update booking details, services, supplier costs, pricing, and terms."
          : "Directly create a confirmed booking with services, suppliers, costs, and terms."
      }
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={form.handleSubmit(onSubmit)}
      isSubmitting={form.formState.isSubmitting}
      size="xl"
      submitLabel={isEditing ? "Save Changes" : "Create Booking"}
    >
      <Form {...form}>
        <div className="space-y-8 pb-4">
          {/* 1. CUSTOMER SELECTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-tf-border pb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-tf-text-secondary">
                1. Customer Details
              </h3>
              {selectedCustomerId === "NEW_CUSTOMER" && (
                <Badge className="bg-tf-primary/20 text-tf-primary border-tf-primary/30">
                  New Customer Mode
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <FormCombobox
                control={form.control as any}
                name="customerId"
                label="Select Customer"
                required
                options={[
                  { label: "✨ + Create New Customer", value: "NEW_CUSTOMER" },
                  ...customers.map((c) => ({
                    label: `${c.firstName} ${c.lastName}${c.phone ? ` (${c.phone})` : ""}`,
                    value: c.id,
                  })),
                ]}
              />
            </div>

            {selectedCustomerId === "NEW_CUSTOMER" && (
              <div className="p-4 rounded-xl border border-tf-primary/30 bg-tf-surface-2 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 text-sm font-medium text-tf-text-primary">
                  <span>Enter New Customer Information:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-tf-text-secondary">
                      First Name <span className="text-tf-danger">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. John"
                      value={newCustomer.firstName}
                      onChange={(e) =>
                        setNewCustomer({ ...newCustomer, firstName: e.target.value })
                      }
                      className="bg-tf-surface border-tf-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-tf-text-secondary">
                      Last Name <span className="text-tf-danger">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. Doe"
                      value={newCustomer.lastName}
                      onChange={(e) =>
                        setNewCustomer({ ...newCustomer, lastName: e.target.value })
                      }
                      className="bg-tf-surface border-tf-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-tf-text-secondary">
                      Phone Number <span className="text-tf-danger">*</span>
                    </Label>
                    <PhoneInput
                      value={newCustomer.phone}
                      onChange={(val) => setNewCustomer({ ...newCustomer, phone: val })}
                      placeholder="Phone"
                      className="bg-tf-surface"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-tf-text-secondary">Email Address</Label>
                    <Input
                      placeholder="john.doe@example.com"
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) =>
                        setNewCustomer({ ...newCustomer, email: e.target.value })
                      }
                      className="bg-tf-surface border-tf-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-tf-text-secondary">City</Label>
                    <Input
                      placeholder="City"
                      value={newCustomer.city}
                      onChange={(e) =>
                        setNewCustomer({ ...newCustomer, city: e.target.value })
                      }
                      className="bg-tf-surface border-tf-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-tf-text-secondary">Country</Label>
                    <Input
                      placeholder="Country"
                      value={newCustomer.country}
                      onChange={(e) =>
                        setNewCustomer({ ...newCustomer, country: e.target.value })
                      }
                      className="bg-tf-surface border-tf-border"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. TRIP & PASSENGER DETAILS */}
          <div className="space-y-4">
            <div className="border-b border-tf-border pb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-tf-text-secondary">
                2. Booking & Travel Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="title"
                label="Booking Title"
                placeholder="e.g. Dubai Family Package 2026"
              />
              <div className="grid grid-cols-3 gap-2">
                <FormField
                  control={form.control as any}
                  name="expectedAdults"
                  label="Adults"
                  type="number"
                />
                <FormField
                  control={form.control as any}
                  name="expectedChildren"
                  label="Children"
                  type="number"
                />
                <FormField
                  control={form.control as any}
                  name="expectedInfants"
                  label="Infants"
                  type="number"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-tf-text-secondary">
                  Departure Date <span className="text-tf-danger">*</span>
                </Label>
                <Controller
                  control={form.control}
                  name="departureDate"
                  render={({ field }) => (
                    <Input
                      type="date"
                      className="rounded-lg bg-tf-surface border-tf-border"
                      value={
                        field.value
                          ? new Date(field.value).toISOString().slice(0, 10)
                          : ""
                      }
                      onChange={(e) =>
                        field.onChange(e.target.value ? new Date(e.target.value) : undefined)
                      }
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-tf-text-secondary">Return Date</Label>
                <Controller
                  control={form.control}
                  name="returnDate"
                  render={({ field }) => (
                    <Input
                      type="date"
                      className="rounded-lg bg-tf-surface border-tf-border"
                      value={
                        field.value
                          ? new Date(field.value).toISOString().slice(0, 10)
                          : ""
                      }
                      onChange={(e) =>
                        field.onChange(e.target.value ? new Date(e.target.value) : undefined)
                      }
                    />
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormCombobox
                control={form.control as any}
                name="bookingStatus"
                label="Booking Status"
                options={[
                  { label: "Confirmed", value: "confirmed" },
                  { label: "Draft / Pending", value: "draft" },
                  { label: "In Progress", value: "in_progress" },
                  { label: "Completed", value: "completed" },
                  { label: "Cancelled", value: "cancelled" },
                ]}
              />
              <FormSelect
                control={form.control as any}
                name="paymentStatus"
                label="Payment Status"
                options={[
                  { label: "Unpaid", value: "unpaid" },
                  { label: "Partial", value: "partial" },
                  { label: "Paid", value: "paid" },
                ]}
              />
            </div>
          </div>

          {/* 3. SERVICES & SUPPLIER OBLIGATIONS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-tf-border pb-2">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-tf-text-secondary">
                  3. Services & Supplier Obligations
                </h3>
                <p className="text-xs text-tf-text-muted mt-0.5">
                  Specify flights, hotels, transfers, each linked to their supplier and costs.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddService}
                className="border-tf-border text-tf-primary hover:bg-tf-primary/10"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Service
              </Button>
            </div>

            {fields.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-tf-border rounded-xl bg-tf-surface-2 space-y-3">
                <AlertCircle className="h-8 w-8 text-tf-warning mx-auto" />
                <p className="text-sm font-medium text-tf-text-primary">No services added yet</p>
                <p className="text-xs text-tf-text-secondary">
                  Click below to add a service with supplier and cost details.
                </p>
                <Button type="button" onClick={handleAddService} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add First Service
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <ServiceItemCard
                    key={field.id}
                    index={index}
                    suppliers={suppliers}
                    onRemove={() => remove(index)}
                    canRemove={fields.length > 1}
                    form={form}
                    currency={activeCurrency}
                  />
                ))}
              </div>
            )}

            {/* Financial Summary Card */}
            {fields.length > 0 && (
              <div className="rounded-xl border border-tf-border bg-tf-surface-2 p-4 sm:p-5 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 border-b border-tf-border pb-2">
                  <Calculator className="h-4 w-4 text-tf-primary" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-tf-text-primary">
                    Total Booking Financials
                  </h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-tf-text-muted block">Supplier Obligations:</span>
                    <span className="font-semibold text-tf-text-primary">
                      {activeCurrency} {totals.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-tf-text-muted block">Selling Subtotal:</span>
                    <span className="font-semibold text-tf-text-primary">
                      {activeCurrency} {totals.totalSelling.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-tf-text-muted block">Gross Margin:</span>
                    <span
                      className={`font-semibold ${
                        totals.grossMargin >= 0 ? "text-tf-success" : "text-tf-danger"
                      }`}
                    >
                      {activeCurrency} {totals.grossMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-tf-text-muted block">Output Tax (VAT):</span>
                    <span className="font-semibold text-tf-accent">
                      {activeCurrency} {totals.totalVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="border-l border-tf-border pl-3">
                    <span className="text-xs text-tf-primary font-medium block">Total Payable:</span>
                    <span className="font-bold text-tf-primary text-base">
                      {activeCurrency} {totals.customerPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. NOTES & TERMS TEMPLATES */}
          <div className="space-y-4">
            <div className="border-b border-tf-border pb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-tf-text-secondary">
                4. Notes & Terms Templates
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-tf-text-muted">Template Shortcuts:</span>
                  {notesTemplates.length > 0 && (
                    <Select
                      onValueChange={(val) => {
                        const t = notesTemplates.find((x) => x.id === val);
                        if (t) form.setValue("notes", t.content, { shouldDirty: true });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs px-2 w-[180px] bg-tf-surface">
                        <SelectValue placeholder="Load Notes Template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {notesTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <FormTextArea
                  control={form.control as any}
                  name="notes"
                  label="Booking Notes"
                  placeholder="Special customer requirements, room preferences, internal notes..."
                />
              </div>

              {/* Terms & Conditions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-tf-text-muted">Template Shortcuts:</span>
                  {termsTemplates.length > 0 && (
                    <Select
                      onValueChange={(val) => {
                        const t = termsTemplates.find((x) => x.id === val);
                        if (t) {
                          form.setValue("terms", t.content, { shouldDirty: true });
                          form.setValue("termsTemplateId", t.id, { shouldDirty: true });
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs px-2 w-[180px] bg-tf-surface">
                        <SelectValue placeholder="Load Terms Template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {termsTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <FormTextArea
                  control={form.control as any}
                  name="terms"
                  label="Terms & Conditions"
                  placeholder="Cancellation policy, payment terms, visa requirements..."
                />
              </div>
            </div>
          </div>
        </div>
      </Form>
    </DrawerForm>
  );
}
