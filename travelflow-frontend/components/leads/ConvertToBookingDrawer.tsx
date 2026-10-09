"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { showSuccess, showError } from "@/lib/toast-utils";
import { DrawerForm } from "@/components/forms/DrawerForm";
import {
  FormField,
  FormSelect,
  FormCombobox,
  FormTextArea,
} from "@/components/forms/FormField";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Lead } from "@/types";
import { API } from "@/lib/data-source";
import { useSuppliers } from "@/features/suppliers/hooks/queries";
import { Trash2, Plus } from "lucide-react";
import { useBranchStore } from "@/store/branch.store";

const TAX_TREATMENT_OPTIONS = [
  { label: "VAT on Margin", value: "VAT_ON_MARGIN" },
  { label: "VAT on Selling Price", value: "VAT_ON_SELLING_PRICE" },
  { label: "Zero Rated", value: "ZERO_RATED" },
  { label: "Exempt", value: "EXEMPT" },
  { label: "No VAT", value: "NO_VAT" },
] as const;

const bookingServiceSchema = z.object({
  serviceCategory: z.string().min(1, "Service category is required"),
  title: z.string().min(1, "Service title is required"),
  description: z.string().optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  costPrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  taxTreatment: z.enum([
    "VAT_ON_MARGIN", "VAT_ON_SELLING_PRICE",
    "ZERO_RATED", "EXEMPT", "NO_VAT"
  ]).default("VAT_ON_MARGIN"),
  vatRate: z.coerce.number().min(0).max(100).default(0),
  quantity: z.coerce.number().int().min(1).default(1),
  unit: z.string().optional().default("Person"),
  status: z.string().optional().default("pending"),
});

const bookingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  departureDate: z.string().min(1, "Departure date is required"),
  returnDate: z.string().optional(),
  expectedAdults: z.coerce.number().int().min(1),
  expectedChildren: z.coerce.number().int().min(0),
  expectedInfants: z.coerce.number().int().min(0),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]),
  notes: z.string().optional(),
  services: z.array(bookingServiceSchema).min(1, "At least one service is required"),
});

type BookingValues = z.infer<typeof bookingSchema>;

interface ConvertToBookingDrawerProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

