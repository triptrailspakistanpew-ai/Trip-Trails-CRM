"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { showSuccess, showError } from "@/lib/toast-utils";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  FormField,
  FormSelect,
  FormTextArea,
  FormCombobox,
} from "@/components/forms/FormField";
import { PhoneInput } from "@/components/ui/phone-input";

import {
  getDefaultTaxesForCurrency,
  getQuotationDefaultValues,
  quotationDefaultValues,
  quotationSchema,
  quotationStatusOptions,
  quotationTaxTypeOptions,
  type QuotationFormValues,
} from "@/features/quotations/schemas/quotation.schema";
import type { QuotationItem, QuotationTax, Quotation } from "@/types/quotation";
import type { Customer, Branch, User, Supplier } from "@/types";
import type { Template } from "@/types/template";

import { API } from "@/lib/data-source";
import { useBranchStore } from "@/store/branch.store";

function calcTotals(items: QuotationItem[], taxes: QuotationTax[]) {
  let subtotal = 0;
  let totalCost = 0;

  (items ?? []).forEach((it) => {
    subtotal += (it.quantity || 1) * (it.sellingPrice || 0);
    totalCost += (it.quantity || 1) * (it.costPrice || 0);
  });

  const estimatedProfit = subtotal - totalCost;

  const taxAmount = (taxes ?? []).reduce((acc, t) => {
    const val = Number(t.value || 0);
    if (t.taxType === "fixed") return acc + val;
    return acc + estimatedProfit * (val / 100);
  }, 0);

  return { subtotal, estimatedProfit, taxAmount };
}

