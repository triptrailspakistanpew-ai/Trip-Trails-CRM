"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { showSuccess, showError } from "@/lib/toast-utils";
import { Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

import { DrawerForm } from "@/components/forms/DrawerForm";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  FormField,
  FormPhoneField,
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
import type { Customer, Supplier, Branch, User } from "@/types";
import type { Template } from "@/types/template";
import { useBranchStore } from "@/store/branch.store";

import { API } from "@/lib/data-source";

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

function formatMoney(n: unknown) {
  if (typeof n !== "number") return "0";
  return n.toLocaleString?.() ?? String(n);
}

export function QuotationDrawer({
  title,
  description,
  isOpen,
  onClose,
  onSaved,
  initialValues,
  size = "lg",
  customers = [],
  branches = [],
  agents = [],

  editingId,
  mode = "create",
  onEditFromView,
  onCreateFromView,
}: {
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (q?: any) => Promise<void> | void;
  initialValues?: Partial<QuotationFormValues>;
  size?: "sm" | "md" | "lg" | "xl";
  customers?: Customer[];
  branches?: Branch[];
  agents?: User[];
  editingId?: string;
  mode?: "create" | "edit" | "view";
  onEditFromView?: () => void;
  onCreateFromView?: () => void;
}) {
  const queryClient = useQueryClient();
  const activeCurrency = useBranchStore(state => state.activeCurrency);
  const isViewMode = mode === "view";

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
    if (isOpen) {
      API.getTemplates("quotation_notes").then(setNotesTemplates).catch(console.error);
      API.getTemplates("quotation_terms").then(setTermsTemplates).catch(console.error);
      API.getSuppliers().then(setSuppliers).catch(console.error);
    }
  }, [isOpen]);

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      ...getQuotationDefaultValues(effectiveCurrency),
      currency: effectiveCurrency,
      ...initialValues,
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

  const watchedItems = form.watch("items");
  const watchedTaxes = form.watch("taxes") ?? [];

  // Defensive: backend / initialValues mapping might accidentally provide a non-array.
  const watchedItemsArray = Array.isArray(watchedItems) ? watchedItems : [];
  const watchedTaxesArray = Array.isArray(watchedTaxes) ? watchedTaxes : [];

  const { subtotal, estimatedProfit, taxAmount } = useMemo(
    () => calcTotals(watchedItemsArray as any, watchedTaxesArray as any),
    [watchedItemsArray, watchedTaxesArray],
  );

  const grandTotal = subtotal + taxAmount;
  const currentCurrency = form.watch("currency") || activeCurrency;

  useEffect(() => {
    if (!isOpen) return;
    const effCurr = initialValues?.currency || activeCurrency || "PKR";
    const defTaxes = mode === "create" && (!initialValues?.taxes || initialValues.taxes.length === 0)
      ? getDefaultTaxesForCurrency(effCurr)
      : (initialValues?.taxes ?? quotationDefaultValues.taxes);

    form.reset({
      ...getQuotationDefaultValues(effCurr),
      currency: effCurr,
      ...initialValues,
      taxes: defTaxes,
    });
    // Pre-populate new customer fields when editing a quotation with deferred customer details
    if (initialValues?.customerName) {
      setNewCustomer({
        name: initialValues.customerName || "",
        phone: initialValues.customerPhone || "",
        email: initialValues.customerEmail || "",
      });
    } else {
      setNewCustomer({ name: "", phone: "", email: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingId, mode]);

  const onSubmit = async (values: QuotationFormValues) => {
    if (isViewMode) return;

    try {
      console.log("[QuotationDrawer] Submitting validated payload:", values);

      let finalCustomerId: string | undefined = values.customerId;
      let customerName: string | undefined;
      let customerPhone: string | undefined;
      let customerEmail: string | undefined;

      if (finalCustomerId === "NEW_CUSTOMER") {
        // Defer customer creation – pass temporary details to the backend
        customerName = newCustomer.name.trim();
        customerPhone = newCustomer.phone.trim();
        customerEmail = newCustomer.email.trim() || undefined;
        finalCustomerId = undefined; // No real customer yet
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

      // Invalidate queries to ensure UI updates immediately
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
      if (editingId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.quotations.detail(editingId) });
      }

      await onSaved(finalQuotation);
      onClose();
    } catch (e: any) {
      showError(e.message || "Failed to save quotation");
    }
  };

  return (
    <DrawerForm
      title={title}
      description={description}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();

        if (isViewMode && onEditFromView) {
          onEditFromView();
          return;
        }

        const values = form.getValues();
        console.log(
          "[QuotationDrawer] Create/Update submit clicked. Current form values:",
          values,
        );

        form.handleSubmit(onSubmit, (formErrors) => {
          console.log(
            "[QuotationDrawer] Validation failed. Errors:",
            formErrors,
          );
        })(e);
      }}
      isSubmitting={form.formState.isSubmitting}
      size={size}
      submitLabel={isViewMode ? "Edit" : editingId ? "Save Changes" : "Create Quotation"}
    >
      <Form {...form}>
        <div className="space-y-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-tf-text-primary">
                Parties
              </h4>

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
                <div className="p-4 border rounded-lg bg-tf-surface-2 space-y-4">
                  <h4 className="text-sm font-semibold text-tf-text-primary">
                    New Customer Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-tf-text-primary">
                Trip Details
              </h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-tf-text-primary">
                Items
              </h4>
              <div className="space-y-3">
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
                            options={(suppliers || [])
                              .filter((s) => {
                                const cat = watchedItemsArray[index]?.serviceCategory;
                                if (!cat || cat === "other") return true;
                                const validCats = cat === "flight" ? ["airline", "consolidator"] : cat === "transfer" ? ["transport"] : [cat, "consolidator", "other"];
                                return !s.category || validCats.includes(s.category);
                              })
                              .map((s) => ({
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

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-tf-text-primary">
                Taxes
              </h4>

              <div className="space-y-3">
                {taxFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                  >
                    <div className="md:col-span-5">
                      <FormField
                        control={form.control}
                        name={`taxes.${index}.label` as const}
                        label={index === 0 ? "Label" : ""}
                        placeholder="e.g. Sales tax"
                        required
                        disabled={isViewMode}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <FormSelect
                        control={form.control}
                        name={`taxes.${index}.taxType` as const}
                        label={index === 0 ? "Type" : ""}
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
                        label={index === 0 ? "Value" : ""}
                        type="number"
                        required
                        disabled={isViewMode}
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-tf-border text-tf-text-muted hover:text-tf-text-primary"
                        onClick={() => removeTax(index)}
                        aria-label="Remove tax"
                        disabled={isViewMode || taxFields.length <= 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed border-tf-border text-tf-text-secondary hover:bg-tf-surface-2"
                  disabled={isViewMode}
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
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-tf-text-primary">
                Notes & Terms
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
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
                    label="Notes"
                    placeholder="Internal or customer notes"
                    disabled={isViewMode}
                  />
                </div>
                <div className="space-y-2">
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
                    label="Terms"
                    placeholder="Payment / cancellation / package terms"
                    disabled={isViewMode}
                  />
                </div>
              </div>

              <FormCombobox
                control={form.control}
                name="status"
                label="Quotation Status"
                options={quotationStatusOptions.map((s) => ({
                  label: s.label,
                  value: s.value,
                }))}
                disabled={isViewMode}
              />
            </div>
          </div>
        </div>
      </Form>
    </DrawerForm>
  );
}