// Helper component to display VAT calculation breakdown
function VatCalculationBreakdown({ costPrice, sellingPrice, vatRate, taxTreatment, currency }: any) {
  const cost = Number(costPrice) || 0;
  const selling = Number(sellingPrice) || 0;
  const margin = selling - cost;
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
      taxBase = selling;
      vatAmount = (taxBase * rate) / 100;
      taxLabel = `VAT on Selling Price (${rate}%)`;
      break;
    case "ZERO_RATED":
      taxBase = selling;
      vatAmount = 0;
      taxLabel = "Zero Rated";
      break;
    case "EXEMPT":
    case "NO_VAT":
      taxBase = 0;
      vatAmount = 0;
      taxLabel = treatment === "EXEMPT" ? "Exempt" : "No VAT";
      break;
  }

  const total = selling + vatAmount;

  return (
    <div className="bg-tf-surface-2 p-3 rounded text-xs space-y-1">
      <div className="flex justify-between">
        <span className="text-tf-text-muted">Supplier Cost:</span>
        <span className="font-medium">{currency} {cost.toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-tf-text-muted">Selling Price:</span>
        <span className="font-medium">{currency} {selling.toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-tf-text-muted">Margin:</span>
        <span className={`font-medium ${margin > 0 ? "text-tf-success" : "text-tf-error"}`}>
          {currency} {margin.toLocaleString()}
        </span>
      </div>
      <div className="border-t border-tf-surface-3 pt-1 mt-1 flex justify-between">
        <span className="text-tf-text-muted">{taxLabel}:</span>
        <span className="font-medium text-tf-accent">{currency} {vatAmount.toLocaleString()}</span>
      </div>
      <div className="flex justify-between font-semibold pt-1">
        <span>Customer Pays:</span>
        <span className="text-tf-success">{currency} {total.toLocaleString()}</span>
      </div>
    </div>
  );
}

// Component for a single service/supplier row
function ServiceRow({
  index,
  suppliers,
  onRemove,
  canRemove,
  form,
  currency,
}: {
  index: number;
  suppliers: any[];
  onRemove: () => void;
  canRemove: boolean;
  form: any;
  currency: string;
}) {
  const costPrice = useWatch({
    control: form.control,
    name: `services.${index}.costPrice`,
  });
  const sellingPrice = useWatch({
    control: form.control,
    name: `services.${index}.sellingPrice`,
  });
  const vatRate = useWatch({
    control: form.control,
    name: `services.${index}.vatRate`,
  });
  const taxTreatment = useWatch({
    control: form.control,
    name: `services.${index}.taxTreatment`,
  });

  const serviceCategory = useWatch({
    control: form.control,
    name: `services.${index}.serviceCategory`,
  });

  const showVatRate = taxTreatment === "VAT_ON_MARGIN" || taxTreatment === "VAT_ON_SELLING_PRICE";

  const validCats = serviceCategory === "flight" ? ["airline", "consolidator"] : serviceCategory === "transfer" ? ["transport"] : [serviceCategory, "consolidator", "other"];
  const filteredSuppliers = suppliers.filter(s => {
    if (!serviceCategory || serviceCategory === "other") return true;
    return !s.category || validCats.includes(s.category);
  });

  return (
    <div className="border border-tf-surface-3 rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium">Service {index + 1}</h4>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-tf-error hover:bg-tf-error/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <FormCombobox
        control={form.control}
        name={`services.${index}.serviceCategory`}
        label="Service Category"
        options={[
          { label: "Flight", value: "flight" },
          { label: "Hotel", value: "hotel" },
          { label: "Transfer", value: "transfer" },
          { label: "Insurance", value: "insurance" },
          { label: "Visa", value: "visa" },
          { label: "Activity", value: "activity" },
          { label: "Other", value: "other" },
        ]}
      />

      <FormField
        control={form.control}
        name={`services.${index}.title`}
        label="Service Title"
        placeholder="e.g. Emirates Flight LHE-DXB"
      />

      <FormTextArea
        control={form.control}
        name={`services.${index}.description`}
        label="Service Details"
        placeholder="Optional supplier instructions or notes"
      />

      <div className="grid grid-cols-2 gap-4">
        <FormCombobox
          control={form.control}
          name={`services.${index}.supplierId`}
          label="Supplier"
          options={[
            { label: "Select supplier", value: "" },
            ...filteredSuppliers.map((supplier) => ({
              label: supplier.name,
              value: supplier.id,
            })),
          ]}
        />
        <FormField
          control={form.control}
          name={`services.${index}.supplierName`}
          label="Manual Override"
          placeholder="Type supplier name"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`services.${index}.costPrice`}
          label={`Supplier Cost (${currency})`}
          type="number"
        />
        <FormField
          control={form.control}
          name={`services.${index}.sellingPrice`}
          label={`Selling Price (${currency})`}
          type="number"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormCombobox
          control={form.control}
          name={`services.${index}.taxTreatment`}
          label="Tax Treatment"
          options={TAX_TREATMENT_OPTIONS.map(o => ({ label: o.label, value: o.value }))}
        />
        {showVatRate && (
          <FormField
            control={form.control}
            name={`services.${index}.vatRate`}
            label="VAT Rate (%)"
            type="number"
            placeholder="e.g., 5 for 5%"
          />
        )}
      </div>

      <VatCalculationBreakdown
        costPrice={costPrice}
        sellingPrice={sellingPrice}
        vatRate={vatRate}
        taxTreatment={taxTreatment}
        currency={currency}
      />
    </div>
  );
}