export function QuotationForm({
  initialValues,
  customers = [],
  branches = [],
  agents = [],
  editingId,
  mode = "create",
}: {
  initialValues?: Partial<QuotationFormValues>;
  customers?: Customer[];
  branches?: Branch[];
  agents?: User[];
  editingId?: string;
  mode?: "create" | "edit" | "view";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeCurrency = useBranchStore(state => state.activeCurrency);
  const isViewMode = mode === "view";
  const isEditing = mode === "edit";

  const effectiveCurrency = initialValues?.currency || activeCurrency || "PKR";
  const defaultTaxes = mode === "create" && (!initialValues?.taxes || initialValues.taxes.length === 0)
    ? getDefaultTaxesForCurrency(effectiveCurrency)
    : (initialValues?.taxes ?? quotationDefaultValues.taxes);

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const [notesTemplates, setNotesTemplates] = useState<Template[]>([]);
  const [termsTemplates, setTermsTemplates] = useState<Template[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    API.getTemplates("quotation_notes").then(setNotesTemplates).catch(console.error);
    API.getTemplates("quotation_terms").then(setTermsTemplates).catch(console.error);
    API.getSuppliers().then(setSuppliers).catch(console.error);
  }, []);

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      ...getQuotationDefaultValues(effectiveCurrency),
      ...initialValues,
      currency: effectiveCurrency,
      taxes: defaultTaxes,
    },
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({ control: form.control, name: "items" });

  const {
    fields: taxFields,
    append: appendTax,
    remove: removeTax,
  } = useFieldArray({ control: form.control, name: "taxes" });

  const watchedItems = useWatch({ control: form.control, name: "items" });
  const watchedTaxes = useWatch({ control: form.control, name: "taxes" }) ?? [];
  const currentCurrency = useWatch({ control: form.control, name: "currency" }) || activeCurrency;

  const watchedItemsArray = Array.isArray(watchedItems) ? watchedItems : [];
  const watchedTaxesArray = Array.isArray(watchedTaxes) ? watchedTaxes : [];

  const { subtotal, estimatedProfit, taxAmount } = calcTotals(
    watchedItemsArray as any,
    watchedTaxesArray as any
  );

  const grandTotal = subtotal + taxAmount;

  useEffect(() => {
    if (initialValues?.customerName) {
      setNewCustomer({
        name: initialValues.customerName || "",
        phone: initialValues.customerPhone || "",
        email: initialValues.customerEmail || "",
      });
    }
  }, [initialValues]);

  const onSubmit = async (values: QuotationFormValues) => {
    if (isViewMode) return;

    try {
      let finalCustomerId: string | undefined = values.customerId;
      let customerName: string | undefined;
      let customerPhone: string | undefined;
      let customerEmail: string | undefined;

      if (finalCustomerId === "NEW_CUSTOMER") {
        customerName = newCustomer.name.trim();
        customerPhone = newCustomer.phone.trim();
        customerEmail = newCustomer.email.trim() || undefined;
        finalCustomerId = undefined;
      }

      const payload = {
        ...values,
        customerId: finalCustomerId || undefined,
        customerName,
        customerPhone,
        customerEmail,
      };

      let finalQuotation: any = null;
      if (editingId) {
        finalQuotation = await API.updateQuotation(editingId, payload as any);
        showSuccess("Quotation updated successfully");
      } else {
        finalQuotation = await API.createQuotation(payload as any);
        showSuccess("Quotation created successfully", {
          description: finalQuotation.quotationRef
            ? `Ref: ${finalQuotation.quotationRef}`
            : undefined,
        });
      }

      // Invalidate queries so list view and detail view get the fresh status immediately
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
      if (editingId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.quotations.detail(editingId) });
      }

      router.push(`/quotations/${editingId || finalQuotation.id}`);
      router.refresh();
    } catch (e: any) {
      showError(e.message || "Failed to save quotation");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-tf-text-primary">
              {isViewMode ? "View Quotation" : isEditing ? "Edit Quotation" : "Create Quotation"}
            </h1>
            <p className="text-sm text-tf-text-secondary mt-1">
              {isViewMode ? "View quotation details" : isEditing ? "Update existing quotation" : "Build a new quotation for a customer"}
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT COLUMN: Main Form Sections */}
            <div className="lg:col-span-2 space-y-6">

              {/* SECTION: Parties & Trip Details */}
              <div className="bg-tf-surface border border-tf-border rounded-xl p-6 shadow-sm space-y-6">
                <h2 className="text-lg font-semibold text-tf-text-primary border-b border-tf-border pb-3">
                  Basic Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    label="Title"
                    placeholder="e.g. Umrah package - 2026"
                    required
                    disabled={isViewMode}
                  />

                  <FormCombobox
                    control={form.control}
                    name="customerId"
                    label="Customer"
                    required
                    options={[
                      { label: "+ Create New Customer", value: "NEW_CUSTOMER" },
                      ...(customers || []).map((c) => ({
                        label: `${c.firstName} ${c.lastName}`,
                        value: c.id,
                      })),
                    ]}
                    disabled={isViewMode}
                  />
                </div>

                {form.watch("customerId") === "NEW_CUSTOMER" && (
                  <div className="p-4 border border-tf-border rounded-lg bg-tf-surface-2 space-y-4">
                    <h4 className="text-sm font-semibold text-tf-text-primary">
                      New Customer Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-tf-text-secondary">Customer Name <span className="text-tf-danger">*</span></div>
                        <Input
                          value={newCustomer.name}
                          onChange={(e) =>
                            setNewCustomer({ ...newCustomer, name: e.target.value })
                          }
                          placeholder="e.g. John Doe"
                          required
                          disabled={isViewMode}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-tf-text-secondary">Phone <span className="text-tf-danger">*</span></div>
                        <PhoneInput
                          value={newCustomer.phone}
                          onChange={(val) =>
                            setNewCustomer({ ...newCustomer, phone: val })
                          }
                          placeholder="Enter phone number"
                          disabled={isViewMode}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-tf-text-secondary">Email</div>
                        <Input
                          value={newCustomer.email}
                          onChange={(e) =>
                            setNewCustomer({ ...newCustomer, email: e.target.value })
                          }
                          placeholder="john@example.com"
                          type="email"
                          disabled={isViewMode}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="destination"
                      label="Destination"
                      placeholder="e.g. Dubai, Saudia Arabia"
                      required
                      disabled={isViewMode}
                    />
                    <FormCombobox
                      control={form.control}
                      name="travelType"
                      label="Travel Type"
                      required
                      options={[
                        { label: "Visa", value: "visa" },
                        { label: "Holiday Package", value: "holiday_package" },
                        { label: "Honey Moon", value: "honey moon" },
                        { label: "Umrah", value: "umrah" },
                        { label: "Hajj", value: "hajj" },
                        { label: "Flight", value: "flight" },
                        { label: "Hotel", value: "hotel" },
                        { label: "Corporate", value: "corporate" },
                        { label: "Custom", value: "custom" },
                      ]}
                      disabled={isViewMode}
                    />
                    <FormSelect
                      control={form.control}
                      name="currency"
                      label="Currency"
                      required
                      options={[
                        { label: "PKR (Pakistani Rupee)", value: "PKR" },
                        { label: "AED (UAE Dirham)", value: "AED" },
                        ...(activeCurrency !== "PKR" && activeCurrency !== "AED" ? [{ label: activeCurrency, value: activeCurrency }] : [])
                      ]}
                      disabled={isViewMode}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="validUntil"
                      label="Valid Until"
                      type="date"
                      disabled={isViewMode}
                    />
                    <FormField
                      control={form.control}
                      name="adults"
                      label="Adults"
                      type="number"
                      disabled={isViewMode}
                    />
                    <FormField
                      control={form.control}
                      name="children"
                      label="Children"
                      type="number"
                      disabled={isViewMode}
                    />
                    <FormField
                      control={form.control}
                      name="infants"
                      label="Infants"
                      type="number"
                      disabled={isViewMode}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: Items */}
              <div className="bg-tf-surface border border-tf-border rounded-xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-tf-border pb-3">
                  <h2 className="text-lg font-semibold text-tf-text-primary">
                    Services & Items
                  </h2>
                </div>

                <div className="space-y-4">
                  {itemFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="space-y-3 bg-tf-surface-2 p-4 rounded-lg border border-tf-border relative"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                        <div className="md:col-span-3 space-y-3">
                          <FormCombobox
                            control={form.control}
                            name={`items.${index}.serviceCategory` as const}
                            label="Category"
                            options={[
                              { label: "Flight", value: "flight" },
                              { label: "Hotel", value: "hotel" },
                              { label: "Transfer", value: "transfer" },
                              { label: "Insurance", value: "insurance" },
                              { label: "Visa", value: "visa" },
                              { label: "Activity", value: "activity" },
                              { label: "Other", value: "other" },
                            ]}
                            required
                            disabled={isViewMode}
                          />
                        </div>
                        <div className="md:col-span-3 space-y-3">
                          <FormCombobox
                            control={form.control}
                            name={`items.${index}.supplierId` as const}
                            label="Supplier"
                            options={(suppliers || []).map((s) => ({
                              label: s.name,
                              value: s.id,
                            }))}
                            disabled={isViewMode}
                          />
                        </div>
                        <div className="md:col-span-3 space-y-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.supplierName` as const}
                            label="Manual Supplier Name"
                            placeholder="Optional unlisted supplier"
                            disabled={isViewMode}
                          />
                        </div>
                        <div className="md:col-span-3 space-y-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.title` as const}
                            label="Title"
                            placeholder="e.g. DXB-KHI Flight"
                            required
                            disabled={isViewMode}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                        <div className="md:col-span-3 space-y-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.costPrice` as const}
                            label={`Cost / Unit (${currentCurrency})`}
                            type="number"
                            required
                            disabled={isViewMode}
                          />
                        </div>
                        <div className="md:col-span-3 space-y-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.sellingPrice` as const}
                            label={`Selling Price / Unit (${currentCurrency})`}
                            type="number"
                            required
                            disabled={isViewMode}
                          />
                        </div>
                        <div className="md:col-span-2 space-y-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity` as const}
                            label="Qty"
                            type="number"
                            required
                            disabled={isViewMode}
                          />
                        </div>
                        <div className="md:col-span-3 space-y-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.unit` as const}
                            label="Unit"
                            placeholder="e.g. Person, Night"
                            disabled={isViewMode}
                          />
                        </div>
                        <div className="md:col-span-1 pt-8 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-tf-danger hover:bg-tf-danger/10 hover:text-tf-danger"
                            onClick={() => removeItem(index)}
                            disabled={isViewMode || itemFields.length <= 1}
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <FormField
                          control={form.control}
                          name={`items.${index}.description` as const}
                          label="Service Notes / Voucher Instructions"
                          placeholder="e.g. Flight PNR 7X8Y9Z, Hotel Voucher Ref #..."
                          disabled={isViewMode}
                        />
                      </div>
                    </div>
                  ))}

                  {!isViewMode && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-dashed border-tf-border text-tf-text-secondary hover:bg-tf-surface-2 mt-4"
                      onClick={() =>
                        appendItem({
                          id: undefined,
                          serviceCategory: "other",
                          title: "",
                          description: "",
                          quantity: 1,
                          unit: "Person",
                          costPrice: 0,
                          sellingPrice: 0,
                          supplierId: undefined,
                          supplierName: undefined,
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                  )}
                </div>
              </div>

              {/* SECTION: Taxes */}
              <div className="bg-tf-surface border border-tf-border rounded-xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-tf-border pb-3">
                  <h2 className="text-lg font-semibold text-tf-text-primary">
                    Taxes & Fees
                  </h2>
                </div>

                <div className="space-y-4">
                  {taxFields.length === 0 && (
                    <p className="text-sm text-tf-text-muted italic">No taxes applied.</p>
                  )}
                  {taxFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-tf-surface-2 p-4 rounded-lg border border-tf-border"
                    >
                      <div className="md:col-span-5">
                        <FormField
                          control={form.control}
                          name={`taxes.${index}.label` as const}
                          label="Tax Label"
                          placeholder="e.g. Sales tax"
                          required
                          disabled={isViewMode}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <FormSelect
                          control={form.control}
                          name={`taxes.${index}.taxType` as const}
                          label="Type"
                          required
                          disabled={isViewMode}
                          options={quotationTaxTypeOptions.map((t) => ({
                            label: t.label,
                            value: t.value,
                          }))}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <FormField
                          control={form.control}
                          name={`taxes.${index}.value` as const}
                          label="Value"
                          type="number"
                          required
                          disabled={isViewMode}
                        />
                      </div>
                      <div className="md:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-tf-danger hover:bg-tf-danger/10 hover:text-tf-danger"
                          onClick={() => removeTax(index)}
                          aria-label="Remove tax"
                          disabled={isViewMode}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {!isViewMode && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-dashed border-tf-border text-tf-text-secondary hover:bg-tf-surface-2 mt-4"
                      onClick={() =>
                        appendTax({
                          id: undefined,
                          label: "VAT",
                          taxType: "percentage",
                          value: currentCurrency === "AED" ? 5 : 0,
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Tax
                    </Button>
                  )}
                </div>
              </div>

              {/* SECTION: Notes & Terms */}
              <div className="bg-tf-surface border border-tf-border rounded-xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-tf-border pb-3">
                  <h2 className="text-lg font-semibold text-tf-text-primary">
                    Notes & Terms
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    {!isViewMode && notesTemplates.length > 0 && (
                      <div className="flex justify-end">
                        <select
                          className="text-xs bg-tf-surface-2 border border-tf-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-tf-primary text-tf-text-secondary w-full"
                          onChange={(e) => {
                            if (e.target.value) {
                              const t = notesTemplates.find(x => x.id === e.target.value);
                              if (t) form.setValue("notes", t.content, { shouldDirty: true });
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">-- Load Notes Template --</option>
                          {notesTemplates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <FormTextArea
                      control={form.control}
                      name="notes"
                      label="Customer Notes"
                      placeholder="Internal or customer notes"
                      disabled={isViewMode}
                    />
                  </div>
                  <div className="space-y-3">
                    {!isViewMode && termsTemplates.length > 0 && (
                      <div className="flex justify-end">
                        <select
                          className="text-xs bg-tf-surface-2 border border-tf-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-tf-primary text-tf-text-secondary w-full"
                          onChange={(e) => {
                            if (e.target.value) {
                              const t = termsTemplates.find(x => x.id === e.target.value);
                              if (t) form.setValue("terms", t.content, { shouldDirty: true });
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">-- Load Terms Template --</option>
                          {termsTemplates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <FormTextArea
                      control={form.control}
                      name="terms"
                      label="Terms & Conditions"
                      placeholder="Payment / cancellation / package terms"
                      disabled={isViewMode}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Summary & Actions */}
            <div className="lg:col-span-1">

              <div className="bg-tf-surface border border-tf-border rounded-xl p-6 shadow-sm sticky top-0">
                <h3 className="text-lg font-semibold text-tf-text-primary border-b border-tf-border pb-3 mb-4">
                  Quotation Summary
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-tf-text-secondary">
                    <span>Subtotal</span>
                    <span>{currentCurrency} {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-tf-text-primary font-medium mt-1">
                    <span>Est. Profit Margin</span>
                    <span className="text-emerald-600">{currentCurrency} {estimatedProfit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-tf-text-secondary">
                    <span>Taxes</span>
                    <span>{currentCurrency} {taxAmount.toLocaleString()}</span>
                  </div>

                  <div className="pt-3 border-t border-tf-border flex justify-between font-bold text-lg text-tf-text-primary">
                    <span>Grand Total</span>
                    <span>{currentCurrency} {grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <FormCombobox
                    control={form.control}
                    name="status"
                    label="Status"
                    options={quotationStatusOptions.map((s) => ({
                      label: s.label,
                      value: s.value,
                    }))}
                    disabled={isViewMode}
                  />

                  {!isViewMode && (
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                      className="w-full bg-tf-primary hover:bg-tf-primary-hover text-white py-6 mt-4 shadow-sm"
                    >
                      {form.formState.isSubmitting
                        ? "Saving..."
                        : isEditing ? "Save Changes" : "Create Quotation"}
                    </Button>
                  )}

                  {isViewMode && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => router.push(`/quotations/${editingId}/edit`)}
                    >
                      Edit Quotation
                    </Button>
                  )}
                </div>
              </div>

            </div>

          </div>
        </form>
      </Form>
    </div>
  );
}