export function ConvertToBookingDrawer({
  lead,
  isOpen,
  onClose,
}: ConvertToBookingDrawerProps) {
  const router = useRouter();
  const activeCurrency = useBranchStore((state) => state.activeCurrency);
  const { data: suppliers = [] } = useSuppliers();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    mode: "onChange",
    defaultValues: {
      title: `${lead.destination || "Trip"}`,
      departureDate: lead.travelDate
        ? new Date(lead.travelDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      returnDate: "",
      expectedAdults: lead.adults || 1,
      expectedChildren: lead.children || 0,
      expectedInfants: 0,
      paymentStatus: "unpaid",
      notes: lead.notes || "",
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
          vatRate: 0,
          quantity: 1,
          unit: "Person",
          status: "pending",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "services",
  });

  async function onSubmit(data: BookingValues) {
    setIsSubmitting(true);
    try {
      // Backend calculates all financial fields — we only send the source values
      const bookingData = {
        title: data.title,
        departureDate: new Date(data.departureDate).toISOString(),
        returnDate: data.returnDate
          ? new Date(data.returnDate).toISOString()
          : undefined,
        expectedAdults: data.expectedAdults,
        expectedChildren: data.expectedChildren,
        expectedInfants: data.expectedInfants,
        paymentStatus: data.paymentStatus,
        notes: data.notes,
        services: (data.services || []).map((service) => ({
          serviceCategory: service.serviceCategory,
          title: service.title,
          description: service.description || undefined,
          supplierId: service.supplierId || undefined,
          supplierName: service.supplierName || undefined,
          costPrice: Number(service.costPrice) || 0,
          sellingPrice: Number(service.sellingPrice) || 0,
          taxTreatment: service.taxTreatment || "VAT_ON_MARGIN",
          vatRate: Number(service.vatRate) || 0,
          quantity: Number(service.quantity) || 1,
          unit: service.unit || "Person",
          status: service.status || "pending",
        })),
      };

      await API.convertLead(lead.id, bookingData as any);
      showSuccess("Booking Created", {
        description: "Lead converted to booking successfully",
      });
      onClose();
      router.refresh();
    } catch (error: any) {
      showError("Conversion Failed", error.message || "Failed to convert lead");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNextOrSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    } else {
      form.handleSubmit(onSubmit)();
    }
  }

  function handleAddService() {
    append({
      serviceCategory: "flight",
      title: "",
      description: "",
      supplierId: "",
      supplierName: "",
      costPrice: 0,
      sellingPrice: 0,
      taxTreatment: "VAT_ON_MARGIN",
      vatRate: 0,
      quantity: 1,
      unit: "Person",
      status: "pending",
    });
  }

  return (
    <DrawerForm
      isOpen={isOpen}
      onClose={onClose}
      title="Convert Lead to Booking"
      description={`Convert ${lead.name} to a confirmed booking`}
      onSubmit={handleNextOrSubmit}
      submitLabel={step < 3 ? "Next" : "Create Booking"}
      isSubmitting={isSubmitting}
    >
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-tf-surface-2 p-4 rounded-lg">
            <h4 className="font-medium text-tf-text-primary mb-2">
              {lead.name}
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-tf-text-muted">Phone</p>
                <p className="font-medium">{lead.phone}</p>
              </div>
              <div>
                <p className="text-tf-text-muted">Destination</p>
                <p className="font-medium">{lead.destination}</p>
              </div>
              <div>
                <p className="text-tf-text-muted">Adults</p>
                <p className="font-medium">{lead.adults}</p>
              </div>
              <div>
                <p className="text-tf-text-muted">Children</p>
                <p className="font-medium">{lead.children}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {step >= 2 && (
        <Form {...form}>
          <div className={step === 2 ? "space-y-4" : "hidden"}>
            <FormField
              control={form.control}
              name="title"
              label="Booking Title"
              placeholder="e.g. Dubai Family Package"
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="expectedAdults"
                label="Adults"
                type="number"
              />
              <FormField
                control={form.control}
                name="expectedChildren"
                label="Children"
                type="number"
              />
              <FormField
                control={form.control}
                name="expectedInfants"
                label="Infants"
                type="number"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="departureDate"
                label="Departure Date"
                type="date"
              />
              <FormField
                control={form.control}
                name="returnDate"
                label="Return Date"
                type="date"
              />
            </div>
            <FormTextArea
              control={form.control}
              name="notes"
              label="Booking Notes"
              placeholder="Optional trip notes or special requirements"
            />
          </div>

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <ServiceRow
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

              <Button
                type="button"
                variant="outline"
                onClick={handleAddService}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Supplier
              </Button>

              <div className="pt-4 border-t border-tf-surface-3">
                <FormSelect
                  control={form.control}
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
          )}
        </Form>
      )}
    </DrawerForm>
  );
}
